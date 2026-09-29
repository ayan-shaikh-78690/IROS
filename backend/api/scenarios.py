"""
Scenarios API Router for IROS (Intelligent Route Optimization System).
Milestone M2.3: Single Source of Truth + Persistent Storage.

Endpoints:
- GET /api/scenarios: List all persistent scenarios.
- POST /api/scenarios: Create or clone a scenario.
- GET /api/scenarios/{id}: Retrieve scenario details, fleet, customer stops, and latest optimization run.
- PUT /api/scenarios/{id}: Update scenario stops, depot, and vehicle fleet.
- DELETE /api/scenarios/{id}: Delete scenario.
- POST /api/scenarios/{id}/baseline: Calculate and persist the unoptimized initial scenario baseline.
- GET /api/scenarios/{id}/latest-run: Retrieve the latest optimization run for this scenario.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

from data.database import (
    get_all_scenarios,
    get_scenario_by_id,
    save_or_update_scenario,
    delete_scenario,
    record_optimization_run,
    get_latest_optimization_run,
)
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

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


class ScenarioPayload(BaseModel):
    id: Optional[str] = None
    name: str = Field(default="Custom Scenario")
    region: Optional[str] = Field(default="Ahmedabad–Gandhinagar, Gujarat, India")
    city: Optional[str] = Field(default="Ahmedabad–Gandhinagar, Gujarat")
    depot: Dict[str, Any]
    customers: List[Dict[str, Any]] = Field(default_factory=list)
    vehicles: Optional[List[Dict[str, Any]]] = None
    numVehicles: Optional[int] = Field(default=3)
    num_vehicles: Optional[int] = None
    vehicleCapacity: Optional[float] = Field(default=120.0)
    vehicle_capacity: Optional[float] = None
    vehicleType: Optional[str] = Field(default="van")
    vehicle_type: Optional[str] = None
    round_trip: Optional[bool] = Field(default=True)
    isRoundTrip: Optional[bool] = None
    weights: Optional[Dict[str, float]] = None


@router.get("", include_in_schema=False)
@router.get("/")
def list_scenarios():
    """Returns a list of all persistent scenarios with fleet and stop counts."""
    try:
        scenarios = get_all_scenarios()
        return {
            "status": "success",
            "count": len(scenarios),
            "scenarios": scenarios,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scenarios: {str(exc)}")


@router.post("", include_in_schema=False)
@router.post("/")
def create_scenario(payload: ScenarioPayload):
    """Creates a new persistent scenario with fleet vehicles and customer stops."""
    try:
        data = payload.model_dump()
        saved = save_or_update_scenario(data)
        return {
            "status": "success",
            "message": "Scenario created successfully",
            "scenario": saved,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create scenario: {str(exc)}")


@router.get("/{scenario_id}")
def get_scenario(scenario_id: str = Path(..., description="Unique scenario ID")):
    """Retrieves full scenario details, including customer stops, fleet, and latest run."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return {
        "status": "success",
        "scenario": scenario,
    }


@router.put("/{scenario_id}")
def update_scenario_endpoint(payload: ScenarioPayload, scenario_id: str = Path(...)):
    """Updates an existing scenario with updated fleet, depot, and customer stops."""
    try:
        data = payload.model_dump()
        data["id"] = scenario_id
        saved = save_or_update_scenario(data)
        return {
            "status": "success",
            "message": "Scenario updated successfully",
            "scenario": saved,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update scenario: {str(exc)}")


@router.delete("/{scenario_id}")
def delete_scenario_endpoint(scenario_id: str = Path(...)):
    """Deletes a scenario and all associated runs and routes."""
    success = delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return {
        "status": "success",
        "message": f"Scenario '{scenario_id}' deleted successfully.",
    }


@router.get("/{scenario_id}/latest-run")
def get_scenario_latest_run(scenario_id: str = Path(...)):
    """Fetches the latest optimization run, metrics, and road routes for this scenario."""
    run = get_latest_optimization_run(scenario_id)
    if not run:
        return {
            "status": "none",
            "message": "No optimization runs found for this scenario yet.",
            "run": None,
        }
    return {
        "status": "success",
        "run": run,
    }


@router.post("/{scenario_id}/baseline")
async def calculate_scenario_baseline(scenario_id: str = Path(...)):
    """
    Calculates and persists the unoptimized initial scenario baseline:
    - Original customer sequential order partitioned round-robin across fleet
    - Road distances and travel times via OSRM
    - Capacity and time-window feasibility evaluations
    - Real road-following GeoJSON coordinates
    """
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")

    if not scenario.get("customers"):
        raise HTTPException(status_code=400, detail="Scenario has no delivery stops.")

    # Convert to VRPProblemDefinition
    depot_raw = scenario["depot"]
    depot = VRPDepot(
        id=depot_raw.get("id", "DEPOT-001"),
        name=depot_raw.get("name", "Central Fleet Depot"),
        lat=float(depot_raw["lat"]),
        lng=float(depot_raw["lng"]),
        opening_time="08:00",
        closing_time="20:00",
    )

    customers: List[VRPCustomer] = [
        VRPCustomer(
            id=c["id"],
            name=c.get("name") or c["id"],
            lat=float(c["lat"]),
            lng=float(c["lng"]),
            demand=float(c.get("demand", 15.0)),
            earliest_arrival=c.get("earliest_arrival") or c.get("earliestArrival") or "09:00",
            latest_arrival=c.get("latest_arrival") or c.get("latestArrival") or "18:00",
            service_duration_s=float(c.get("service_duration_s") or c.get("serviceDurationS") or 300.0),
        )
        for c in scenario["customers"]
    ]

    vehicles_raw = scenario.get("vehicles", [])
    if not vehicles_raw:
        num_v = int(scenario.get("numVehicles", 3))
        cap = float(scenario.get("vehicleCapacity", 120.0))
        vtype = scenario.get("vehicleType", "van")
        vehicles = [
            VRPVehicle(id=f"VEH-{i+1:02d}", name=f"Fleet {vtype.upper()} {i+1}", type=vtype, capacity=cap, speed_factor=1.0)
            for i in range(num_v)
        ]
    else:
        vehicles = [
            VRPVehicle(
                id=v["id"],
                name=v.get("name") or v["id"],
                type=v.get("vehicle_type", "van"),
                capacity=float(v.get("capacity", 120.0)),
                speed_factor=float(v.get("speed_factor", 1.0)),
            )
            for v in vehicles_raw
        ]

    problem = VRPProblemDefinition(
        scenario_id=scenario_id,
        depot=depot,
        customers=customers,
        vehicles=vehicles,
        round_trip=bool(scenario.get("round_trip", True)),
        default_service_duration_s=300.0,
    )

    matrix_info = await vrp_service.build_cost_matrix(problem)

    objective = ObjectiveFunction(
        weight_distance=scenario["weights"]["w_distance"],
        weight_travel_time=scenario["weights"]["w_travel_time"],
        weight_congestion=scenario["weights"]["w_congestion"],
    )

    # Initial partition (round-robin sequential order)
    num_v = max(1, len(problem.vehicles))
    initial_partitions: List[List[str]] = [[] for _ in range(num_v)]
    for idx, cust in enumerate(problem.customers):
        initial_partitions[idx % num_v].append(cust.id)

    init_fitness, init_breakdown, init_c_res, init_routes = objective.evaluate(
        initial_partitions, problem, matrix_info
    )

    # Attach OSRM road geometry to each non-empty vehicle tour
    customer_map = {c.id: c for c in problem.customers}
    enriched_routes: List[Dict[str, Any]] = []

    for r in init_routes:
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
            scenario_id=f"baseline-{r.vehicle_id}",
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

    baseline_metrics = {
        "order_type": "Original Scenario Dispatch Order",
        "fitness": init_fitness,
        "total_distance_km": init_breakdown.get("raw_metrics", {}).get("distance_km", 0.0),
        "total_travel_time_min": init_breakdown.get("raw_metrics", {}).get("total_duration_min", 0.0),
        "congestion_cost": init_breakdown.get("raw_metrics", {}).get("congestion_cost", 0.0),
        "is_feasible": init_breakdown.get("is_feasible", False),
        "capacity_violation": init_breakdown.get("raw_metrics", {}).get("capacity_violation", 0.0),
        "time_window_violation": init_breakdown.get("raw_metrics", {}).get("time_window_violation", 0.0),
        "routes": enriched_routes,
    }

    # Persist baseline run in database
    run_id = record_optimization_run(
        scenario_id=scenario_id,
        algorithm="baseline",
        population_size=1,
        iterations=0,
        random_seed=42,
        runtime_ms=10.0,
        convergence_history=[init_fitness],
        iteration_snapshots=[{"iteration": 0, "fitness": init_fitness, "partitions": initial_partitions}],
        result_data={
            "best_fitness": init_fitness,
            "total_distance_km": baseline_metrics["total_distance_km"],
            "total_travel_time_min": baseline_metrics["total_travel_time_min"],
            "is_feasible": baseline_metrics["is_feasible"],
            "fitness_breakdown": init_breakdown,
        },
        routes_data=enriched_routes,
        before_data=baseline_metrics,
        delta_data={"distance_saved_km": 0.0, "time_saved_min": 0.0, "fitness_improvement": 0.0},
    )

    baseline_metrics["run_id"] = run_id
    return {
        "status": "success",
        "scenario_id": scenario_id,
        "baseline": baseline_metrics,
    }
