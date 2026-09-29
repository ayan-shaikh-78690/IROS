"""
Pydantic Schemas for VEDIORA API.
These schemas define data contracts for Milestone 1 and prepare interfaces for future milestones.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Health Check
class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Service health status")
    service: str = Field(default="vediora-backend", description="Service identifier")


# Scenario Models (Future-Ready M2 Data Models)
class Location(BaseModel):
    id: str = Field(..., description="Unique location identifier")
    latitude: float = Field(..., description="Latitude coordinate in decimal degrees")
    longitude: float = Field(..., description="Longitude coordinate in decimal degrees")
    type: str = Field(default="delivery_stop", description="Location category: 'depot' or 'delivery_stop'")
    name: str = Field(..., description="Human-readable label or destination name")
    demand: Optional[float] = Field(default=0.0, ge=0.0, description="Payload parcel demand")
    earliest_arrival: Optional[str] = Field(default="09:00", description="Time window start")
    latest_arrival: Optional[str] = Field(default="18:00", description="Time window end")


class Vehicle(BaseModel):
    id: str = Field(..., description="Vehicle fleet identifier")
    type: str = Field(default="van", description="Vehicle classification: 'van', 'bike', 'truck'")
    capacity: float = Field(default=100.0, gt=0.0, description="Maximum cargo payload units")


class Scenario(BaseModel):
    id: str = Field(..., description="Unique scenario identifier")
    name: str = Field(..., description="Scenario descriptive name")
    city: str = Field(default="Ahmedabad–Gandhinagar, Gujarat", description="Target city region")
    depot: Location = Field(..., description="Central depot starting and ending location")
    delivery_stops: List[Location] = Field(default_factory=list, description="Ordered customer delivery stops")
    vehicles: List[Vehicle] = Field(default_factory=list, description="Fleet vehicles assigned")


class LocationPoint(BaseModel):
    id: Optional[str] = Field(default=None, description="Unique identifier (e.g. DEPOT-001 or CUST-001)")
    lat: float = Field(..., description="Latitude in decimal degrees")
    lng: float = Field(..., description="Longitude in decimal degrees")
    name: Optional[str] = Field(default=None, description="Optional label or address")


class CustomerNode(LocationPoint):
    customer_id: str = Field(..., description="Unique customer identifier")
    demand: float = Field(default=1.0, ge=0.0, description="Payload demand requirement")
    earliest_arrival: Optional[str] = Field(default=None, description="Time window start (e.g. '09:00')")
    latest_arrival: Optional[str] = Field(default=None, description="Time window end (e.g. '17:00')")


class OptimizationWeights(BaseModel):
    distance: float = Field(default=0.4, ge=0.0, description="Weight for path distance")
    travel_time: float = Field(default=0.4, ge=0.0, description="Weight for travel duration")
    congestion: float = Field(default=0.2, ge=0.0, description="Weight for traffic congestion factor")


class ScenarioConfig(BaseModel):
    name: str = Field(..., description="Scenario descriptive name")
    region: str = Field(..., description="Geographic bounding region or city name")
    num_vehicles: int = Field(default=3, gt=0, description="Fleet vehicle count")
    vehicle_capacity: float = Field(default=100.0, gt=0.0, description="Uniform vehicle capacity")
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)
    depot: Optional[LocationPoint] = Field(default=None, description="Primary depot location")
    customers: List[CustomerNode] = Field(default_factory=list, description="List of target customers")


# Optimization Models (Interface contracts for Milestone 4)
class OptimizationJobRequest(BaseModel):
    scenario: ScenarioConfig
    algorithm: str = Field(..., description="Algorithm to run: 'pso' or 'qpso'")
    population_size: int = Field(default=50, gt=0, description="Swarm particle population")
    iterations: int = Field(default=100, gt=0, description="Maximum iterations")
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)


class OptimizationRouteSegment(BaseModel):
    vehicle_id: int
    stops: List[str]
    segment_distance_km: float
    segment_travel_time_min: float


class OptimizationJobResponse(BaseModel):
    """
    Contract for optimization result.
    NOTE: Real values will be populated in Milestone 4 when PSO/QPSO engines are implemented.
    """
    job_id: str
    status: str
    algorithm: str
    best_objective_cost: Optional[float] = None
    total_distance_km: Optional[float] = None
    total_travel_time_min: Optional[float] = None
    congestion_index: Optional[float] = None
    runtime_seconds: Optional[float] = None
    iterations_completed: Optional[int] = None
    routes: List[OptimizationRouteSegment] = Field(default_factory=list)
    convergence_history: List[float] = Field(default_factory=list)


# =========================================================================
# Weighted Transportation Graph Schemas (M2.1.5 Foundation for M2.2)
# Graph G = (V, E) where V = intersections, E = road segments
# =========================================================================

class RoadIntersectionNode(BaseModel):
    """
    Transportation network node V representing an OSM intersection or delivery endpoint.
    """
    id: str = Field(..., description="Unique intersection/node identifier")
    latitude: float = Field(..., description="Latitude in decimal degrees")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    name: Optional[str] = Field(default=None, description="Intersection street label or junction name")


class WeightedRoadEdge(BaseModel):
    """
    Conceptual road-network edge E in G = (V, E).
    Represents an authentic road segment with multi-component weights.
    """
    id: str = Field(..., description="Unique edge identifier")
    from_node: str = Field(..., description="Origin node identifier")
    to_node: str = Field(..., description="Destination node identifier")
    distance_m: float = Field(..., ge=0.0, description="Road segment physical distance in meters")
    travel_time_s: float = Field(..., ge=0.0, description="Estimated traversal duration in seconds")
    speed_kmh: float = Field(default=40.0, gt=0.0, description="Operating speed limit in km/h")
    congestion_factor: float = Field(default=1.0, ge=1.0, description="Traffic congestion multiplier (1.0 = free flow)")
    weight: Optional[float] = Field(
        default=None,
        description="Composite cost: w_time * norm(time) + w_dist * norm(dist) + w_cong * norm(cong)"
    )


class WeightedCostFormula(BaseModel):
    """
    Multi-objective cost formulation parameters for edge evaluation.
    """
    w_time: float = Field(default=0.4, ge=0.0, le=1.0, description="Travel time weight factor")
    w_distance: float = Field(default=0.4, ge=0.0, le=1.0, description="Distance weight factor")
    w_congestion: float = Field(default=0.2, ge=0.0, le=1.0, description="Traffic congestion weight factor")
    formulation: str = Field(
        default="Weight = w_time * norm_time + w_distance * norm_distance + w_congestion * norm_congestion",
        description="Mathematical cost formula"
    )


class TransportationGraph(BaseModel):
    """
    Weighted Transportation Graph G = (V, E)
    Foundation for M2.2 routing engine and M3/M4 QPSO optimization.
    """
    city: str = Field(default="Ahmedabad–Gandhinagar, Gujarat", description="Target metropolitan road network")
    nodes: List[RoadIntersectionNode] = Field(default_factory=list, description="Intersection vertices V")
    edges: List[WeightedRoadEdge] = Field(default_factory=list, description="Weighted road segments E")
    cost_formula: WeightedCostFormula = Field(default_factory=WeightedCostFormula)
    status: str = Field(default="schema_ready", description="Graph readiness state")
    routing_metrics_status: str = Field(
        default="Routing metrics will be calculated in M2.2",
        description="Engine status message"
    )


# =========================================================================
# Real Road Routing Engine Schemas (M2.2-A)
# OpenStreetMap / OSRM Provider Integration
# =========================================================================

class RouteLeg(BaseModel):
    """
    Individual road leg between two consecutive locations in the dispatch sequence.
    """
    from_location_id: str = Field(..., description="Origin location identifier")
    to_location_id: str = Field(..., description="Destination location identifier")
    from_name: Optional[str] = Field(default=None, description="Origin label")
    to_name: Optional[str] = Field(default=None, description="Destination label")
    distance_m: float = Field(..., ge=0.0, description="Leg road distance in meters")
    duration_s: float = Field(..., ge=0.0, description="Leg travel time in seconds")
    routing_weight: float = Field(default=0.0, description="Engine routing weight")
    geometry: Optional[Dict[str, Any]] = Field(default=None, description="GeoJSON LineString geometry for leg")


class RouteGeometry(BaseModel):
    """
    GeoJSON LineString road geometry following actual streets.
    """
    type: str = Field(default="LineString", description="GeoJSON type")
    coordinates: List[List[float]] = Field(
        ...,
        description="List of [longitude, latitude] coordinate pairs along real roads"
    )


class RouteRequest(BaseModel):
    """
    Road route calculation request for the current scenario dispatch sequence.
    """
    scenario_id: Optional[str] = Field(default=None, description="Optional scenario ID")
    depot: LocationPoint = Field(..., description="Central fleet depot")
    delivery_stops: List[LocationPoint] = Field(default_factory=list, description="Ordered delivery stops")
    round_trip: bool = Field(default=True, description="Whether route returns to depot (Depot -> Stops -> Depot)")


class RouteResponse(BaseModel):
    """
    Calculated road-following route from the routing engine.
    """
    status: str = Field(default="success", description="Routing status: 'success' or 'error'")
    provider: str = Field(default="OSRM", description="Routing engine provider (e.g. OSRM, local)")
    scenario_id: Optional[str] = Field(default=None, description="Associated scenario ID")
    round_trip: bool = Field(default=True, description="Whether route returns to depot")
    total_distance_m: float = Field(..., description="Total road distance in meters")
    total_distance_km: float = Field(..., description="Total road distance in kilometers")
    total_duration_s: float = Field(..., description="Total travel time in seconds")
    total_duration_min: float = Field(..., description="Total travel time in minutes")
    routing_weight: float = Field(default=0.0, description="OSRM routing engine weight")
    num_stops: int = Field(..., description="Number of delivery stops included")
    sequence: List[str] = Field(default_factory=list, description="Sequence of location labels/IDs")
    geometry: RouteGeometry = Field(..., description="Complete road-following geometry")
    legs: List[RouteLeg] = Field(default_factory=list, description="Multi-leg route segments")
    message: Optional[str] = Field(default=None, description="Status or error message")


class MatrixRequest(BaseModel):
    """
    Cost matrix request between all locations (Depot + Delivery Stops).
    Foundation for discrete VRP representation and PSO/QPSO solver in M2.2-B / M3.
    """
    locations: List[LocationPoint] = Field(..., description="List of locations (Depot + Stops)")


class MatrixResponse(BaseModel):
    """
    Pairwise distance and travel duration matrices for all locations.
    """
    status: str = Field(default="success", description="Calculation status")
    provider: str = Field(default="OSRM", description="Routing matrix provider")
    location_count: int = Field(..., description="Number of locations in matrix")
    location_ids: List[str] = Field(default_factory=list, description="Ordered location IDs")
    location_names: List[str] = Field(default_factory=list, description="Ordered location names")
    distances_matrix_m: List[List[float]] = Field(
        ...,
        description="distance(i, j) matrix in meters between all location pairs"
    )
    durations_matrix_s: List[List[float]] = Field(
        ...,
        description="duration(i, j) matrix in seconds between all location pairs"
    )
    matrix_units: Dict[str, str] = Field(
        default_factory=lambda: {"distances": "meters", "durations": "seconds"}
    )
    message: Optional[str] = Field(default=None, description="Status info")

