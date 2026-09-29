import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building2,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Sliders,
  Truck,
  Bike,
  Layers,
  Info,
  Clock,
  Compass,
  Map as MapIcon,
  Globe2,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Package,
  Crosshair,
  Maximize2,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  PenTool,
  Loader2,
  Route as RouteIcon,
} from 'lucide-react';
import {
  useScenario,
  SCENARIO_PRESETS,
  VEHICLE_TYPES,
  INDIAN_CITIES,
} from '../context/ScenarioContext';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import RealMapView from '../components/RealMapView';
import VrpInspectionPanel from '../components/VrpInspectionPanel';
import {
  getLandmarkSuggestions,
  geocodeAddress,
  AHMEDABAD_GANDHINAGAR_LANDMARKS,
} from '../utils/geocoding';
import { fetchGraphSchema } from '../services/api';

export default function ScenarioLab() {
  const {
    scenario,
    selectedCityId,
    selectCity,
    mapClickMode,
    setMapClickMode,
    activePresetId,
    loadPreset,
    setVehicleType,
    updateScenario,
    addCustomer,
    removeCustomer,
    updateCustomer,
    setDepot,
    clearAllStops,
    resetScenario,
    focusOnMap,
    currentRoute,
    isRoutingLoading,
    routingError,
    calculateRoute,
    calculateVrpSolution,
    isRoundTrip,
    setIsRoundTrip,
  } = useScenario();

  // Collapsible panel states
  const [isFleetExpanded, setIsFleetExpanded] = useState(false);
  const [isPresetsExpanded, setIsPresetsExpanded] = useState(false);
  const [isTechPanelExpanded, setIsTechPanelExpanded] = useState(true);

  // Dual entry modes: 'map' or 'manual'
  const [depotEntryMode, setDepotEntryMode] = useState('map');
  const [stopEntryMode, setStopEntryMode] = useState('map');

  // Manual Depot Form State
  const [manualDepotQuery, setManualDepotQuery] = useState('');
  const [manualDepotName, setManualDepotName] = useState('');
  const [manualDepotLat, setManualDepotLat] = useState('');
  const [manualDepotLng, setManualDepotLng] = useState('');
  const [depotSuggestions, setDepotSuggestions] = useState([]);
  const [isGeocodingDepot, setIsGeocodingDepot] = useState(false);

  // Manual Stop Form State
  const [manualStopQuery, setManualStopQuery] = useState('');
  const [manualStopName, setManualStopName] = useState('');
  const [manualStopLat, setManualStopLat] = useState('');
  const [manualStopLng, setManualStopLng] = useState('');
  const [manualStopDemand, setManualStopDemand] = useState(15);
  const [manualStopEarliest, setManualStopEarliest] = useState('09:00');
  const [manualStopLatest, setManualStopLatest] = useState('12:00');
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [isGeocodingStop, setIsGeocodingStop] = useState(false);

  // Graph schema status from backend
  const [graphSchema, setGraphSchema] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchGraphSchema().then((schema) => {
      if (isMounted && schema) {
        setGraphSchema(schema);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update manual depot inputs if preset changes
  useEffect(() => {
    if (scenario.depot) {
      setManualDepotName(scenario.depot.name || '');
      setManualDepotLat(String(scenario.depot.lat || ''));
      setManualDepotLng(String(scenario.depot.lng || ''));
    }
  }, [scenario.depot]);

  // Handle Depot Autocomplete Search
  const handleDepotQueryChange = (val) => {
    setManualDepotQuery(val);
    if (val.trim().length > 1) {
      setDepotSuggestions(getLandmarkSuggestions(val));
    } else {
      setDepotSuggestions([]);
    }
  };

  const handleSelectDepotLandmark = (landmark) => {
    setManualDepotName(landmark.name);
    setManualDepotQuery(landmark.name);
    setManualDepotLat(String(landmark.lat));
    setManualDepotLng(String(landmark.lng));
    setDepotSuggestions([]);
  };

  // Submit Manual Depot
  const handleSetManualDepot = async (e) => {
    if (e) e.preventDefault();
    let lat = parseFloat(manualDepotLat);
    let lng = parseFloat(manualDepotLng);
    let name = manualDepotName.trim() || manualDepotQuery.trim() || 'Central Fleet Depot';

    // If coordinates are missing but text query exists, attempt geocode
    if ((isNaN(lat) || isNaN(lng)) && manualDepotQuery.trim()) {
      setIsGeocodingDepot(true);
      const geocoded = await geocodeAddress(manualDepotQuery.trim());
      setIsGeocodingDepot(false);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        name = geocoded.displayName || name;
        setManualDepotLat(String(lat));
        setManualDepotLng(String(lng));
      }
    }

    if (!isNaN(lat) && !isNaN(lng)) {
      const newDepot = {
        id: 'DEPOT-001',
        name,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        type: 'depot',
      };
      setDepot(newDepot);
      focusOnMap(lat, lng, 14);
      setDepotSuggestions([]);
      // Recalculate route with updated depot
      calculateRoute({ ...scenario, depot: newDepot });
    }
  };

  // Handle Stop Autocomplete Search
  const handleStopQueryChange = (val) => {
    setManualStopQuery(val);
    if (val.trim().length > 1) {
      setStopSuggestions(getLandmarkSuggestions(val));
    } else {
      setStopSuggestions([]);
    }
  };

  const handleSelectStopLandmark = (landmark) => {
    setManualStopName(landmark.name);
    setManualStopQuery(landmark.name);
    setManualStopLat(String(landmark.lat));
    setManualStopLng(String(landmark.lng));
    setStopSuggestions([]);
  };

  // Submit Manual Delivery Stop
  const handleAddManualStop = async (e) => {
    if (e) e.preventDefault();
    let lat = parseFloat(manualStopLat);
    let lng = parseFloat(manualStopLng);
    const nextNum = scenario.customers.length + 1;
    let name = manualStopName.trim() || manualStopQuery.trim() || `Delivery Stop ${nextNum}`;

    if ((isNaN(lat) || isNaN(lng)) && manualStopQuery.trim()) {
      setIsGeocodingStop(true);
      const geocoded = await geocodeAddress(manualStopQuery.trim());
      setIsGeocodingStop(false);
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        name = geocoded.displayName || name;
      }
    }

    // Graceful regional coordinate fallback if not entered
    if (isNaN(lat) || isNaN(lng)) {
      const baseLat = scenario.depot?.lat || 23.0338;
      const baseLng = scenario.depot?.lng || 72.5850;
      const angle = (nextNum * 47) % 360;
      const rad = (angle * Math.PI) / 180;
      lat = Number((baseLat + 0.018 * Math.cos(rad)).toFixed(5));
      lng = Number((baseLng + 0.018 * Math.sin(rad)).toFixed(5));
    }

    const usedStopIds = new Set(scenario.customers.map((stop) => stop.id));
    let stopIdNumber = nextNum;
    let stopId = `CUST-${String(stopIdNumber).padStart(3, '0')}`;
    while (usedStopIds.has(stopId)) {
      stopIdNumber += 1;
      stopId = `CUST-${String(stopIdNumber).padStart(3, '0')}`;
    }

    const newStop = {
      id: stopId,
      name,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      demand: Number(manualStopDemand) || 15,
      earliestArrival: manualStopEarliest || '09:00',
      latestArrival: manualStopLatest || '12:00',
      type: 'delivery_stop',
    };

    addCustomer(newStop);
    focusOnMap(lat, lng, 14);

    // Reset fields for convenient next stop entry
    setManualStopQuery('');
    setManualStopName('');
    setManualStopLat('');
    setManualStopLng('');
    setStopSuggestions([]);

    // Recalculate route with appended stop
    calculateRoute({
      ...scenario,
      customers: [...scenario.customers, newStop],
    });
  };

  // Status computation for summary
  const hasDepot = !!(scenario.depot && scenario.depot.lat && scenario.depot.lng);
  const numStops = scenario.customers.length;
  const isRouteReady = hasDepot && numStops > 0;

  // Current city details
  const currentCity =
    INDIAN_CITIES.find((c) => c.id === selectedCityId) || INDIAN_CITIES[0];

  // Current vehicle archetype
  const currentVehicleTypeInfo =
    VEHICLE_TYPES[scenario.vehicleType?.toUpperCase()] || VEHICLE_TYPES.VAN;

  // Clean depot display name
  const depotDisplayName = scenario.depot?.name
    ? scenario.depot.name.replace(/\(.*?\)/g, '').trim()
    : `${currentCity.name} Logistics Hub`;

  return (
    <div
      className="content-wrapper"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '0.45rem',
            }}
          >
            <Badge variant="cyan">M2.2-A Real Road Routing Engine</Badge>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
              }}
            >
              TEAM VEDIORA • SIH 2026 #26137
            </span>
          </div>
          <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
            Scenario Lab
          </h1>
          <p className="text-body" style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Real road-following route calculation and transportation network modeling.
          </p>
        </div>

        {/* Global Action: Reset Scenario */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={resetScenario}
            title="Reset to default Ahmedabad demo scenario"
            aria-label="Reset scenario"
          >
            <RotateCcw size={14} />
            <span>Reset Scenario</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="scenario-lab-layout">
        {/* =========================================================================
            LEFT COLUMN: Route Setup / Dual-Entry Controls / Technical Graph Panel
            ========================================================================= */}
        <div className="scenario-controls-col">
          {/* 1. SCENARIO SUMMARY PANEL (With Real Road Route Metrics & Action) */}
          <GlassCard className="scenario-summary-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={17} color="var(--cyan-core)" />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Scenario Summary
                </span>
              </div>
              <span
                className={`scenario-summary-status ${
                  isRoutingLoading
                    ? 'pending'
                    : currentRoute
                    ? 'ready'
                    : isRouteReady
                    ? 'ready'
                    : 'pending'
                }`}
                aria-label={`Route status: ${
                  isRoutingLoading
                    ? 'Calculating road route...'
                    : currentRoute
                    ? 'Road Route Ready'
                    : isRouteReady
                    ? 'Ready for routing'
                    : 'Awaiting delivery stops'
                }`}
              >
                {isRoutingLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : currentRoute ? (
                  <CheckCircle2 size={13} />
                ) : isRouteReady ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                <span>
                  {isRoutingLoading
                    ? 'Calculating road route...'
                    : currentRoute
                    ? 'Road Route Ready'
                    : isRouteReady
                    ? 'Ready for routing'
                    : 'Awaiting delivery stops'}
                </span>
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="scenario-summary-grid">
              {/* Total Road Distance */}
              <div className="scenario-summary-item">
                <span className="scenario-summary-label">Total Distance</span>
                <span
                  className="scenario-summary-val"
                  style={{ color: 'var(--cyan-core)' }}
                  title={currentRoute ? `${currentRoute.total_distance_km} km` : 'Pending calculation'}
                >
                  {currentRoute ? `${currentRoute.total_distance_km} km` : '—'}
                </span>
              </div>

              {/* Estimated Travel Time */}
              <div className="scenario-summary-item">
                <span className="scenario-summary-label">Travel Time</span>
                <span
                  className="scenario-summary-val"
                  style={{ color: 'var(--indigo-core)' }}
                  title={currentRoute ? `${currentRoute.total_duration_min} min` : 'Pending calculation'}
                >
                  {currentRoute ? `${currentRoute.total_duration_min} min` : '—'}
                </span>
              </div>

              {/* Delivery Stops Count */}
              <div className="scenario-summary-item">
                <span className="scenario-summary-label">Delivery Stops</span>
                <span className="scenario-summary-val">
                  {numStops}
                </span>
              </div>

              {/* Route Status */}
              <div className="scenario-summary-item">
                <span className="scenario-summary-label">Route Status</span>
                <span
                  className="scenario-summary-val"
                  style={{
                    fontSize: '0.85rem',
                    color: currentRoute
                      ? 'var(--status-success)'
                      : isRouteReady
                      ? 'var(--cyan-core)'
                      : 'var(--status-warning)',
                  }}
                >
                  {isRoutingLoading
                    ? 'Calculating...'
                    : currentRoute
                    ? 'Road Route Ready'
                    : isRouteReady
                    ? 'Ready for routing'
                    : 'Awaiting stops'}
                </span>
              </div>
            </div>

            {/* Calculate / Refresh Road Route Primary Button */}
            <div style={{ marginTop: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  calculateRoute();
                  calculateVrpSolution();
                }}
                disabled={!isRouteReady || isRoutingLoading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.5rem 1rem' }}
                title="Calculate real road-following route using OpenStreetMap"
              >
                {isRoutingLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Calculating road route...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={14} />
                    <span>{currentRoute ? 'Recalculate Road Route' : 'Calculate Road Route'}</span>
                  </>
                )}
              </button>

              {/* Round Trip Configuration (Depot -> Stops -> Depot) */}
              <div
                style={{
                  marginTop: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <label
                  htmlFor="round-trip-checkbox"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    id="round-trip-checkbox"
                    checked={isRoundTrip}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsRoundTrip(val);
                      if (isRouteReady) {
                        calculateRoute(scenario, val);
                        calculateVrpSolution(scenario, val);
                      }
                    }}
                    style={{ accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                  />
                  <span>Round-Trip Dispatch</span>
                </label>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: isRoundTrip ? 'var(--cyan-core)' : 'var(--text-muted)',
                  }}
                >
                  {isRoundTrip ? 'Return to Depot' : 'One-Way Sequence'}
                </span>
              </div>
            </div>

            {/* Error Message if routing fails */}
            {routingError && (
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{routingError}</span>
              </div>
            )}
          </GlassCard>

          {/* 2. GEOGRAPHIC COVERAGE REGION */}
          <GlassCard style={{ padding: '1.25rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <label
                htmlFor="city-select"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                <Globe2 size={16} color="var(--cyan-core)" />
                <span>Geographic Coverage Area</span>
              </label>
              <Badge variant="cyan">
                {selectedCityId === 'ahmedabad' ? 'SIH Demo Default' : 'National Grid'}
              </Badge>
            </div>

            <select
              id="city-select"
              className="form-select"
              value={selectedCityId}
              onChange={(e) => selectCity(e.target.value)}
              style={{ width: '100%', marginBottom: '0.55rem' }}
              aria-label="Select city or region"
            >
              {INDIAN_CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} {city.id === 'ahmedabad' ? '★ (Ahmedabad–Gandhinagar Demo)' : ''}
                </option>
              ))}
            </select>

            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              {currentCity.description}
            </p>
          </GlassCard>

          {/* 3. CENTRAL FLEET DEPOT (DUAL ENTRY: Map Click vs Manual Input) */}
          <GlassCard style={{ padding: '1.25rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="scenario-depot-badge" aria-hidden="true">
                  <Building2 size={15} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Central Fleet Depot
                  </h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.675rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    START &amp; RETURN DISPATCH HUB
                  </span>
                </div>
              </div>
            </div>

            {/* Entry Mode Switch Tabs: Method A (Map Click) vs Method B (Manual Entry) */}
            <div className="scenario-tab-switch" role="tablist" aria-label="Depot Entry Method">
              <button
                type="button"
                className={`scenario-tab-btn ${depotEntryMode === 'map' ? 'active' : ''}`}
                onClick={() => setDepotEntryMode('map')}
                role="tab"
                aria-selected={depotEntryMode === 'map'}
              >
                <Crosshair size={13} />
                <span>Method A: Map Click</span>
              </button>
              <button
                type="button"
                className={`scenario-tab-btn ${depotEntryMode === 'manual' ? 'active' : ''}`}
                onClick={() => setDepotEntryMode('manual')}
                role="tab"
                aria-selected={depotEntryMode === 'manual'}
              >
                <PenTool size={13} />
                <span>Method B: Manual Entry</span>
              </button>
            </div>

            {/* METHOD A: DIRECT MAP CLICK */}
            {depotEntryMode === 'map' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Click anywhere on the OpenStreetMap canvas to place depot:
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      mapClickMode === 'depot' ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() =>
                      setMapClickMode(mapClickMode === 'depot' ? 'stop' : 'depot')
                    }
                    title="Click anywhere on the map to place Central Depot"
                    aria-label="Set Depot location on map"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Crosshair size={13} />
                    <span>{mapClickMode === 'depot' ? 'Placement Active' : 'Set on Map'}</span>
                  </button>
                </div>

                {scenario.depot ? (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                    }}
                  >
                    <input
                      type="text"
                      className="scenario-stop-title-input"
                      style={{
                        fontWeight: 700,
                        color: 'var(--cyan-core)',
                        fontSize: '0.875rem',
                      }}
                      value={scenario.depot.name || ''}
                      onChange={(e) => {
                        const updated = { ...scenario.depot, name: e.target.value };
                        setDepot(updated);
                      }}
                      placeholder="Depot Name / Distribution Center"
                      aria-label="Depot name"
                    />

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        marginTop: '0.2rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>Lat:</span>
                        <span>{Number(scenario.depot.lat).toFixed(4)}°N</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>Lng:</span>
                        <span>{Number(scenario.depot.lng).toFixed(4)}°E</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      color: 'var(--text-tertiary)',
                      fontSize: '0.8rem',
                    }}
                  >
                    No depot designated. Click "Set on Map" to place your start hub.
                  </div>
                )}
              </div>
            )}

            {/* METHOD B: MANUAL ADDRESS & COORDINATE ENTRY */}
            {depotEntryMode === 'manual' && (
              <form onSubmit={handleSetManualDepot} className="scenario-manual-box">
                <div style={{ position: 'relative' }}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <Search size={13} color="var(--cyan-core)" />
                    <span>Search Address / Landmark in {currentCity.shortName}:</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualDepotQuery}
                    onChange={(e) => handleDepotQueryChange(e.target.value)}
                    placeholder="e.g. Ashram Road Central Distribution Hub"
                    style={{ width: '100%', fontSize: '0.825rem' }}
                    aria-label="Search depot address or landmark"
                  />

                  {/* Autocomplete Suggestions */}
                  {depotSuggestions.length > 0 && (
                    <div className="scenario-suggestions-dropdown">
                      {depotSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="scenario-suggestion-item"
                          onClick={() => handleSelectDepotLandmark(item)}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>
                              {item.region} • {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                            </div>
                          </div>
                          <Badge variant="cyan">Select</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Latitude (°N):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={manualDepotLat}
                      onChange={(e) => setManualDepotLat(e.target.value)}
                      placeholder="23.0338"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Manual depot latitude"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Longitude (°E):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={manualDepotLng}
                      onChange={(e) => setManualDepotLng(e.target.value)}
                      placeholder="72.5850"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Manual depot longitude"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                    Depot Label / Name:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualDepotName}
                    onChange={(e) => setManualDepotName(e.target.value)}
                    placeholder="Ashram Road Central Distribution Hub"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    aria-label="Manual depot name"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isGeocodingDepot}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
                >
                  {isGeocodingDepot ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                  <span>{isGeocodingDepot ? 'Geocoding...' : 'Set Depot Location'}</span>
                </button>
              </form>
            )}
          </GlassCard>

          {/* 4. DELIVERY STOPS (DUAL ENTRY: Map Click vs Manual Input) */}
          <GlassCard style={{ padding: '1.25rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Delivery Stops
                </h3>
                <span
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: 'var(--indigo-core)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '5px',
                  }}
                >
                  {numStops} {numStops === 1 ? 'Stop' : 'Stops'}
                </span>
              </div>

              {/* Clear All Stops */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={clearAllStops}
                disabled={numStops === 0}
                title="Clear all delivery stops"
                aria-label="Clear all delivery stops"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>

            {/* Entry Mode Switch Tabs: Method A (Map Click) vs Method B (Manual Entry) */}
            <div className="scenario-tab-switch" role="tablist" aria-label="Stop Entry Method">
              <button
                type="button"
                className={`scenario-tab-btn ${stopEntryMode === 'map' ? 'active' : ''}`}
                onClick={() => setStopEntryMode('map')}
                role="tab"
                aria-selected={stopEntryMode === 'map'}
              >
                <Crosshair size={13} />
                <span>Method A: Map Click Mode</span>
              </button>
              <button
                type="button"
                className={`scenario-tab-btn ${stopEntryMode === 'manual' ? 'active' : ''}`}
                onClick={() => setStopEntryMode('manual')}
                role="tab"
                aria-selected={stopEntryMode === 'manual'}
              >
                <Plus size={13} />
                <span>Method B: Manual Stop Entry</span>
              </button>
            </div>

            {/* METHOD A HELPER */}
            {stopEntryMode === 'map' && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background:
                    mapClickMode === 'stop'
                      ? 'rgba(99, 102, 241, 0.08)'
                      : 'var(--bg-elevated)',
                  border: `1px solid ${
                    mapClickMode === 'stop'
                      ? 'rgba(99, 102, 241, 0.25)'
                      : 'var(--border-subtle)'
                  }`,
                  padding: '0.45rem 0.75rem',
                  borderRadius: '7px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <MapPin size={14} color="var(--indigo-core)" />
                  <span>Click anywhere on the map or click <b>"+ Quick Add"</b>:</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setMapClickMode('stop');
                    addCustomer();
                  }}
                  title="Add a new delivery stop location"
                  aria-label="Quick add delivery stop"
                  style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
                >
                  <Plus size={12} />
                  <span>Quick Add</span>
                </button>
              </div>
            )}

            {/* METHOD B FORM: MANUAL DELIVERY STOP ENTRY */}
            {stopEntryMode === 'manual' && (
              <form onSubmit={handleAddManualStop} className="scenario-manual-box" style={{ marginBottom: '0.85rem' }}>
                <div style={{ position: 'relative' }}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <Search size={13} color="var(--indigo-core)" />
                    <span>Enter Address / Landmark in {currentCity.shortName}:</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualStopQuery}
                    onChange={(e) => handleStopQueryChange(e.target.value)}
                    placeholder="e.g. SG Highway Commercial Complex"
                    style={{ width: '100%', fontSize: '0.825rem' }}
                    aria-label="Search delivery stop address or landmark"
                  />

                  {/* Autocomplete Suggestions */}
                  {stopSuggestions.length > 0 && (
                    <div className="scenario-suggestions-dropdown">
                      {stopSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="scenario-suggestion-item"
                          onClick={() => handleSelectStopLandmark(item)}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>
                              {item.region} • {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                            </div>
                          </div>
                          <Badge variant="indigo">Select</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Latitude (°N):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={manualStopLat}
                      onChange={(e) => setManualStopLat(e.target.value)}
                      placeholder="e.g. 23.0305"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Manual stop latitude"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Longitude (°E):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={manualStopLng}
                      onChange={(e) => setManualStopLng(e.target.value)}
                      placeholder="e.g. 72.5178"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Manual stop longitude"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.55rem' }}>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Payload (units):
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={manualStopDemand}
                      onChange={(e) => setManualStopDemand(e.target.value)}
                      style={{ width: '100%', fontSize: '0.775rem' }}
                      aria-label="Stop payload demand"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Earliest:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={manualStopEarliest}
                      onChange={(e) => setManualStopEarliest(e.target.value)}
                      placeholder="09:00"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Stop earliest arrival window"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                      Latest:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={manualStopLatest}
                      onChange={(e) => setManualStopLatest(e.target.value)}
                      placeholder="12:00"
                      style={{ width: '100%', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}
                      aria-label="Stop latest arrival window"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isGeocodingStop}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
                >
                  {isGeocodingStop ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>{isGeocodingStop ? 'Geocoding...' : 'Add Delivery Stop'}</span>
                </button>
              </form>
            )}

            {/* Scrollable Numbered Stops List (Identical Data Model) */}
            <div className="scenario-stops-list">
              {numStops === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-subtle)',
                  }}
                >
                  <MapPin
                    size={28}
                    color="var(--text-tertiary)"
                    style={{ margin: '0 auto 0.5rem', opacity: 0.6 }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    No delivery stops registered yet
                  </p>
                  <p
                    style={{
                      margin: '0.35rem 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Use Map Click Mode or Manual Stop Entry to add destinations.
                  </p>
                </div>
              ) : (
                scenario.customers.map((stop, index) => {
                  const stopNumber = index + 1;
                  return (
                    <div key={stop.id} className="scenario-stop-card">
                      <div className="scenario-stop-header">
                        <div
                          className="scenario-stop-badge"
                          title={`Stop #${stopNumber}`}
                        >
                          {stopNumber}
                        </div>

                        <input
                          type="text"
                          className="scenario-stop-title-input"
                          value={stop.name || ''}
                          onChange={(e) =>
                            updateCustomer(stop.id, 'name', e.target.value)
                          }
                          placeholder={`Delivery Stop ${stopNumber}`}
                          aria-label={`Name for Stop ${stopNumber}`}
                        />

                        <button
                          type="button"
                          className="scenario-stop-delete-btn"
                          onClick={() => {
                            removeCustomer(stop.id);
                            // Recalculate route after removal
                            const remaining = scenario.customers.filter((c) => c.id !== stop.id);
                            calculateRoute({ ...scenario, customers: remaining });
                            calculateVrpSolution({ ...scenario, customers: remaining });
                          }}
                          title={`Remove Stop #${stopNumber}`}
                          aria-label={`Remove Stop ${stopNumber}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Stop Coordinates, Demand & Time Window */}
                      <div className="scenario-stop-meta-row">
                        <div className="scenario-stop-meta-tag">
                          <span style={{ color: 'var(--text-tertiary)' }}>Lat:</span>
                          <span>{Number(stop.lat || stop.latitude).toFixed(4)}°N</span>
                        </div>

                        <div className="scenario-stop-meta-tag">
                          <span style={{ color: 'var(--text-tertiary)' }}>Lng:</span>
                          <span>{Number(stop.lng || stop.longitude).toFixed(4)}°E</span>
                        </div>

                        <div className="scenario-stop-meta-tag">
                          <Package size={12} color="var(--indigo-core)" />
                          <span>{stop.demand || 15} units</span>
                        </div>

                        <div className="scenario-stop-meta-tag">
                          <Clock size={12} color="var(--cyan-core)" />
                          <span>
                            {stop.earliestArrival || '09:00'}–{stop.latestArrival || '12:00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* 5. WEIGHTED TRANSPORTATION GRAPH FOUNDATION (Connected to Real OSRM Routing in M2.2-A) */}
          <GlassCard style={{ padding: '1.15rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setIsTechPanelExpanded(!isTechPanelExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={17} color="var(--cyan-core)" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Transportation Network Foundation
                    </span>
                    <Badge variant="cyan">G = (V, E)</Badge>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    OpenStreetMap Road Network • Weighted Multi-Cost Schema
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', border: 'none' }}
                aria-label="Toggle transportation network details"
              >
                {isTechPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isTechPanelExpanded && (
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div className="scenario-tech-grid">
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Road Network</span>
                    <span className="scenario-tech-value" style={{ fontSize: '0.8rem' }}>
                      Ahmedabad–Gandhinagar (OSM)
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Nodes (V)</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? currentRoute.sequence.length : '—'}
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Edges / Legs (E)</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? `${currentRoute.legs.length} legs` : '—'}
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">OSRM Route Weight</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? currentRoute.routing_weight : '—'}
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Road Distance</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? `${currentRoute.total_distance_km} km` : '—'}
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Travel Time</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? `${currentRoute.total_duration_min} min` : '—'}
                    </span>
                  </div>
                  <div className="scenario-tech-item">
                    <span className="scenario-tech-label">Congestion Factor</span>
                    <span className="scenario-tech-value">
                      {currentRoute ? '1.0 (Free-Flow)' : '—'}
                    </span>
                  </div>
                </div>

                {/* Multi-Objective Cost Formulation Preview */}
                <div className="scenario-tech-formula">
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.675rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Multi-Objective Cost Formulation (Metaheuristic Target):
                  </div>
                  <code>
                    Weight = w_time · norm(t) + w_dist · norm(d) + w_cong · norm(c)
                  </code>
                </div>

                {/* Status Notice */}
                {currentRoute ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(16, 185, 129, 0.09)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '7px',
                      fontSize: '0.775rem',
                      color: 'var(--status-success)',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                    <span>Real road geometry &amp; metrics computed via OpenStreetMap (OSRM). Stop ordering will be optimized via PSO/QPSO in M3/M4.</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(14, 165, 233, 0.08)',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      borderRadius: '7px',
                      fontSize: '0.775rem',
                      color: 'var(--cyan-bright)',
                      fontWeight: 500,
                    }}
                  >
                    <Info size={15} style={{ flexShrink: 0 }} />
                    <span>Click "Calculate Road Route" to extract real road geometry and metrics from OpenStreetMap.</span>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* 6. FUTURE-READY FLEET VEHICLE MODEL */}
          <GlassCard style={{ padding: '1.15rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setIsFleetExpanded(!isFleetExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={17} color="var(--cyan-core)" />
                <div>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Fleet Vehicle &amp; Capacity
                  </span>
                  <span
                    style={{
                      marginLeft: '0.65rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.725rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {currentVehicleTypeInfo.name} • {scenario.numVehicles} units
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', border: 'none' }}
                aria-label="Toggle fleet details"
              >
                {isFleetExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isFleetExpanded && (
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">
                      <span>Vehicle Archetype</span>
                    </label>
                    <select
                      className="form-select"
                      value={scenario.vehicleType || 'van'}
                      onChange={(e) => setVehicleType(e.target.value)}
                      aria-label="Select vehicle type"
                    >
                      <option value="bike">Cargo Two-Wheeler / Bike</option>
                      <option value="van">Delivery Van (Standard)</option>
                      <option value="truck">Medium Freight Truck</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Vehicle Capacity (Units)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={scenario.vehicleCapacity}
                      onChange={(e) =>
                        updateScenario({
                          vehicleCapacity: parseFloat(e.target.value) || 0,
                        })
                      }
                      aria-label="Vehicle payload capacity"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Fleet Size</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="form-input"
                      value={scenario.numVehicles}
                      onChange={(e) =>
                        updateScenario({
                          numVehicles: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      aria-label="Number of vehicles"
                    />
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-elevated)',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                  }}
                >
                  <b>Future-Ready Data Model:</b> Fleet parameters will be fed into the multi-vehicle routing solver.
                </div>
              </div>
            )}
          </GlassCard>

          {/* 6B. DISCRETE VRP REPRESENTATION & CONSTRAINT ENGINE (M2.2-B) */}
          <VrpInspectionPanel />

          {/* 7. AHMEDABAD PRESETS QUICK LOADER */}
          <GlassCard style={{ padding: '1.15rem 1.35rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={17} color="var(--cyan-core)" />
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Ahmedabad Scenario Presets
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.5rem', border: 'none' }}
                aria-label="Toggle scenario presets"
              >
                {isPresetsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isPresetsExpanded && (
              <div
                style={{
                  marginTop: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                }}
              >
                {SCENARIO_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => loadPreset(preset.id)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: isSelected
                          ? 'rgba(14, 165, 233, 0.12)'
                          : 'var(--bg-elevated)',
                        border: `1px solid ${
                          isSelected ? 'var(--cyan-core)' : 'var(--border-subtle)'
                        }`,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: isSelected
                              ? 'var(--cyan-core)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {preset.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {preset.description}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-tertiary)',
                          whiteSpace: 'nowrap',
                          marginLeft: '0.5rem',
                        }}
                      >
                        {preset.customers.length} Stops
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Interactive Map (Real Road Route Polyline via OSRM)
            ========================================================================= */}
        <div className="scenario-map-col">
          <RealMapView />
        </div>
      </div>
    </div>
  );
}
