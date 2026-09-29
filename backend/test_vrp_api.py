"""
FastAPI Test for VRP Endpoints.
Verifies GET /api/vrp/formulation, POST /api/vrp/matrix, POST /api/vrp/decode, POST /api/vrp/evaluate.
"""

import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)


def test_vrp_formulation_endpoint():
    print("\n--- API TEST 1: GET /api/vrp/formulation ---")
    resp = client.get("/api/vrp/formulation")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "Capacitated Vehicle Routing Problem" in data["title"]
    assert "combinatorial search space" in data["search_space_description"]
    assert "QPSO" in data["search_space_description"]
    assert "high-quality feasible solutions" in data["near_optimality_goal"]
    assert data["service_duration_policy"]["default_service_duration_s"] == 300.0
    assert "road_distance" in data["data_provenance_schema"]
    print("[PASS] Formulation endpoint returned valid specifications and correct claims.")


def test_vrp_matrix_endpoint():
    print("\n--- API TEST 2: POST /api/vrp/matrix ---")
    payload = {
        "depot": {
            "id": "DEPOT-001",
            "name": "Ashram Road Depot",
            "lat": 23.0338,
            "lng": 72.5850,
            "opening_time": "08:00",
            "closing_time": "20:00",
        },
        "customers": [
            {
                "id": "CUST-001",
                "name": "Navrangpura",
                "lat": 23.0365,
                "lng": 72.5611,
                "demand": 20.0,
                "service_duration_s": 300.0,
            },
            {
                "id": "CUST-002",
                "name": "Paldi",
                "lat": 23.0134,
                "lng": 72.5629,
                "demand": 30.0,
                "service_duration_s": 300.0,
            },
        ],
        "vehicles": [
            {"id": "VEH-01", "name": "Van 1", "capacity": 60.0},
        ],
    }

    resp = client.post("/api/vrp/matrix", json=payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["location_count"] == 3
    assert len(data["distances_matrix_m"]) == 3
    assert data["is_fallback"] in [True, False]
    assert data["provenance"]["coordinates"] == "user/dataset"
    print(f"[PASS] Matrix endpoint returned 3x3 matrix (Provider: {data['provider']}).")


def test_vrp_decode_and_evaluate_endpoints():
    print("\n--- API TEST 3: POST /api/vrp/decode & /api/vrp/evaluate ---")
    payload = {
        "problem": {
            "depot": {
                "id": "DEPOT-001",
                "name": "Ashram Road Depot",
                "lat": 23.0338,
                "lng": 72.5850,
            },
            "customers": [
                {
                    "id": "CUST-001",
                    "name": "Navrangpura",
                    "lat": 23.0365,
                    "lng": 72.5611,
                    "demand": 25.0,
                    "earliest_arrival": "08:30",
                    "latest_arrival": "10:30",
                },
                {
                    "id": "CUST-002",
                    "name": "Paldi",
                    "lat": 23.0134,
                    "lng": 72.5629,
                    "demand": 35.0,
                    "earliest_arrival": "09:00",
                    "latest_arrival": "11:30",
                },
            ],
            "vehicles": [
                {"id": "VEH-01", "name": "Van 1", "capacity": 100.0},
            ],
            "round_trip": True,
        },
        "candidate_partitions": [["CUST-001", "CUST-002"]],
    }

    # Decode test
    decode_resp = client.post("/api/vrp/decode", json=payload)
    assert decode_resp.status_code == 200, f"Decode error: {decode_resp.text}"
    decode_data = decode_resp.json()
    assert decode_data["status"] == "success"
    sol = decode_data["solution"]
    assert len(sol["routes"]) == 1
    assert sol["is_overall_feasible"] is True
    assert sol["routes"][0]["total_demand_loaded"] == 60.0
    print(f"[PASS] Decode endpoint scheduled {len(sol['routes'][0]['schedule'])} stops successfully.")

    # Evaluate test
    eval_payload = {
        **payload,
        "weight_distance": 0.4,
        "weight_time": 0.4,
        "weight_congestion": 0.2,
    }
    eval_resp = client.post("/api/vrp/evaluate", json=eval_payload)
    assert eval_resp.status_code == 200, f"Evaluate error: {eval_resp.text}"
    eval_data = eval_resp.json()
    assert eval_data["status"] == "success"
    assert "fitness_cost" in eval_data
    assert "distance_cost" in eval_data["fitness_breakdown"]
    print(f"[PASS] Evaluate endpoint returned fitness cost: {eval_data['fitness_cost']} with full breakdown.")


if __name__ == "__main__":
    print("================================================================")
    print("  FASTAPI ROUTER TEST SUITE FOR /api/vrp                        ")
    print("================================================================")
    test_vrp_formulation_endpoint()
    test_vrp_matrix_endpoint()
    test_vrp_decode_and_evaluate_endpoints()
    print("\n================================================================")
    print("  ALL API TESTS PASSED CLEANLY (100% SUCCESS)                   ")
    print("================================================================")
