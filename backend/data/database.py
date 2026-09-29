"""
IROS Database Module (SQLite)
Intelligent Route Optimization System • Team VEDIORA
SIH 2026 Problem Statement: 26137

Authoritative persistence layer for:
- SCENARIOS (id, name, region, city, depot, round_trip, timestamps)
- CUSTOMERS (id, scenario_id, name, lat, lng, demand, time windows, service duration)
- VEHICLES (id, scenario_id, name, vehicle_type, capacity, available, speed_factor)
- OPTIMIZATION_RUNS (id, scenario_id, algorithm, population_size, iterations, seed, runtime, timestamps, convergence, snapshots)
- OPTIMIZATION_RESULTS (id, run_id, fitness, distance, travel_time, congestion, penalties, feasibility, deltas)
- ROUTES (id, result_id, vehicle_id, ordered_stop_ids, distance, travel_time, geometry, feasibility)
"""

import os
import json
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iros.db")


def get_db_connection() -> sqlite3.Connection:
    """Returns a thread-safe sqlite3 connection with dictionary row access and WAL mode."""
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """Initializes the database schema if tables do not exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. SCENARIOS TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                region TEXT,
                city TEXT,
                depot_lat REAL NOT NULL,
                depot_lng REAL NOT NULL,
                depot_name TEXT,
                round_trip INTEGER DEFAULT 1,
                weights_distance REAL DEFAULT 0.35,
                weights_travel_time REAL DEFAULT 0.45,
                weights_congestion REAL DEFAULT 0.20,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 2. CUSTOMERS TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                name TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                demand REAL DEFAULT 15.0,
                earliest_arrival TEXT DEFAULT '09:00',
                latest_arrival TEXT DEFAULT '18:00',
                service_duration_s REAL DEFAULT 300.0,
                sequence_order INTEGER DEFAULT 0,
                PRIMARY KEY (id, scenario_id),
                FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
            );
        """)

        # 3. VEHICLES TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                name TEXT,
                vehicle_type TEXT DEFAULT 'van',
                capacity REAL DEFAULT 120.0,
                available INTEGER DEFAULT 1,
                speed_factor REAL DEFAULT 1.0,
                PRIMARY KEY (id, scenario_id),
                FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
            );
        """)

        # 4. OPTIMIZATION RUNS TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS optimization_runs (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                algorithm TEXT NOT NULL,
                population_size INTEGER,
                iterations INTEGER,
                random_seed INTEGER,
                runtime_ms REAL,
                started_at TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                convergence_history TEXT,
                iteration_snapshots TEXT,
                FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
            );
        """)

        # 5. OPTIMIZATION RESULTS TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS optimization_results (
                id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL,
                fitness REAL NOT NULL,
                total_distance REAL NOT NULL,
                total_travel_time REAL NOT NULL,
                congestion_cost REAL DEFAULT 0.0,
                capacity_penalty REAL DEFAULT 0.0,
                time_window_penalty REAL DEFAULT 0.0,
                feasible INTEGER DEFAULT 1,
                vehicle_count INTEGER DEFAULT 1,
                before_distance REAL,
                before_travel_time REAL,
                before_fitness REAL,
                distance_saved REAL,
                time_saved REAL,
                fitness_improvement REAL,
                FOREIGN KEY (run_id) REFERENCES optimization_runs(id) ON DELETE CASCADE
            );
        """)

        # 6. ROUTES TABLE
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                result_id TEXT NOT NULL,
                vehicle_id TEXT NOT NULL,
                ordered_stop_ids TEXT NOT NULL,
                distance REAL NOT NULL,
                travel_time REAL NOT NULL,
                geometry TEXT,
                payload_demand REAL DEFAULT 0.0,
                capacity_limit REAL DEFAULT 120.0,
                feasible INTEGER DEFAULT 1,
                FOREIGN KEY (result_id) REFERENCES optimization_results(id) ON DELETE CASCADE
            );
        """)

        conn.commit()

    # Seed default scenarios if database is brand new
    seed_default_scenarios()


def seed_default_scenarios():
    """Seeds authentic SIH 2026 default scenarios if none exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM scenarios;")
        row = cursor.fetchone()
        if row and row["count"] > 0:
            return  # Already seeded or has data

        now = datetime.now(timezone.utc).isoformat()

        # Seed 1: Ahmedabad Peak Traffic (Primary Urban Scenario)
        s1_id = "ahmedabad-peak"
        cursor.execute("""
            INSERT INTO scenarios (
                id, name, region, city, depot_lat, depot_lng, depot_name, round_trip,
                weights_distance, weights_travel_time, weights_congestion, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s1_id,
            "Ahmedabad Peak Traffic (SG Highway - Ashram Road)",
            "Ahmedabad–Gandhinagar, Gujarat, India",
            "Ahmedabad–Gandhinagar, Gujarat",
            23.0338, 72.5850,
            "Ashram Road Central Distribution Hub",
            1, 0.30, 0.45, 0.25, now, now
        ))

        # Vehicles for S1
        for i in range(3):
            v_id = f"VEH-{i+1:02d}"
            cursor.execute("""
                INSERT INTO vehicles (id, scenario_id, name, vehicle_type, capacity, available, speed_factor)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (v_id, s1_id, f"Fleet VAN {i+1}", "van", 120.0, 1, 1.0))

        # Customers for S1
        s1_customers = [
            ("CUST-001", "SG Highway Commercial Hub", 23.0305, 72.5178, 25.0, "09:00", "11:00", 300.0, 0),
            ("CUST-002", "Navrangpura Retail Center", 23.0373, 72.5524, 35.0, "09:30", "12:00", 300.0, 1),
            ("CUST-003", "Paldi Commercial Complex", 23.0225, 72.5714, 20.0, "10:00", "13:00", 300.0, 2),
            ("CUST-004", "Vastrapur Technology Park", 23.0544, 72.5312, 28.0, "11:00", "14:00", 300.0, 3),
        ]
        for c in s1_customers:
            cursor.execute("""
                INSERT INTO customers (id, scenario_id, name, latitude, longitude, demand, earliest_arrival, latest_arrival, service_duration_s, sequence_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c[0], s1_id, c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]))

        # Seed 2: SIH 20-Stop Metropolitan Benchmark
        s2_id = "sih-metropolitan-20"
        cursor.execute("""
            INSERT INTO scenarios (
                id, name, region, city, depot_lat, depot_lng, depot_name, round_trip,
                weights_distance, weights_travel_time, weights_congestion, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s2_id,
            "Ahmedabad Metropolitan Logistics (20 Stops • 3 Vehicles)",
            "Ahmedabad–Gandhinagar, Gujarat, India",
            "Ahmedabad–Gandhinagar, Gujarat",
            23.0338, 72.5850,
            "Ashram Road Central Distribution Hub",
            1, 0.35, 0.45, 0.20, now, now
        ))

        # Vehicles for S2 (3 vans with 120 kg capacity)
        for i in range(3):
            v_id = f"VEH-{i+1:02d}"
            cursor.execute("""
                INSERT INTO vehicles (id, scenario_id, name, vehicle_type, capacity, available, speed_factor)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (v_id, s2_id, f"Fleet VAN {i+1}", "van", 120.0, 1, 1.0))

        # 20 Customers for S2
        s2_customers = [
            ("CUST-001", "SG Highway Trade Center", 23.0305, 72.5178, 18.0, "09:00", "12:00", 300.0, 0),
            ("CUST-002", "Navrangpura Commercial Complex", 23.0373, 72.5524, 14.0, "09:30", "12:30", 300.0, 1),
            ("CUST-003", "Paldi Business Hub", 23.0225, 72.5714, 20.0, "10:00", "13:00", 300.0, 2),
            ("CUST-004", "Vastrapur Innovation Park", 23.0544, 72.5312, 16.0, "10:30", "14:00", 300.0, 3),
            ("CUST-005", "Prahlad Nagar Corporate Road", 23.0135, 72.5298, 22.0, "11:00", "14:30", 300.0, 4),
            ("CUST-006", "Thaltej Cross Road Center", 23.0612, 72.5165, 12.0, "09:00", "12:00", 300.0, 5),
            ("CUST-007", "Usmanpura Regional Depot", 23.0510, 72.5740, 15.0, "09:30", "13:00", 300.0, 6),
            ("CUST-008", "Ghatlodia Distribution Node", 23.0725, 72.5385, 10.0, "10:00", "13:30", 300.0, 7),
            ("CUST-009", "Chandkheda Express Hub", 23.1110, 72.5830, 25.0, "11:00", "15:00", 300.0, 8),
            ("CUST-010", "Sabarmati Freight Center", 23.0820, 72.5925, 18.0, "10:30", "14:00", 300.0, 9),
            ("CUST-011", "Shahibaug Distribution Point", 23.0590, 72.5980, 14.0, "09:00", "12:30", 300.0, 10),
            ("CUST-012", "Kalupur Wholesale Yard", 23.0280, 72.6015, 24.0, "10:00", "14:00", 300.0, 11),
            ("CUST-013", "Maninagar Transit Base", 23.0015, 72.6080, 16.0, "11:00", "15:00", 300.0, 12),
            ("CUST-014", "Ellisbridge Retail Point", 23.0210, 72.5620, 11.0, "09:00", "12:00", 300.0, 13),
            ("CUST-015", "Memnagar Logistics Branch", 23.0560, 72.5450, 13.0, "10:00", "13:30", 300.0, 14),
            ("CUST-016", "Ranip Cargo Terminal", 23.0780, 72.5670, 17.0, "11:30", "15:30", 300.0, 15),
            ("CUST-017", "Vasna Distribution Hub", 23.0030, 72.5510, 15.0, "09:30", "13:00", 300.0, 16),
            ("CUST-018", "Vejalpur Commerce Point", 23.0085, 72.5240, 12.0, "10:00", "14:00", 300.0, 17),
            ("CUST-019", "Bopal Gateway Station", 23.0340, 72.4710, 19.0, "12:00", "16:00", 300.0, 18),
            ("CUST-020", "Sola Science City Road", 23.0780, 72.5120, 14.0, "11:00", "15:00", 300.0, 19),
        ]
        for c in s2_customers:
            cursor.execute("""
                INSERT INTO customers (id, scenario_id, name, latitude, longitude, demand, earliest_arrival, latest_arrival, service_duration_s, sequence_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c[0], s2_id, c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]))

        conn.commit()


# =========================================================================
# Scenario Repository Functions
# =========================================================================

def get_all_scenarios() -> List[Dict[str, Any]]:
    """Fetches all scenarios with stop counts and vehicle summaries."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.*,
                (SELECT COUNT(*) FROM customers c WHERE c.scenario_id = s.id) as stop_count,
                (SELECT COUNT(*) FROM vehicles v WHERE v.scenario_id = s.id) as vehicle_count,
                (SELECT SUM(demand) FROM customers c WHERE c.scenario_id = s.id) as total_demand,
                (SELECT SUM(capacity) FROM vehicles v WHERE v.scenario_id = s.id) as total_capacity
            FROM scenarios s
            ORDER BY s.updated_at DESC;
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def get_scenario_by_id(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full scenario details including customers, vehicles, and latest run."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM scenarios WHERE id = ?;", (scenario_id,))
        s_row = cursor.fetchone()
        if not s_row:
            return None

        scenario = dict(s_row)

        # Get customers ordered by sequence
        cursor.execute("""
            SELECT * FROM customers
            WHERE scenario_id = ?
            ORDER BY sequence_order ASC, id ASC;
        """, (scenario_id,))
        c_rows = cursor.fetchall()
        scenario["customers"] = [
            {
                "id": c["id"],
                "name": c["name"],
                "lat": c["latitude"],
                "lng": c["longitude"],
                "latitude": c["latitude"],
                "longitude": c["longitude"],
                "demand": c["demand"],
                "earliestArrival": c["earliest_arrival"],
                "latestArrival": c["latest_arrival"],
                "earliest_arrival": c["earliest_arrival"],
                "latest_arrival": c["latest_arrival"],
                "serviceDurationS": c["service_duration_s"],
                "service_duration_s": c["service_duration_s"],
            }
            for c in c_rows
        ]

        # Get vehicles
        cursor.execute("""
            SELECT * FROM vehicles
            WHERE scenario_id = ?
            ORDER BY id ASC;
        """, (scenario_id,))
        v_rows = cursor.fetchall()
        scenario["vehicles"] = [
            {
                "id": v["id"],
                "name": v["name"],
                "vehicle_type": v["vehicle_type"],
                "vehicleType": v["vehicle_type"],
                "capacity": v["capacity"],
                "available": bool(v["available"]),
                "speed_factor": v["speed_factor"],
            }
            for v in v_rows
        ]

        # Convenience scenario root fields
        scenario["numVehicles"] = len(scenario["vehicles"])
        scenario["num_vehicles"] = len(scenario["vehicles"])
        scenario["vehicleCapacity"] = scenario["vehicles"][0]["capacity"] if scenario["vehicles"] else 120.0
        scenario["vehicle_capacity"] = scenario["vehicleCapacity"]
        scenario["vehicleType"] = scenario["vehicles"][0]["vehicle_type"] if scenario["vehicles"] else "van"
        scenario["depot"] = {
            "id": "DEPOT-001",
            "name": scenario["depot_name"] or "Central Fleet Depot",
            "lat": scenario["depot_lat"],
            "lng": scenario["depot_lng"],
            "latitude": scenario["depot_lat"],
            "longitude": scenario["depot_lng"],
            "type": "depot",
        }
        scenario["isRoundTrip"] = bool(scenario["round_trip"])
        scenario["weights"] = {
            "w_distance": scenario["weights_distance"],
            "w_travel_time": scenario["weights_travel_time"],
            "w_congestion": scenario["weights_congestion"],
            "distance": scenario["weights_distance"],
            "travelTime": scenario["weights_travel_time"],
            "congestion": scenario["weights_congestion"],
        }

        # Check for latest baseline and optimization runs
        latest_run = get_latest_optimization_run(scenario_id)
        scenario["latest_optimization_run"] = latest_run

        return scenario


def save_or_update_scenario(data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates or updates a scenario with all its stops and vehicles transactionally."""
    init_db()
    s_id = data.get("id") or f"scenario-{int(datetime.now(timezone.utc).timestamp())}"
    name = data.get("name") or "Custom Scenario"
    region = data.get("region") or "Ahmedabad–Gandhinagar, Gujarat, India"
    city = data.get("city") or data.get("region") or "Ahmedabad–Gandhinagar, Gujarat"

    depot = data.get("depot") or {}
    depot_lat = float(depot.get("lat") or depot.get("latitude") or 23.0338)
    depot_lng = float(depot.get("lng") or depot.get("longitude") or 72.5850)
    depot_name = depot.get("name") or "Central Fleet Depot"

    round_trip = 1 if data.get("round_trip", data.get("isRoundTrip", True)) else 0

    weights = data.get("weights") or {}
    w_dist = float(weights.get("distance", weights.get("w_distance", 0.35)))
    w_time = float(weights.get("travelTime", weights.get("w_travel_time", 0.45)))
    w_cong = float(weights.get("congestion", weights.get("w_congestion", 0.20)))

    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Insert or update scenario
        cursor.execute("""
            INSERT INTO scenarios (
                id, name, region, city, depot_lat, depot_lng, depot_name, round_trip,
                weights_distance, weights_travel_time, weights_congestion, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                region = excluded.region,
                city = excluded.city,
                depot_lat = excluded.depot_lat,
                depot_lng = excluded.depot_lng,
                depot_name = excluded.depot_name,
                round_trip = excluded.round_trip,
                weights_distance = excluded.weights_distance,
                weights_travel_time = excluded.weights_travel_time,
                weights_congestion = excluded.weights_congestion,
                updated_at = excluded.updated_at;
        """, (s_id, name, region, city, depot_lat, depot_lng, depot_name, round_trip, w_dist, w_time, w_cong, now, now))

        # Replace customers
        cursor.execute("DELETE FROM customers WHERE scenario_id = ?;", (s_id,))
        customers = data.get("customers", [])
        for idx, c in enumerate(customers):
            c_id = c.get("id") or f"CUST-{idx+1:03d}"
            c_name = c.get("name") or f"Delivery Stop {idx+1}"
            lat = float(c.get("lat") or c.get("latitude") or 23.0300)
            lng = float(c.get("lng") or c.get("longitude") or 72.5500)
            demand = float(c.get("demand", 15.0))
            earliest = c.get("earliestArrival") or c.get("earliest_arrival") or "09:00"
            latest = c.get("latestArrival") or c.get("latest_arrival") or "18:00"
            service_s = float(c.get("serviceDurationS") or c.get("service_duration_s") or 300.0)

            cursor.execute("""
                INSERT INTO customers (
                    id, scenario_id, name, latitude, longitude, demand,
                    earliest_arrival, latest_arrival, service_duration_s, sequence_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c_id, s_id, c_name, lat, lng, demand, earliest, latest, service_s, idx))

        # Replace vehicles
        cursor.execute("DELETE FROM vehicles WHERE scenario_id = ?;", (s_id,))
        vehicles = data.get("vehicles", [])
        if not vehicles:
            # Fallback to num_vehicles and vehicle_capacity
            num_v = int(data.get("numVehicles") or data.get("num_vehicles") or 3)
            cap = float(data.get("vehicleCapacity") or data.get("vehicle_capacity") or 120.0)
            vtype = data.get("vehicleType") or data.get("vehicle_type") or "van"
            vehicles = [
                {"id": f"VEH-{i+1:02d}", "name": f"Fleet {vtype.upper()} {i+1}", "vehicle_type": vtype, "capacity": cap, "available": True}
                for i in range(num_v)
            ]

        for v in vehicles:
            v_id = v.get("id") or "VEH-01"
            v_name = v.get("name") or f"Fleet Vehicle {v_id}"
            v_type = v.get("vehicle_type") or v.get("vehicleType") or "van"
            v_cap = float(v.get("capacity", 120.0))
            v_avail = 1 if v.get("available", True) else 0
            v_speed = float(v.get("speed_factor", 1.0))

            cursor.execute("""
                INSERT INTO vehicles (id, scenario_id, name, vehicle_type, capacity, available, speed_factor)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (v_id, s_id, v_name, v_type, v_cap, v_avail, v_speed))

        conn.commit()

    return get_scenario_by_id(s_id)


def delete_scenario(scenario_id: str) -> bool:
    """Deletes a scenario and cascaded records."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM scenarios WHERE id = ?;", (scenario_id,))
        conn.commit()
        return cursor.rowcount > 0


# =========================================================================
# Optimization Persistence Functions
# =========================================================================

def record_optimization_run(
    scenario_id: str,
    algorithm: str,
    population_size: int,
    iterations: int,
    random_seed: Optional[int],
    runtime_ms: float,
    convergence_history: List[float],
    iteration_snapshots: Optional[List[Dict[str, Any]]],
    result_data: Dict[str, Any],
    routes_data: List[Dict[str, Any]],
    before_data: Optional[Dict[str, Any]] = None,
    delta_data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Persists a complete optimization run, its result metrics, and vehicle route geometries.
    Returns the unique run_id.
    """
    init_db()
    run_id = f"run-{algorithm.lower()}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    result_id = f"res-{run_id}"
    now = datetime.now(timezone.utc).isoformat()

    conv_json = json.dumps(convergence_history or [])
    snaps_json = json.dumps(iteration_snapshots or [])

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Ensure scenario_id exists in scenarios to satisfy foreign key constraint
        cursor.execute("SELECT id FROM scenarios WHERE id = ?", (scenario_id,))
        if not cursor.fetchone():
            d_lat = 23.0338
            d_lng = 72.5850
            d_name = "Central Fleet Depot"
            if isinstance(result_data, dict):
                depot_info = result_data.get("depot") or {}
                if depot_info.get("lat") is not None and depot_info.get("lng") is not None:
                    d_lat = float(depot_info["lat"])
                    d_lng = float(depot_info["lng"])
                    d_name = depot_info.get("name", d_name)

            cursor.execute("""
                INSERT OR IGNORE INTO scenarios (
                    id, name, region, city, depot_lat, depot_lng, depot_name,
                    round_trip, weights_distance, weights_travel_time, weights_congestion,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scenario_id, scenario_id, "Ahmedabad–Gandhinagar, Gujarat", "Ahmedabad",
                d_lat, d_lng, d_name,
                1, 0.35, 0.45, 0.20, now, now
            ))

        # 1. Insert OPTIMIZATION RUN
        cursor.execute("""
            INSERT INTO optimization_runs (
                id, scenario_id, algorithm, population_size, iterations,
                random_seed, runtime_ms, started_at, completed_at,
                convergence_history, iteration_snapshots
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id, scenario_id, algorithm, population_size, iterations,
            random_seed, runtime_ms, now, now, conv_json, snaps_json
        ))

        # 2. Insert OPTIMIZATION RESULT
        b_dist = float(before_data.get("total_distance_km", 0.0)) if before_data else 0.0
        b_time = float(before_data.get("total_travel_time_min", 0.0)) if before_data else 0.0
        b_fit = float(before_data.get("fitness", 0.0)) if before_data else 0.0

        d_saved = float(delta_data.get("distance_saved_km", 0.0)) if delta_data else (b_dist - float(result_data.get("total_distance_km", 0.0)))
        t_saved = float(delta_data.get("time_saved_min", 0.0)) if delta_data else (b_time - float(result_data.get("total_travel_time_min", 0.0)))
        f_saved = float(delta_data.get("fitness_improvement", 0.0)) if delta_data else (b_fit - float(result_data.get("best_fitness", 0.0)))

        cursor.execute("""
            INSERT INTO optimization_results (
                id, run_id, fitness, total_distance, total_travel_time, congestion_cost,
                capacity_penalty, time_window_penalty, feasible, vehicle_count,
                before_distance, before_travel_time, before_fitness,
                distance_saved, time_saved, fitness_improvement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            result_id,
            run_id,
            float(result_data.get("best_fitness", 0.0)),
            float(result_data.get("total_distance_km", 0.0)),
            float(result_data.get("total_travel_time_min", 0.0)),
            float(result_data.get("fitness_breakdown", {}).get("raw_metrics", {}).get("congestion_cost", 0.0)),
            float(result_data.get("fitness_breakdown", {}).get("raw_metrics", {}).get("capacity_violation", 0.0)),
            float(result_data.get("fitness_breakdown", {}).get("raw_metrics", {}).get("time_window_violation", 0.0)),
            1 if result_data.get("is_feasible", True) else 0,
            len(routes_data or []),
            b_dist, b_time, b_fit,
            round(d_saved, 2), round(t_saved, 1), round(f_saved, 2)
        ))

        # 3. Insert ROUTES
        for idx, r in enumerate(routes_data or []):
            route_id = f"route-{run_id}-{idx+1}"
            v_id = r.get("vehicle_id", f"VEH-{idx+1:02d}")
            stops = json.dumps(r.get("stops", []))
            dist = float(r.get("distance_m", 0.0))
            dur = float(r.get("duration_s", r.get("total_duration_s", 0.0)))
            geom = json.dumps(r.get("geometry")) if r.get("geometry") else None
            demand = float(r.get("total_demand_loaded", r.get("payload_demand", 0.0)))
            cap = float(r.get("capacity_limit", r.get("vehicle_capacity", 120.0)))
            feas = 1 if r.get("is_capacity_feasible", True) and (r.get("time_window_delays_s", 0) == 0) else 0

            cursor.execute("""
                INSERT INTO routes (
                    id, result_id, vehicle_id, ordered_stop_ids,
                    distance, travel_time, geometry, payload_demand, capacity_limit, feasible
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (route_id, result_id, v_id, stops, dist, dur, geom, demand, cap, feas))

        conn.commit()

    return run_id


def get_latest_optimization_run(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Fetches the most recent optimization run and complete results for a scenario."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*,
                   res.id as result_id, res.fitness, res.total_distance, res.total_travel_time,
                   res.congestion_cost, res.capacity_penalty, res.time_window_penalty,
                   res.feasible, res.vehicle_count, res.before_distance, res.before_travel_time,
                   res.before_fitness, res.distance_saved, res.time_saved, res.fitness_improvement
            FROM optimization_runs r
            JOIN optimization_results res ON res.run_id = r.id
            WHERE r.scenario_id = ?
            ORDER BY r.completed_at DESC
            LIMIT 1;
        """, (scenario_id,))
        row = cursor.fetchone()
        if not row:
            return None

        run_dict = dict(row)
        run_dict["convergence_history"] = json.loads(run_dict["convergence_history"] or "[]")
        run_dict["iteration_snapshots"] = json.loads(run_dict["iteration_snapshots"] or "[]")

        # Get routes
        cursor.execute("""
            SELECT * FROM routes
            WHERE result_id = ?
            ORDER BY vehicle_id ASC;
        """, (run_dict["result_id"],))
        route_rows = cursor.fetchall()

        routes = []
        for rr in route_rows:
            r = dict(rr)
            r["stops"] = json.loads(r["ordered_stop_ids"] or "[]")
            r["geometry"] = json.loads(r["geometry"]) if r["geometry"] else None
            r["distance_m"] = r["distance"]
            r["duration_s"] = r["travel_time"]
            r["total_duration_s"] = r["travel_time"]
            r["total_demand_loaded"] = r["payload_demand"]
            r["is_capacity_feasible"] = bool(r["feasible"])
            routes.append(r)

        run_dict["routes"] = routes
        return run_dict


def get_optimization_run_by_id(run_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an optimization run by run_id."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.*,
                   res.id as result_id, res.fitness, res.total_distance, res.total_travel_time,
                   res.congestion_cost, res.capacity_penalty, res.time_window_penalty,
                   res.feasible, res.vehicle_count, res.before_distance, res.before_travel_time,
                   res.before_fitness, res.distance_saved, res.time_saved, res.fitness_improvement
            FROM optimization_runs r
            JOIN optimization_results res ON res.run_id = r.id
            WHERE r.id = ?;
        """, (run_id,))
        row = cursor.fetchone()
        if not row:
            return None

        run_dict = dict(row)
        run_dict["convergence_history"] = json.loads(run_dict["convergence_history"] or "[]")
        run_dict["iteration_snapshots"] = json.loads(run_dict["iteration_snapshots"] or "[]")

        cursor.execute("""
            SELECT * FROM routes
            WHERE result_id = ?
            ORDER BY vehicle_id ASC;
        """, (run_dict["result_id"],))
        route_rows = cursor.fetchall()
        routes = []
        for rr in route_rows:
            r = dict(rr)
            r["stops"] = json.loads(r["ordered_stop_ids"] or "[]")
            r["geometry"] = json.loads(r["geometry"]) if r["geometry"] else None
            r["distance_m"] = r["distance"]
            r["duration_s"] = r["travel_time"]
            r["total_duration_s"] = r["travel_time"]
            r["total_demand_loaded"] = r["payload_demand"]
            r["is_capacity_feasible"] = bool(r["feasible"])
            routes.append(r)

        run_dict["routes"] = routes
        return run_dict


def list_recent_optimization_runs(limit: int = 20) -> List[Dict[str, Any]]:
    """Lists recent optimization runs for Analytics and History views."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT r.id, r.scenario_id, r.algorithm, r.population_size, r.iterations,
                   r.random_seed, r.runtime_ms, r.started_at, r.completed_at,
                   r.convergence_history,
                   res.id as result_id, res.fitness, res.total_distance, res.total_travel_time, res.feasible,
                   res.distance_saved, res.time_saved, res.fitness_improvement,
                   res.before_distance, res.before_travel_time, res.before_fitness,
                   s.name as scenario_name
            FROM optimization_runs r
            JOIN optimization_results res ON res.run_id = r.id
            LEFT JOIN scenarios s ON s.id = r.scenario_id
            ORDER BY r.completed_at DESC
            LIMIT ?;
        """, (limit,))
        runs = []
        for row in cursor.fetchall():
            rd = dict(row)
            try:
                rd["convergence_history"] = json.loads(rd["convergence_history"] or "[]")
            except Exception:
                rd["convergence_history"] = []

            # Fetch routes for this run
            res_id = rd.get("result_id") or f"res-{rd['id']}"
            cursor.execute("""
                SELECT * FROM routes WHERE result_id = ? ORDER BY vehicle_id ASC;
            """, (res_id,))
            route_rows = cursor.fetchall()
            routes_list = []
            for rr in route_rows:
                r_dict = dict(rr)
                try:
                    r_dict["stops"] = json.loads(r_dict["ordered_stop_ids"] or "[]")
                except Exception:
                    r_dict["stops"] = []
                r_dict["distance_km"] = round(float(r_dict.get("distance", 0.0)) / 1000.0, 2)
                r_dict["duration_min"] = round(float(r_dict.get("travel_time", 0.0)) / 60.0, 1)
                routes_list.append(r_dict)
            rd["routes"] = routes_list
            rd["routes_with_geometry"] = routes_list
            runs.append(rd)
        return runs


# Convenience aliases and database singleton facade
get_scenario = get_scenario_by_id
get_all = get_all_scenarios
save_scenario = save_or_update_scenario


class DatabaseFacade:
    """Convenience object facade providing db.* method access."""
    get_scenario = staticmethod(get_scenario_by_id)
    get_scenario_by_id = staticmethod(get_scenario_by_id)
    get_all_scenarios = staticmethod(get_all_scenarios)
    save_or_update_scenario = staticmethod(save_or_update_scenario)
    save_scenario = staticmethod(save_or_update_scenario)
    record_optimization_run = staticmethod(record_optimization_run)
    get_latest_optimization_run = staticmethod(get_latest_optimization_run)
    get_optimization_run_by_id = staticmethod(get_optimization_run_by_id)
    list_recent_optimization_runs = staticmethod(list_recent_optimization_runs)


db = DatabaseFacade()
