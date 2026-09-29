"""
Unified Multi-Objective Fitness Evaluator for IROS VRP.
Shared by Classical PSO (M3), Quantum QPSO (M4), and benchmarking suites.

Evaluates composite objective:
Fitness = w_distance * norm(distance) + w_time * norm(travel_time) + w_congestion * norm(congestion) + Penalties

Maintains complete transparency by preserving all raw metrics separately.
"""

from typing import List, Dict, Any, Tuple, Optional
from models.vrp_models import VRPProblemDefinition, VRPMatrixInfo, VehicleRoute, VRPSolution
from optimization.constraints import VRPConstraintEngine, ConstraintValidationResult, constraint_engine


class ObjectiveFunction:
    """
    Standardized multi-objective fitness evaluator for vehicle routing solutions.
    Ensures that PSO, QPSO, and future algorithms evaluate candidate routes identically.
    """

    def __init__(
        self,
        weight_distance: float = 0.4,
        weight_travel_time: float = 0.4,
        weight_congestion: float = 0.2,
        constraint_evaluator: Optional[VRPConstraintEngine] = None,
        # Normalization scale baselines: ~50 km and ~60 min for urban fleet operations
        dist_scale_km: float = 50.0,
        time_scale_min: float = 60.0,
    ):
        self.w_d = weight_distance
        self.w_t = weight_travel_time
        self.w_c = weight_congestion
        self.constraints = constraint_evaluator or constraint_engine
        self.dist_scale = max(1.0, dist_scale_km)
        self.time_scale = max(1.0, time_scale_min)

    def evaluate(
        self,
        candidate_partitions: List[List[str]],
        problem: VRPProblemDefinition,
        matrix_info: VRPMatrixInfo,
    ) -> Tuple[float, Dict[str, Any], ConstraintValidationResult, List[VehicleRoute]]:
        """
        Evaluates a candidate discrete solution.
        Returns:
        - scalar fitness cost (lower is better)
        - transparent metrics breakdown dictionary
        - constraint validation result
        - decoded vehicle route itineraries
        """
        c_res, routes = self.constraints.validate_solution(candidate_partitions, problem, matrix_info)

        # Aggregate raw metrics across fleet routes
        total_dist_km = sum(r.distance_km for r in routes)
        total_travel_min = sum(r.travel_time_s / 60.0 for r in routes)
        total_duration_min = sum(r.total_duration_min for r in routes)

        # Baseline congestion index (Free-flow 1.0 until M5 dynamic simulation)
        congestion_cost = total_duration_min * 0.1

        # Normalized base operational costs
        norm_dist = total_dist_km / self.dist_scale
        norm_time = total_duration_min / self.time_scale
        norm_cong = congestion_cost / (self.time_scale * 0.1)

        base_cost = (
            self.w_d * norm_dist * 50.0  # Scale back to operational scale for intuitive reading
            + self.w_t * norm_time * 50.0
            + self.w_c * norm_cong * 10.0
        )

        # Total fitness = base operational cost + constraint penalties
        fitness = base_cost + c_res.total_penalty

        breakdown = {
            "fitness": round(fitness, 2),
            "distance_cost": round(self.w_d * norm_dist * 50.0, 2),
            "duration_cost": round(self.w_t * norm_time * 50.0, 2),
            "congestion_cost": round(self.w_c * norm_cong * 10.0, 2),
            "total_penalty": round(c_res.total_penalty, 2),
            "raw_metrics": {
                "distance_km": round(total_dist_km, 2),
                "travel_time_min": round(total_travel_min, 1),
                "total_duration_min": round(total_duration_min, 1),
                "congestion_cost": round(congestion_cost, 2),
                "capacity_violation": round(c_res.capacity_violations, 1),
                "time_window_violation": round(c_res.time_window_violations_min, 1),
                "unassigned_stops": len(c_res.unassigned_customers),
                "duplicate_stops": len(c_res.duplicate_customers),
            },
            "is_feasible": c_res.is_overall_feasible,
        }

        return round(fitness, 2), breakdown, c_res, routes


# Global shared objective function
shared_objective_function = ObjectiveFunction()
