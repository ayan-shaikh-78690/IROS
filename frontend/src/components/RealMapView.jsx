import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Crosshair,
  Building2,
  Navigation,
  Globe2,
  Loader2,
} from 'lucide-react';
import { useScenario, INDIAN_CITIES } from '../context/ScenarioContext';
import { useTheme } from '../context/ThemeContext';
import { ACTIVE_MAP_PROVIDER } from '../config/mapConfig';

// Defensive check to prevent Leaflet _leaflet_pos error on unmounted elements
if (typeof L !== 'undefined' && L.DomUtil && !L.DomUtil._patchedPosition) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el) {
    if (!el) return new L.Point(0, 0);
    return originalGetPosition.call(this, el);
  };
  L.DomUtil._patchedPosition = true;
}

export default function RealMapView({ onMapClickModeChange }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylineLayerRef = useRef(null);

  const {
    scenario,
    selectedCityId,
    selectCity,
    mapClickMode,
    setMapClickMode,
    setDepot,
    addCustomer,
    removeCustomer,
    mapFocusTarget,
    currentRoute,
    isRoutingLoading,
    routingError,
    calculateRoute,
    optimizedRoutes,
    activeRouteView,
    setActiveRouteView,
  } = useScenario();

  const { isDark } = useTheme();

  // Create or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let initTimer = null;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const city = INDIAN_CITIES.find((c) => c.id === selectedCityId) || INDIAN_CITIES[0];
      const initialCenter = scenario.depot ? [scenario.depot.lat, scenario.depot.lng] : city.center;
      const initialZoom = city.zoom || 12;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false, // We provide custom glass zoom controls
        attributionControl: true,
      });

      // Layer groups for markers and polyline
      const markersLayer = L.layerGroup().addTo(map);
      const polylineLayer = L.layerGroup().addTo(map);

      markersLayerRef.current = markersLayer;
      polylineLayerRef.current = polylineLayer;
      mapInstanceRef.current = map;

      // Handle map click
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const currentMode = mapContainerRef.current?.getAttribute('data-click-mode') || 'stop';

        if (currentMode === 'depot') {
          setDepot({
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            name: `Depot (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          });
        } else {
          // Add Delivery Stop (addCustomer automatically calculates sequential index)
          addCustomer({
            lat: Number(lat.toFixed(5)),
            lng: Number(lng.toFixed(5)),
            demand: 15,
            earliestArrival: '09:00',
            latestArrival: '12:00',
          });
        }
      });

      // Invalidate size immediately and after mount to prevent grey/clipped tiles
      initTimer = setTimeout(() => {
        if (mapInstanceRef.current && mapInstanceRef.current._container) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch (_) {}
        }
      }, 150);

      // Observe size changes to ensure leaflet tiles never have blank tiles
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (mapInstanceRef.current && mapInstanceRef.current._container) {
            try {
              mapInstanceRef.current.invalidateSize();
            } catch (_) {}
          }
        });
        ro.observe(mapContainerRef.current);
        map._resizeObserver = ro;
      }
    }

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (mapInstanceRef.current) {
        if (mapInstanceRef.current._resizeObserver) {
          mapInstanceRef.current._resizeObserver.disconnect();
        }
        try {
          mapInstanceRef.current.stop();
        } catch (_) {}
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fly to selected city when city selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCityId) return;
    const city = INDIAN_CITIES.find((c) => c.id === selectedCityId);
    if (city && city.center) {
      map.flyTo(city.center, city.zoom || 12, { duration: 1.0 });
    }
  }, [selectedCityId]);

  // Smoothly fly map to focus target when a location is manually set or added
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapFocusTarget) return;
    map.flyTo([mapFocusTarget.lat, mapFocusTarget.lng], mapFocusTarget.zoom || 13, {
      duration: 1.0,
    });
  }, [mapFocusTarget]);

  // Auto fit map bounds when real road route or optimized fleet routes arrive
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRouteView === 'optimized' && optimizedRoutes && optimizedRoutes.length > 0) {
      const allCoords = [];
      optimizedRoutes.forEach((r) => {
        if (r.geometry?.coordinates?.length) {
          r.geometry.coordinates.forEach(([lng, lat]) => allCoords.push([lat, lng]));
        }
      });
      if (allCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 15 });
        return;
      }
    }

    if (!currentRoute?.geometry?.coordinates?.length) return;
    const roadCoords = currentRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (roadCoords.length > 1) {
      const bounds = L.latLngBounds(roadCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [currentRoute, optimizedRoutes, activeRouteView]);

  // Update container attribute for click mode
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.setAttribute('data-click-mode', mapClickMode);
    }
  }, [mapClickMode]);

  // Update Tile Layer using standard OpenStreetMap tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(ACTIVE_MAP_PROVIDER.url, {
      maxZoom: ACTIVE_MAP_PROVIDER.maxZoom || 19,
      minZoom: ACTIVE_MAP_PROVIDER.minZoom || 3,
      attribution: ACTIVE_MAP_PROVIDER.attribution,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, []);

  // Synchronize Markers & Real Road-Following Route
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    const polylineLayer = polylineLayerRef.current;
    const map = mapInstanceRef.current;
    if (!markersLayer || !polylineLayer || !map) return;

    markersLayer.clearLayers();
    polylineLayer.clearLayers();

    const coordinatesList = [];

    // 1. Render Depot Marker
    if (scenario.depot && scenario.depot.lat && scenario.depot.lng) {
      const depotLatLng = [scenario.depot.lat, scenario.depot.lng];
      coordinatesList.push(depotLatLng);

      const depotIcon = L.divIcon({
        className: 'iros-depot-div-icon',
        html: `
          <div class="iros-depot-marker">
            <div class="iros-depot-pulse"></div>
            <div class="iros-depot-pin">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18"/>
                <path d="M19 21v-4"/>
                <path d="M19 17a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v4"/>
                <path d="M3 7l9-4 9 4v10"/>
              </svg>
            </div>
            <span class="iros-depot-tag">DEPOT</span>
          </div>
        `,
        iconSize: [44, 48],
        iconAnchor: [22, 44],
        popupAnchor: [0, -42],
      });

      const depotMarker = L.marker(depotLatLng, { icon: depotIcon }).addTo(markersLayer);

      depotMarker.bindPopup(`
        <div class="iros-map-popup">
          <div class="iros-popup-badge depot">CENTRAL FLEET DEPOT</div>
          <h4 class="iros-popup-title">${scenario.depot.name || 'Central Hub'}</h4>
          <div class="iros-popup-meta">
            <div><span>Latitude:</span> <b>${scenario.depot.lat.toFixed(5)}°N</b></div>
            <div><span>Longitude:</span> <b>${scenario.depot.lng.toFixed(5)}°E</b></div>
          </div>
          <div class="iros-popup-footer">
            Starting &amp; ending point for all delivery vehicles
          </div>
        </div>
      `);
    }

    // 2. Render Delivery Stop Markers (Numbered: 1, 2, 3...)
    if (scenario.customers && scenario.customers.length > 0) {
      scenario.customers.forEach((stop, index) => {
        if (!stop.lat || !stop.lng) return;
        const stopLatLng = [stop.lat, stop.lng];
        coordinatesList.push(stopLatLng);

        const stopNumber = index + 1;

        const stopIcon = L.divIcon({
          className: 'iros-stop-div-icon',
          html: `
            <div class="iros-stop-marker">
              <div class="iros-stop-badge">${stopNumber}</div>
              <span class="iros-stop-label">Stop ${stopNumber}</span>
            </div>
          `,
          iconSize: [36, 42],
          iconAnchor: [18, 40],
          popupAnchor: [0, -38],
        });

        const stopMarker = L.marker(stopLatLng, { icon: stopIcon }).addTo(markersLayer);

        // Bind popup with delete action
        const popupContent = document.createElement('div');
        popupContent.className = 'iros-map-popup';
        popupContent.innerHTML = `
          <div class="iros-popup-badge stop">DELIVERY STOP #${stopNumber}</div>
          <h4 class="iros-popup-title">${stop.name || `Customer Stop ${stopNumber}`}</h4>
          <div class="iros-popup-meta">
            <div><span>Payload Demand:</span> <b>${stop.demand || 15} units</b></div>
            <div><span>Time Window:</span> <b>${stop.earliestArrival || '09:00'} – ${stop.latestArrival || '12:00'}</b></div>
            <div><span>Coordinates:</span> <b>${Number(stop.lat).toFixed(4)}°N, ${Number(stop.lng).toFixed(4)}°E</b></div>
          </div>
          <div style="margin-top: 0.65rem; display: flex; justify-content: flex-end;">
            <button class="iros-popup-delete-btn" id="del-stop-${stop.id}">
              Remove Stop
            </button>
          </div>
        `;

        // Attach listener for delete button inside Leaflet popup
        stopMarker.bindPopup(popupContent).on('popupopen', () => {
          const btn = document.getElementById(`del-stop-${stop.id}`);
          if (btn) {
            btn.onclick = () => {
              removeCustomer(stop.id);
            };
          }
        });
      });
    }

    // 3. Render REAL ROAD-FOLLOWING ROUTES (M2.2-A / M3 / M4)
    const VEHICLE_COLORS = [
      { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)' }, // Cyan
      { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)' }, // Purple
      { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.35)' }, // Emerald
      { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)' }, // Amber
      { stroke: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)' }, // Pink
    ];

    if (activeRouteView === 'optimized' && optimizedRoutes && optimizedRoutes.length > 0) {
      optimizedRoutes.forEach((route, idx) => {
        if (!route.stops || route.stops.length === 0) return;
        const colorSet = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
        const vehCap = route.capacity_limit || route.vehicle_capacity || scenario.vehicleCapacity || 100;
        const payload = route.total_demand_loaded != null ? route.total_demand_loaded : (route.payload_demand || 0);
        const remaining = Math.max(0, vehCap - payload);
        const utilPct = vehCap > 0 ? Math.round((payload / vehCap) * 100) : 0;
        const isFeasible = (route.is_capacity_feasible ?? (payload <= vehCap)) && ((route.time_window_delays_s || route.time_window_violations || 0) === 0);
        const distKm = (route.distance_m / 1000).toFixed(1);
        const durMin = ((route.total_duration_s || route.duration_s || 0) / 60).toFixed(0);

        if (route.geometry?.coordinates?.length > 1) {
          const roadPath = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          L.polyline(roadPath, {
            color: colorSet.glow,
            weight: 8,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(polylineLayer);

          const polyline = L.polyline(roadPath, {
            color: colorSet.stroke,
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(polylineLayer);

          polyline.bindTooltip(
            `Vehicle ${route.vehicle_id}: ${route.stops.length} stops • ${distKm} km • ${durMin} min • ${utilPct}% cap (${isFeasible ? 'FEASIBLE' : 'PENALIZED'})`,
            { sticky: true, className: 'iros-polyline-tooltip' }
          );

          polyline.bindPopup(`
            <div class="iros-map-popup">
              <div class="iros-popup-badge" style="background: ${colorSet.stroke}; color: #000; font-weight: 700;">
                VEHICLE ${route.vehicle_id}
              </div>
              <h4 class="iros-popup-title">${route.vehicle_name || `Fleet ${route.vehicle_type?.toUpperCase() || 'VAN'}`}</h4>
              <div class="iros-popup-meta">
                <div><span>Payload Capacity:</span> <b>${vehCap} kg</b></div>
                <div><span>Assigned Demand:</span> <b>${payload} kg</b></div>
                <div><span>Remaining Space:</span> <b>${remaining} kg</b></div>
                <div><span>Capacity Utilization:</span> <b>${utilPct}%</b></div>
                <div><span>Customers Served:</span> <b>${route.stops.length} stops</b></div>
                <div><span>Road Distance:</span> <b>${distKm} km</b></div>
                <div><span>Route Duration:</span> <b>${durMin} min</b></div>
                <div><span>Feasibility Status:</span> <b style="color: ${isFeasible ? '#34d399' : '#fbbf24'};">${isFeasible ? 'FEASIBLE' : 'PENALIZED'}</b></div>
              </div>
            </div>
          `);
        } else {
          const pts = [];
          if (scenario.depot?.lat && scenario.depot?.lng) {
            pts.push([scenario.depot.lat, scenario.depot.lng]);
          }
          const custMap = new Map(scenario.customers.map((c) => [c.id, c]));
          route.stops.forEach((sid) => {
            const cust = custMap.get(sid);
            if (cust?.lat && cust?.lng) pts.push([cust.lat, cust.lng]);
          });
          if (scenario.depot?.lat && scenario.depot?.lng && pts.length > 1) {
            pts.push([scenario.depot.lat, scenario.depot.lng]);
          }
          if (pts.length > 1) {
            L.polyline(pts, {
              color: colorSet.stroke,
              weight: 3.5,
              opacity: 0.9,
              dashArray: '6, 6',
            }).addTo(polylineLayer);
          }
        }
      });
    } else if (
      currentRoute &&
      currentRoute.geometry &&
      currentRoute.geometry.coordinates &&
      currentRoute.geometry.coordinates.length > 1
    ) {
      // GeoJSON is [lng, lat], Leaflet polyline expects [lat, lng]
      const roadPath = currentRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      // Ambient glow underlay for visual depth
      L.polyline(roadPath, {
        color: isDark ? 'rgba(14, 165, 233, 0.4)' : 'rgba(2, 132, 199, 0.3)',
        weight: 8,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(polylineLayer);

      // Primary crisp road line
      const roadPolyline = L.polyline(roadPath, {
        color: isDark ? '#38bdf8' : '#0284c7',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(polylineLayer);

      roadPolyline.bindTooltip(
        `Current Road Route: ${currentRoute.total_distance_km} km • ${currentRoute.total_duration_min} min (${currentRoute.provider})`,
        {
          sticky: true,
          className: 'iros-polyline-tooltip',
        }
      );
    } else if (coordinatesList.length > 1) {
      // Subtle temporary dotted line only while road route is being calculated
      const fullRoutePath = [...coordinatesList];
      if (scenario.depot && coordinatesList.length > 1) {
        fullRoutePath.push([scenario.depot.lat, scenario.depot.lng]);
      }

      L.polyline(fullRoutePath, {
        color: isDark ? 'rgba(14, 165, 233, 0.45)' : 'rgba(2, 132, 199, 0.45)',
        weight: 2,
        opacity: 0.5,
        dashArray: '5, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(polylineLayer);
    }
  }, [scenario.depot, scenario.customers, currentRoute, optimizedRoutes, activeRouteView, isDark]);

  // Map Navigation Functions
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleZoomToAhmedabad = () => {
    const ahmedabad = INDIAN_CITIES.find((c) => c.id === 'ahmedabad');
    if (ahmedabad && mapInstanceRef.current) {
      selectCity('ahmedabad');
      mapInstanceRef.current.flyTo(ahmedabad.center, 12, { duration: 1.2 });
    }
  };

  const handleZoomToIndia = () => {
    const india = INDIAN_CITIES.find((c) => c.id === 'india-overview');
    if (india && mapInstanceRef.current) {
      selectCity('india-overview');
      mapInstanceRef.current.flyTo(india.center, 5, { duration: 1.4 });
    }
  };

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRouteView === 'optimized' && optimizedRoutes && optimizedRoutes.length > 0) {
      const allCoords = [];
      optimizedRoutes.forEach((r) => {
        if (r.geometry?.coordinates?.length) {
          r.geometry.coordinates.forEach(([lng, lat]) => allCoords.push([lat, lng]));
        }
      });
      if (allCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 15, duration: 1.0 });
        return;
      }
    }

    if (currentRoute?.geometry?.coordinates?.length > 1) {
      const roadCoords = currentRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      map.fitBounds(L.latLngBounds(roadCoords), { padding: [50, 50], maxZoom: 15, duration: 1.0 });
      return;
    }

    const points = [];
    if (scenario.depot?.lat && scenario.depot?.lng) {
      points.push([scenario.depot.lat, scenario.depot.lng]);
    }
    if (scenario.customers) {
      scenario.customers.forEach((c) => {
        if (c.lat && c.lng) points.push([c.lat, c.lng]);
      });
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.0 });
    }
  };

  return (
    <div className="iros-map-wrapper">
      {/* Floating Toolbar Above Map */}
      <div className="iros-map-toolbar">
        {/* Placement Mode Switch */}
        <div className="iros-mode-switch">
          <button
            type="button"
            className={`iros-mode-btn ${mapClickMode === 'stop' ? 'active' : ''}`}
            onClick={() => setMapClickMode('stop')}
            title="Click anywhere on the map to add delivery stop"
            aria-label="Add Stop mode"
          >
            <MapPin size={15} />
            <span>Add Stop</span>
            {mapClickMode === 'stop' && <span className="active-dot"></span>}
          </button>

          <button
            type="button"
            className={`iros-mode-btn ${mapClickMode === 'depot' ? 'active' : ''}`}
            onClick={() => setMapClickMode('depot')}
            title="Click anywhere on the map to set central depot"
            aria-label="Set Depot mode"
          >
            <Building2 size={15} />
            <span>Set Depot</span>
            {mapClickMode === 'depot' && <span className="active-dot"></span>}
          </button>
        </div>

        {/* View Presets & Calculate Route Buttons */}
        <div className="iros-map-actions">
          {/* Toggle between single road sequence and multi-vehicle optimized tours */}
          {optimizedRoutes && optimizedRoutes.length > 0 && (
            <button
              type="button"
              className={`iros-action-pill ${activeRouteView === 'optimized' ? 'active' : ''}`}
              onClick={() => setActiveRouteView(activeRouteView === 'optimized' ? 'road' : 'optimized')}
              title="Toggle between single road sequence and multi-vehicle optimized tours"
              style={{
                borderColor: activeRouteView === 'optimized' ? 'var(--cyan-bright)' : undefined,
                color: activeRouteView === 'optimized' ? 'var(--cyan-bright)' : undefined,
              }}
            >
              <Layers size={13} />
              <span>{activeRouteView === 'optimized' ? 'Fleet Tours' : 'Single Road'}</span>
            </button>
          )}

          <button
            type="button"
            className="iros-action-pill"
            onClick={() => calculateRoute()}
            disabled={isRoutingLoading || !scenario.depot || scenario.customers.length === 0}
            title="Calculate real road route via OpenStreetMap OSRM"
          >
            {isRoutingLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Navigation size={13} />
            )}
            <span>{isRoutingLoading ? 'Routing...' : 'Road Route'}</span>
          </button>

          <button
            type="button"
            className="iros-action-pill"
            onClick={handleZoomToAhmedabad}
            title="Focus Ahmedabad–Gandhinagar demo region"
          >
            <Compass size={13} />
            <span>Ahmedabad Demo</span>
          </button>

          <button
            type="button"
            className="iros-action-pill"
            onClick={handleZoomToIndia}
            title="Zoom out to whole India view"
          >
            <Globe2 size={13} />
            <span>India View</span>
          </button>

          <button
            type="button"
            className="iros-action-pill"
            onClick={handleFitBounds}
            title="Fit view to show complete road route or all stops"
          >
            <Maximize2 size={13} />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      {/* Helper Banner for User Interaction */}
      <div className="iros-map-helper-banner">
        <span className="pulse-indicator"></span>
        {isRoutingLoading ? (
          <span>Calculating real road route via OpenStreetMap (OSRM)...</span>
        ) : activeRouteView === 'optimized' && optimizedRoutes ? (
          <span>
            <b>Optimized Multi-Vehicle Fleet:</b> Rendering {optimizedRoutes.filter((r) => r.stops?.length > 0).length} color-coded vehicle tours generated by discrete metaheuristic optimizer.
          </span>
        ) : currentRoute ? (
          <span>
            <b>Road Route:</b> {currentRoute.total_distance_km} km • {currentRoute.total_duration_min} min • {currentRoute.legs.length} legs via real streets.
          </span>
        ) : (
          <span>
            <b>Map Mode:</b> Click on any road or neighborhood to {mapClickMode === 'depot' ? 'position your Central Fleet Depot' : 'add a numbered Delivery Stop'}.
          </span>
        )}
      </div>

      {/* Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="iros-leaflet-canvas" tabIndex={0} aria-label="Interactive transportation geographic map"></div>

      {/* Custom Glass Floating Zoom Controls */}
      <div className="iros-map-zoom-controls">
        <button
          type="button"
          onClick={handleZoomIn}
          className="iros-zoom-btn"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <div className="divider"></div>
        <button
          type="button"
          onClick={handleZoomOut}
          className="iros-zoom-btn"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
      </div>

      {/* Sequence Ribbon Indicator at the bottom */}
      <div className="iros-map-sequence-ribbon">
        <span className="ribbon-label">
          {activeRouteView === 'optimized' && optimizedRoutes ? 'Fleet Dispatch:' : 'Dispatch Sequence:'}
        </span>
        <div className="ribbon-chain">
          {activeRouteView === 'optimized' && optimizedRoutes ? (
            optimizedRoutes
              .filter((r) => r.stops && r.stops.length > 0)
              .map((r, idx) => {
                const colors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
                const c = colors[idx % colors.length];
                return (
                  <span
                    key={r.vehicle_id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.06)',
                      borderLeft: `3px solid ${c}`,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.725rem',
                    }}
                  >
                    <b>Veh {r.vehicle_id}:</b> {r.stops.length} stops ({r.payload_demand} units)
                  </span>
                );
              })
          ) : (
            <>
              <span className="ribbon-node depot">DEPOT</span>
              {scenario.customers.length === 0 ? (
                <span className="ribbon-empty">→ Click map to place Stop 1</span>
              ) : (
                scenario.customers.map((c, i) => (
                  <React.Fragment key={c.id}>
                    <span className="ribbon-arrow">→</span>
                    <span className="ribbon-node stop" title={c.name}>Stop {i + 1}</span>
                  </React.Fragment>
                ))
              )}
              {scenario.customers.length > 0 && (
                <>
                  <span className="ribbon-arrow">→</span>
                  <span className="ribbon-node return">Return Hub</span>
                </>
              )}
            </>
          )}
        </div>
        {activeRouteView !== 'optimized' && currentRoute && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.725rem',
              fontWeight: 700,
              color: 'var(--cyan-bright)',
              background: 'rgba(14, 165, 233, 0.18)',
              padding: '0.2rem 0.5rem',
              borderRadius: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            {currentRoute.total_distance_km} km • {currentRoute.total_duration_min} min
          </span>
        )}
      </div>
    </div>
  );
}
