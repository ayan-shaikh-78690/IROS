"""
Optimization API Router for IROS (Intelligent Route Optimization System).
Milestones M3 (Classical PSO) and M4 (Quantum-Inspired QPSO).

Endpoints:
- POST /api/optimization/pso: Executes Classical Discrete PSO baseline.
- POST /api/optimization/qpso: Executes Quantum-Behaved PSO.
- POST /api/optimization/run: Unified optimization job submission endpoint.
- POST /api/optimization/compare: Executes both PSO and QPSO on identical scenario for head-to-head benchmarking.
- GET /api/optimization/: Returns optimization engine status and algorithmic parameters.
"""

from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, HTTPException, Depends, Path
from pydantic import BaseModel, Field

from models.vrp_models import (
    VRPProblemDefinition,
    VRPCustomer,
    VRPVehicle,
    VRPDepot,
    VRPMatrixInfo,
    VehicleRoute,
)
from services.vrp_service import vrp_service
from services.route_service import routing_service
from models.schemas import RouteRequest, LocationPoint
from optimization.objective import ObjectiveFunction
from optimization.constraints import VRPConstraintEngine
from optimization.pso import PSOSolver
from optimization.qpso import QPSOSolver
from data.database import (
    record_optimization_run,
    get_optimization_run_by_id,
    list_recent_optimization_runs,
)

router = APIRouter(prefix="/optimization", tags=["Optimization"])


# =========================================================================
# Request and Response Contracts
# =========================================================================

class OptimizationRunRequest(BaseModel):
    """Execution request for discrete metaheuristic solver."""
    problem: Optional[VRPProblemDefinition] = None
    scenario: Optional[Dict[str, Any]] = None  # Compatible with legacy ScenarioConfig
    algorithm: str = Field(default="qpso", description="'pso' or 'qpso'")
    population_size: int = Field(default=40, ge=10, le=200)
    iterations: int = Field(default=80, ge=10, le=500)
    random_seed: Optional[int] = Field(default=42, description="Seed for reproducible experiments")

    # Algorithm specific hyperparameters
    w: float = Field(default=0.7, description="PSO inertia weight")
    c1: float = Field(default=1.5, description="PSO cognitive factor")
    c2: float = Field(default=1.5, description="PSO social factor")
    alpha_start: float = Field(default=1.0, description="QPSO initial contraction-expansion")
    alpha_end: float = Field(default=0.5, description="QPSO final contraction-expansion")

    # Multi-Objective Weights
    weight_distance: float = Field(default=0.4, ge=0.0, le=1.0)
    weight_travel_time: float = Field(default=0.4, ge=0.0, le=1.0)
    weight_congestion: float = Field(default=0.2, ge=0.0, le=1.0)

    # Attach real street geometry via OSRM for map visualization
    include_road_geometry: bool = Field(default=True)


class OptimizationCompareRequest(BaseModel):
    """Request to benchmark Classical PSO against Quantum QPSO under identical conditions."""
    scenario_id: Optional[str] = None
    problem: Optional[VRPProblemDefinition] = None
    scenario: Optional[Dict[str, Any]] = None
    population_size: int = Field(default=40, ge=10, le=200)
    iterations: int = Field(default=80, ge=10, le=500)
    random_seed: Optional[int] = Field(default=42)
    weight_distance: float = Field(default=0.4)
    weight_travel_time: float = Field(default=0.4)
    weight_congestion: float = Field(default=0.2)
    include_road_geometry: bool = Field(default=True)


def normalize_problem_definition(request_obj: Any) -> VRPProblemDefinition:
    """Extracts or adapts a VRPProblemDefinition from problem or legacy scenario."""
    if hasattr(request_obj, "problem") and request_obj.problem is not None:
        return request_obj.problem

    scenario_dict = getattr(request_obj, "scenario", None) or {}
    sc_id = (
        getattr(request_obj, "scenario_id", None)
        or scenario_dict.get("id")
        or scenario_dict.get("scenario_id")
        or "ahmedabad-peak"
    )

    # If scenario_dict has no customers, attempt to hydrate from SQLite database
    if not scenario_dict.get("customers"):
        try:
            from data.database import db
            db_sc = db.get_scenario(sc_id)
            if db_sc and db_sc.get("customers"):
                scenario_dict = db_sc
        except Exception:
            pass

    depot_raw = scenario_dict.get("depot") or {}
    depot = VRPDepot(
        id=depot_raw.get("id", "DEPOT-001"),
        name=depot_raw.get("name", "Central Fleet Depot"),
        lat=float(depot_raw.get("lat") or depot_raw.get("latitude") or 23.0338),
        lng=float(depot_raw.get("lng") or depot_raw.get("longitude") or 72.5850),
        opening_time="08:00",
        closing_time="20:00",
    )

    customers: List[VRPCustomer] = []
    cust_list = scenario_dict.get("customers", [])
    for idx, c in enumerate(cust_list):
        cid = c.get("id") or c.get("customer_id") or f"CUST-{idx+1:03d}"
        cname = c.get("name") or f"Delivery Stop {idx+1}"
        clat = float(c.get("lat") or c.get("latitude") or 23.0300)
        clng = float(c.get("lng") or c.get("longitude") or 72.5500)
        demand = float(c.get("demand", 15.0))
        earliest = c.get("earliest_arrival") or c.get("earliestArrival") or "09:00"
        latest = c.get("latest_arrival") or c.get("latestArrival") or "18:00"
        customers.append(
            VRPCustomer(
                id=cid,
                name=cname,
                lat=clat,
                lng=clng,
                demand=demand,
                earliest_arrival=earliest,
                latest_arrival=latest,
                service_duration_s=300.0,
            )
        )

    custom_vehicles = scenario_dict.get("vehicles")
    if custom_vehicles and isinstance(custom_vehicles, list) and len(custom_vehicles) > 0:
        vehicles: List[VRPVehicle] = [
            VRPVehicle(
                id=str(v.get("id") or f"VEH-{i+1:02d}"),
                name=str(v.get("name") or f"Fleet {v.get('type', 'van').upper()} {i+1}"),
                type=str(v.get("type", "van")),
                capacity=float(v.get("capacity", 120.0)),
                speed_factor=float(v.get("speed_factor", 1.0)),
            )
            for i, v in enumerate(custom_vehicles)
            if v.get("available", True) is not False
        ]
    else:
        num_vehicles = int(
            scenario_dict.get("num_vehicles") or scenario_dict.get("numVehicles") or 3
        )
        capacity = float(
            scenario_dict.get("vehicle_capacity") or scenario_dict.get("vehicleCapacity") or 100.0
        )
        vtype = scenario_dict.get("vehicleType") or scenario_dict.get("vehicle_type") or "van"
        vehicles: List[VRPVehicle] = [
            VRPVehicle(
                id=f"VEH-{i+1:02d}",
                name=f"Fleet {vtype.upper()} {i+1}",
                type=vtype,
                capacity=capacity,
                speed_factor=1.0,
            )
            for i in range(num_vehicles)
        ]

    round_trip = bool(
        scenario_dict.get("round_trip", scenario_dict.get("isRoundTrip", scenario_dict.get("roundTrip", True)))
    )

    sc_id = (
        getattr(request_obj, "scenario_id", None)
        or scenario_dict.get("id")
        or scenario_dict.get("scenario_id")
        or "ahmedabad-peak"
    )

    return VRPProblemDefinition(
        scenario_id=sc_id,
        depot=depot,
        customers=customers,
        vehicles=vehicles,
        round_trip=round_trip,
        default_service_duration_s=300.0,
    )


def evaluate_initial_scenario_baseline(
    problem: VRPProblemDefinition,
    matrix_info: VRPMatrixInfo,
    objective: ObjectiveFunction,
) -> Tuple[Dict[str, Any], List[VehicleRoute]]:
    """
    Evaluates the unoptimized baseline route directly from the scenario customer ordering,
    split round-robin across active fleet vehicles.
    Provides verifiable 'Before Optimization' metrics.
    """
    num_v = max(1, len(problem.vehicles))
    initial_partitions: List[List[str]] = [[] for _ in range(num_v)]
    for idx, cust in enumerate(problem.customers):
        initial_partitions[idx % num_v].append(cust.id)

    init_fitness, init_breakdown, init_c_res, init_routes = objective.evaluate(
        initial_partitions, problem, matrix_info
    )

    before_metrics = {
        "order_type": "Original Scenario Dispatch Order",
        "fitness": init_fitness,
        "total_distance_km": init_breakdown.get("raw_metrics", {}).get("distance_km", 0.0),
        "total_travel_time_min": init_breakdown.get("raw_metrics", {}).get("total_duration_min", 0.0),
        "congestion_cost": init_breakdown.get("raw_metrics", {}).get("congestion_cost", 0.0),
        "is_feasible": init_breakdown.get("is_feasible", False),
        "capacity_violation": init_breakdown.get("raw_metrics", {}).get("capacity_violation", 0.0),
        "time_window_violation": init_breakdown.get("raw_metrics", {}).get("time_window_violation", 0.0),
        "routes": [r.model_dump() for r in init_routes],
    }

    return before_metrics, init_routes


def compute_before_after_delta(
    before: Dict[str, Any],
    after_dist: float,
    after_time: float,
    after_fit: float,
) -> Dict[str, Any]:
    """Computes transparent, honest improvement deltas comparing Before vs After."""
    b_dist = float(before.get("total_distance_km", 0.0))
    b_time = float(before.get("total_travel_time_min", 0.0))
    b_fit = float(before.get("fitness", 0.0))

    dist_saved = round(b_dist - after_dist, 2)
    time_saved = round(b_time - after_time, 1)
    fit_saved = round(b_fit - after_fit, 2)

    pct_dist = round((dist_saved / b_dist * 100.0), 1) if b_dist > 0 else 0.0
    pct_time = round((time_saved / b_time * 100.0), 1) if b_time > 0 else 0.0
    pct_fit = round((fit_saved / b_fit * 100.0), 1) if b_fit > 0 else 0.0

    return {
        "distance_saved_km": dist_saved,
        "distance_reduction_pct": pct_dist,
        "time_saved_min": time_saved,
        "time_reduction_pct": pct_time,
        "fitness_improvement": fit_saved,
        "fitness_improvement_pct": pct_fit,
        "has_improvement": fit_saved > 0,
        "summary": (
            f"Reduced fitness by {pct_fit}% ({fit_saved} score reduction, {dist_saved} km saved)"
            if fit_saved > 0
            else "No improvement found in this stochastic run"
        ),
    }


async def attach_road_geometries_to_routes(
    decoded_routes: List[VehicleRoute],
    problem: VRPProblemDefinition,
) -> List[Dict[str, Any]]:
    """
    Calls RoutingService for each non-empty vehicle tour to attach real street-following
    OSRM GeoJSON geometry so the frontend Leaflet map can render authentic road paths.
    """
    customer_map = {c.id: c for c in problem.customers}
    depot = problem.depot
    enriched_routes: List[Dict[str, Any]] = []

    for r in decoded_routes:
        r_dict = r.model_dump()
        if not r.stops:
            r_dict["geometry"] = None
            enriched_routes.append(r_dict)
            continue

        stops_locs: List[LocationPoint] = []
        for sid in r.stops:
            cust = customer_map.get(sid)
            if cust:
                stops_locs.append(
                    LocationPoint(
                        id=cust.id,
                        name=cust.name,
                        lat=cust.lat,
                        lng=cust.lng,
                        demand=cust.demand,
                        type="delivery_stop",
                    )
                )

        route_req = RouteRequest(
            scenario_id=f"veh-{r.vehicle_id}",
            depot=LocationPoint(
                id=depot.id,
                name=depot.name,
                lat=depot.lat,
                lng=depot.lng,
                type="depot",
            ),
            delivery_stops=stops_locs,
            round_trip=problem.round_trip,
        )

        try:
            road_resp = await routing_service.calculate_road_route(route_req)
            r_dict["geometry"] = road_resp.geometry.model_dump() if road_resp.geometry else None
        except Exception:
            r_dict["geometry"] = None

        enriched_routes.append(r_dict)

    return enriched_routes


# =========================================================================
# Route Handlers
# =========================================================================

@router.get("/")
def get_optimization_status():
    """
    Optimization API status and supported metaheuristics metadata.
    Milestones M3 (Classical PSO) and M4 (Quantum QPSO).
    """
    return {
        "status": "operational",
        "milestones": ["M2.2-B (VRP Representation)", "M3 (Classical PSO)", "M4 (Quantum-Inspired QPSO)"],
        "supported_algorithms": ["pso", "qpso"],
        "objective_function": "Multi-objective composite cost: w_d * norm(dist) + w_t * norm(time) + w_c * norm(cong) + Penalties",
        "constraints_handled": ["Exactly-once coverage", "Vehicle payload capacity", "Time window arrivals", "Depot schedule flow"],
        "message": "Optimization solvers fully connected. Authentic metaheuristic trajectories computed without synthetic or pre-cooked outputs.",
    }


@router.post("/pso")
async def run_pso_endpoint(request: OptimizationRunRequest):
    """
    Executes Classical Discrete Particle Swarm Optimization (PSO) baseline.
    Uses swap sequence velocity updates and multi-vehicle partition adaptation.
    """
    try:
        problem = normalize_problem_definition(request)
        matrix_info = await vrp_service.build_cost_matrix(problem)

        objective = ObjectiveFunction(
            weight_distance=request.weight_distance,
            weight_travel_time=request.weight_travel_time,
            weight_congestion=request.weight_congestion,
        )

        # Baseline evaluation (Original Scenario order)
        before_metrics, _ = evaluate_initial_scenario_baseline(problem, matrix_info, objective)

        solver = PSOSolver(
            population_size=request.population_size,
            max_iterations=request.iterations,
            w=request.w,
            c1=request.c1,
            c2=request.c2,
            objective=objective,
            random_seed=request.random_seed,
        )

        result = solver.solve(problem, matrix_info)
        result["before_optimization"] = before_metrics
        result["comparison_before_after"] = compute_before_after_delta(
            before_metrics,
            result.get("total_distance_km", 0.0),
            result.get("total_travel_time_min", 0.0),
            result.get("best_fitness", 0.0),
        )

        if request.include_road_geometry and result.get("decoded_routes"):
            result["routes_with_geometry"] = await attach_road_geometries_to_routes(
                result["decoded_routes"], problem
            )

        # Persist run in SQLite database
        routes_to_persist = (
            result.get("routes_with_geometry")
            if result.get("routes_with_geometry")
            else [r.model_dump() for r in result.get("decoded_routes", [])]
        )
        run_id = record_optimization_run(
            scenario_id=problem.scenario_id,
            algorithm="pso",
            population_size=request.population_size,
            iterations=request.iterations,
            random_seed=request.random_seed,
            runtime_ms=result.get("execution_time_ms", 0.0),
            convergence_history=result.get("convergence_history", []),
            iteration_snapshots=result.get("iteration_snapshots", []),
            result_data=result,
            routes_data=routes_to_persist,
            before_data=before_metrics,
            delta_data=result.get("comparison_before_after"),
        )
        result["run_id"] = run_id
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Classical PSO execution error: {str(exc)}")


@router.post("/qpso")
async def run_qpso_endpoint(request: OptimizationRunRequest):
    """
    Executes Quantum-Behaved Particle Swarm Optimization (QPSO).
    Uses mean-best consensus (mbest), quantum delta potential attractor, and contraction-expansion dynamics.
    """
    try:
        problem = normalize_problem_definition(request)
        matrix_info = await vrp_service.build_cost_matrix(problem)

        objective = ObjectiveFunction(
            weight_distance=request.weight_distance,
            weight_travel_time=request.weight_travel_time,
            weight_congestion=request.weight_congestion,
        )

        # Baseline evaluation (Original Scenario order)
        before_metrics, _ = evaluate_initial_scenario_baseline(problem, matrix_info, objective)

        solver = QPSOSolver(
            population_size=request.population_size,
            max_iterations=request.iterations,
            alpha_start=request.alpha_start,
            alpha_end=request.alpha_end,
            objective=objective,
            random_seed=request.random_seed,
        )

        result = solver.solve(problem, matrix_info)
        result["before_optimization"] = before_metrics
        result["comparison_before_after"] = compute_before_after_delta(
            before_metrics,
            result.get("total_distance_km", 0.0),
            result.get("total_travel_time_min", 0.0),
            result.get("best_fitness", 0.0),
        )

        if request.include_road_geometry and result.get("decoded_routes"):
            result["routes_with_geometry"] = await attach_road_geometries_to_routes(
                result["decoded_routes"], problem
            )

        # Persist run in SQLite database
        routes_to_persist = (
            result.get("routes_with_geometry")
            if result.get("routes_with_geometry")
            else [r.model_dump() for r in result.get("decoded_routes", [])]
        )
        run_id = record_optimization_run(
            scenario_id=problem.scenario_id,
            algorithm="qpso",
            population_size=request.population_size,
            iterations=request.iterations,
            random_seed=request.random_seed,
            runtime_ms=result.get("execution_time_ms", 0.0),
            convergence_history=result.get("convergence_history", []),
            iteration_snapshots=result.get("iteration_snapshots", []),
            result_data=result,
            routes_data=routes_to_persist,
            before_data=before_metrics,
            delta_data=result.get("comparison_before_after"),
        )
        result["run_id"] = run_id
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quantum QPSO execution error: {str(exc)}")


@router.post("/run")
async def run_optimization_unified(request: OptimizationRunRequest):
    """
    Unified entry point for submitting optimization jobs.
    Directs to Classical PSO or Quantum QPSO based on the request's algorithm flag.
    """
    algo = (request.algorithm or "qpso").lower().strip()
    if algo == "pso":
        return await run_pso_endpoint(request)
    elif algo in ["qpso", "quantum", "quantum_pso"]:
        return await run_qpso_endpoint(request)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported algorithm '{request.algorithm}'. Choose 'pso' or 'qpso'.",
        )


@router.post("/compare")
async def run_optimization_comparison(request: OptimizationCompareRequest):
    """
    Executes both Classical PSO and Quantum QPSO on the EXACT SAME scenario and initial conditions.
    Provides verifiable, non-fabricated side-by-side benchmarking telemetry for SIH 2026.
    """
    try:
        problem = normalize_problem_definition(request)
        matrix_info = await vrp_service.build_cost_matrix(problem)

        objective = ObjectiveFunction(
            weight_distance=request.weight_distance,
            weight_travel_time=request.weight_travel_time,
            weight_congestion=request.weight_congestion,
        )

        # Baseline evaluation (Original Scenario order)
        before_metrics, _ = evaluate_initial_scenario_baseline(problem, matrix_info, objective)

        # 1. Run Classical PSO
        pso_solver = PSOSolver(
            population_size=request.population_size,
            max_iterations=request.iterations,
            objective=objective,
            random_seed=request.random_seed,
        )
        pso_result = pso_solver.solve(problem, matrix_info)

        # 2. Run Quantum QPSO
        qpso_solver = QPSOSolver(
            population_size=request.population_size,
            max_iterations=request.iterations,
            objective=objective,
            random_seed=request.random_seed,
        )
        qpso_result = qpso_solver.solve(problem, matrix_info)

        # 3. Optional Geometry Attachment for winning algorithm
        winner_algo = "qpso" if qpso_result["best_fitness"] <= pso_result["best_fitness"] else "pso"
        winner_routes = (
            qpso_result.get("decoded_routes")
            if winner_algo == "qpso"
            else pso_result.get("decoded_routes")
        )

        routes_with_geom = []
        if request.include_road_geometry and winner_routes:
            routes_with_geom = await attach_road_geometries_to_routes(winner_routes, problem)

        pso_routes_to_persist = (
            routes_with_geom if (winner_algo == "pso" and routes_with_geom)
            else [r.model_dump() for r in pso_result.get("decoded_routes", [])]
        )
        qpso_routes_to_persist = (
            routes_with_geom if (winner_algo == "qpso" and routes_with_geom)
            else [r.model_dump() for r in qpso_result.get("decoded_routes", [])]
        )

        pso_delta = compute_before_after_delta(
            before_metrics,
            pso_result["total_distance_km"],
            pso_result["total_travel_time_min"],
            pso_result["best_fitness"],
        )
        qpso_delta = compute_before_after_delta(
            before_metrics,
            qpso_result["total_distance_km"],
            qpso_result["total_travel_time_min"],
            qpso_result["best_fitness"],
        )

        # Persist both runs in database
        pso_run_id = record_optimization_run(
            scenario_id=problem.scenario_id,
            algorithm="pso",
            population_size=request.population_size,
            iterations=request.iterations,
            random_seed=request.random_seed,
            runtime_ms=pso_result.get("execution_time_ms", 0.0),
            convergence_history=pso_result.get("convergence_history", []),
            iteration_snapshots=pso_result.get("iteration_snapshots", []),
            result_data=pso_result,
            routes_data=pso_routes_to_persist,
            before_data=before_metrics,
            delta_data=pso_delta,
        )

        qpso_run_id = record_optimization_run(
            scenario_id=problem.scenario_id,
            algorithm="qpso",
            population_size=request.population_size,
            iterations=request.iterations,
            random_seed=request.random_seed,
            runtime_ms=qpso_result.get("execution_time_ms", 0.0),
            convergence_history=qpso_result.get("convergence_history", []),
            iteration_snapshots=qpso_result.get("iteration_snapshots", []),
            result_data=qpso_result,
            routes_data=qpso_routes_to_persist,
            before_data=before_metrics,
            delta_data=qpso_delta,
        )

        # 4. Comparative Differential Metrics
        fitness_diff = pso_result["best_fitness"] - qpso_result["best_fitness"]
        fitness_improvement_pct = (
            (fitness_diff / max(1e-6, pso_result["best_fitness"])) * 100.0
            if pso_result["best_fitness"] > 0
            else 0.0
        )

        time_diff_ms = pso_result["execution_time_ms"] - qpso_result["execution_time_ms"]

        return {
            "status": "success",
            "scenario_id": problem.scenario_id,
            "problem_size": {
                "customers": len(problem.customers),
                "vehicles": len(problem.vehicles),
            },
            "before_optimization": before_metrics,
            "pso": {
                "algorithm": "Classical PSO",
                "run_id": pso_run_id,
                "best_fitness": pso_result["best_fitness"],
                "total_distance_km": pso_result["total_distance_km"],
                "total_travel_time_min": pso_result["total_travel_time_min"],
                "execution_time_ms": pso_result["execution_time_ms"],
                "is_feasible": pso_result["is_feasible"],
                "convergence_history": pso_result["convergence_history"],
                "iteration_snapshots": pso_result.get("iteration_snapshots", []),
                "decoded_routes": pso_result["decoded_routes"],
                "comparison_before_after": pso_delta,
            },
            "qpso": {
                "algorithm": "Quantum-Inspired QPSO",
                "run_id": qpso_run_id,
                "best_fitness": qpso_result["best_fitness"],
                "total_distance_km": qpso_result["total_distance_km"],
                "total_travel_time_min": qpso_result["total_travel_time_min"],
                "execution_time_ms": qpso_result["execution_time_ms"],
                "is_feasible": qpso_result["is_feasible"],
                "convergence_history": qpso_result["convergence_history"],
                "iteration_snapshots": qpso_result.get("iteration_snapshots", []),
                "decoded_routes": qpso_result["decoded_routes"],
                "comparison_before_after": qpso_delta,
            },
            "comparison": {
                "winner": winner_algo.upper(),
                "fitness_improvement_absolute": round(fitness_diff, 2),
                "fitness_improvement_percent": round(fitness_improvement_pct, 2),
                "time_difference_ms": round(time_diff_ms, 2),
                "speedup_ratio": round(
                    pso_result["execution_time_ms"] / max(0.1, qpso_result["execution_time_ms"]), 2
                ),
            },
            "winning_routes_with_geometry": routes_with_geom,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Comparison execution error: {str(exc)}")


# =========================================================================
# Query Endpoints for Persisted Optimization Runs
# =========================================================================

@router.get("/runs")
def list_runs(limit: int = 20):
    """Returns a list of recent optimization runs for Analytics and History dashboards."""
    return {
        "status": "success",
        "runs": list_recent_optimization_runs(limit=limit),
    }


@router.get("/runs/{run_id}")
def get_run(run_id: str = Path(...)):
    """Retrieves full details, metrics, and routes of a persisted optimization run."""
    run = get_optimization_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Optimization run '{run_id}' not found.")
    return {
        "status": "success",
        "run": run,
    }


@router.get("/runs/{run_id}/history")
def get_run_history(run_id: str = Path(...)):
    """Returns the recorded convergence curve and iteration candidate snapshots for playback."""
    run = get_optimization_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Optimization run '{run_id}' not found.")
    return {
        "status": "success",
        "run_id": run_id,
        "algorithm": run["algorithm"],
        "convergence_history": run["convergence_history"],
        "iteration_snapshots": run["iteration_snapshots"],
    }


@router.get("/runs/{run_id}/routes")
def get_run_routes(run_id: str = Path(...)):
    """Returns the individual vehicle tours and road-following geometry of a persisted run."""
    run = get_optimization_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Optimization run '{run_id}' not found.")
    return {
        "status": "success",
        "run_id": run_id,
        "algorithm": run["algorithm"],
        "routes": run["routes"],
    }
