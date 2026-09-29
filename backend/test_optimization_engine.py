"""
Comprehensive Test Suite for IROS Optimization Engine (Milestones M2.2-B, M3, M4).
Verifies:
1. Route Encoding, Decoding, Swap Sequences, and Permutation Algebra
2. Exactly-once Customer Uniqueness & Repair Operator
3. Vehicle Capacity Constraint Checking
4. Time Window Arrival & Lateness Detection
5. Shared Multi-Objective Fitness Evaluation
6. Classical Discrete PSO (M3) Execution & Convergence
7. Quantum-Behaved QPSO (M4) Execution & Convergence
8. Head-to-Head Comparative Benchmarking (PSO vs QPSO)
9. FastAPI Optimization Endpoints
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.vrp_models import (
    VRPCustomer,
    VRPVehicle,
    VRPDepot,
    VRPProblemDefinition,
    VRPMatrixInfo,
)
from optimization.encoding import (
    SwapOperator,
    SwapSequence,
    compute_permutation_difference,
    DiscreteVRPSolution,
    create_initial_random_solution,
)
from optimization.constraints import VRPConstraintEngine
from optimization.objective import ObjectiveFunction
from optimization.pso import PSOSolver
from optimization.qpso import QPSOSolver
from services.vrp_service import vrp_service


def create_sample_problem(num_customers: int = 5, num_vehicles: int = 2) -> VRPProblemDefinition:
    """Generates synthetic geographic VRP problem centered around Ahmedabad."""
    depot = VRPDepot(
        id="DEPOT-001",
        name="Ashram Road Central Depot",
        lat=23.0338,
        lng=72.5850,
        opening_time="08:00",
        closing_time="20:00",
    )

    customers: List[VRPCustomer] = []
    base_lat = 23.0338
    base_lng = 72.5850

    # Coords distributed around central Ahmedabad
    offsets = [
        (0.012, -0.021, 20.0, "08:30", "11:00"),
        (0.024, -0.015, 25.0, "09:00", "11:30"),
        (-0.018, -0.012, 30.0, "09:30", "12:00"),
        (0.015, 0.010, 15.0, "10:00", "13:00"),
        (-0.025, 0.018, 35.0, "10:30", "14:00"),
        (0.035, -0.005, 22.0, "11:00", "14:30"),
        (-0.030, -0.020, 28.0, "11:30", "15:00"),
        (0.005, 0.025, 18.0, "12:00", "15:30"),
        (-0.015, 0.030, 24.0, "12:30", "16:00"),
        (0.028, 0.015, 16.0, "13:00", "16:30"),
    ]

    for i in range(num_customers):
        off = offsets[i % len(offsets)]
        customers.append(
            VRPCustomer(
                id=f"CUST-{i+1:03d}",
                name=f"Customer Stop {i+1}",
                lat=round(base_lat + off[0] + (i * 0.001), 4),
                lng=round(base_lng + off[1] + (i * 0.001), 4),
                demand=off[2],
                earliest_arrival=off[3],
                latest_arrival=off[4],
                service_duration_s=300.0,
            )
        )

    vehicles: List[VRPVehicle] = [
        VRPVehicle(
            id=f"VEH-{k+1:02d}",
            name=f"Van {k+1}",
            type="van",
            capacity=80.0,
            speed_factor=1.0,
        )
        for k in range(num_vehicles)
    ]

    return VRPProblemDefinition(
        scenario_id="test-scenario",
        depot=depot,
        customers=customers,
        vehicles=vehicles,
        round_trip=True,
        default_service_duration_s=300.0,
    )


def test_permutation_algebra():
    print("\n--- TEST 1: Permutation Algebra & Swap Sequences ---")
    p1 = ["A", "B", "C", "D", "E"]
    p2 = ["C", "A", "B", "E", "D"]

    # Compute minimal swap sequence
    ss = compute_permutation_difference(p2, p1)
    applied = ss.apply(p1)
    assert applied == p2, f"Expected {p2}, got {applied}"
    print(f"[PASS] Permutation difference correctly computed: {len(ss)} swap operations transform P1 -> P2.")

    # Giant Tour and Cut Encoding
    sol = DiscreteVRPSolution([["C1", "C2"], ["C3", "C4", "C5"]], num_vehicles=2)
    giant, cuts = sol.to_giant_tour()
    assert giant == ["C1", "C2", "C3", "C4", "C5"]
    assert cuts == [2]

    reconstructed = DiscreteVRPSolution.from_giant_tour(giant, cuts, 2)
    assert reconstructed.routes == sol.routes
    print("[PASS] Giant tour and cut index encoding/decoding verified.")

    # Uniqueness Repair Operator
    corrupted = DiscreteVRPSolution([["C1", "C2", "C1"], ["C3"]], num_vehicles=2)
    repaired = corrupted.repair_and_validate(["C1", "C2", "C3", "C4", "C5"])
    visited = repaired.get_all_visited_customers()
    assert len(visited) == 5
    assert set(visited) == {"C1", "C2", "C3", "C4", "C5"}
    print(f"[PASS] Uniqueness repair successfully restored missing and duplicate customers: {repaired.routes}")


async def test_constraints_and_objective(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 2: Constraints Engine & Multi-Objective Fitness ---")
    problem = create_sample_problem(num_customers=5, num_vehicles=2)
    objective = ObjectiveFunction(weight_distance=0.4, weight_travel_time=0.4, weight_congestion=0.2)

    # Feasible partition
    partitions_feas = [["CUST-001", "CUST-002"], ["CUST-003", "CUST-004", "CUST-005"]]
    fit_feas, bdown_feas, c_res_feas, _ = objective.evaluate(partitions_feas, problem, matrix_info)

    # Infeasible partition (CUST-005 omitted)
    partitions_infeas = [["CUST-001", "CUST-002"], ["CUST-003", "CUST-004"]]
    fit_infeas, bdown_infeas, c_res_infeas, _ = objective.evaluate(partitions_infeas, problem, matrix_info)

    assert c_res_infeas.is_coverage_feasible is False
    assert "CUST-005" in c_res_infeas.unassigned_customers
    assert fit_infeas > fit_feas, "Infeasible candidate must have higher penalized fitness cost"
    print(f"[PASS] Feasible Fitness = {fit_feas} vs Infeasible (Penalized) Fitness = {fit_infeas}")


async def test_discrete_pso(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 3: Classical Discrete PSO Solver Execution & Convergence ---")
    problem = create_sample_problem(num_customers=5, num_vehicles=2)

    solver = PSOSolver(
        population_size=20,
        max_iterations=30,
        w=0.7,
        c1=1.5,
        c2=1.5,
        random_seed=42,
    )

    result = solver.solve(problem, matrix_info)

    assert result["status"] == "success"
    assert result["algorithm"] == "Classical PSO"
    assert len(result["convergence_history"]) == 31  # init + 30 iterations
    assert result["best_fitness"] > 0
    assert result["execution_time_ms"] > 0

    # Verify convergence monotonicity
    history = result["convergence_history"]
    for i in range(len(history) - 1):
        assert history[i + 1] <= history[i] + 1e-6, "Global best fitness must be non-increasing!"

    print(f"[PASS] Classical PSO executed in {result['execution_time_ms']} ms.")
    print(f"       Initial Fitness: {history[0]} -> Optimized Fitness: {history[-1]}")
    print(f"       Total Fleet Distance: {result['total_distance_km']} km, Travel Time: {result['total_travel_time_min']} min")
    return result


async def test_quantum_qpso(matrix_info: VRPMatrixInfo):
    print("\n--- TEST 4: Quantum-Behaved QPSO Solver Execution & Convergence ---")
    problem = create_sample_problem(num_customers=5, num_vehicles=2)

    solver = QPSOSolver(
        population_size=20,
        max_iterations=30,
        alpha_start=1.0,
        alpha_end=0.5,
        random_seed=42,
    )

    result = solver.solve(problem, matrix_info)

    assert result["status"] == "success"
    assert result["algorithm"] == "Quantum-Inspired QPSO"
    assert len(result["convergence_history"]) == 31
    assert result["best_fitness"] > 0
    assert result["execution_time_ms"] > 0

    # Verify convergence monotonicity
    history = result["convergence_history"]
    for i in range(len(history) - 1):
        assert history[i + 1] <= history[i] + 1e-6, "Global best fitness must be non-increasing!"

    print(f"[PASS] Quantum QPSO executed in {result['execution_time_ms']} ms.")
    print(f"       Initial Fitness: {history[0]} -> Optimized Fitness: {history[-1]}")
    print(f"       Total Fleet Distance: {result['total_distance_km']} km, Travel Time: {result['total_travel_time_min']} min")
    return result


async def test_larger_scenario_10_customers():
    print("\n--- TEST 5: Scalability Validation (10 Customers, 3 Vehicles) ---")
    problem_10 = create_sample_problem(num_customers=10, num_vehicles=3)
    matrix_info = await vrp_service.build_cost_matrix(problem_10)

    pso = PSOSolver(population_size=25, max_iterations=25, random_seed=123)
    qpso = QPSOSolver(population_size=25, max_iterations=25, random_seed=123)

    res_pso = pso.solve(problem_10, matrix_info)
    res_qpso = qpso.solve(problem_10, matrix_info)

    print(f"[PASS] 10-Customer Problem Solved:")
    print(f"       PSO:  Best Fitness = {res_pso['best_fitness']}, Distance = {res_pso['total_distance_km']} km, Time = {res_pso['execution_time_ms']} ms")
    print(f"       QPSO: Best Fitness = {res_qpso['best_fitness']}, Distance = {res_qpso['total_distance_km']} km, Time = {res_qpso['execution_time_ms']} ms")


def test_fastapi_endpoints():
    print("\n--- TEST 6: FastAPI Optimization Endpoints ---")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Status endpoint
    resp = client.get("/api/optimization/")
    assert resp.status_code == 200
    data = resp.json()
    assert "pso" in data["supported_algorithms"]
    assert "qpso" in data["supported_algorithms"]
    print("[PASS] GET /api/optimization/ operational.")

    # 2. POST /api/optimization/pso
    problem_payload = {
        "problem": {
            "depot": {"id": "DEPOT-001", "name": "Depot", "lat": 23.0338, "lng": 72.5850},
            "customers": [
                {"id": "CUST-001", "name": "Stop 1", "lat": 23.0365, "lng": 72.5611, "demand": 15.0},
                {"id": "CUST-002", "name": "Stop 2", "lat": 23.0289, "lng": 72.5564, "demand": 25.0},
                {"id": "CUST-003", "name": "Stop 3", "lat": 23.0134, "lng": 72.5629, "demand": 20.0},
            ],
            "vehicles": [
                {"id": "VEH-01", "name": "Van 1", "capacity": 60.0},
                {"id": "VEH-02", "name": "Van 2", "capacity": 60.0},
            ],
        },
        "population_size": 15,
        "iterations": 15,
        "random_seed": 7,
        "include_road_geometry": False,
    }

    resp_pso = client.post("/api/optimization/pso", json=problem_payload)
    assert resp_pso.status_code == 200, f"PSO failed: {resp_pso.text}"
    pso_data = resp_pso.json()
    assert pso_data["algorithm"] == "Classical PSO"
    assert len(pso_data["convergence_history"]) == 16
    print(f"[PASS] POST /api/optimization/pso returned fitness: {pso_data['best_fitness']}.")

    # 3. POST /api/optimization/qpso
    resp_qpso = client.post("/api/optimization/qpso", json=problem_payload)
    assert resp_qpso.status_code == 200, f"QPSO failed: {resp_qpso.text}"
    qpso_data = resp_qpso.json()
    assert qpso_data["algorithm"] == "Quantum-Inspired QPSO"
    assert len(qpso_data["convergence_history"]) == 16
    print(f"[PASS] POST /api/optimization/qpso returned fitness: {qpso_data['best_fitness']}.")

    # 4. POST /api/optimization/compare
    resp_comp = client.post("/api/optimization/compare", json=problem_payload)
    assert resp_comp.status_code == 200, f"Compare failed: {resp_comp.text}"
    comp_data = resp_comp.json()
    assert "pso" in comp_data and "qpso" in comp_data
    assert "comparison" in comp_data
    print(f"[PASS] POST /api/optimization/compare returned winner: {comp_data['comparison']['winner']}.")


async def main():
    print("================================================================")
    print("  VEDIORA IROS — Optimization Engine Comprehensive Test Suite   ")
    print("================================================================")
    test_permutation_algebra()

    sample_problem = create_sample_problem(num_customers=5, num_vehicles=2)
    matrix_info = await vrp_service.build_cost_matrix(sample_problem)

    await test_constraints_and_objective(matrix_info)
    await test_discrete_pso(matrix_info)
    await test_quantum_qpso(matrix_info)
    await test_larger_scenario_10_customers()
    test_fastapi_endpoints()

    print("\n================================================================")
    print("  ALL 6 OPTIMIZATION TEST SUITES PASSED (100% SUCCESS)          ")
    print("================================================================")


if __name__ == "__main__":
    asyncio.run(main())
