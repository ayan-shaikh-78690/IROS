# VEDIORA — Quantum-Inspired Intelligent Traffic Route Optimization

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026137-0ea5e9.svg)](https://sih.gov.in)
[![Product Release](https://img.shields.io/badge/Release-Milestone%201.5%20UX%20%2B%20Docker-10b981.svg)]()
[![Docker Ready](https://img.shields.io/badge/Docker-Compose%20Ready-2496ed.svg)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61dafb.svg)](https://react.dev)

> **Smart India Hackathon 2026 — Problem Statement 26137**  
> **Quantum-Inspired Intelligent Traffic Route Optimization in Transportation Systems Using Metaheuristic Optimization**

---

## 1. Product Overview

**VEDIORA** (*Intelligent Mobility Intelligence*) is an advanced transportation optimization platform designed for **urban logistics and delivery fleets** (such as parcel vans, cargo two-wheelers, and freight trucks). The platform balances travel time, driving distance, road congestion, fuel burn, and customer time windows simultaneously.

Our primary demonstration region is **Ahmedabad–Gandhinagar, Gujarat, India**, modeling key commercial hubs including Ashram Road, S.G. Highway, C.G. Road, and Gandhinagar Infocity.

```text
Optimize. Simulate. Compare. Decide.
```

---

## 2. User Journey

VEDIORA guides fleet operators and dispatchers through an intuitive 5-step workflow:

1. **Choose an Area**: Select an urban delivery district (e.g. Ahmedabad–Gandhinagar). The system loads true street networks, intersection topologies, and one-way rules.
2. **Build Your Delivery Scenario**: Set the primary depot/warehouse location and balance your business priorities (driving distance vs. travel time vs. traffic avoidance).
3. **Add Vehicles and Delivery Stops**: Choose vehicle types (cargo bikes, delivery vans, or freight trucks) with specific capacities and assign customer stops with strict delivery time windows (e.g. 09:00 — 11:00).
4. **Simulate Traffic & Road Conditions**: Factor in time-varying road speeds and rush-hour bottlenecks. Road rules (such as truck bans in central commercial corridors) are automatically evaluated.
5. **Optimize and Compare Routes**: Run intelligent swarm search algorithms to evaluate millions of route permutations and compare alternative dispatch plans side-by-side.

---

## 3. Light + Dark Theme System

VEDIORA features a full glassmorphic dual theme system:
- **Dark Mode**: Deep obsidian background (`#07090e`), translucent glass panels, subtle cyan/indigo glowing accents, and high-contrast telemetry.
- **Light Mode**: Crisp slate background (`#f8fafc`), clean white translucent glass cards, dark legible typography, and restrained blue accents.
- **Persistence & Detection**: Theme preference is automatically detected from the user's operating system (`prefers-color-scheme`) on first visit and persisted in `localStorage`.
- **Toggle**: Quick-switch between light and dark themes using the sun/moon button in the top navigation bar.

---

## 4. Current Capabilities (Milestone 1.5)

- **Control-Center Glass Navigation**: Floating glass navigation bar with live backend status indicator (`API Online`), theme toggle, mobile responsive drawer, and primary CTA.
- **Interactive Abstract Network Canvas**: Responsive HTML5 Canvas visualization rendering animated road network topology, nodes, and traffic flow packets (adapting dynamically to Light and Dark modes).
- **Scenario Lab Workspace**:
  - **Scenario Presets**: 4 ready-to-run presets for Ahmedabad–Gandhinagar (Ahmedabad Peak Traffic, Urban Retail Express, Gandhinagar Tech Corridor, Heavy Freight Stress Test).
  - **Multi-Vehicle Fleets**: Archetypes for Cargo Two-Wheelers (`bike`), Delivery Vans (`van`), and Medium Freight Trucks (`truck`) with distinct capacities, speed factors, and road restrictions.
  - **Delivery Time Windows**: Exact customer time window constraints (earliest and latest arrival times).
  - **Road Rules Architecture**: Toggles for one-way street enforcement, construction closures, and peak-hour truck bans.
  - **Dynamic Re-Routing Preview**: Architecture prepared for real-time recalculation upon traffic surges.
  - **Interactive Map Builder & Manual Input**: Mode switching, live weight sum validation (1.00 total), capacity validation, and customer row management.
- **Optimization Studio**: Parameter controls for Swarm Size, Maximum Search Cycles, and algorithm selection (Classical PSO vs. Quantum-Inspired QPSO).
- **Algorithm Arena**: Side-by-side conceptual comparison of Classical PSO vs. Quantum-Inspired QPSO with an expandable mathematical deep dive and authentic empty-state telemetry containers.
- **Analytics Dashboard**: Multi-objective telemetry metrics and empty chart containers (strictly zero fabricated benchmarks).
- **FastAPI Backend Foundation**: Operational `GET /health` endpoint, clean Pydantic data contracts, and CORS configuration.
- **Docker Multi-Container Foundation**: Production-ready Dockerfiles for frontend and backend with `docker-compose.yml`.

---

## 5. Upcoming Capabilities (Roadmap)

- **Milestone 2**: Real OpenStreetMap ingestion with OSMnx (spatial bounding boxes, graph caching, and interactive Leaflet GIS map with draggable pins and road snapping).
- **Milestone 3**: NetworkX directed multigraph modeling, dynamic edge congestion impedance, and turn penalties.
- **Milestone 4**: Implementation of the Classical PSO and Quantum-Behaved QPSO solver engines with live convergence telemetry.
- **Milestone 5**: Comprehensive benchmark comparison against baseline savings heuristics (Clarke-Wright, greedy nearest-neighbor).

---

## 6. Local Development

### Prerequisites
- **Node.js**: v18+ (tested on v24.13.0)
- **Python**: 3.10+ (tested on Python 3.11.0)
- **npm**: v9+

### Backend Execution
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Health Check: `http://127.0.0.1:8000/health`
- Interactive API Docs: `http://127.0.0.1:8000/docs`

### Frontend Execution
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```
- Application URL: `http://127.0.0.1:5173/`
- Production Build: `npm run build`

---

## 7. Docker Development

VEDIORA includes a Docker setup enabling the entire 6-person hackathon team to spin up frontend and backend services with a single command:

```bash
docker compose up --build
```

- **Frontend Container**: Multi-stage build running Nginx on `http://localhost:5173` with SPA fallback.
- **Backend Container**: Python 3.11 slim image running Uvicorn ASGI on `http://localhost:8000` with automated health checks.

To stop the containers:
```bash
docker compose down
```

---

## 8. Problem Statement Alignment

| Criterion | Implementation in VEDIORA |
| :--- | :--- |
| **Problem Statement** | SIH 2026 Problem Statement 26137 |
| **Demonstration City** | Ahmedabad–Gandhinagar, Gujarat, India |
| **Target Vehicles** | Urban logistics & delivery fleets (vans, bikes, trucks) |
| **Search Mechanics** | Classical PSO & Quantum-Inspired QPSO |
| **Scientific Integrity** | Zero fabricated benchmarks or hardcoded optimization gains |
