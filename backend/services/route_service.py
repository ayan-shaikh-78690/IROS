"""
Routing Service for IROS (Intelligent Route Optimization System).
Milestone 2.2-A: Real Road Routing Engine.

Responsibilities:
1. Snap coordinates to OpenStreetMap road network.
2. Calculate actual street-following route geometry, distance, and duration.
3. Compute pairwise cost matrices for discrete VRP / optimization foundation.
4. Support configurable routing engines (OSRM default, extensible to self-hosted/custom).
"""
import logging
import math
from typing import List, Dict, Any, Optional
import httpx

from config import settings
from models.schemas import (
    LocationPoint,
    RouteRequest,
    RouteResponse,
    RouteLeg,
    RouteGeometry,
    MatrixRequest,
    MatrixResponse,
)

logger = logging.getLogger("iros.routing")


class RoutingService:
    """
    Isolated routing provider client.
    Delegates road-network routing to OSRM while preserving IROS data models.
    """

    def __init__(
        self,
        provider: str = settings.ROUTING_PROVIDER,
        base_url: str = settings.ROUTING_BASE_URL,
        timeout: float = settings.ROUTING_TIMEOUT_SECONDS,
    ):
        self.provider = provider
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def calculate_road_route(self, request: RouteRequest) -> RouteResponse:
        """
        Calculates road-following route for the given sequence:
        Depot -> Stop 1 -> Stop 2 -> ... -> Depot (if round_trip).
        """
        depot = request.depot
        stops = request.delivery_stops

        if not stops:
            # Trivial case: Depot only
            return RouteResponse(
                status="success",
                provider=self.provider,
                scenario_id=request.scenario_id,
                round_trip=request.round_trip,
                total_distance_m=0.0,
                total_distance_km=0.0,
                total_duration_s=0.0,
                total_duration_min=0.0,
                routing_weight=0.0,
                num_stops=0,
                sequence=[depot.name or "Depot"],
                geometry=RouteGeometry(type="LineString", coordinates=[[depot.lng, depot.lat]]),
                legs=[],
                message="No delivery stops designated. Route centered at depot.",
            )

        # Assemble sequence of locations
        locations: List[LocationPoint] = [depot] + list(stops)
        if request.round_trip:
            # Round-trip: return to depot
            locations.append(depot)

        # Build coordinate string for OSRM: lon,lat;lon,lat;...
        coord_pairs = [f"{loc.lng:.5f},{loc.lat:.5f}" for loc in locations]
        coords_str = ";".join(coord_pairs)
        url = f"{self.base_url}/route/v1/driving/{coords_str}?overview=full&geometries=geojson&steps=false"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers={"User-Agent": "VEDIORA-IROS/1.0"})

            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    primary_route = data["routes"][0]
                    coords = primary_route["geometry"]["coordinates"]
                    dist_m = float(primary_route.get("distance", 0.0))
                    dur_s = float(primary_route.get("duration", 0.0))
                    weight = float(primary_route.get("weight", 0.0))
                    raw_legs = primary_route.get("legs", [])

                    # Construct explicit RouteLeg objects
                    legs: List[RouteLeg] = []
                    for i, raw_leg in enumerate(raw_legs):
                        from_loc = locations[i]
                        to_loc = locations[i + 1] if i + 1 < len(locations) else locations[0]
                        legs.append(
                            RouteLeg(
                                from_location_id=from_loc.id or f"LOC-{i}",
                                to_location_id=to_loc.id or f"LOC-{i+1}",
                                from_name=from_loc.name or f"Stop {i}",
                                to_name=to_loc.name or f"Stop {i+1}",
                                distance_m=float(raw_leg.get("distance", 0.0)),
                                duration_s=float(raw_leg.get("duration", 0.0)),
                                routing_weight=float(raw_leg.get("weight", 0.0)),
                            )
                        )

                    location_labels = [loc.name or f"Stop {i}" for i, loc in enumerate(locations)]

                    return RouteResponse(
                        status="success",
                        provider=self.provider,
                        scenario_id=request.scenario_id,
                        round_trip=request.round_trip,
                        total_distance_m=round(dist_m, 1),
                        total_distance_km=round(dist_m / 1000.0, 2),
                        total_duration_s=round(dur_s, 1),
                        total_duration_min=round(dur_s / 60.0, 1),
                        routing_weight=round(weight, 2),
                        num_stops=len(stops),
                        sequence=location_labels,
                        geometry=RouteGeometry(type="LineString", coordinates=coords),
                        legs=legs,
                        message="Real road-following route successfully calculated via OSRM.",
                    )
                else:
                    code = data.get("code", "UnknownError")
                    logger.warning(f"OSRM returned non-OK status: {code}")
                    return self._fallback_geometric_route(locations, request, message=f"OSRM: {code}")

            else:
                logger.error(f"OSRM request failed with HTTP {response.status_code}")
                return self._fallback_geometric_route(
                    locations, request, message=f"Routing service returned HTTP {response.status_code}"
                )

        except Exception as exc:
            logger.exception(f"Routing service exception: {exc}")
            # Graceful geometric fallback if network is unreachable
            return self._fallback_geometric_route(
                locations, request, message="Routing service temporarily unavailable. Using direct geodesic approximation."
            )

    async def calculate_cost_matrix(self, request: MatrixRequest) -> MatrixResponse:
        """
        Calculates distance and duration matrices between all locations (Depot + Stops).
        Prepares M2.2-B Cost Matrix & Discrete VRP representation.
        """
        locations = request.locations
        n = len(locations)
        if n < 2:
            return MatrixResponse(
                status="success",
                provider=self.provider,
                location_count=n,
                location_ids=[loc.id or f"LOC-{i}" for i, loc in enumerate(locations)],
                location_names=[loc.name or f"Point {i}" for i, loc in enumerate(locations)],
                distances_matrix_m=[[0.0]],
                durations_matrix_s=[[0.0]],
                message="Single location; zero cost matrix.",
            )

        coord_pairs = [f"{loc.lng:.5f},{loc.lat:.5f}" for loc in locations]
        coords_str = ";".join(coord_pairs)
        url = f"{self.base_url}/table/v1/driving/{coords_str}?annotations=duration,distance"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers={"User-Agent": "VEDIORA-IROS/1.0"})

            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok":
                    distances = data.get("distances", [])
                    durations = data.get("durations", [])
                    return MatrixResponse(
                        status="success",
                        provider=self.provider,
                        location_count=n,
                        location_ids=[loc.id or f"LOC-{i}" for i, loc in enumerate(locations)],
                        location_names=[loc.name or f"Point {i}" for i, loc in enumerate(locations)],
                        distances_matrix_m=distances,
                        durations_matrix_s=durations,
                        message="Pairwise road distance and travel time matrix calculated successfully.",
                    )

            logger.warning(f"OSRM Table service failed with status {response.status_code}")
            return self._fallback_geometric_matrix(locations)

        except Exception as exc:
            logger.exception(f"Matrix calculation exception: {exc}")
            return self._fallback_geometric_matrix(locations)

    def _fallback_geometric_route(
        self, locations: List[LocationPoint], request: RouteRequest, message: str
    ) -> RouteResponse:
        """
        Fallback when OSRM server is temporarily unreachable.
        Computes accurate Haversine distances to preserve application stability.
        """
        coords = [[loc.lng, loc.lat] for loc in locations]
        total_dist_m = 0.0
        legs: List[RouteLeg] = []

        for i in range(len(locations) - 1):
            p1 = locations[i]
            p2 = locations[i + 1]
            dist = self._haversine(p1.lat, p1.lng, p2.lat, p2.lng)
            # Assuming average urban road speed 30 km/h (8.33 m/s)
            dur = dist / 8.33
            total_dist_m += dist
            legs.append(
                RouteLeg(
                    from_location_id=p1.id or f"LOC-{i}",
                    to_location_id=p2.id or f"LOC-{i+1}",
                    from_name=p1.name or f"Stop {i}",
                    to_name=p2.name or f"Stop {i+1}",
                    distance_m=round(dist, 1),
                    duration_s=round(dur, 1),
                    routing_weight=round(dur, 1),
                )
            )

        total_dur_s = total_dist_m / 8.33
        return RouteResponse(
            status="fallback",
            provider="GeometricFallback",
            scenario_id=request.scenario_id,
            round_trip=request.round_trip,
            total_distance_m=round(total_dist_m, 1),
            total_distance_km=round(total_dist_m / 1000.0, 2),
            total_duration_s=round(total_dur_s, 1),
            total_duration_min=round(total_dur_s / 60.0, 1),
            routing_weight=round(total_dur_s, 2),
            num_stops=len(request.delivery_stops),
            sequence=[loc.name or f"Stop {i}" for i, loc in enumerate(locations)],
            geometry=RouteGeometry(type="LineString", coordinates=coords),
            legs=legs,
            message=message,
        )

    def _fallback_geometric_matrix(self, locations: List[LocationPoint]) -> MatrixResponse:
        """Fallback pairwise matrix computation using Haversine formula."""
        n = len(locations)
        distances: List[List[float]] = [[0.0] * n for _ in range(n)]
        durations: List[List[float]] = [[0.0] * n for _ in range(n)]

        for i in range(n):
            for j in range(n):
                if i != j:
                    dist = self._haversine(locations[i].lat, locations[i].lng, locations[j].lat, locations[j].lng)
                    distances[i][j] = round(dist, 1)
                    durations[i][j] = round(dist / 8.33, 1)

        return MatrixResponse(
            status="fallback",
            provider="GeometricFallback",
            location_count=n,
            location_ids=[loc.id or f"LOC-{i}" for i, loc in enumerate(locations)],
            location_names=[loc.name or f"Point {i}" for i, loc in enumerate(locations)],
            distances_matrix_m=distances,
            durations_matrix_s=durations,
            message="Pairwise matrix estimated via Haversine geodesic calculation.",
        )

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance between two coordinate pairs on Earth in meters."""
        r = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c


# Global routing service singleton
routing_service = RoutingService()
