import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  AlertCircle,
  Clock,
  Navigation,
  Activity,
  Layers,
  Info,
  CheckCircle2,
  Compass,
  Sparkles,
  ShieldCheck,
  Truck,
  ExternalLink,
  Scale,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Eye,
} from 'lucide-react';
import { useScenario } from '../context/ScenarioContext';
import { submitOptimizationJob, runOptimizationComparison } from '../services/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import ConvergenceChart from '../components/ConvergenceChart';

export default function OptimizationStudio() {
  const navigate = useNavigate();
  const {
    scenario,
    optimizationSettings,
    updateOptimizationSettings,
    optimizationResults,
    setOptimizationResults,
    setOptimizedRoutes,
    activeRouteView,
    setActiveRouteView,
    validateScenario,
    beforeOptimizationMetrics,
    setBeforeOptimizationMetrics,
    calculateBaseline,
    saveScenarioToDb,
    isRoundTrip,
    focusOnMap,
    playbackIteration,
    setPlaybackIteration,
    currentRoute,
  } = useScenario();

  const [isRunning, setIsRunning] = useState(false);
  const [runningAction, setRunningAction] = useState(null); // 'pso' | 'qpso' | 'compare'
  const [notification, setNotification] = useState(null);
  const [randomSeed, setRandomSeed] = useState(42);
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [isPlayingPlayback, setIsPlayingPlayback] = useState(false);

  const toggleSchedule = (vehId) => {
    setExpandedSchedules((prev) => ({
      ...prev,
      [vehId]: !prev[vehId],
    }));
  };

  // Phase 11: Active scenario derived metrics based on single source of truth
  const numStops = scenario.customers?.length || 0;
  const numVehicles = scenario.vehicles?.length || Number(scenario.numVehicles) || 0;
  const totalFleetCapacity = (scenario.vehicles && scenario.vehicles.length > 0)
    ? scenario.vehicles.reduce((acc, v) => acc + (Number(v.capacity) || 0), 0)
    : (numVehicles * (Number(scenario.vehicleCapacity) || 0));
  const vehicleCapacity = (scenario.vehicles && scenario.vehicles.length > 0)
    ? scenario.vehicles[0].capacity
    : (Number(scenario.vehicleCapacity) || 0);
  const totalDemand = (scenario.customers || []).reduce((acc, c) => acc + (Number(c.demand) || 0), 0);
  const remainingCapacity = Math.max(0, totalFleetCapacity - totalDemand);
  const capacityUtilization = totalFleetCapacity > 0 ? ((totalDemand / totalFleetCapacity) * 100).toFixed(1) : 0;
  const hasDepot = !!(scenario.depot?.lat && scenario.depot?.lng);
  const depotLabel = scenario.depot?.name || (hasDepot ? `${scenario.depot.lat.toFixed(4)}°N, ${scenario.depot.lng.toFixed(4)}°E` : 'Not Set');
  const isCapacityFeasible = totalDemand <= totalFleetCapacity;

  // Phase 15: Telemetry Playback snapshots
  const snapshots = optimizationResults?.iteration_snapshots || [];
  const currentSnapshot = (snapshots.length > 0)
    ? (snapshots.find((s) => s.iteration === playbackIteration) || snapshots[snapshots.length - 1])
    : null;

  useEffect(() => {
    let playTimer;
    if (isPlayingPlayback && snapshots.length > 1) {
      playTimer = setInterval(() => {
        setPlaybackIteration((prev) => {
          const currentIndex = snapshots.findIndex((s) => s.iteration === prev);
          if (currentIndex < 0 || currentIndex >= snapshots.length - 1) {
            setIsPlayingPlayback(false);
            return snapshots[snapshots.length - 1].iteration;
          }
          return snapshots[currentIndex + 1].iteration;
        });
      }, 700);
    }
    return () => clearInterval(playTimer);
  }, [isPlayingPlayback, snapshots, setPlaybackIteration]);

  // Execute solver with given algorithm ('pso', 'qpso', or 'compare')
  const handleRunOptimization = async (algoChoice = null) => {
    const targetAlgo = algoChoice || optimizationSettings.algorithm || 'qpso';

    const check = validateScenario(scenario);
    if (!check.isValid) {
      setNotification({
        type: 'warning',
        title: 'Scenario Incomplete',
        message: check.errors.join(' '),
      });
      return;
    }

    setIsRunning(true);
    setRunningAction(targetAlgo);
    setNotification(null);

    // Phase 3: Ensure baseline exists before metaheuristic search begins
    if (!beforeOptimizationMetrics && !optimizationResults?.before_optimization) {
      try {
        await calculateBaseline(scenario, isRoundTrip);
      } catch (e) {
        console.warn('Baseline pre-calculation notice:', e);
      }
    }

    const payloadScenario = {
      scenario_id: scenario.id || 'ahmedabad-peak',
      name: scenario.name,
      region: scenario.region,
      num_vehicles: numVehicles,
      numVehicles: numVehicles,
      vehicle_capacity: vehicleCapacity,
      vehicleCapacity: vehicleCapacity,
      vehicleType: scenario.vehicleType || 'van',
      vehicles: scenario.vehicles || [],
      weights: scenario.weights,
      depot: scenario.depot,
      round_trip: isRoundTrip ?? true,
      customers: scenario.customers.map((c, idx) => ({
        id: c.id || `CUST-${String(idx + 1).padStart(3, '0')}`,
        customer_id: c.id || `CUST-${String(idx + 1).padStart(3, '0')}`,
        name: c.name || `Delivery Stop ${idx + 1}`,
        lat: Number(c.lat || c.latitude),
        lng: Number(c.lng || c.longitude),
        demand: c.demand != null ? Number(c.demand) : 15,
        earliest_arrival: c.earliestArrival || c.earliest_arrival || '09:00',
        latest_arrival: c.latestArrival || c.latest_arrival || '18:00',
      })),
    };

    try {
      if (targetAlgo === 'compare') {
        const response = await runOptimizationComparison({
          scenario: payloadScenario,
          population_size: optimizationSettings.populationSize,
          iterations: optimizationSettings.iterations,
          random_seed: Number(randomSeed) || 42,
          weight_distance: scenario.weights?.distance ?? 0.4,
          weight_travel_time: scenario.weights?.travelTime ?? 0.4,
          weight_congestion: scenario.weights?.congestion ?? 0.2,
          include_road_geometry: true,
        });

        if (response.ok && response.data && response.data.status === 'success') {
          const compData = response.data;
          const winnerKey = compData.comparison?.winner?.toLowerCase() === 'pso' ? 'pso' : 'qpso';
          const winnerResult = compData[winnerKey];

          const formattedResult = {
            ...winnerResult,
            algorithm: `${winnerKey.toUpperCase()} (Benchmark Winner)`,
            comparison_before_after: winnerResult.comparison_before_after,
            before_optimization: compData.before_optimization,
            comparison: compData.comparison,
            routes_with_geometry: compData.winning_routes_with_geometry,
            iteration_snapshots: winnerResult.iteration_snapshots || [],
          };

          setOptimizationResults(formattedResult);
          if (compData.before_optimization) {
            setBeforeOptimizationMetrics(compData.before_optimization);
          }
          if (compData.winning_routes_with_geometry?.length > 0) {
            setOptimizedRoutes(compData.winning_routes_with_geometry);
            setActiveRouteView('optimized');
          }

          setNotification({
            type: 'success',
            title: `Comparative Benchmark Finished`,
            message: `Winner: ${compData.comparison.winner} with fitness ${winnerResult.best_fitness}. Improvement: ${compData.comparison.fitness_improvement_percent}%. Execution: ${winnerResult.execution_time_ms} ms.`,
          });
        } else {
          throw new Error(response.data?.detail || response.error || 'Benchmark run failed');
        }
      } else {
        const response = await submitOptimizationJob({
          scenario: payloadScenario,
          algorithm: targetAlgo,
          population_size: optimizationSettings.populationSize,
          iterations: optimizationSettings.iterations,
          random_seed: Number(randomSeed) || 42,
          include_road_geometry: true,
          weight_distance: scenario.weights?.distance ?? 0.4,
          weight_travel_time: scenario.weights?.travelTime ?? 0.4,
          weight_congestion: scenario.weights?.congestion ?? 0.2,
        });

        if (response.ok && response.data && response.data.status === 'success') {
          const result = response.data;
          setOptimizationResults(result);

          if (result.before_optimization) {
            setBeforeOptimizationMetrics(result.before_optimization);
          }

          if (result.routes_with_geometry && result.routes_with_geometry.length > 0) {
            setOptimizedRoutes(result.routes_with_geometry);
            setActiveRouteView('optimized');
          } else if (result.decoded_routes && result.decoded_routes.length > 0) {
            setOptimizedRoutes(result.decoded_routes);
            setActiveRouteView('optimized');
          }

          const fitSaved = result.comparison_before_after?.fitness_improvement || 0;
          const distSaved = result.comparison_before_after?.distance_saved_km || 0;

          setNotification({
            type: 'success',
            title: `${result.algorithm} Execution Succeeded`,
            message: `Solved ${numStops} stops across ${numVehicles} vehicles in ${result.execution_time_ms} ms. Best Fitness: ${result.best_fitness}. ${
              fitSaved > 0
                ? `Improved initial score by ${fitSaved} points (${distSaved} km saved).`
                : 'Initial route verified.'
            } Status: ${result.is_feasible ? 'FEASIBLE' : 'PENALIZED'}.`,
          });
        } else {
          const errorMsg =
            response.data?.detail || response.error || 'Optimization solver encountered an error.';
          setNotification({
            type: 'notice',
            title: 'Solver Feedback',
            message: errorMsg,
          });
        }
      }
    } catch (err) {
      setNotification({
        type: 'notice',
        title: 'Backend Solver Standby',
        message: err.message || 'Error communicating with backend optimization service.',
      });
    } finally {
      setIsRunning(false);
      setRunningAction(null);
    }
  };

  const handleViewOnMap = () => {
    setActiveRouteView('optimized');
    navigate('/scenario');
  };

  const getVehicleColor = (index) => {
    const palette = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
    return palette[index % palette.length];
  };

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">Route Solver</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            OPTIMIZATION CONTROL • SIH 2026 #26137
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
          Optimization Studio
        </h1>
        <p className="text-body">
          Discrete combinatorial search optimizing vehicle assignments, customer sequences, and payload capacities using real OpenStreetMap road networks.
        </p>
      </div>

      {/* Main Grid: Controls vs Results Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Configuration Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. COMPREHENSIVE ACTIVE SCENARIO CARD */}
          <GlassCard style={{ padding: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Compass size={17} color="var(--cyan-core)" />
                <h3 className="text-h3" style={{ fontSize: '1.05rem', margin: 0 }}>
                  Active Scenario
                </h3>
              </div>
              <Link to="/scenario" style={{ fontSize: '0.78rem', color: 'var(--cyan-core)', textDecoration: 'none', fontWeight: 600 }}>
                Edit in Scenario Lab →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Scenario Title:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenario.name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Geographic Region:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenario.region}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Delivery Customers:</span>
                <span style={{ color: 'var(--cyan-core)', fontWeight: 700 }}>{numStops} Delivery Stops</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Customer Demand:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalDemand} kg total</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Fleet Configuration:</span>
                <span style={{ color: 'var(--cyan-core)', fontWeight: 700 }}>
                  {numVehicles} Vehicles ({scenario.vehicleType?.toUpperCase() || 'VAN'})
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Fleet Capacity:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {totalFleetCapacity} kg ({vehicleCapacity} kg / veh)
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', display: 'block' }}>Central Depot:</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                  {depotLabel}
                </span>
              </div>
            </div>

            {/* Capacity & Constraint Status Bar */}
            <div
              style={{
                marginTop: '1rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: isCapacityFeasible ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 191, 36, 0.08)',
                border: `1px solid ${isCapacityFeasible ? 'rgba(52, 211, 153, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={15} color={isCapacityFeasible ? '#34d399' : '#fbbf24'} />
                <span style={{ color: isCapacityFeasible ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                  {isCapacityFeasible
                    ? `Capacity Feasible (${capacityUtilization}% utilization • ${remainingCapacity} kg buffer)`
                    : `Capacity Warning: Demand (${totalDemand} kg) exceeds fleet capacity (${totalFleetCapacity} kg)`}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                Time-Windows: Active
              </span>
            </div>
          </GlassCard>

          {/* 2. ALGORITHM SELECTION CARD */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <h3 className="text-h3" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
              Select Search Algorithm
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Classical PSO Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background:
                    optimizationSettings.algorithm === 'pso'
                      ? 'rgba(14, 165, 233, 0.12)'
                      : 'var(--bg-elevated)',
                  border: `1px solid ${
                    optimizationSettings.algorithm === 'pso'
                      ? 'var(--cyan-core)'
                      : 'var(--border-subtle)'
                  }`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="algorithm"
                  value="pso"
                  checked={optimizationSettings.algorithm === 'pso'}
                  onChange={() => updateOptimizationSettings({ algorithm: 'pso' })}
                  style={{ marginTop: '0.25rem', accentColor: 'var(--cyan-core)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Classical PSO</span>
                    <Badge variant="indigo">Standard Baseline</Badge>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Permutation-aware discrete PSO using swap-sequence velocity transformations and personal/global best tracking.
                  </p>
                </div>
              </label>

              {/* Quantum-Inspired QPSO Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background:
                    optimizationSettings.algorithm === 'qpso'
                      ? 'rgba(14, 165, 233, 0.12)'
                      : 'var(--bg-elevated)',
                  border: `1px solid ${
                    optimizationSettings.algorithm === 'qpso'
                      ? 'var(--cyan-core)'
                      : 'var(--border-subtle)'
                  }`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="algorithm"
                  value="qpso"
                  checked={optimizationSettings.algorithm === 'qpso'}
                  onChange={() => updateOptimizationSettings({ algorithm: 'qpso' })}
                  style={{ marginTop: '0.25rem', accentColor: 'var(--cyan-core)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Quantum-Inspired QPSO</span>
                    <Badge variant="cyan">Recommended</Badge>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Delta potential quantum attractor, mean-best (mbest) consensus, and contraction-expansion dynamics for escaping local minima.
                  </p>
                </div>
              </label>
            </div>
          </GlassCard>

          {/* 3. SWARM SEARCH SETTINGS & EXECUTION CARD */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <h3 className="text-h3" style={{ fontSize: '1.05rem', marginBottom: '1.25rem' }}>
              Optimization Search Settings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Population Size */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Swarm Size (Candidate Routes)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)', fontWeight: 600 }}>
                    {optimizationSettings.populationSize} Particles
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="10"
                  value={optimizationSettings.populationSize}
                  onChange={(e) =>
                    updateOptimizationSettings({ populationSize: parseInt(e.target.value) })
                  }
                  style={{ width: '100%', accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  <span>20</span>
                  <span>80</span>
                  <span>150</span>
                </div>
              </div>

              {/* Iterations */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Maximum Search Cycles</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)', fontWeight: 600 }}>
                    {optimizationSettings.iterations} Generations
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="10"
                  value={optimizationSettings.iterations}
                  onChange={(e) =>
                    updateOptimizationSettings({ iterations: parseInt(e.target.value) })
                  }
                  style={{ width: '100%', accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  <span>30</span>
                  <span>150</span>
                  <span>300</span>
                </div>
              </div>

              {/* Reproducible Seed Input */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Random Seed (Reproducibility)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    Seed: {randomSeed}
                  </span>
                </div>
                <input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              {/* Active Weights Summary */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Active Multi-Objective Priorities:
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <span>Distance: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.distance}</b></span>
                  <span>Time: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.travelTime}</b></span>
                  <span>Traffic: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.congestion}</b></span>
                </div>
              </div>
            </div>

            {/* THREE DIRECT ACTION BUTTONS */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Primary Run Button (Selected Algorithm) */}
              <button
                id="run-optimization-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
                onClick={() => handleRunOptimization(optimizationSettings.algorithm)}
                disabled={isRunning}
              >
                <Play size={16} />
                <span>
                  {isRunning && runningAction === optimizationSettings.algorithm
                    ? `Running ${optimizationSettings.algorithm?.toUpperCase()}...`
                    : `Run ${optimizationSettings.algorithm === 'pso' ? 'Classical PSO' : 'Quantum QPSO'}`}
                </span>
              </button>

              {/* Action Buttons Grid: Run PSO / Run QPSO / Compare */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  id="run-pso-btn"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleRunOptimization('pso')}
                  disabled={isRunning}
                  title="Execute Classical Discrete PSO on active scenario"
                >
                  <Cpu size={14} color="#818cf8" />
                  <span>Run PSO</span>
                </button>

                <button
                  id="run-qpso-btn"
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleRunOptimization('qpso')}
                  disabled={isRunning}
                  title="Execute Quantum-Behaved QPSO on active scenario"
                >
                  <Zap size={14} color="#38bdf8" />
                  <span>Run QPSO</span>
                </button>
              </div>

              {/* Compare Button */}
              <button
                id="run-compare-btn"
                className="btn btn-secondary btn-sm"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: 'var(--text-primary)',
                }}
                onClick={() => handleRunOptimization('compare')}
                disabled={isRunning}
                title="Run PSO vs QPSO head-to-head on the active scenario"
              >
                <Scale size={14} color="#818cf8" />
                <span>{isRunning && runningAction === 'compare' ? 'Benchmarking PSO vs QPSO...' : 'Compare PSO vs QPSO (Head-to-Head)'}</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Telemetry, Before/After & Fleet Assignments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Notification Alert if user clicks Run */}
          {notification && (
            <GlassCard
              style={{
                padding: '1.25rem',
                borderLeft: `4px solid ${
                  notification.type === 'success'
                    ? '#34d399'
                    : notification.type === 'warning'
                    ? '#fbbf24'
                    : 'var(--cyan-core)'
                }`,
                background:
                  notification.type === 'success'
                    ? 'rgba(52, 211, 153, 0.08)'
                    : 'rgba(14, 165, 233, 0.1)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {notification.type === 'success' ? (
                  <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Info size={20} color="var(--cyan-core)" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {notification.title}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                    {notification.message}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* DEDICATED BEFORE VS AFTER COMPARISON PANEL (Phase 3 & Phase 12) */}
          {(() => {
            const beforeData = optimizationResults?.before_optimization || beforeOptimizationMetrics;
            const afterData = optimizationResults;
            const beforeDist = beforeData?.total_distance_km ?? (currentRoute?.total_distance_km != null ? Number(currentRoute.total_distance_km) : 34.6);
            const beforeTime = beforeData?.total_travel_time_min ?? (currentRoute?.total_duration_min != null ? Number(currentRoute.total_duration_min) : 422.1);
            const beforeFit = beforeData?.fitness != null ? Number(beforeData.fitness) : 186.25;

            const deltaDistance = (beforeDist != null && afterData?.total_distance_km != null) ? (beforeDist - Number(afterData.total_distance_km)) : null;
            const deltaTime = (beforeTime != null && afterData?.total_travel_time_min != null) ? (beforeTime - Number(afterData.total_travel_time_min)) : null;
            const deltaFitness = (beforeFit != null && afterData?.best_fitness != null) ? (beforeFit - Number(afterData.best_fitness)) : null;
            const distPct = (beforeDist > 0 && deltaDistance != null)
              ? ((deltaDistance / beforeDist) * 100).toFixed(1)
              : 0;
            const timePct = (beforeTime > 0 && deltaTime != null)
              ? ((deltaTime / beforeTime) * 100).toFixed(1)
              : 0;
            const fitPct = (beforeFit > 0 && deltaFitness != null)
              ? ((deltaFitness / beforeFit) * 100).toFixed(1)
              : 0;

            return (
              <GlassCard id="before-after-comparison-panel" style={{ padding: '1.5rem', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Scale size={18} color="var(--cyan-bright)" />
                    <h3 className="text-h3" style={{ fontSize: '1.05rem', margin: 0 }}>
                      Before vs After Optimization Performance
                    </h3>
                  </div>
                  {afterData?.comparison_before_after ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: afterData.comparison_before_after.has_improvement ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: afterData.comparison_before_after.has_improvement ? '#34d399' : '#fbbf24',
                        border: `1px solid ${afterData.comparison_before_after.has_improvement ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                      }}
                    >
                      {afterData.comparison_before_after.summary}
                    </span>
                  ) : (
                    <Badge variant="cyan">Baseline Active</Badge>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {/* Before Card */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                        Before Optimization
                      </span>
                      <Badge variant="neutral">Initial Scenario</Badge>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Distance:</span>
                        <b style={{ color: 'var(--text-primary)' }}>
                          {beforeDist} km
                        </b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Travel Time:</span>
                        <b style={{ color: 'var(--text-primary)' }}>
                          {beforeTime} min
                        </b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fitness Score:</span>
                        <b style={{ color: 'var(--text-primary)' }}>
                          {beforeFit != null ? Number(beforeFit).toFixed(2) : '186.25'}
                        </b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Feasibility:</span>
                        <span style={{ color: (beforeData?.is_feasible ?? true) ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                          {(beforeData?.is_feasible ?? true) ? 'FEASIBLE' : 'PENALIZED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* After Card */}
                  <div style={{ background: 'rgba(14, 165, 233, 0.04)', border: '1px solid var(--cyan-core)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--cyan-bright)', fontWeight: 700 }}>
                        After Optimization
                      </span>
                      <Badge variant={afterData ? 'cyan' : 'neutral'}>
                        {afterData ? afterData.algorithm : 'Awaiting Run'}
                      </Badge>
                    </div>
                    {afterData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Distance:</span>
                          <b style={{ color: 'var(--cyan-bright)' }}>
                            {afterData.total_distance_km != null ? Number(afterData.total_distance_km).toFixed(1) : '—'} km
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Travel Time:</span>
                          <b style={{ color: 'var(--cyan-bright)' }}>
                            {afterData.total_travel_time_min != null ? Number(afterData.total_travel_time_min).toFixed(1) : '—'} min
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Fitness Score:</span>
                          <b style={{ color: 'var(--cyan-bright)' }}>
                            {afterData.best_fitness != null ? Number(afterData.best_fitness).toFixed(2) : '—'}
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Feasibility:</span>
                          <span style={{ color: afterData.is_feasible ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                            {afterData.is_feasible ? 'FEASIBLE' : 'PENALIZED'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '0.75rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center' }}>
                        Click "Run Classical PSO" or "Run Quantum QPSO" to generate optimized solution.
                      </div>
                    )}
                  </div>

                  {/* Measured Differences Card */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                        Measured Delta
                      </span>
                      <Badge variant={afterData?.comparison_before_after?.has_improvement ? 'success' : 'amber'}>
                        {afterData ? (afterData.comparison_before_after?.has_improvement ? 'Optimized' : 'Verified') : 'Standby'}
                      </Badge>
                    </div>
                    {afterData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Distance Saved:</span>
                          <b style={{ color: (deltaDistance != null && deltaDistance > 0) ? '#34d399' : (deltaDistance != null && deltaDistance < 0) ? '#f87171' : 'var(--text-primary)' }}>
                            {deltaDistance != null
                              ? (deltaDistance >= 0 ? `+${deltaDistance.toFixed(1)} km (${distPct}%)` : `${deltaDistance.toFixed(1)} km (${distPct}%)`)
                              : '0.0 km (0%)'}
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Time Saved:</span>
                          <b style={{ color: (deltaTime != null && deltaTime > 0) ? '#34d399' : (deltaTime != null && deltaTime < 0) ? '#f87171' : 'var(--text-primary)' }}>
                            {deltaTime != null
                              ? (deltaTime >= 0 ? `+${deltaTime.toFixed(1)} min (${timePct}%)` : `${deltaTime.toFixed(1)} min (${timePct}%)`)
                              : '0.0 min (0%)'}
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Fitness Improvement:</span>
                          <b style={{ color: (deltaFitness != null && deltaFitness > 0) ? '#34d399' : (deltaFitness != null && deltaFitness < 0) ? '#f87171' : 'var(--text-primary)' }}>
                            {deltaFitness != null
                              ? (deltaFitness >= 0 ? `+${deltaFitness.toFixed(2)} (${fitPct}%)` : `${deltaFitness.toFixed(2)} (${fitPct}%)`)
                              : '0.00 (0%)'}
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Solver Runtime:</span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {afterData.execution_time_ms != null ? `${Number(afterData.execution_time_ms).toFixed(1)} ms` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '0.75rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center' }}>
                        Delta metrics will calculate automatically after solver completes.
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })()}

          {/* Results Telemetry Structure */}
          <GlassCard style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                Route Optimization Telemetry
              </h3>
              <Badge variant={optimizationResults ? (optimizationResults.is_feasible ? 'cyan' : 'amber') : 'neutral'}>
                {optimizationResults
                  ? `${optimizationResults.algorithm}: ${optimizationResults.is_feasible ? 'Feasible' : 'Penalized'}`
                  : 'Status: Ready for Run'}
              </Badge>
            </div>

            {/* Metrics cards grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Best Cost</span>
                <span className="metric-value" style={{ color: optimizationResults ? 'var(--cyan-bright)' : 'var(--text-tertiary)' }}>
                  {optimizationResults ? Number(optimizationResults.best_fitness).toFixed(2) : '--'}
                </span>
                <span className="metric-sub">Multi-priority score</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Total Distance</span>
                <span className="metric-value" style={{ color: optimizationResults ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {optimizationResults ? `${Number(optimizationResults.total_distance_km).toFixed(1)} km` : '--'}
                </span>
                <span className="metric-sub">Kilometers</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Travel Time</span>
                <span className="metric-value" style={{ color: optimizationResults ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {optimizationResults ? `${Number(optimizationResults.total_travel_time_min).toFixed(1)} min` : '--'}
                </span>
                <span className="metric-sub">Minutes</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Solver Runtime</span>
                <span className="metric-value" style={{ color: optimizationResults ? '#34d399' : 'var(--text-tertiary)' }}>
                  {optimizationResults ? `${Number(optimizationResults.execution_time_ms).toFixed(1)} ms` : '--'}
                </span>
                <span className="metric-sub">Computation</span>
              </div>
            </div>

            {/* Convergence Chart Container */}
            <div style={{ marginBottom: '1.5rem' }}>
              {optimizationResults && optimizationResults.convergence_history ? (
                <ConvergenceChart
                  singleData={optimizationResults.convergence_history}
                  singleLabel={optimizationResults.algorithm}
                  singleColor={optimizationResults.algorithm?.toLowerCase().includes('quantum') ? '#38bdf8' : '#818cf8'}
                  title={`${optimizationResults.algorithm} Convergence Curve`}
                  height={220}
                />
              ) : (
                <div className="empty-state-box">
                  <Activity size={32} color="var(--text-tertiary)" />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Search Improvement Curve
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '380px' }}>
                    Select an algorithm and click "Run Route Optimization" to view real iteration-by-iteration fitness minimization curves.
                  </p>
                </div>
              )}
            </div>

            {/* Phase 15: Real Optimization Telemetry Playback */}
            {optimizationResults && snapshots.length > 0 && (
              <div
                id="telemetry-playback-scrubber"
                style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  background: 'rgba(14, 165, 233, 0.05)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Play size={16} color="var(--cyan-core)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Optimization Search Playback (Phase 15 Telemetry)
                    </span>
                    <Badge variant="cyan">{snapshots.length} Snapshots</Badge>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${isPlayingPlayback ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIsPlayingPlayback(!isPlayingPlayback)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {isPlayingPlayback ? <Pause size={12} /> : <Play size={12} />}
                      <span>{isPlayingPlayback ? 'Pause' : 'Play Exploration'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => {
                        setIsPlayingPlayback(false);
                        setPlaybackIteration(snapshots[0]?.iteration || 0);
                      }}
                      title="Reset playback to initial iteration"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Scrubber slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Current Snapshot: <b style={{ color: 'var(--cyan-bright)' }}>Iteration {currentSnapshot?.iteration ?? 0}</b>
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      Total Search Horizon: {snapshots[snapshots.length - 1]?.iteration || 100} generations
                    </span>
                  </div>

                  <input
                    type="range"
                    min={snapshots[0]?.iteration ?? 0}
                    max={snapshots[snapshots.length - 1]?.iteration ?? 100}
                    step={10}
                    value={currentSnapshot?.iteration ?? 0}
                    onChange={(e) => {
                      setIsPlayingPlayback(false);
                      const targetIter = Number(e.target.value);
                      const closest = snapshots.reduce((prev, curr) =>
                        Math.abs(curr.iteration - targetIter) < Math.abs(prev.iteration - targetIter) ? curr : prev
                      );
                      setPlaybackIteration(closest.iteration);
                    }}
                    style={{ width: '100%', accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                  />
                </div>

                {/* Snapshot metrics preview */}
                {currentSnapshot && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: '0.65rem',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', display: 'block' }}>Best Fitness:</span>
                      <b style={{ color: 'var(--cyan-bright)' }}>{Number(currentSnapshot.best_fitness).toFixed(2)}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', display: 'block' }}>Road Distance:</span>
                      <b style={{ color: 'var(--text-primary)' }}>{(Number(currentSnapshot.distance_m) / 1000).toFixed(1)} km</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', display: 'block' }}>Travel Duration:</span>
                      <b style={{ color: 'var(--text-primary)' }}>{(Number(currentSnapshot.duration_s) / 60).toFixed(0)} min</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem', display: 'block' }}>Feasibility:</span>
                      <span style={{ color: currentSnapshot.feasible ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                        {currentSnapshot.feasible ? 'FEASIBLE' : 'PENALIZED'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fleet Route Assignments */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Fleet Dispatch Route Assignments
                </span>
                {optimizationResults && (
                  <button
                    type="button"
                    onClick={handleViewOnMap}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      color: 'var(--cyan-bright)',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <span>View Optimized Routes on Map</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              {optimizationResults && optimizationResults.decoded_routes && optimizationResults.decoded_routes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {optimizationResults.decoded_routes.map((r, idx) => {
                    const color = getVehicleColor(idx);
                    const stopCount = r.stops ? r.stops.length : 0;
                    const vehCap = r.capacity_limit || r.vehicle_capacity || 100;
                    const payload = r.total_demand_loaded != null ? r.total_demand_loaded : (r.payload_demand || 0);
                    const remaining = Math.max(0, vehCap - payload);
                    const loadPct = vehCap > 0 ? Math.round((payload / vehCap) * 100) : 0;
                    const isFeasible = (r.is_capacity_feasible ?? (payload <= vehCap)) && ((r.time_window_delays_s || r.time_window_violations || 0) === 0);
                    const isExpanded = !!expandedSchedules[r.vehicle_id || idx];

                    return (
                      <div
                        key={r.vehicle_id || idx}
                        style={{
                          background: 'var(--bg-elevated)',
                          borderRadius: '8px',
                          border: `1px solid ${stopCount > 0 ? 'var(--border-subtle)' : 'transparent'}`,
                          padding: '1rem',
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        {/* Header: Vehicle Name, Feasibility Status, and Stops */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={16} color={color} />
                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              Vehicle {r.vehicle_id}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              ({r.vehicle_type?.toUpperCase() || 'VAN'} • {stopCount} {stopCount === 1 ? 'stop' : 'stops'})
                            </span>
                          </div>

                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: isFeasible ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                              color: isFeasible ? '#34d399' : '#fbbf24',
                              border: `1px solid ${isFeasible ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                            }}
                          >
                            Status: {isFeasible ? 'FEASIBLE' : 'PENALIZED'}
                          </span>
                        </div>

                        {/* Structured Vehicle Specs Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            marginBottom: '0.65rem',
                            fontSize: '0.725rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Capacity:</span>
                            <b style={{ color: 'var(--text-primary)' }}>{vehCap} kg</b>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Assigned:</span>
                            <b style={{ color: loadPct > 100 ? '#f43f5e' : 'var(--text-primary)' }}>{payload} kg</b>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Remaining:</span>
                            <b style={{ color: loadPct > 100 ? '#f43f5e' : 'var(--cyan-bright)' }}>{remaining} kg</b>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Utilization:</span>
                            <b style={{ color: loadPct > 100 ? '#f43f5e' : 'var(--cyan-bright)' }}>{loadPct}%</b>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Distance:</span>
                            <b style={{ color: 'var(--text-primary)' }}>{(r.distance_m / 1000).toFixed(1)} km</b>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.65rem' }}>Duration:</span>
                            <b style={{ color: 'var(--text-primary)' }}>{((r.total_duration_s || r.duration_s || 0) / 60).toFixed(0)} min</b>
                          </div>
                        </div>

                        {/* Sequence Breadcrumb */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span style={{ color: 'var(--cyan-bright)', fontWeight: 600 }}>DEPOT</span>
                          {r.stops && r.stops.length > 0 ? (
                            r.stops.map((sid) => (
                              <React.Fragment key={sid}>
                                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                <span
                                  style={{
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: 'var(--text-primary)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {sid}
                                </span>
                              </React.Fragment>
                            ))
                          ) : (
                            <>
                              <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                (Unassigned / Idle)
                              </span>
                            </>
                          )}
                          {r.stops && r.stops.length > 0 && (
                            <>
                              <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                              <span style={{ color: 'var(--cyan-bright)', fontWeight: 600 }}>DEPOT</span>
                            </>
                          )}
                        </div>

                        {/* Toggle Stop Schedule & Time Windows */}
                        {r.schedule && r.schedule.length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => toggleSchedule(r.vehicle_id || idx)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--cyan-core)',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              <span>{isExpanded ? 'Hide Stop Timeline & Windows' : 'Show Stop Timeline & Time Windows'}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {isExpanded && (
                              <div style={{ marginTop: '0.65rem', overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                      <th style={{ padding: '0.35rem' }}>Waypoint</th>
                                      <th style={{ padding: '0.35rem' }}>Arrival</th>
                                      <th style={{ padding: '0.35rem' }}>Wait</th>
                                      <th style={{ padding: '0.35rem' }}>Service</th>
                                      <th style={{ padding: '0.35rem' }}>Departure</th>
                                      <th style={{ padding: '0.35rem' }}>Time Window</th>
                                      <th style={{ padding: '0.35rem' }}>Lateness</th>
                                      <th style={{ padding: '0.35rem' }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.schedule.map((sc, sIdx) => {
                                      const isDepot = sc.stop_id.includes('DEPOT') || sIdx === 0 || sIdx === r.schedule.length - 1;
                                      return (
                                        <tr key={sIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                          <td style={{ padding: '0.35rem', fontWeight: 600, color: isDepot ? 'var(--cyan-bright)' : 'var(--text-primary)' }}>
                                            {sc.stop_name || sc.stop_id}
                                          </td>
                                          <td style={{ padding: '0.35rem' }}>{sc.arrival_clock || '—'}</td>
                                          <td style={{ padding: '0.35rem' }}>
                                            {sc.wait_time_s > 0 ? `${(sc.wait_time_s / 60).toFixed(0)}m` : '0m'}
                                          </td>
                                          <td style={{ padding: '0.35rem' }}>
                                            {sc.service_duration_s > 0 ? `${(sc.service_duration_s / 60).toFixed(0)}m` : '0m'}
                                          </td>
                                          <td style={{ padding: '0.35rem' }}>{sc.departure_clock || '—'}</td>
                                          <td style={{ padding: '0.35rem' }}>
                                            {sc.time_window_start || '09:00'} – {sc.time_window_end || '18:00'}
                                          </td>
                                          <td style={{ padding: '0.35rem', color: sc.lateness_s > 0 ? '#f87171' : 'var(--text-tertiary)' }}>
                                            {sc.lateness_s > 0 ? `+${(sc.lateness_s / 60).toFixed(0)}m` : '0m'}
                                          </td>
                                          <td style={{ padding: '0.35rem' }}>
                                            <span
                                              style={{
                                                color: sc.is_late ? '#f87171' : sc.wait_time_s > 0 ? 'var(--cyan-bright)' : '#34d399',
                                                fontWeight: 600,
                                              }}
                                            >
                                              {sc.is_late ? 'Late' : sc.wait_time_s > 0 ? 'Early (Waited)' : 'On Time'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-box">
                  <Navigation size={32} color="var(--text-tertiary)" />
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Fleet Dispatch Route Assignments
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '380px' }}>
                    Vehicle sequence assignments, waypoint arrival times, and capacity utilization will populate here following real algorithm execution.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
