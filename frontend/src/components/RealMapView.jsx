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
  } = useScenario();

  const { isDark } = useTheme();

  // Create or update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

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
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Observe size changes to ensure leaflet tiles never have blank tiles
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        ro.observe(mapContainerRef.current);
        map._resizeObserver = ro;
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        if (mapInstanceRef.current._resizeObserver) {
          mapInstanceRef.current._resizeObserver.disconnect();
        }
        mapInstanceRef.current.remove();
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

  // Auto fit map bounds when real road route arrives
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentRoute?.geometry?.coordinates?.length) return;
    const roadCoords = currentRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (roadCoords.length > 1) {
      const bounds = L.latLngBounds(roadCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [currentRoute]);

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

    // 3. Render REAL ROAD-FOLLOWING ROUTE (M2.2-A)
    // Replaces straight lines with authentic street geometry returned by OSRM
    if (
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
  }, [scenario.depot, scenario.customers, currentRoute, isDark]);

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
        <span className="ribbon-label">Dispatch Sequence:</span>
        <div className="ribbon-chain">
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
        </div>
        {currentRoute && (
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
