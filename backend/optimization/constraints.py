"""
Unified VRP Constraint Engine for IROS.
Milestones M2.2-B / M3 / M4.

Validates all operational constraints for Capacitated Vehicle Routing with Time Windows (CVRP-TW):
1. Exactly-once customer visitation (no unassigned, no duplicates)
2. Fleet vehicle payload capacity limits (sum(demand) <= capacity)
3. Customer arrival time-window bounds [earliest_arrival, latest_arrival]
4. Stop handling service duration accounting
5. Depot dispatch opening and closing cutoff hours
6. Comprehensive constraint violation metrics and penalty cost calculation
"""

from typing import List, Dict, Tuple, Set, Optional, Any
from models.vrp_models import (
    VRPProblemDefinition,
    VRPCustomer,
    VRPVehicle,
    VRPDepot,
    VRPMatrixInfo,
    StopSchedule,
    VehicleRoute,
    VRPSolution,
)
from services.vrp_service import parse_clock_to_seconds, format_seconds_to_clock


class ConstraintValidationResult:
    """Detailed outcome of constraint evaluation for a candidate solution."""

    def __init__(self):
        self.is_coverage_feasible: bool = True
        self.is_capacity_feasible: bool = True
        self.is_time_window_feasible: bool = True
        self.is_overall_feasible: bool = True

        self.unassigned_customers: List[str] = []
        self.duplicate_customers: List[str] = []
        self.capacity_violations: float = 0.0  # Total excess demand across fleet
        self.time_window_violations_min: float = 0.0  # Total lateness across all stops in minutes

        self.total_penalty: float = 0.0
        self.penalty_breakdown: Dict[str, float] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_feasible": self.is_overall_feasible,
            "is_coverage_feasible": self.is_coverage_feasible,
            "is_capacity_feasible": self.is_capacity_feasible,
            "is_time_window_feasible": self.is_time_window_feasible,
            "unassigned_customers": self.unassigned_customers,
            "duplicate_customers": self.duplicate_customers,
            "capacity_violations": round(self.capacity_violations, 2),
            "time_window_violations_min": round(self.time_window_violations_min, 2),
            "total_penalty": round(self.total_penalty, 2),
            "penalty_breakdown": self.penalty_breakdown,
        }


class VRPConstraintEngine:
    """
    Central constraint validation engine shared across Classical PSO, Quantum QPSO,
    and any future metaheuristics or exact methods.
    """

    def __init__(
        self,
        penalty_capacity: float = 100.0,
        penalty_time_window: float = 10.0,
        penalty_coverage: float = 500.0,
    ):
        self.penalty_capacity = penalty_capacity
        self.penalty_time_window = penalty_time_window
        self.penalty_coverage = penalty_coverage

    def validate_solution(
        self,
        candidate_partitions: List[List[str]],
        problem: VRPProblemDefinition,
        matrix_info: VRPMatrixInfo,
    ) -> Tuple[ConstraintValidationResult, List[VehicleRoute]]:
        """
        Validates the candidate discrete solution against all physical and operational constraints.
        Returns validation result and decoded vehicle route itineraries with stop schedules.
        """
        result = ConstraintValidationResult()
        depot = problem.depot
        customer_map: Dict[str, VRPCustomer] = {c.id: c for c in problem.customers}
        all_expected_ids = set(customer_map.keys())

        # Build location index map from cost matrix
        id_to_idx = {loc_id: idx for idx, loc_id in enumerate(matrix_info.location_ids)}
        depot_idx = id_to_idx.get(depot.id, 0)

        # Ensure enough vehicles
        vehicles = list(problem.vehicles)
        while len(vehicles) < len(candidate_partitions):
            idx = len(vehicles) + 1
            vehicles.append(
                VRPVehicle(
                    id=f"VEH-{idx:02d}",
                    name=f"Fleet Vehicle {idx}",
                    type="van",
                    capacity=100.0,
                    speed_factor=1.0,
                )
            )

        depot_start_s = parse_clock_to_seconds(depot.opening_time, 28800.0)
        depot_cutoff_s = parse_clock_to_seconds(depot.closing_time, 72000.0)

        decoded_routes: List[VehicleRoute] = []
        visited_customer_ids: List[str] = []

        total_cap_excess = 0.0
        total_lateness_s = 0.0

        for k, partition in enumerate(candidate_partitions):
            veh = vehicles[k]
            stops = [s for s in partition if s in customer_map]
            visited_customer_ids.extend(stops)

            if not stops:
                # Idle vehicle at depot
                decoded_routes.append(
                    VehicleRoute(
                        vehicle_id=veh.id,
                        vehicle_name=veh.name,
                        vehicle_type=veh.type,
                        capacity_limit=veh.capacity,
                        stops=[],
                        full_sequence=[depot.id],
                        distance_m=0.0,
                        distance_km=0.0,
                        travel_time_s=0.0,
                        total_duration_s=0.0,
                        total_duration_min=0.0,
                        total_demand_loaded=0.0,
                        capacity_exceeded=0.0,
                        time_window_delays_s=0.0,
                        is_capacity_feasible=True,
                        is_time_window_feasible=True,
                        is_feasible=True,
                        schedule=[
                            StopSchedule(
                                stop_id=depot.id,
                                stop_name=depot.name,
                                arrival_time_s=depot_start_s,
                                arrival_clock=format_seconds_to_clock(depot_start_s),
                                wait_time_s=0.0,
                                service_start_s=depot_start_s,
                                service_duration_s=0.0,
                                departure_time_s=depot_start_s,
                                departure_clock=format_seconds_to_clock(depot_start_s),
                                time_window_start=depot.opening_time,
                                time_window_end=depot.closing_time,
                                lateness_s=0.0,
                                is_late=False,
                            )
                        ],
                    )
                )
                continue

            full_seq = [depot.id] + stops + ([depot.id] if problem.round_trip else [])

            # 1. Capacity check
            total_demand = sum(customer_map[sid].demand for sid in stops)
            excess_demand = max(0.0, total_demand - veh.capacity)
            total_cap_excess += excess_demand
            is_cap_ok = excess_demand <= 1e-6

            # 2. Timing & Time Window check
            route_dist_m = 0.0
            route_travel_s = 0.0
            route_lateness_s = 0.0
            current_time_s = depot_start_s

            schedule: List[StopSchedule] = [
                StopSchedule(
                    stop_id=depot.id,
                    stop_name=depot.name,
                    arrival_time_s=depot_start_s,
                    arrival_clock=format_seconds_to_clock(depot_start_s),
                    wait_time_s=0.0,
                    service_start_s=depot_start_s,
                    service_duration_s=0.0,
                    departure_time_s=depot_start_s,
                    departure_clock=format_seconds_to_clock(depot_start_s),
                    time_window_start=depot.opening_time,
                    time_window_end=depot.closing_time,
                    lateness_s=0.0,
                    is_late=False,
                )
            ]

            prev_id = depot.id
            for sid in stops:
                cust = customer_map[sid]
                u_idx = id_to_idx.get(prev_id, 0)
                v_idx = id_to_idx.get(sid, 0)

                leg_dist = matrix_info.distances_matrix_m[u_idx][v_idx]
                leg_dur = matrix_info.durations_matrix_s[u_idx][v_idx] / max(0.1, veh.speed_factor)

                route_dist_m += leg_dist
                route_travel_s += leg_dur

                arrival_s = current_time_s + leg_dur
                tw_start_s = parse_clock_to_seconds(cust.earliest_arrival, depot_start_s)
                tw_end_s = parse_clock_to_seconds(cust.latest_arrival, depot_cutoff_s)

                wait_s = max(0.0, tw_start_s - arrival_s)
                service_start_s = arrival_s + wait_s

                late_s = max(0.0, arrival_s - tw_end_s)
                route_lateness_s += late_s

                svc_dur = (
                    cust.service_duration_s
                    if cust.service_duration_s is not None
                    else problem.default_service_duration_s
                )

                departure_s = service_start_s + svc_dur
                current_time_s = departure_s

                schedule.append(
                    StopSchedule(
                        stop_id=cust.id,
                        stop_name=cust.name,
                        arrival_time_s=arrival_s,
                        arrival_clock=format_seconds_to_clock(arrival_s),
                        wait_time_s=wait_s,
                        service_start_s=service_start_s,
                        service_duration_s=svc_dur,
                        departure_time_s=departure_s,
                        departure_clock=format_seconds_to_clock(departure_s),
                        time_window_start=cust.earliest_arrival,
                        time_window_end=cust.latest_arrival,
                        lateness_s=late_s,
                        is_late=late_s > 0,
                    )
                )
                prev_id = sid

            if problem.round_trip:
                u_idx = id_to_idx.get(prev_id, 0)
                v_idx = depot_idx
                ret_dist = matrix_info.distances_matrix_m[u_idx][v_idx]
                ret_dur = matrix_info.durations_matrix_s[u_idx][v_idx] / max(0.1, veh.speed_factor)

                route_dist_m += ret_dist
                route_travel_s += ret_dur
                return_arrival_s = current_time_s + ret_dur

                depot_lateness_s = max(0.0, return_arrival_s - depot_cutoff_s)
                route_lateness_s += depot_lateness_s

                schedule.append(
                    StopSchedule(
                        stop_id=depot.id,
                        stop_name=f"{depot.name} (Return)",
                        arrival_time_s=return_arrival_s,
                        arrival_clock=format_seconds_to_clock(return_arrival_s),
                        wait_time_s=0.0,
                        service_start_s=return_arrival_s,
                        service_duration_s=0.0,
                        departure_time_s=return_arrival_s,
                        departure_clock=format_seconds_to_clock(return_arrival_s),
                        time_window_start=depot.opening_time,
                        time_window_end=depot.closing_time,
                        lateness_s=depot_lateness_s,
                        is_late=depot_lateness_s > 0,
                    )
                )
                total_duration_s = return_arrival_s - depot_start_s
            else:
                total_duration_s = current_time_s - depot_start_s

            total_lateness_s += route_lateness_s
            is_tw_ok = route_lateness_s <= 1e-6

            decoded_routes.append(
                VehicleRoute(
                    vehicle_id=veh.id,
                    vehicle_name=veh.name,
                    vehicle_type=veh.type,
                    capacity_limit=veh.capacity,
                    stops=stops,
                    full_sequence=full_seq,
                    distance_m=round(route_dist_m, 1),
                    distance_km=round(route_dist_m / 1000.0, 2),
                    travel_time_s=round(route_travel_s, 1),
                    total_duration_s=round(total_duration_s, 1),
                    total_duration_min=round(total_duration_s / 60.0, 1),
                    total_demand_loaded=round(total_demand, 1),
                    capacity_exceeded=round(excess_demand, 1),
                    time_window_delays_s=round(route_lateness_s, 1),
                    is_capacity_feasible=is_cap_ok,
                    is_time_window_feasible=is_tw_ok,
                    is_feasible=is_cap_ok and is_tw_ok,
                    schedule=schedule,
                )
            )

        # 3. Coverage verification
        visited_counts: Dict[str, int] = {}
        for sid in visited_customer_ids:
            visited_counts[sid] = visited_counts.get(sid, 0) + 1

        unassigned = sorted(list(all_expected_ids - set(visited_counts.keys())))
        duplicates = sorted([sid for sid, c in visited_counts.items() if c > 1])

        is_cov_ok = len(unassigned) == 0 and len(duplicates) == 0
        is_cap_ok = total_cap_excess <= 1e-6
        is_tw_ok = total_lateness_s <= 1e-6

        # Penalties calculation
        cap_penalty = self.penalty_capacity * total_cap_excess
        tw_penalty = self.penalty_time_window * (total_lateness_s / 60.0)
        cov_penalty = self.penalty_coverage * (len(unassigned) + len(duplicates))
        total_penalty = cap_penalty + tw_penalty + cov_penalty

        result.is_coverage_feasible = is_cov_ok
        result.is_capacity_feasible = is_cap_ok
        result.is_time_window_feasible = is_tw_ok
        result.is_overall_feasible = is_cov_ok and is_cap_ok and is_tw_ok
        result.unassigned_customers = unassigned
        result.duplicate_customers = duplicates
        result.capacity_violations = total_cap_excess
        result.time_window_violations_min = total_lateness_s / 60.0
        result.total_penalty = total_penalty
        result.penalty_breakdown = {
            "capacity_penalty": round(cap_penalty, 2),
            "time_window_penalty": round(tw_penalty, 2),
            "coverage_penalty": round(cov_penalty, 2),
        }

        return result, decoded_routes


# Global constraint engine instance
constraint_engine = VRPConstraintEngine()
