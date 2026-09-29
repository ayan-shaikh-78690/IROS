import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchHealth,
  calculateRoadRoute,
  fetchVrpMatrix,
  evaluateVrpSolution,
  fetchScenarios,
  fetchScenarioById,
  saveScenarioApi,
  updateScenarioApi,
  deleteScenarioApi,
  calculateScenarioBaseline,
  fetchScenarioLatestRun,
} from '../services/api';

const ScenarioContext = createContext();

// Vehicle Type Archetypes
export const VEHICLE_TYPES = {
  BIKE: {
    id: 'bike',
    name: 'Cargo Two-Wheeler / Bike',
    defaultCapacity: 25,
    maxPayloadKg: 40,
    speedFactor: 1.15, // nimble in congested traffic
    roadRestrictions: 'Can access narrow inner-city lanes; prohibited on access-controlled expressways',
    fuelType: 'Electric / Petrol',
    icon: 'Bike',
  },
  VAN: {
    id: 'van',
    name: 'Delivery Van',
    defaultCapacity: 100,
    maxPayloadKg: 850,
    speedFactor: 1.0,
    roadRestrictions: 'Standard urban roads; height limit in historical gates',
    fuelType: 'EV / CNG / Diesel',
    icon: 'Truck',
  },
  TRUCK: {
    id: 'truck',
    name: 'Medium Freight Truck',
    defaultCapacity: 300,
    maxPayloadKg: 3500,
    speedFactor: 0.8,
    roadRestrictions: 'Restricted during peak hours in central commercial zones (Ashram Road / C.G. Road)',
    fuelType: 'Diesel / Heavy EV',
    icon: 'Container',
  },
};

export function buildFleetArray(numVehicles, vehicleCapacity, vehicleType = 'van') {
  const count = Math.max(1, parseInt(numVehicles, 10) || 1);
  const cap = Number(vehicleCapacity) || 120;
  return Array.from({ length: count }, (_, i) => ({
    id: `VEH-${String(i + 1).padStart(2, '0')}`,
    name: `Fleet ${vehicleType.toUpperCase()} ${i + 1}`,
    vehicle_type: vehicleType,
    vehicleType: vehicleType,
    capacity: cap,
    available: true,
    speed_factor: 1.0,
  }));
}

// Indian Cities Configuration (Section 2: India -> State/City -> Specific delivery area)
export const INDIAN_CITIES = [
  {
    id: 'ahmedabad',
    name: 'Ahmedabad–Gandhinagar, Gujarat',
    shortName: 'Ahmedabad–Gandhinagar',
    state: 'Gujarat',
    center: [23.0338, 72.5850],
    zoom: 12,
    description: 'Primary SIH 2026 Demonstration Region',
    defaultDepot: {
      lat: 23.0338,
      lng: 72.5850,
      name: 'Ashram Road Central Distribution Hub',
    },
  },
  {
    id: 'mumbai',
    name: 'Mumbai, Maharashtra',
    shortName: 'Mumbai',
    state: 'Maharashtra',
    center: [19.0760, 72.8777],
    zoom: 12,
    description: 'High-density coastal commercial metropolitan corridor',
    defaultDepot: {
      lat: 19.0760,
      lng: 72.8777,
      name: 'Bandra-Kurla Complex Logistics Base',
    },
  },
  {
    id: 'delhi',
    name: 'Delhi-NCR',
    shortName: 'Delhi-NCR',
    state: 'Delhi',
    center: [28.6139, 77.2090],
    zoom: 12,
    description: 'Arterial logistics & inter-state distribution belt',
    defaultDepot: {
      lat: 28.6139,
      lng: 77.2090,
      name: 'Connaught Place Micro-Depot',
    },
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru, Karnataka',
    shortName: 'Bengaluru',
    state: 'Karnataka',
    center: [12.9716, 77.5946],
    zoom: 12,
    description: 'Tech parks & e-commerce last-mile express grid',
    defaultDepot: {
      lat: 12.9716,
      lng: 77.5946,
      name: 'Electronic City Express Hub',
    },
  },
  {
    id: 'pune',
    name: 'Pune, Maharashtra',
    shortName: 'Pune',
    state: 'Maharashtra',
    center: [18.5204, 73.8567],
    zoom: 12,
    description: 'Manufacturing belt and urban retail clusters',
    defaultDepot: {
      lat: 18.5204,
      lng: 73.8567,
      name: 'Shivajinagar Dispatch Center',
    },
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad, Telangana',
    shortName: 'Hyderabad',
    state: 'Telangana',
    center: [17.3850, 78.4867],
    zoom: 12,
    description: 'Outer ring road & central commercial corridors',
    defaultDepot: {
      lat: 17.3850,
      lng: 78.4867,
      name: 'HITEC City Fulfillment Terminal',
    },
  },
  {
    id: 'india-overview',
    name: 'All-India National Overview',
    shortName: 'All-India',
    state: 'National',
    center: [22.5937, 78.9629],
    zoom: 5,
    description: 'National geographic overview perspective',
    defaultDepot: {
      lat: 23.0338,
      lng: 72.5850,
      name: 'Ashram Road Central Distribution Hub',
    },
  },
];

// Scenario Presets for Ahmedabad - Gandhinagar
export const SCENARIO_PRESETS = [
  {
    id: 'ahmedabad-peak',
    name: 'Ahmedabad Peak Traffic (SG Highway - Ashram Road)',
    description: 'High-density commercial corridor with peak morning delivery windows across western Ahmedabad.',
    region: 'Ahmedabad–Gandhinagar, Gujarat, India',
    vehicleType: 'van',
    numVehicles: 3,
    vehicleCapacity: 120,
    vehicles: buildFleetArray(3, 120, 'van'),
    weights: { distance: 0.3, travelTime: 0.45, congestion: 0.25 },
    depot: {
      lat: 23.0338,
      lng: 72.5850,
      name: 'Ashram Road Central Distribution Hub',
    },
    customers: [
      { id: 'CUST-001', lat: 23.0305, lng: 72.5178, demand: 25, earliestArrival: '09:00', latestArrival: '11:00', name: 'SG Highway Commercial Hub' },
      { id: 'CUST-002', lat: 23.0373, lng: 72.5524, demand: 35, earliestArrival: '09:30', latestArrival: '12:00', name: 'Navrangpura Retail Center' },
      { id: 'CUST-003', lat: 23.0225, lng: 72.5714, demand: 20, earliestArrival: '10:00', latestArrival: '13:00', name: 'Paldi Commercial Complex' },
      { id: 'CUST-004', lat: 23.0544, lng: 72.5312, demand: 28, earliestArrival: '11:00', latestArrival: '14:00', name: 'Vastrapur Technology Park' },
    ],
  },
  {
    id: 'urban-delivery',
    name: 'Urban Retail Express (Navrangpura - C.G. Road)',
    description: 'Fast last-mile parcel dispatch utilizing nimble two-wheeler delivery fleets.',
    region: 'Ahmedabad, Gujarat, India',
    vehicleType: 'bike',
    numVehicles: 4,
    vehicleCapacity: 35,
    vehicles: buildFleetArray(4, 35, 'bike'),
    weights: { distance: 0.25, travelTime: 0.55, congestion: 0.2 },
    depot: {
      lat: 23.0280,
      lng: 72.5590,
      name: 'C.G. Road Micro-Fulfillment Center',
    },
    customers: [
      { id: 'CUST-001', lat: 23.0345, lng: 72.5540, demand: 8, earliestArrival: '08:30', latestArrival: '10:30', name: 'Navrangpura Post Point' },
      { id: 'CUST-002', lat: 23.0210, lng: 72.5620, demand: 12, earliestArrival: '09:00', latestArrival: '11:30', name: 'Ellisbridge Mart' },
      { id: 'CUST-003', lat: 23.0410, lng: 72.5680, demand: 9, earliestArrival: '10:00', latestArrival: '12:30', name: 'Usmanpura Pharmacy Store' },
    ],
  },
  {
    id: 'gandhinagar-dist',
    name: 'Gandhinagar Tech Corridor (Infocity - Sector 21)',
    description: 'Planned wide-avenue logistics linking Gandhinagar government & IT sectors.',
    region: 'Gandhinagar, Gujarat, India',
    vehicleType: 'van',
    numVehicles: 2,
    vehicleCapacity: 150,
    vehicles: buildFleetArray(2, 150, 'van'),
    weights: { distance: 0.4, travelTime: 0.4, congestion: 0.2 },
    depot: {
      lat: 23.1915,
      lng: 72.6320,
      name: 'Infocity Logistics Hub',
    },
    customers: [
      { id: 'CUST-001', lat: 23.2156, lng: 72.6506, demand: 40, earliestArrival: '09:00', latestArrival: '12:00', name: 'Sector 21 Commerce Center' },
      { id: 'CUST-002', lat: 23.2230, lng: 72.6680, demand: 35, earliestArrival: '10:30', latestArrival: '13:30', name: 'Sector 28 Industrial Zone' },
      { id: 'CUST-003', lat: 23.1780, lng: 72.6190, demand: 45, earliestArrival: '13:00', latestArrival: '16:00', name: 'Kudasan Regional Depot' },
    ],
  },
  {
    id: 'heavy-freight',
    name: 'Heavy Freight Stress Test (Sardar Patel Ring Road)',
    description: 'Large payload truck routing navigating ring-road bypasses and vehicle weight limits.',
    region: 'Ahmedabad Outer Corridor, Gujarat',
    vehicleType: 'truck',
    numVehicles: 3,
    vehicleCapacity: 300,
    vehicles: buildFleetArray(3, 300, 'truck'),
    weights: { distance: 0.5, travelTime: 0.3, congestion: 0.2 },
    depot: {
      lat: 23.0850,
      lng: 72.4920,
      name: 'S.P. Ring Road Freight Terminal',
    },
    customers: [
      { id: 'CUST-001', lat: 23.1120, lng: 72.5280, demand: 90, earliestArrival: '07:00', latestArrival: '11:00', name: 'Sarkhej Warehouse' },
      { id: 'CUST-002', lat: 22.9860, lng: 72.4980, demand: 110, earliestArrival: '10:00', latestArrival: '15:00', name: 'Sanand Industrial Cluster' },
      { id: 'CUST-003', lat: 23.1340, lng: 72.5890, demand: 80, earliestArrival: '12:00', latestArrival: '17:00', name: 'Chandkheda Bulk Depot' },
      { id: 'CUST-004', lat: 23.0150, lng: 72.6320, demand: 75, earliestArrival: '14:00', latestArrival: '18:00', name: 'Narol Textile Gateway' },
    ],
  },
  {
    id: 'sih-metropolitan-20',
    name: 'Ahmedabad Metropolitan Logistics (20 Stops • 3 Vehicles)',
    description: 'SIH 2026 20-customer benchmark across Ahmedabad commercial centers, residential nodes, and transport corridors.',
    region: 'Ahmedabad–Gandhinagar, Gujarat, India',
    vehicleType: 'van',
    numVehicles: 3,
    vehicleCapacity: 120,
    vehicles: buildFleetArray(3, 120, 'van'),
    weights: { distance: 0.35, travelTime: 0.45, congestion: 0.2 },
    depot: {
      lat: 23.0338,
      lng: 72.5850,
      name: 'Ashram Road Central Distribution Hub',
    },
    customers: [
      { id: 'CUST-001', lat: 23.0305, lng: 72.5178, demand: 18, earliestArrival: '09:00', latestArrival: '12:00', name: 'SG Highway Trade Center' },
      { id: 'CUST-002', lat: 23.0373, lng: 72.5524, demand: 14, earliestArrival: '09:30', latestArrival: '12:30', name: 'Navrangpura Commercial Complex' },
      { id: 'CUST-003', lat: 23.0225, lng: 72.5714, demand: 20, earliestArrival: '10:00', latestArrival: '13:00', name: 'Paldi Business Hub' },
      { id: 'CUST-004', lat: 23.0544, lng: 72.5312, demand: 16, earliestArrival: '10:30', latestArrival: '14:00', name: 'Vastrapur Innovation Park' },
      { id: 'CUST-005', lat: 23.0135, lng: 72.5298, demand: 22, earliestArrival: '11:00', latestArrival: '14:30', name: 'Prahlad Nagar Corporate Road' },
      { id: 'CUST-006', lat: 23.0610, lng: 72.5020, demand: 12, earliestArrival: '09:15', latestArrival: '12:45', name: 'Thaltej Shilaj Corridor' },
      { id: 'CUST-007', lat: 23.0410, lng: 72.5680, demand: 15, earliestArrival: '09:45', latestArrival: '13:15', name: 'Usmanpura Cross Roads' },
      { id: 'CUST-008', lat: 23.0780, lng: 72.5280, demand: 18, earliestArrival: '11:30', latestArrival: '15:00', name: 'Gota SG Junction' },
      { id: 'CUST-009', lat: 23.0950, lng: 72.5950, demand: 25, earliestArrival: '10:15', latestArrival: '14:00', name: 'Sabarmati Railway Terminal' },
      { id: 'CUST-010', lat: 23.1120, lng: 72.5850, demand: 19, earliestArrival: '12:00', latestArrival: '16:00', name: 'Chandkheda Central Point' },
      { id: 'CUST-011', lat: 23.0480, lng: 72.6020, demand: 14, earliestArrival: '11:00', latestArrival: '15:30', name: 'Shahibaug Riverfront Gate' },
      { id: 'CUST-012', lat: 23.0110, lng: 72.5980, demand: 21, earliestArrival: '13:00', latestArrival: '17:00', name: 'Kankaria Lakefront Logistics' },
      { id: 'CUST-013', lat: 22.9980, lng: 72.6080, demand: 17, earliestArrival: '13:30', latestArrival: '17:30', name: 'Maninagar Commercial Market' },
      { id: 'CUST-014', lat: 23.0210, lng: 72.5620, demand: 13, earliestArrival: '09:00', latestArrival: '12:00', name: 'Ellisbridge Post Hub' },
      { id: 'CUST-015', lat: 23.0400, lng: 72.5350, demand: 16, earliestArrival: '10:00', latestArrival: '14:00', name: 'Drive-in Road Retail Belt' },
      { id: 'CUST-016', lat: 23.0680, lng: 72.5580, demand: 20, earliestArrival: '11:15', latestArrival: '15:45', name: 'Ranip Transit Hub' },
      { id: 'CUST-017', lat: 23.0050, lng: 72.5450, demand: 15, earliestArrival: '12:30', latestArrival: '16:30', name: 'Vasna APMC Market' },
      { id: 'CUST-018', lat: 23.0250, lng: 72.5080, demand: 18, earliestArrival: '13:00', latestArrival: '17:00', name: 'South Bopal Ring Road' },
      { id: 'CUST-019', lat: 23.0380, lng: 72.4880, demand: 14, earliestArrival: '14:00', latestArrival: '18:00', name: 'Shela Commercial Zone' },
      { id: 'CUST-020', lat: 23.0720, lng: 72.5120, demand: 22, earliestArrival: '14:30', latestArrival: '18:30', name: 'Science City Road Gateway' },
    ],
  },
];

const DEFAULT_SCENARIO = SCENARIO_PRESETS[0];

const INITIAL_OPT_SETTINGS = {
  algorithm: 'qpso', // 'pso' or 'qpso'
  populationSize: 50,
  iterations: 100,
  weights: {
    distance: 0.3,
    travelTime: 0.45,
    congestion: 0.25,
  },
};

export function ScenarioProvider({ children }) {
  const [scenario, setScenario] = useState({
    ...DEFAULT_SCENARIO,
    vehicleType: DEFAULT_SCENARIO.vehicleType || 'van',
    vehicles: DEFAULT_SCENARIO.vehicles || buildFleetArray(3, 120, 'van'),
    roadRules: {
      allowOneWayOnly: true,
      avoidClosedRoads: true,
      enforceTruckWeightLimits: true,
    },
    dynamicRerouting: false,
  });

  const [activePresetId, setActivePresetId] = useState(DEFAULT_SCENARIO.id);
  const [optimizationSettings, setOptimizationSettings] = useState(INITIAL_OPT_SETTINGS);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [beforeOptimizationMetrics, setBeforeOptimizationMetrics] = useState(null);
  const [optimizedRoutes, setOptimizedRoutes] = useState(null);
  const [activeRouteView, setActiveRouteView] = useState('road'); // 'road' | 'optimized'
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', service: null });
  const [isSyncingToDb, setIsSyncingToDb] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'error'
  const [playbackIteration, setPlaybackIteration] = useState(null); // Phase 15 telemetry playback

  // Check backend health periodically
  const checkHealth = async () => {
    const health = await fetchHealth();
    setBackendHealth(health);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // M2.2-A Real Road Routing Engine State
  const [currentRoute, setCurrentRoute] = useState(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const routeRequestIdRef = useRef(0);
  const autoSaveTimerRef = useRef(null);
  const hasHydratedRef = useRef(false);

  // Calculate real road route for scenario sequence (Depot -> Stop 1 -> ... -> Depot)
  const calculateRoute = useCallback(async (customScenario = null, customRoundTrip = null) => {
    const sc = customScenario || scenario;
    const requestId = ++routeRequestIdRef.current;
    if (!sc.depot || !sc.depot.lat || !sc.depot.lng) {
      setRoutingError('Please set a central depot first.');
      setIsRoutingLoading(false);
      return null;
    }
    if (!sc.customers || sc.customers.length === 0) {
      setRoutingError('Please add at least one delivery stop.');
      setCurrentRoute(null);
      setIsRoutingLoading(false);
      return null;
    }

    setIsRoutingLoading(true);
    setRoutingError(null);

    const roundTripVal = customRoundTrip !== null ? customRoundTrip : isRoundTrip;

    const payload = {
      scenario_id: sc.id || 'custom-scenario',
      depot: {
        id: sc.depot.id || 'DEPOT-001',
        name: sc.depot.name || 'Central Fleet Depot',
        lat: Number(sc.depot.lat),
        lng: Number(sc.depot.lng),
      },
      delivery_stops: sc.customers.map((c, i) => ({
        id: c.id || `CUST-${String(i + 1).padStart(3, '0')}`,
        name: c.name || `Delivery Stop ${i + 1}`,
        lat: Number(c.lat || c.latitude),
        lng: Number(c.lng || c.longitude),
        demand: c.demand != null ? Number(c.demand) : 15,
        earliest_arrival: c.earliestArrival || c.earliest_arrival || '09:00',
        latest_arrival: c.latestArrival || c.latest_arrival || '12:00',
      })),
      round_trip: roundTripVal,
    };

    try {
      const res = await calculateRoadRoute(payload);
      if (requestId !== routeRequestIdRef.current) return null;

      if (res && res.status === 'success') {
        setCurrentRoute(res);
        setRoutingError(null);
        return res;
      }

      setRoutingError(res?.message || 'Unable to calculate road route.');
      return null;
    } finally {
      if (requestId === routeRequestIdRef.current) {
        setIsRoutingLoading(false);
      }
    }
  }, [scenario, isRoundTrip]);

  // M2.2-B Discrete VRP Representation State
  const [vrpSolution, setVrpSolution] = useState(null);
  const [vrpMatrix, setVrpMatrix] = useState(null);
  const [isVrpLoading, setIsVrpLoading] = useState(false);
  const [vrpError, setVrpError] = useState(null);

  const calculateVrpSolution = useCallback(async (customScenario = null, customRoundTrip = null) => {
    const sc = customScenario || scenario;
    if (!sc.depot || !sc.depot.lat || !sc.depot.lng || !sc.customers || sc.customers.length === 0) {
      setVrpSolution(null);
      setVrpMatrix(null);
      return null;
    }

    setIsVrpLoading(true);
    setVrpError(null);

    const roundTripVal = customRoundTrip !== null ? customRoundTrip : isRoundTrip;
    const numVehicles = Math.max(1, sc.vehicles?.length || sc.numVehicles || 2);
    const vehicleCapacity = Number(sc.vehicleCapacity) || 100;
    const vType = sc.vehicleType || 'van';

    const vehicles = sc.vehicles && sc.vehicles.length > 0
      ? sc.vehicles.map((v, i) => ({
          id: v.id || `VEH-${String(i + 1).padStart(2, '0')}`,
          name: v.name || `Fleet ${vType.toUpperCase()} ${i + 1}`,
          type: v.vehicle_type || v.vehicleType || vType,
          capacity: Number(v.capacity) || vehicleCapacity,
          speed_factor: Number(v.speed_factor) || 1.0,
        }))
      : Array.from({ length: numVehicles }, (_, i) => ({
          id: `VEH-${String(i + 1).padStart(2, '0')}`,
          name: `Fleet ${vType.toUpperCase()} ${i + 1}`,
          type: vType,
          capacity: vehicleCapacity,
          speed_factor: 1.0,
        }));

    const customers = sc.customers.map((c, i) => ({
      id: c.id || `CUST-${String(i + 1).padStart(3, '0')}`,
      name: c.name || `Delivery Stop ${i + 1}`,
      lat: Number(c.lat || c.latitude),
      lng: Number(c.lng || c.longitude),
      demand: c.demand != null ? Number(c.demand) : 15,
      earliest_arrival: c.earliestArrival || c.earliest_arrival || '09:00',
      latest_arrival: c.latestArrival || c.latest_arrival || '12:00',
      service_duration_s: c.serviceDurationS != null ? Number(c.serviceDurationS) : 300.0,
    }));

    const problem = {
      scenario_id: sc.id || 'custom-scenario',
      depot: {
        id: sc.depot.id || 'DEPOT-001',
        name: sc.depot.name || 'Central Fleet Depot',
        lat: Number(sc.depot.lat),
        lng: Number(sc.depot.lng),
        opening_time: '08:00',
        closing_time: '20:00',
      },
      customers,
      vehicles,
      round_trip: roundTripVal,
      default_service_duration_s: 300.0,
    };

    const candidate_partitions = Array.from({ length: numVehicles }, () => []);
    customers.forEach((c, idx) => {
      candidate_partitions[idx % numVehicles].push(c.id);
    });

    try {
      const matrixRes = await fetchVrpMatrix(problem);
      if (matrixRes && matrixRes.distances_matrix_m) {
        setVrpMatrix(matrixRes);
      }
      const evalRes = await evaluateVrpSolution({
        problem,
        candidate_partitions,
        weight_distance: sc.weights?.w_distance ?? 0.4,
        weight_time: sc.weights?.w_time ?? 0.4,
        weight_congestion: sc.weights?.w_congestion ?? 0.2,
        penalty_capacity: 100.0,
        penalty_time_window: 10.0,
        penalty_coverage: 500.0,
      });
      if (evalRes && evalRes.status === 'success') {
        setVrpSolution(evalRes.solution);
        setVrpError(null);
        return evalRes.solution;
      } else {
        setVrpError(evalRes?.message || 'Failed to evaluate discrete VRP solution');
        return null;
      }
    } catch (err) {
      setVrpError(err.message || 'Error communicating with VRP engine');
      return null;
    } finally {
      setIsVrpLoading(false);
    }
  }, [scenario, isRoundTrip]);

  // Phase 2 & 17: Hydrate authoritative scenario and latest optimization run from backend SQLite DB
  const hydrateFromDb = useCallback(async () => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    try {
      const storedScenarioId = localStorage.getItem('iros_active_scenario_id') || DEFAULT_SCENARIO.id;
      const scRes = await fetchScenarioById(storedScenarioId);
      if (scRes && scRes.scenario) {
        const dbSc = scRes.scenario;
        const vCount = dbSc.vehicles?.length || dbSc.numVehicles || 3;
        const vCap = dbSc.vehicles?.[0]?.capacity || dbSc.vehicleCapacity || 120;
        const vType = dbSc.vehicles?.[0]?.vehicle_type || dbSc.vehicleType || 'van';

        const mappedScenario = {
          ...dbSc,
          vehicleType: vType,
          numVehicles: vCount,
          vehicleCapacity: vCap,
          vehicles: dbSc.vehicles && dbSc.vehicles.length > 0 ? dbSc.vehicles : buildFleetArray(vCount, vCap, vType),
          customers: (dbSc.customers || []).map((c) => ({
            ...c,
            lat: Number(c.lat != null ? c.lat : c.latitude),
            lng: Number(c.lng != null ? c.lng : c.longitude),
            earliestArrival: c.earliestArrival || c.earliest_arrival || '09:00',
            latestArrival: c.latestArrival || c.latest_arrival || '12:00',
          })),
        };
        setScenario(mappedScenario);
        setActivePresetId(mappedScenario.id);

        // Hydrate latest run if available
        const runRes = await fetchScenarioLatestRun(mappedScenario.id);
        if (runRes && runRes.run) {
          setOptimizationResults(runRes.run);
          if (runRes.run.routes_with_geometry?.length > 0) {
            setOptimizedRoutes(runRes.run.routes_with_geometry);
            setActiveRouteView('optimized');
          } else if (runRes.run.decoded_routes?.length > 0) {
            setOptimizedRoutes(runRes.run.decoded_routes);
            setActiveRouteView('optimized');
          }
          if (runRes.run.before_optimization) {
            setBeforeOptimizationMetrics(runRes.run.before_optimization);
          }
        }
        calculateRoute(mappedScenario);
        calculateVrpSolution(mappedScenario);
        return;
      }
    } catch (err) {
      console.warn('Backend SQLite scenario hydration:', err.message);
    }
    // Fallback to default scenario
    calculateRoute(DEFAULT_SCENARIO);
    calculateVrpSolution(DEFAULT_SCENARIO);
  }, [calculateRoute, calculateVrpSolution]);

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  // Phase 2: Save Scenario to Backend SQLite Database
  const saveScenarioToDb = useCallback(async (customScenario = null) => {
    const sc = customScenario || scenario;
    setIsSyncingToDb(true);
    setDbSyncStatus('saving');
    try {
      const res = await updateScenarioApi(sc.id, sc);
      if (res && res.status === 'success') {
        setDbSyncStatus('synced');
        localStorage.setItem('iros_active_scenario_id', sc.id);
        return res;
      }
      setDbSyncStatus('error');
      return null;
    } catch (err) {
      setDbSyncStatus('error');
      return null;
    } finally {
      setIsSyncingToDb(false);
    }
  }, [scenario]);

  // Debounced auto-sync to backend SQLite database on scenario changes
  useEffect(() => {
    if (!scenario?.id) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveScenarioToDb(scenario);
    }, 700);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [scenario.customers, scenario.depot, scenario.vehicles, scenario.numVehicles, scenario.vehicleCapacity, scenario.vehicleType]);

  // Phase 3: Calculate & Persist Baseline
  const calculateBaseline = useCallback(async (customScenario = null, customRoundTrip = null) => {
    const sc = customScenario || scenario;
    const roundTripVal = customRoundTrip !== null ? customRoundTrip : isRoundTrip;
    try {
      const res = await calculateScenarioBaseline(sc.id, { round_trip: roundTripVal });
      if (res && res.status === 'success') {
        if (res.baseline) {
          setBeforeOptimizationMetrics(res.baseline);
        }
        if (res.route) {
          setCurrentRoute(res.route);
        }
        return res;
      }
      return null;
    } catch (err) {
      console.warn('Error calculating scenario baseline:', err);
      return null;
    }
  }, [scenario, isRoundTrip]);

  const loadPreset = (presetId) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    localStorage.setItem('iros_active_scenario_id', preset.id);

    const vCount = preset.numVehicles || 3;
    const vCap = preset.vehicleCapacity || 120;
    const vType = preset.vehicleType || 'van';
    const fleet = preset.vehicles || buildFleetArray(vCount, vCap, vType);

    const updated = {
      ...scenario,
      id: preset.id,
      name: preset.name,
      region: preset.region,
      vehicleType: vType,
      numVehicles: vCount,
      vehicleCapacity: vCap,
      vehicles: fleet.map((v) => ({ ...v })),
      weights: { ...preset.weights },
      depot: { ...preset.depot },
      customers: preset.customers.map((c) => ({ ...c })),
    };
    setScenario(updated);
    setOptimizationResults(null);
    setBeforeOptimizationMetrics(null);
    setOptimizedRoutes(null);
    setActiveRouteView('road');
    calculateRoute(updated);
    calculateVrpSolution(updated);
    saveScenarioToDb(updated);
  };

  const updateScenario = (updates) => {
    setScenario((prev) => {
      const next = { ...prev, ...updates };
      return next;
    });
  };

  // Phase 11: Single Source of Truth Fleet Synchronization
  const setVehicleCount = (count) => {
    const newCount = Math.max(1, parseInt(count, 10) || 1);
    setScenario((prev) => {
      const curVehicles = prev.vehicles || [];
      const vType = prev.vehicleType || 'van';
      const cap = Number(prev.vehicleCapacity) || 120;
      let nextVehicles;
      if (newCount > curVehicles.length) {
        const added = Array.from({ length: newCount - curVehicles.length }, (_, i) => ({
          id: `VEH-${String(curVehicles.length + i + 1).padStart(2, '0')}`,
          name: `Fleet ${vType.toUpperCase()} ${curVehicles.length + i + 1}`,
          vehicle_type: vType,
          vehicleType: vType,
          capacity: cap,
          available: true,
          speed_factor: 1.0,
        }));
        nextVehicles = [...curVehicles, ...added];
      } else {
        nextVehicles = curVehicles.slice(0, newCount);
      }
      return {
        ...prev,
        numVehicles: newCount,
        vehicles: nextVehicles,
      };
    });
  };

  const setFleetCapacity = (capacity) => {
    const newCap = Math.max(1, Number(capacity) || 1);
    setScenario((prev) => ({
      ...prev,
      vehicleCapacity: newCap,
      vehicles: (prev.vehicles || []).map((v) => ({ ...v, capacity: newCap })),
    }));
  };

  const updateVehicle = (vehicleId, updates) => {
    setScenario((prev) => {
      const updatedVehicles = (prev.vehicles || []).map((v) =>
        v.id === vehicleId ? { ...v, ...updates } : v
      );
      return {
        ...prev,
        vehicles: updatedVehicles,
      };
    });
  };

  const addVehicle = (vehicleData) => {
    setScenario((prev) => {
      const cur = prev.vehicles || [];
      const nextId = `VEH-${String(cur.length + 1).padStart(2, '0')}`;
      const newVeh = {
        id: vehicleData?.id || nextId,
        name: vehicleData?.name || `Fleet ${(prev.vehicleType || 'van').toUpperCase()} ${cur.length + 1}`,
        vehicle_type: vehicleData?.vehicle_type || prev.vehicleType || 'van',
        capacity: Number(vehicleData?.capacity || prev.vehicleCapacity || 120),
        available: vehicleData?.available ?? true,
        speed_factor: 1.0,
      };
      return {
        ...prev,
        numVehicles: cur.length + 1,
        vehicles: [...cur, newVeh],
      };
    });
  };

  const removeVehicle = (vehicleId) => {
    setScenario((prev) => {
      const cur = prev.vehicles || [];
      if (cur.length <= 1) return prev; // Minimum 1 vehicle required
      const nextVehicles = cur.filter((v) => v.id !== vehicleId);
      return {
        ...prev,
        numVehicles: nextVehicles.length,
        vehicles: nextVehicles,
      };
    });
  };

  const setVehicleType = (typeKey) => {
    const vType = VEHICLE_TYPES[typeKey.toUpperCase()] || VEHICLE_TYPES.VAN;
    setScenario((prev) => ({
      ...prev,
      vehicleType: vType.id,
      vehicleCapacity: vType.defaultCapacity,
      vehicles: (prev.vehicles || []).map((v) => ({
        ...v,
        vehicle_type: vType.id,
        vehicleType: vType.id,
        capacity: vType.defaultCapacity,
      })),
    }));
  };

  const [mapFocusTarget, setMapFocusTarget] = useState(null);

  const focusOnMap = (lat, lng, zoom = 14) => {
    if (lat != null && lng != null) {
      setMapFocusTarget({ lat: Number(lat), lng: Number(lng), zoom, timestamp: Date.now() });
    }
  };

  const addCustomer = (customerData) => {
    setScenario((prev) => {
      const nextNum = prev.customers.length + 1;
      const usedIds = new Set(prev.customers.map((customer) => customer.id));
      let generatedNum = nextNum;
      let generatedId = `CUST-${String(generatedNum).padStart(3, '0')}`;
      while (usedIds.has(generatedId)) {
        generatedNum += 1;
        generatedId = `CUST-${String(generatedNum).padStart(3, '0')}`;
      }
      const newId = customerData?.id && !usedIds.has(customerData.id)
        ? customerData.id
        : generatedId;
      const baseLat = prev.depot?.lat || 23.0300;
      const baseLng = prev.depot?.lng || 72.5500;
      const angle = (nextNum * 47) % 360;
      const rad = (angle * Math.PI) / 180;
      const defaultLat = +(baseLat + 0.018 * Math.cos(rad)).toFixed(5);
      const defaultLng = +(baseLng + 0.018 * Math.sin(rad)).toFixed(5);

      const lat = Number(customerData?.lat ?? customerData?.latitude ?? defaultLat);
      const lng = Number(customerData?.lng ?? customerData?.longitude ?? defaultLng);

      const newCustomer = {
        id: newId,
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        demand: customerData?.demand != null ? Number(customerData.demand) : 15,
        earliestArrival: customerData?.earliestArrival || customerData?.earliest_arrival || '09:00',
        latestArrival: customerData?.latestArrival || customerData?.latest_arrival || '17:00',
        name: customerData?.name || `Delivery Stop ${nextNum}`,
        type: 'delivery_stop',
      };
      return {
        ...prev,
        customers: [...prev.customers, newCustomer],
      };
    });
  };

  const removeCustomer = (id) => {
    setScenario((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  };

  const updateCustomer = (id, field, value) => {
    setScenario((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === 'lat') updated.latitude = Number(value);
          if (field === 'lng') updated.longitude = Number(value);
          if (field === 'earliestArrival') updated.earliest_arrival = value;
          if (field === 'latestArrival') updated.latest_arrival = value;
          return updated;
        }
        return c;
      }),
    }));
  };

  const setDepot = (depotData) => {
    if (!depotData) {
      setScenario((prev) => ({ ...prev, depot: null }));
      return;
    }
    const lat = Number(depotData.lat ?? depotData.latitude);
    const lng = Number(depotData.lng ?? depotData.longitude);
    const normalizedDepot = {
      id: depotData.id || 'DEPOT-001',
      name: depotData.name || 'Central Fleet Depot',
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      type: 'depot',
    };
    setScenario((prev) => ({
      ...prev,
      depot: normalizedDepot,
    }));
  };

  const updateOptimizationSettings = (updates) => {
    setOptimizationSettings((prev) => ({ ...prev, ...updates }));
  };

  const [selectedCityId, setSelectedCityId] = useState('ahmedabad');
  const [mapClickMode, setMapClickMode] = useState('stop'); // 'depot' or 'stop'

  const selectCity = (cityId) => {
    const city = INDIAN_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    setSelectedCityId(city.id);
    setScenario((prev) => ({
      ...prev,
      region: city.name,
      city: city.name,
      depot: city.defaultDepot ? { ...city.defaultDepot, type: 'depot' } : prev.depot,
    }));
  };

  const clearAllStops = () => {
    setScenario((prev) => ({
      ...prev,
      customers: [],
    }));
    setCurrentRoute(null);
    setOptimizedRoutes(null);
    setRoutingError(null);
  };

  const clearAll = () => {
    setScenario((prev) => ({
      ...prev,
      depot: null,
      customers: [],
    }));
    setCurrentRoute(null);
    setOptimizedRoutes(null);
    setRoutingError(null);
  };

  const validateScenario = useCallback((customScenario = null) => {
    const sc = customScenario || scenario;
    const errors = [];
    if (!sc.depot || sc.depot.lat == null || sc.depot.lng == null) {
      errors.push('Central Fleet Depot is missing. Please place a depot on the map or enter depot coordinates.');
    }
    if (!sc.customers || sc.customers.length === 0) {
      errors.push('No delivery stops defined. Please add at least 1 delivery customer.');
    }
    const vehiclesList = sc.vehicles || [];
    const numVehicles = vehiclesList.length > 0 ? vehiclesList.length : (Number(sc.numVehicles) || 0);
    if (numVehicles < 1) {
      errors.push('At least 1 fleet vehicle must be configured.');
    }
    const totalCapacity = vehiclesList.length > 0
      ? vehiclesList.reduce((acc, v) => acc + (Number(v.capacity) || 0), 0)
      : (numVehicles * (Number(sc.vehicleCapacity) || 0));
    if (totalCapacity <= 0) {
      errors.push('Total fleet capacity must be greater than zero.');
    }
    const totalDemand = (sc.customers || []).reduce((acc, c) => acc + (Number(c.demand) || 0), 0);
    const isCapacityExceeded = totalDemand > totalCapacity;

    return {
      isValid: errors.length === 0,
      errors,
      totalDemand,
      totalCapacity,
      isCapacityExceeded,
      numStops: sc.customers?.length || 0,
      numVehicles,
      vehicleCapacity: vehiclesList.length > 0 ? vehiclesList[0].capacity : Number(sc.vehicleCapacity) || 0,
    };
  }, [scenario]);

  const resetScenario = () => {
    setSelectedCityId('ahmedabad');
    setMapClickMode('stop');
    setOptimizedRoutes(null);
    setBeforeOptimizationMetrics(null);
    setActiveRouteView('road');
    loadPreset(DEFAULT_SCENARIO.id);
  };

  return (
    <ScenarioContext.Provider
      value={{
        scenario,
        activePresetId,
        selectedCityId,
        setSelectedCityId,
        selectCity,
        mapClickMode,
        setMapClickMode,
        loadPreset,
        setVehicleType,
        setVehicleCount,
        setFleetCapacity,
        updateVehicle,
        addVehicle,
        removeVehicle,
        optimizationSettings,
        optimizationResults,
        beforeOptimizationMetrics,
        setBeforeOptimizationMetrics,
        optimizedRoutes,
        setOptimizedRoutes,
        activeRouteView,
        setActiveRouteView,
        backendHealth,
        checkHealth,
        updateScenario,
        addCustomer,
        removeCustomer,
        updateCustomer,
        setDepot,
        clearAllStops,
        clearAll,
        updateOptimizationSettings,
        setOptimizationResults,
        resetScenario,
        validateScenario,
        mapFocusTarget,
        focusOnMap,
        currentRoute,
        isRoutingLoading,
        routingError,
        isRoundTrip,
        setIsRoundTrip,
        calculateRoute,
        vrpSolution,
        vrpMatrix,
        isVrpLoading,
        vrpError,
        calculateVrpSolution,
        saveScenarioToDb,
        calculateBaseline,
        isSyncingToDb,
        dbSyncStatus,
        playbackIteration,
        setPlaybackIteration,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
}
