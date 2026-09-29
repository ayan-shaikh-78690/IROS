"""
VRP Service for IROS (Intelligent Route Optimization System).
Milestone 2.2-B: Cost Matrix + Discrete VRP Representation.

Responsibilities:
1. Extract and validate directional cost matrices (distance and duration) from RoutingService.
2. Preserve genuine directional asymmetry (D[i][j] != D[j][i] due to one-way streets, turn restrictions, flyovers).
3. Explicitly distinguish real OSRM road matrix from geodesic fallback.
4. Decode discrete multi-vehicle candidate partitions into scheduled route itineraries.
5. Validate operational constraints:
   - Exactly-once customer coverage (detect unassigned and duplicate stops)
   - Vehicle payload capacity limits (detect capacity overloads)
   - Delivery time windows (compute early wait time, on-time service, and lateness penalties)
6. Calculate multi-objective scalar fitness with transparent component breakdowns.
7. Track rigorous data provenance for all scenario metrics.
"""

import logging
import math
from typing import List, Dict, Optional, Tuple, Set

from models.schemas import LocationPoint, MatrixRequest
from models.vrp_models import (
    DataProvenance,
    VRPCustomer,
    VRPVehicle,
    VRPDepot,
    VRPProblemDefinition,
    StopSchedule,
    VehicleRoute,
    VRPSolution,
    VRPMatrixInfo,
)
from services.route_service import routing_service

logger = logging.getLogger("iros.vrp")


def parse_clock_to_seconds(clock_str: Optional[str], default_s: float = 28800.0) -> float:
    """Parses 'HH:MM' or 'HH:MM:SS' into seconds from midnight (e.g., '08:00' -> 28800.0s)."""
    if not clock_str or ":" not in clock_str:
        return default_s
    parts = clock_str.strip().split(":")
    try:
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        seconds = int(parts[2]) if len(parts) > 2 else 0
        return float(hours * 3600 + minutes * 60 + seconds)
    except (ValueError, IndexError):
        return default_s


def format_seconds_to_clock(total_seconds: float) -> str:
    """Converts seconds from midnight into 'HH:MM:SS' string format."""
    total_sec_int = int(total_seconds) % 86400  # Wrap around 24 hours if needed
    hours = total_sec_int // 3600
    minutes = (total_sec_int % 3600) // 60
    seconds = total_sec_int % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


class VRPService:
    """
    Core domain service for Discrete Capacitated Vehicle Routing with Time Windows (CVRP-TW).
    Integrates directly with the existing RoutingService singleton to compute matrices.
    """

    def __init__(self):
        self.routing = routing_service

    async def build_cost_matrix(self, problem: VRPProblemDefinition) -> VRPMatrixInfo:
        """
        Calculates directional distance and duration matrices for all problem nodes (Depot + Customers).
        Maintains directional asymmetry and tracks data provenance explicitly.
        """
        depot = problem.depot
        customers = problem.customers

        # Assemble location list: index 0 is always the depot, indices 1..N are customers
        locations: List[LocationPoint] = [
            LocationPoint(
                id=depot.id,
                name=depot.name,
                lat=depot.lat,
                lng=depot.lng,
                type="depot",
            )
        ]

        for cust in customers:
            locations.append(
                LocationPoint(
                    id=cust.id,
                    name=cust.name,
                    lat=cust.lat,
                    lng=cust.lng,
                    demand=cust.demand,
                    type="delivery_stop",
                )
            )

        n = len(locations)
        matrix_req = MatrixRequest(locations=locations)
        raw_matrix = await self.routing.calculate_cost_matrix(matrix_req)

        is_fallback = raw_matrix.provider == "GeometricFallback" or raw_matrix.status == "fallback"
        provider_name = raw_matrix.provider

        distances = raw_matrix.distances_matrix_m
        durations = raw_matrix.durations_matrix_s

        # Validate diagonal correctness: D[i][i] must be 0
        for i in range(n):
            if i < len(distances) and i < len(distances[i]):
                distances[i][i] = 0.0
            if i < len(durations) and i < len(durations[i]):
                durations[i][i] = 0.0

        # Assess directional asymmetry in real road network (D[i][j] != D[j][i])
        has_asymmetry = False
        asymmetry_diff_count = 0
        for i in range(n):
            for j in range(i + 1, n):
                if i < len(distances) and j < len(distances[i]) and j < len(distances) and i < len(distances[j]):
                    if abs(distances[i][j] - distances[j][i]) > 1.0:
                        has_asymmetry = True
                        asymmetry_diff_count += 1

        provenance = DataProvenance(
            coordinates="user/dataset",
            road_distance="OSRM" if not is_fallback else "GeometricFallback",
            road_duration="OSRM" if not is_fallback else "GeometricFallback",
            demand="dataset/user",
            vehicle_capacity="scenario/user",
            time_windows="dataset/user",
            service_duration="dataset/user/default",
            congestion="M5_simulated_pending",
            fitness="IROS_calculation",
        )

        return VRPMatrixInfo(
            provider=provider_name,
            is_fallback=is_fallback,
            location_count=n,
            location_ids=[loc.id for loc in locations],
            location_names=[loc.name for loc in locations],
            distances_matrix_m=distances,
            durations_matrix_s=durations,
            is_asymmetric=has_asymmetry,
            provenance=provenance,
        )

    def decode_candidate_routes(
        self,
        problem: VRPProblemDefinition,
        candidate_partitions: List[List[str]],
        matrix_info: VRPMatrixInfo,
    ) -> VRPSolution:
        """
        Decodes discrete vehicle customer partitions into structured vehicle route itineraries.
        Computes chronologically scheduled stop timelines, checks capacity & time-windows,
        and identifies unassigned or duplicate stops.
        """
        depot = problem.depot
        customer_map: Dict[str, VRPCustomer] = {c.id: c for c in problem.customers}
        all_customer_ids: Set[str] = set(customer_map.keys())

        # Map node identifiers to matrix indices
        id_to_idx: Dict[str, int] = {loc_id: idx for idx, loc_id in enumerate(matrix_info.location_ids)}

        # Ensure depot index is available
        depot_idx = id_to_idx.get(depot.id, 0)

        # Build vehicles list (pad with default vehicles if partitions exceed vehicles list)
        vehicles: List[VRPVehicle] = list(problem.vehicles)
        num_partitions = len(candidate_partitions)
        while len(vehicles) < num_partitions:
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

        depot_start_s = parse_clock_to_seconds(depot.opening_time, 28800.0)  # Default 08:00
        depot_cutoff_s = parse_clock_to_seconds(depot.closing_time, 72000.0)  # Default 20:00

        decoded_routes: List[VehicleRoute] = []
        visited_customer_ids: List[str] = []
        fleet_dist_m = 0.0
        fleet_travel_time_s = 0.0
        fleet_total_duration_s = 0.0
        fleet_capacity_violations = 0.0
        fleet_tw_violations_s = 0.0

        for k, partition in enumerate(candidate_partitions):
            veh = vehicles[k]
            stops = [s for s in partition if s in customer_map]
            visited_customer_ids.extend(stops)

            if not stops:
                # Vehicle is idle (stays at depot)
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

            # Full sequence: Depot -> Stop1 -> Stop2 ... -> Depot (if round_trip)
            full_seq = [depot.id] + stops + ([depot.id] if problem.round_trip else [])

            # Compute payload demand loaded
            total_demand = sum(customer_map[sid].demand for sid in stops)
            excess_demand = max(0.0, total_demand - veh.capacity)
            is_cap_ok = excess_demand <= 1e-6

            # Compute chronology and matrix costs
            route_dist_m = 0.0
            route_travel_s = 0.0
            route_tw_delays_s = 0.0
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

            prev_node_id = depot.id
            for stop_id in stops:
                cust = customer_map[stop_id]
                u_idx = id_to_idx.get(prev_node_id, 0)
                v_idx = id_to_idx.get(stop_id, 0)

                # Directional leg cost lookup
                leg_dist = matrix_info.distances_matrix_m[u_idx][v_idx]
                leg_dur = matrix_info.durations_matrix_s[u_idx][v_idx]

                # Adjust duration by vehicle speed factor if applicable
                speed_factor = max(0.1, veh.speed_factor)
                adjusted_leg_dur = leg_dur / speed_factor

                route_dist_m += leg_dist
                route_travel_s += adjusted_leg_dur

                arrival_s = current_time_s + adjusted_leg_dur

                # Customer time window parsing
                tw_start_s = parse_clock_to_seconds(cust.earliest_arrival, depot_start_s)
                tw_end_s = parse_clock_to_seconds(cust.latest_arrival, depot_cutoff_s)

                # Early arrival -> wait for time window to open
                wait_time_s = max(0.0, tw_start_s - arrival_s)
                service_start_s = arrival_s + wait_time_s

                # Late arrival -> record lateness penalty
                lateness_s = max(0.0, arrival_s - tw_end_s)
                is_late = lateness_s > 0.0
                route_tw_delays_s += lateness_s

                # Service duration: explicit customer value or configurable problem default
                svc_duration = (
                    cust.service_duration_s
                    if cust.service_duration_s is not None
                    else problem.default_service_duration_s
                )

                departure_s = service_start_s + svc_duration
                current_time_s = departure_s

                schedule.append(
                    StopSchedule(
                        stop_id=cust.id,
                        stop_name=cust.name,
                        arrival_time_s=arrival_s,
                        arrival_clock=format_seconds_to_clock(arrival_s),
                        wait_time_s=wait_time_s,
                        service_start_s=service_start_s,
                        service_duration_s=svc_duration,
                        departure_time_s=departure_s,
                        departure_clock=format_seconds_to_clock(departure_s),
                        time_window_start=cust.earliest_arrival,
                        time_window_end=cust.latest_arrival,
                        lateness_s=lateness_s,
                        is_late=is_late,
                    )
                )

                prev_node_id = stop_id

            # Return to depot if round_trip is active
            if problem.round_trip:
                u_idx = id_to_idx.get(prev_node_id, 0)
                v_idx = depot_idx
                return_dist = matrix_info.distances_matrix_m[u_idx][v_idx]
                return_dur = matrix_info.durations_matrix_s[u_idx][v_idx] / max(0.1, veh.speed_factor)

                route_dist_m += return_dist
                route_travel_s += return_dur
                return_arrival_s = current_time_s + return_dur

                depot_lateness_s = max(0.0, return_arrival_s - depot_cutoff_s)
                route_tw_delays_s += depot_lateness_s

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
                        is_late=depot_lateness_s > 0.0,
                    )
                )
                total_route_dur_s = return_arrival_s - depot_start_s
            else:
                total_route_dur_s = current_time_s - depot_start_s

            is_tw_ok = route_tw_delays_s <= 1e-6
            is_overall_route_ok = is_cap_ok and is_tw_ok

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
                    total_duration_s=round(total_route_dur_s, 1),
                    total_duration_min=round(total_route_dur_s / 60.0, 1),
                    total_demand_loaded=round(total_demand, 1),
                    capacity_exceeded=round(excess_demand, 1),
                    time_window_delays_s=round(route_tw_delays_s, 1),
                    is_capacity_feasible=is_cap_ok,
                    is_time_window_feasible=is_tw_ok,
                    is_feasible=is_overall_route_ok,
                    schedule=schedule,
                )
            )

            fleet_dist_m += route_dist_m
            fleet_travel_time_s += route_travel_s
            fleet_total_duration_s += total_route_dur_s
            fleet_capacity_violations += excess_demand
            fleet_tw_violations_s += route_tw_delays_s

        # Coverage verification: exactly-once visitation constraint
        visited_counts: Dict[str, int] = {}
        for sid in visited_customer_ids:
            visited_counts[sid] = visited_counts.get(sid, 0) + 1

        unassigned_customers = sorted(list(all_customer_ids - set(visited_counts.keys())))
        duplicate_customers = sorted([sid for sid, count in visited_counts.items() if count > 1])

        is_coverage_ok = len(unassigned_customers) == 0 and len(duplicate_customers) == 0
        is_capacity_ok = fleet_capacity_violations <= 1e-6
        is_time_window_ok = fleet_tw_violations_s <= 1e-6
        is_overall_ok = is_coverage_ok and is_capacity_ok and is_time_window_ok

        provenance = matrix_info.provenance.copy()

        return VRPSolution(
            scenario_id=problem.scenario_id,
            routes=decoded_routes,
            total_fleet_distance_km=round(fleet_dist_m / 1000.0, 2),
            total_fleet_travel_time_min=round(fleet_travel_time_s / 60.0, 1),
            total_fleet_duration_min=round(fleet_total_duration_s / 60.0, 1),
            total_capacity_violations=round(fleet_capacity_violations, 1),
            total_time_window_violations_min=round(fleet_tw_violations_s / 60.0, 1),
            unassigned_customers=unassigned_customers,
            duplicate_customers=duplicate_customers,
            is_coverage_feasible=is_coverage_ok,
            is_capacity_feasible=is_capacity_ok,
            is_time_window_feasible=is_time_window_ok,
            is_overall_feasible=is_overall_ok,
            provenance=provenance,
        )

    def evaluate_solution_fitness(
        self,
        solution: VRPSolution,
        weight_distance: float = 0.4,
        weight_time: float = 0.4,
        weight_congestion: float = 0.2,
        penalty_capacity: float = 100.0,
        penalty_time_window: float = 10.0,
        penalty_coverage: float = 500.0,
    ) -> Tuple[float, Dict[str, float]]:
        """
        Computes composite objective fitness score for candidate solution.
        Objective: Minimize (distance_cost + time_cost + constraint_penalties).
        Lower fitness indicates a higher-quality candidate solution.
        """
        # Base operational costs
        dist_cost = weight_distance * solution.total_fleet_distance_km
        time_cost = weight_time * solution.total_fleet_duration_min
        # Congestion term (M5 milestone simulation placeholder: free-flow multiplier 1.0)
        cong_cost = weight_congestion * (solution.total_fleet_duration_min * 0.1)

        # Constraint penalties
        cap_penalty = penalty_capacity * solution.total_capacity_violations
        tw_penalty = penalty_time_window * solution.total_time_window_violations_min
        cov_penalty = penalty_coverage * (
            len(solution.unassigned_customers) + len(solution.duplicate_customers)
        )

        total_fitness = dist_cost + time_cost + cong_cost + cap_penalty + tw_penalty + cov_penalty

        breakdown = {
            "distance_cost": round(dist_cost, 2),
            "duration_cost": round(time_cost, 2),
            "congestion_cost": round(cong_cost, 2),
            "capacity_penalty": round(cap_penalty, 2),
            "time_window_penalty": round(tw_penalty, 2),
            "coverage_penalty": round(cov_penalty, 2),
            "raw_fleet_distance_km": solution.total_fleet_distance_km,
            "raw_fleet_duration_min": solution.total_fleet_duration_min,
            "raw_capacity_violations": solution.total_capacity_violations,
            "raw_time_window_violations_min": solution.total_time_window_violations_min,
            "raw_unassigned_stops": float(len(solution.unassigned_customers)),
            "raw_duplicate_stops": float(len(solution.duplicate_customers)),
        }

        return round(total_fitness, 2), breakdown


# Global VRP service singleton
vrp_service = VRPService()
