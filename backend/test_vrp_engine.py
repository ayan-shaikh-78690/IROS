"""
Comprehensive Test Suite for IROS Discrete VRP Engine (Milestone 2.2-B).
Validates:
1. Matrix Indexing & Diagonal Correctness (D[i][i] == 0)
2. Directional / Asymmetric Road Cost Preservation (D[i][j] != D[j][i] on urban networks)
3. Non-Silent Fallback Differentiation (OSRM vs GeometricFallback)
4. Multi-Vehicle Discrete Partition Route Decoding
5. Capacity Constraint Checking (Excess demand detection)
6. Time Window Compliance & Lateness Calculation
7. Coverage & Duplicate Stop Constraint Checking
8. Multi-Objective Fitness Calculation & Penalty Breakdown
9. Data Provenance Integrity
"""

import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.vrp_models import (
    VRPCustomer,
    VRPVehicle,
    VRPDepot,
    VRPProblemDefinition,
    VRPMatrixInfo,
    DataProvenance,
)
from services.vrp_service import vrp_service, parse_clock_to_seconds, format_seconds_to_clock


def create_sample_ahmedabad_problem() -> VRPProblemDefinition:
    """Creates standard Ahmedabad 5-stop problem definition."""
    depot = VRPDepot(
        id="DEPOT-001",
        name="Ashram Road Central Distribution Hub",
        lat=23.0338,
        lng=72.5850,
        opening_time="08:00",
        closing_time="20:00",
    )

    customers = [
        VRPCustomer(
            id="CUST-001",
            name="Navrangpura Commercial Hub",
            lat=23.0365,
            lng=72.5611,
            demand=25.0,
            earliest_arrival="08:30",
            latest_arrival="10:30",
            service_duration_s=300.0,
        ),
        VRPCustomer(
            id="CUST-002",
            name="C.G. Road Retail District",
            lat=23.0289,
            lng=72.5564,
            demand=40.0,
            earliest_arrival="09:00",
            latest_arrival="11:30",
            service_duration_s=300.0,
        ),
        VRPCustomer(
            id="CUST-003",
            name="Paldi Distribution Point",
            lat=23.0134,
            lng=72.5629,
            demand=35.0,
            earliest_arrival="09:30",
            latest_arrival="12:00",
            service_duration_s=300.0,
        ),
        VRPCustomer(
            id="CUST-004",
            name="Sabarmati Riverfront Walk",
            lat=23.0450,
            lng=72.5780,
            demand=20.0,
            earliest_arrival="10:00",
            latest_arrival="13:00",
            service_duration_s=300.0,
        ),
        VRPCustomer(
            id="CUST-005",
            name="Maninagar Railway Cargo",
            lat=22.9980,
            lng=72.6020,
            demand=30.0,
            earliest_arrival="10:30",
            latest_arrival="14:00",
            service_duration_s=300.0,
        ),
    ]

    vehicles = [
        VRPVehicle(
            id="VEH-01",
            name="EV Van 1",
            type="van",
            capacity=80.0,
            speed_factor=1.0,
        ),
        VRPVehicle(
            id="VEH-02",
            name="EV Van 2",
            type="van",
            capacity=80.0,
            speed_factor=1.0,
        ),
    ]

    return VRPProblemDefinition(
        scenario_id="ahmedabad-test",
        depot=depot,
        customers=customers,
        vehicles=vehicles,
        round_trip=True,
        default_service_duration_s=300.0,
    )


async def test_time_conversion_utilities():
    print("\n--- TEST 1: Time Conversion Utilities ---")
    s1 = parse_clock_to_seconds("08:00")
    assert s1 == 28800.0, f"Expected 28800.0, got {s1}"
    c1 = format_seconds_to_clock(28800.0)
    assert c1 == "08:00:00", f"Expected 08:00:00, got {c1}"

    s2 = parse_clock_to_seconds("14:35:45")
    assert s2 == 14 * 3600 + 35 * 60 + 45, f"Expected 52545, got {s2}"
    c2 = format_seconds_to_clock(s2)
    assert c2 == "14:35:45", f"Expected 14:35:45, got {c2}"
    print("[PASS] Time conversion utilities work accurately.")


async def test_cost_matrix_generation_and_asymmetry():
    print("\n--- TEST 2: Cost Matrix & Directional Asymmetry Verification ---")
    problem = create_sample_ahmedabad_problem()
    matrix_info = await vrp_service.build_cost_matrix(problem)

    print(f"Matrix Provider: {matrix_info.provider} (Fallback: {matrix_info.is_fallback})")
    print(f"Location Count: {matrix_info.location_count}")
    print(f"Location IDs: {matrix_info.location_ids}")

    # 1. Correct matrix indexing
    assert matrix_info.location_count == 6  # 1 Depot + 5 Customers
    assert len(matrix_info.distances_matrix_m) == 6
    assert len(matrix_info.durations_matrix_s) == 6

    # 2. Diagonal correctness: D[i][i] == 0 and T[i][i] == 0
    for i in range(6):
        assert matrix_info.distances_matrix_m[i][i] == 0.0, f"Diagonal error at distance [{i}][{i}]"
        assert matrix_info.durations_matrix_s[i][i] == 0.0, f"Diagonal error at duration [{i}][{i}]"
    print("[PASS] Diagonal correctness verified (all D[i][i] == 0, T[i][i] == 0).")

    # 3. Valid directional values: all D[i][j] >= 0
    for i in range(6):
        for j in range(6):
            d = matrix_info.distances_matrix_m[i][j]
            t = matrix_info.durations_matrix_s[i][j]
            assert d >= 0.0, f"Negative distance at [{i}][{j}]: {d}"
            assert t >= 0.0, f"Negative duration at [{i}][{j}]: {t}"
    print("[PASS] Valid non-negative directional values verified.")

    # 4. Asymmetry check: Real road driving networks are NOT symmetric due to one-way streets, flyovers
    asymmetric_pairs = []
    for i in range(6):
        for j in range(i + 1, 6):
            d_ij = matrix_info.distances_matrix_m[i][j]
            d_ji = matrix_info.distances_matrix_m[j][i]
            diff = abs(d_ij - d_ji)
            if diff > 10.0:  # Noticeable asymmetric difference in meters
                asymmetric_pairs.append((matrix_info.location_ids[i], matrix_info.location_ids[j], d_ij, d_ji, diff))

    print(f"Detected {len(asymmetric_pairs)} asymmetric location pairs.")
    for u, v, dij, dji, diff in asymmetric_pairs[:3]:
        print(f"  {u} -> {v}: {dij:.1f} m vs {v} -> {u}: {dji:.1f} m (Diff: {diff:.1f} m)")

    # Assert matrix preservation: DO NOT enforce symmetry!
    if not matrix_info.is_fallback:
        assert len(asymmetric_pairs) > 0, "Expected genuine directional asymmetry on real OSRM road network!"
        print("[PASS] Real road network directional asymmetry correctly preserved.")
    else:
        print("[NOTE] Fallback matrix detected; asymmetry check noted.")

    # 5. Provenance tracking verification
    assert matrix_info.provenance.road_distance in ["OSRM", "GeometricFallback"]
    assert matrix_info.provenance.road_duration in ["OSRM", "GeometricFallback"]
    assert matrix_info.provenance.coordinates == "user/dataset"
    print("[PASS] Matrix data provenance tracked correctly.")

    return matrix_info


async def test_multi_vehicle_decoding_and_scheduling(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 3: Multi-Vehicle Decoding & Scheduling ---")
    problem = create_sample_ahmedabad_problem()

    # Partition: Vehicle 1 gets CUST-001, CUST-002; Vehicle 2 gets CUST-003, CUST-004, CUST-005
    partitions = [
        ["CUST-001", "CUST-002"],
        ["CUST-003", "CUST-004", "CUST-005"],
    ]

    solution = vrp_service.decode_candidate_routes(problem, partitions, matrix_info)

    assert len(solution.routes) == 2, f"Expected 2 routes, got {len(solution.routes)}"
    r1, r2 = solution.routes[0], solution.routes[1]

    # Verify Route 1
    assert r1.vehicle_id == "VEH-01"
    assert r1.stops == ["CUST-001", "CUST-002"]
    assert r1.full_sequence == ["DEPOT-001", "CUST-001", "CUST-002", "DEPOT-001"]
    assert r1.total_demand_loaded == 65.0  # 25 + 40
    assert r1.capacity_limit == 80.0
    assert r1.is_capacity_feasible is True
    assert len(r1.schedule) == 4  # Depot start, Stop 1, Stop 2, Depot return

    print(f"Vehicle 1: Distance = {r1.distance_km} km, Duration = {r1.total_duration_min} min, Demand = {r1.total_demand_loaded}/{r1.capacity_limit}")
    for item in r1.schedule:
        print(f"  [{item.stop_id}] Arr: {item.arrival_clock} | Wait: {item.wait_time_s}s | Svc: {item.service_duration_s}s | Dep: {item.departure_clock} | Late: {item.lateness_s}s")

    # Verify Route 2
    assert r2.vehicle_id == "VEH-02"
    assert r2.stops == ["CUST-003", "CUST-004", "CUST-005"]
    assert r2.total_demand_loaded == 85.0  # 35 + 20 + 30
    assert r2.capacity_limit == 80.0
    # Demand 85 > Capacity 80 => Infeasible!
    assert r2.capacity_exceeded == 5.0
    assert r2.is_capacity_feasible is False
    assert r2.is_feasible is False

    print(f"Vehicle 2: Demand = {r2.total_demand_loaded}/{r2.capacity_limit} (Excess: {r2.capacity_exceeded}) -> Capacity Infeasible as expected.")
    print("[PASS] Multi-vehicle route decoding and chronological scheduling verified.")


async def test_constraint_validations(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 4: Constraint Validation Edge Cases ---")
    problem = create_sample_ahmedabad_problem()

    # Case A: Feasible assignment (V1: 25+40=65 <= 80, V2: 35+20=55 <= 80, V3: 30 <= 80)
    # Adding a 3rd vehicle dynamically to make it feasible
    problem_3veh = create_sample_ahmedabad_problem()
    problem_3veh.vehicles.append(
        VRPVehicle(id="VEH-03", name="EV Van 3", type="van", capacity=80.0, speed_factor=1.0)
    )
    feasible_partitions = [
        ["CUST-001", "CUST-002"],
        ["CUST-003", "CUST-004"],
        ["CUST-005"],
    ]

    sol_feasible = vrp_service.decode_candidate_routes(problem_3veh, feasible_partitions, matrix_info)
    assert sol_feasible.is_coverage_feasible is True
    assert sol_feasible.is_capacity_feasible is True
    assert len(sol_feasible.unassigned_customers) == 0
    assert len(sol_feasible.duplicate_customers) == 0
    print("[PASS] Feasible 3-vehicle solution passes all constraints.")

    # Case B: Coverage Violation (Unassigned Stop)
    missing_partitions = [
        ["CUST-001", "CUST-002"],
        ["CUST-003"],
        # CUST-004 and CUST-005 omitted
    ]
    sol_missing = vrp_service.decode_candidate_routes(problem_3veh, missing_partitions, matrix_info)
    assert sol_missing.is_coverage_feasible is False
    assert "CUST-004" in sol_missing.unassigned_customers
    assert "CUST-005" in sol_missing.unassigned_customers
    print(f"[PASS] Unassigned customers correctly detected: {sol_missing.unassigned_customers}")

    # Case C: Duplicate Stop Violation
    duplicate_partitions = [
        ["CUST-001", "CUST-002"],
        ["CUST-002", "CUST-003", "CUST-004", "CUST-005"],  # CUST-002 visited twice!
    ]
    sol_dup = vrp_service.decode_candidate_routes(problem, duplicate_partitions, matrix_info)
    assert sol_dup.is_coverage_feasible is False
    assert "CUST-002" in sol_dup.duplicate_customers
    print(f"[PASS] Duplicate customer visitation correctly detected: {sol_dup.duplicate_customers}")

    # Case D: Time Window Lateness Violation
    # Set customer latest arrival unrealistically early (e.g. 08:05 when depot opens at 08:00 and transit is 10 min)
    problem_late = create_sample_ahmedabad_problem()
    problem_late.customers[0].latest_arrival = "08:02"  # Impossible window
    sol_late = vrp_service.decode_candidate_routes(problem_late, [["CUST-001"], ["CUST-002", "CUST-003", "CUST-004", "CUST-005"]], matrix_info)
    assert sol_late.routes[0].is_time_window_feasible is False
    assert sol_late.routes[0].schedule[1].is_late is True
    assert sol_late.routes[0].schedule[1].lateness_s > 0
    print(f"[PASS] Time window lateness correctly calculated: {sol_late.routes[0].schedule[1].lateness_s:.1f}s delay.")


async def test_fitness_calculation(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 5: Multi-Objective Fitness Evaluation ---")
    problem = create_sample_ahmedabad_problem()

    # Feasible partition
    problem_3veh = create_sample_ahmedabad_problem()
    problem_3veh.vehicles.append(
        VRPVehicle(id="VEH-03", name="EV Van 3", type="van", capacity=80.0, speed_factor=1.0)
    )
    sol_good = vrp_service.decode_candidate_routes(
        problem_3veh,
        [["CUST-001", "CUST-002"], ["CUST-003", "CUST-004"], ["CUST-005"]],
        matrix_info,
    )
    fitness_good, breakdown_good = vrp_service.evaluate_solution_fitness(sol_good)

    # Infeasible partition (capacity exceeded by 5 units + missing CUST-005)
    sol_bad = vrp_service.decode_candidate_routes(
        problem,
        [["CUST-001", "CUST-002"], ["CUST-003", "CUST-004"]],  # CUST-005 missing!
        matrix_info,
    )
    fitness_bad, breakdown_bad = vrp_service.evaluate_solution_fitness(sol_bad)

    print(f"Good Solution Fitness: {fitness_good}")
    print(f"  Breakdown: {breakdown_good}")
    print(f"Bad Solution Fitness (with penalties): {fitness_bad}")
    print(f"  Breakdown: {breakdown_bad}")

    # Bad solution should have higher (worse) fitness cost due to penalties
    assert fitness_bad > fitness_good, "Infeasible solution must have higher fitness penalty than feasible solution"
    assert breakdown_bad["coverage_penalty"] == 500.0, f"Expected 500.0 coverage penalty, got {breakdown_bad['coverage_penalty']}"
    print("[PASS] Multi-objective fitness scoring accurately penalizes infeasibilities.")


async def main():
    print("================================================================")
    print("  VEDIORA IROS — Milestone 2.2-B Comprehensive Engine Test Suite")
    print("================================================================")
    await test_time_conversion_utilities()
    matrix_info = await test_cost_matrix_generation_and_asymmetry()
    await test_multi_vehicle_decoding_and_scheduling(matrix_info)
    await test_constraint_validations(matrix_info)
    await test_fitness_calculation(matrix_info)
    print("\n================================================================")
    print("  ALL 5 TEST SUITES PASSED CLEANLY (100% SUCCESS)               ")
    print("================================================================")


if __name__ == "__main__":
    asyncio.run(main())
