"""
VRP API Router for IROS (Intelligent Route Optimization System).
Milestone 2.2-B: Cost Matrix + Discrete VRP Representation.

Endpoints:
- POST /api/vrp/matrix: Calculate directional road distance/duration cost matrix.
- POST /api/vrp/decode: Decode candidate vehicle partitions into scheduled itineraries and validate constraints.
- POST /api/vrp/evaluate: Evaluate candidate partition fitness and constraint penalties.
- GET /api/vrp/formulation: CVRP-TW mathematical formulation, objective weights, and search space specification.
"""

from fastapi import APIRouter, HTTPException, Depends
from models.vrp_models import (
    VRPProblemDefinition,
    VRPMatrixInfo,
    VRPDecodeRequest,
    VRPDecodeResponse,
    VRPEvaluateRequest,
    VRPEvaluateResponse,
    VRPSolution,
)
from services.vrp_service import vrp_service

router = APIRouter(prefix="/vrp", tags=["VRP"])


@router.get("/formulation")
def get_vrp_formulation():
    """
    Returns the formal CVRP-TW mathematical problem formulation,
    discrete combinatorial search space description, and data provenance mappings.
    """
    return {
        "title": "Capacitated Vehicle Routing Problem with Time Windows (CVRP-TW)",
        "framework": "IROS Discrete VRP Foundation (M2.2-B)",
        "objective": "Minimize Composite Operational Cost and Constraint Penalties",
        "near_optimality_goal": "Identify high-quality feasible solutions or near-optimal candidate solutions across heterogeneous fleet routes.",
        "search_space_description": (
            "The discrete representation provides the combinatorial search space that will later "
            "be coupled with a problem-specific QPSO update/mapping strategy in M4."
        ),
        "mathematical_formulation": {
            "graph": "Complete directed graph G = (V, E) where V = {0} (depot) U {1..N} (customers)",
            "asymmetric_cost_matrix": "c_ij != c_ji representing directional urban street networks (one-way roads, turn restrictions, flyovers)",
            "decision_variables": "x_ijk in {0, 1} indicating vehicle k traverses arc (i, j); s_ik is service start time at customer i by vehicle k",
            "objective_function": (
                "min sum_k [ w_d * Distance_k + w_t * Time_k + w_c * Congestion_k ] "
                "+ lambda_cap * ExcessDemand + lambda_tw * Lateness + lambda_cov * CoverageViolations"
            ),
            "constraints": [
                "1. Exactly-once visitation: sum_k sum_j x_ijk = 1 for all customers i in {1..N}",
                "2. Flow conservation: sum_j x_0jk = sum_i x_i0k = 1 for all active vehicles k",
                "3. Depot departure and return: sum_j x_ijk - sum_j x_jik = 0 for all nodes i and vehicles k",
                "4. Payload capacity: sum_i q_i * sum_j x_ijk <= Q_k for each vehicle k",
                "5. Time window compliance: e_i <= s_ik <= l_i for all customers i; s_jk >= s_ik + t_service_i + t_travel_ij",
                "6. Depot dispatch window: T_departure >= T_depot_open and T_return <= T_depot_close",
            ],
        },
        "service_duration_policy": {
            "default_service_duration_s": 300.0,
            "status": "Configurable default (5 minutes per stop). Explicit dataset/user values take precedence.",
            "note": "Service duration is treated as an operational parameter, not assumed as ground-truth dataset information.",
        },
        "data_provenance_schema": {
            "coordinates": "user/dataset",
            "road_distance": "OSRM (OpenStreetMap road network)",
            "road_duration": "OSRM (driving profile)",
            "demand": "dataset/user/simulation",
            "vehicle_capacity": "scenario/user",
            "time_windows": "dataset/user/simulation",
            "service_duration": "dataset/user/default",
            "congestion": "future M5 simulation",
            "fitness": "IROS calculation",
        },
    }


@router.post("/matrix", response_model=VRPMatrixInfo)
async def get_vrp_matrix(problem: VRPProblemDefinition):
    """
    Computes pairwise directional distance and duration matrices between all locations (Depot + Customers).
    Preserves directional asymmetry (D[i][j] != D[j][i]) and marks fallback state transparently.
    """
    try:
        matrix_info = await vrp_service.build_cost_matrix(problem)
        return matrix_info
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate VRP cost matrix: {str(exc)}",
        )


@router.post("/decode", response_model=VRPDecodeResponse)
async def decode_vrp_solution(request: VRPDecodeRequest):
    """
    Decodes candidate discrete vehicle customer assignments into detailed route itineraries,
    chronological stop schedules, and operational constraint verifications.
    """
    try:
        matrix_info = await vrp_service.build_cost_matrix(request.problem)
        solution = vrp_service.decode_candidate_routes(
            problem=request.problem,
            candidate_partitions=request.candidate_partitions,
            matrix_info=matrix_info,
        )
        return VRPDecodeResponse(
            status="success",
            solution=solution,
            matrix_provider=matrix_info.provider,
            is_fallback_matrix=matrix_info.is_fallback,
            message="Candidate VRP partitions successfully decoded and scheduled.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to decode candidate VRP solution: {str(exc)}",
        )


@router.post("/evaluate", response_model=VRPEvaluateResponse)
async def evaluate_vrp_solution(request: VRPEvaluateRequest):
    """
    Decodes and evaluates a candidate discrete VRP assignment:
    checks feasibility against capacity, time-windows, and coverage constraints,
    and returns the scalar multi-objective fitness score with complete cost breakdown.
    """
    try:
        matrix_info = await vrp_service.build_cost_matrix(request.problem)
        solution = vrp_service.decode_candidate_routes(
            problem=request.problem,
            candidate_partitions=request.candidate_partitions,
            matrix_info=matrix_info,
        )
        fitness_cost, breakdown = vrp_service.evaluate_solution_fitness(
            solution=solution,
            weight_distance=request.weight_distance,
            weight_time=request.weight_time,
            weight_congestion=request.weight_congestion,
            penalty_capacity=request.penalty_capacity,
            penalty_time_window=request.penalty_time_window,
            penalty_coverage=request.penalty_coverage,
        )

        solution.fitness_cost = fitness_cost
        solution.fitness_breakdown = breakdown

        return VRPEvaluateResponse(
            status="success",
            is_feasible=solution.is_overall_feasible,
            fitness_cost=fitness_cost,
            fitness_breakdown=breakdown,
            solution=solution,
            message="Candidate VRP solution successfully evaluated against CVRP-TW constraints.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to evaluate candidate VRP solution: {str(exc)}",
        )
