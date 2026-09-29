from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    TransportationGraph,
    WeightedCostFormula,
    RouteRequest,
    RouteResponse,
    MatrixRequest,
    MatrixResponse,
)
from services.route_service import routing_service

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("/")
def get_routes_info():
    """
    Route Service Interface.
    Milestone 2.2-A: Real Road Routing Engine (OSRM OpenStreetMap Integration).
    """
    return {
        "status": "operational",
        "milestone": "Milestone 2.2-A",
        "provider": routing_service.provider,
        "base_url": routing_service.base_url,
        "message": "Real road-following routing engine active using OpenStreetMap via OSRM."
    }

@router.post("/calculate", response_model=RouteResponse)
async def calculate_route(request: RouteRequest):
    """
    Calculate real road-following route for the given scenario sequence:
    Depot -> Stop 1 -> Stop 2 -> ... -> Depot (if round_trip).
    Returns real road geometry, road distance, travel duration, routing weight, and legs.
    """
    try:
        response = await routing_service.calculate_road_route(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to calculate road route right now: {str(exc)}"
        )

@router.post("/matrix", response_model=MatrixResponse)
async def calculate_matrix(request: MatrixRequest):
    """
    Calculate pairwise distance (meters) and travel duration (seconds) matrices
    between all locations (Depot + Delivery Stops).
    Foundation for discrete VRP and metaheuristic optimization (PSO / QPSO).
    """
    try:
        response = await routing_service.calculate_cost_matrix(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to calculate cost matrix right now: {str(exc)}"
        )

@router.get("/graph-schema", response_model=TransportationGraph)
def get_graph_schema():
    """
    Returns the transportation network graph G = (V, E) schema and multi-objective cost specification.
    """
    default_graph = TransportationGraph(
        city="Ahmedabad–Gandhinagar, Gujarat",
        nodes=[],
        edges=[],
        cost_formula=WeightedCostFormula(
            w_time=0.4,
            w_distance=0.4,
            w_congestion=0.2,
            formulation="Weight = w_time * norm_time + w_distance * norm_distance + w_congestion * norm_congestion"
        ),
        status="schema_ready",
        routing_metrics_status="Routing metrics will be calculated in M2.2"
    )
    return default_graph
