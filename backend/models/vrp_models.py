"""
VRP Domain Models and Data Contracts for IROS (Intelligent Route Optimization System).
Milestone 2.2-B: Cost Matrix + Discrete VRP Representation.

Establishes:
1. Customer and Vehicle entities with capacity, demand, and time windows.
2. Discrete multi-vehicle partitioned tour representations.
3. Candidate route decoding and timeline scheduling.
4. Constraint verification (coverage, capacity, time windows, depot flow).
5. Multi-objective fitness evaluation foundation (raw metrics vs penalty costs).
6. Strict data provenance tracking across all properties.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class DataProvenance(BaseModel):
    """
    Transparent tracking of data provenance for hackathon integrity.
    Prevents fabricated claims and clarifies data sources.
    """
    coordinates: str = Field(default="user/dataset", description="Origin of latitude/longitude coordinates")
    road_distance: str = Field(default="OSRM", description="Routing engine source for physical road distance")
    road_duration: str = Field(default="OSRM", description="Routing engine source for travel durations")
    demand: str = Field(default="dataset/user", description="Origin of payload demand values")
    vehicle_capacity: str = Field(default="scenario/user", description="Fleet vehicle capacity specification")
    time_windows: str = Field(default="dataset/user", description="Service delivery time window bounds")
    service_duration: str = Field(default="configurable_default", description="Handling service duration at stops")
    congestion: str = Field(default="M5_simulated_pending", description="Traffic congestion status (M5 milestone)")
    fitness: str = Field(default="IROS_calculation", description="Engine computing composite solution fitness")


class VRPCustomer(BaseModel):
    """
    Delivery destination with payload demand, delivery time window, and handling service duration.
    """
    id: str = Field(..., description="Unique customer identifier (e.g. CUST-001)")
    name: str = Field(..., description="Destination label or customer address")
    lat: float = Field(..., description="Latitude coordinate in decimal degrees")
    lng: float = Field(..., description="Longitude coordinate in decimal degrees")
    demand: float = Field(default=15.0, ge=0.0, description="Payload parcel demand (units or kg)")
    earliest_arrival: Optional[str] = Field(default="09:00", description="Time window opening in HH:MM format")
    latest_arrival: Optional[str] = Field(default="18:00", description="Time window closing in HH:MM format")
    service_duration_s: float = Field(
        default=300.0,
        ge=0.0,
        description="Handling service time at stop in seconds (configurable default: 300s / 5 min)"
    )


class VRPVehicle(BaseModel):
    """
    Fleet vehicle with classification, payload capacity limit, and speed characteristics.
    """
    id: str = Field(..., description="Unique vehicle fleet identifier (e.g. VEH-01)")
    name: str = Field(..., description="Descriptive vehicle name")
    type: str = Field(default="van", description="Vehicle classification: 'bike', 'van', 'truck'")
    capacity: float = Field(default=100.0, gt=0.0, description="Maximum cargo payload units")
    speed_factor: float = Field(default=1.0, gt=0.0, description="Speed scaling factor relative to baseline")
    max_travel_time_s: Optional[float] = Field(default=None, description="Maximum route duration / driver shift limit")


class VRPDepot(BaseModel):
    """
    Central logistics hub from which vehicle fleets depart and return.
    """
    id: str = Field(default="DEPOT-001", description="Depot hub identifier")
    name: str = Field(default="Ashram Road Central Distribution Hub", description="Depot facility label")
    lat: float = Field(..., description="Latitude in decimal degrees")
    lng: float = Field(..., description="Longitude in decimal degrees")
    opening_time: str = Field(default="08:00", description="Hub dispatch operations start time (HH:MM)")
    closing_time: str = Field(default="20:00", description="Hub dispatch operations cutoff time (HH:MM)")


class VRPProblemDefinition(BaseModel):
    """
    Complete Capacitated Vehicle Routing Problem with Time Windows (CVRP-TW) definition.
    """
    scenario_id: Optional[str] = Field(default="custom-scenario", description="Scenario identifier")
    depot: VRPDepot = Field(..., description="Central logistics depot")
    customers: List[VRPCustomer] = Field(default_factory=list, description="Target customer delivery stops")
    vehicles: List[VRPVehicle] = Field(default_factory=list, description="Assigned fleet vehicles")
    round_trip: bool = Field(default=True, description="Whether vehicles return to depot (Depot -> Stops -> Depot)")
    default_service_duration_s: float = Field(
        default=300.0,
        description="Global fallback service handling duration if not specified on customer"
    )


class StopSchedule(BaseModel):
    """
    Timeline schedule for a single stop along a vehicle's decoded route.
    """
    stop_id: str
    stop_name: str
    arrival_time_s: float = Field(..., description="Elapsed seconds from day start (e.g., 08:00 = 28800s)")
    arrival_clock: str = Field(..., description="Formatted clock time (HH:MM:SS)")
    wait_time_s: float = Field(default=0.0, description="Idle wait time if vehicle arrived before earliest arrival")
    service_start_s: float = Field(..., description="Time service begins")
    service_duration_s: float = Field(default=0.0, description="Service handling time")
    departure_time_s: float = Field(..., description="Time vehicle departs stop")
    departure_clock: str = Field(..., description="Formatted departure clock time")
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    lateness_s: float = Field(default=0.0, description="Seconds arrived past the latest arrival cutoff")
    is_late: bool = Field(default=False, description="True if arrival_time_s > latest_arrival")


class VehicleRoute(BaseModel):
    """
    Decoded route itinerary for an individual fleet vehicle.
    """
    vehicle_id: str
    vehicle_name: str
    vehicle_type: str
    capacity_limit: float
    stops: List[str] = Field(default_factory=list, description="Ordered customer stop IDs visited")
    full_sequence: List[str] = Field(default_factory=list, description="Full sequence including depot start/end")
    distance_m: float = Field(default=0.0, description="Total road distance traveled in meters")
    distance_km: float = Field(default=0.0, description="Total road distance traveled in kilometers")
    travel_time_s: float = Field(default=0.0, description="Pure transit duration in seconds")
    total_duration_s: float = Field(default=0.0, description="Total route duration including wait & service time")
    total_duration_min: float = Field(default=0.0, description="Total route duration in minutes")
    total_demand_loaded: float = Field(default=0.0, description="Cumulative parcel demand loaded onto vehicle")
    capacity_exceeded: float = Field(default=0.0, description="Demand exceeding vehicle capacity (0 = feasible)")
    time_window_delays_s: float = Field(default=0.0, description="Cumulative lateness penalties in seconds")
    is_capacity_feasible: bool = Field(default=True, description="True if total_demand <= capacity_limit")
    is_time_window_feasible: bool = Field(default=True, description="True if zero lateness occurred")
    is_feasible: bool = Field(default=True, description="True if both capacity and time windows are satisfied")
    schedule: List[StopSchedule] = Field(default_factory=list, description="Chronological schedule at each stop")


class VRPSolution(BaseModel):
    """
    Decoded and evaluated multi-vehicle candidate solution.
    Represents the combinatorial discrete state of the VRP before PSO/QPSO search.
    """
    scenario_id: Optional[str] = None
    routes: List[VehicleRoute] = Field(default_factory=list, description="Itineraries for each active vehicle")
    total_fleet_distance_km: float = Field(default=0.0, description="Sum of all vehicle road distances (km)")
    total_fleet_travel_time_min: float = Field(default=0.0, description="Sum of transit times across fleet (min)")
    total_fleet_duration_min: float = Field(default=0.0, description="Total operational duration across fleet (min)")
    total_capacity_violations: float = Field(default=0.0, description="Total excess demand across all vehicles")
    total_time_window_violations_min: float = Field(default=0.0, description="Total lateness across all stops (min)")
    unassigned_customers: List[str] = Field(default_factory=list, description="Customers omitted from candidate routes")
    duplicate_customers: List[str] = Field(default_factory=list, description="Customers erroneously visited >1 time")
    is_coverage_feasible: bool = Field(default=True, description="True if every customer visited exactly once")
    is_capacity_feasible: bool = Field(default=True, description="True if no vehicle exceeds payload capacity")
    is_time_window_feasible: bool = Field(default=True, description="True if all time windows are met")
    is_overall_feasible: bool = Field(default=True, description="True if all constraints are satisfied")
    fitness_cost: float = Field(default=0.0, description="Composite objective score (Lower is better)")
    fitness_breakdown: Dict[str, float] = Field(default_factory=dict, description="Transparent score breakdown")
    provenance: DataProvenance = Field(default_factory=DataProvenance)


class VRPMatrixInfo(BaseModel):
    """
    Cost matrix metadata and provenance.
    Preserves directional asymmetry (D[i][j] != D[j][i]).
    """
    provider: str = Field(default="OSRM", description="Routing provider used")
    is_fallback: bool = Field(default=False, description="True if geodesic fallback was used due to network outage")
    location_count: int
    location_ids: List[str]
    location_names: List[str]
    distances_matrix_m: List[List[float]] = Field(..., description="Directional distance matrix (meters)")
    durations_matrix_s: List[List[float]] = Field(..., description="Directional travel duration matrix (seconds)")
    is_asymmetric: bool = Field(default=True, description="Preserves genuine directional cost asymmetry")
    provenance: DataProvenance = Field(default_factory=DataProvenance)


# =========================================================================
# API Request / Response Envelopes
# =========================================================================

class VRPDecodeRequest(BaseModel):
    """
    Request to decode and schedule a candidate discrete VRP assignment.
    candidate_partitions: e.g. [["CUST-001", "CUST-003"], ["CUST-002", "CUST-004"]]
    """
    problem: VRPProblemDefinition
    candidate_partitions: List[List[str]] = Field(
        ...,
        description="Discrete customer assignment per vehicle: [[stop_id, ...], [stop_id, ...]]"
    )


class VRPEvaluateRequest(BaseModel):
    """
    Request to evaluate candidate VRP assignment constraints and calculate fitness score.
    """
    problem: VRPProblemDefinition
    candidate_partitions: List[List[str]] = Field(
        ...,
        description="Discrete customer assignment per vehicle"
    )
    weight_distance: float = Field(default=0.4, ge=0.0, le=1.0)
    weight_time: float = Field(default=0.4, ge=0.0, le=1.0)
    weight_congestion: float = Field(default=0.2, ge=0.0, le=1.0)
    penalty_capacity: float = Field(default=100.0, ge=0.0, description="Cost penalty multiplier per unit of excess demand")
    penalty_time_window: float = Field(default=10.0, ge=0.0, description="Cost penalty multiplier per minute of lateness")
    penalty_coverage: float = Field(default=500.0, ge=0.0, description="Cost penalty per omitted/duplicate customer")


class VRPDecodeResponse(BaseModel):
    status: str = "success"
    solution: VRPSolution
    matrix_provider: str
    is_fallback_matrix: bool = False
    message: Optional[str] = None


class VRPEvaluateResponse(BaseModel):
    status: str = "success"
    is_feasible: bool
    fitness_cost: float
    fitness_breakdown: Dict[str, float]
    solution: VRPSolution
    message: Optional[str] = None
