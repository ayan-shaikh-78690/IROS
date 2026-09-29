import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Zap,
  TrendingDown,
  Clock,
  Navigation,
  ShieldCheck,
  Scale,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Award,
  Layers,
  Info,
  MapPin,
  ArrowRight,
  Database,
  Sliders,
} from 'lucide-react';
import { useScenario } from '../context/ScenarioContext';
import {
  runPsoOptimization,
  runQpsoOptimization,
  runOptimizationComparison,
} from '../services/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import ConvergenceChart from '../components/ConvergenceChart';

export default function AlgorithmArena() {
  const navigate = useNavigate();
  const {
    scenario,
    setOptimizedRoutes,
    setActiveRouteView,
    optimizationResults,
    setOptimizationResults,
    calculateBaseline,
    beforeOptimizationMetrics,
  } = useScenario();

  const [showFormulas, setShowFormulas] = useState(false);
  const [iterations, setIterations] = useState(80);
  const [populationSize, setPopulationSize] = useState(40);
  const [randomSeed, setRandomSeed] = useState(42);
  const [runningAlgo, setRunningAlgo] = useState(null); // 'pso' | 'qpso' | 'compare' | null
  const [singleResult, setSingleResult] = useState(optimizationResults || null);
  const [compResults, setCompResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync if context optimizationResults updates externally
  useEffect(() => {
    if (optimizationResults && !singleResult && !compResults) {
      setSingleResult(optimizationResults);
    }
  }, [optimizationResults]);

  const buildPayload = () => {
    return {
      scenario_id: scenario.id || 'ahmedabad-peak',
      scenario: {
        scenario_id: scenario.id || 'ahmedabad-peak',
        name: scenario.name || 'Active Scenario',
        region: scenario.region || 'Ahmedabad–Gandhinagar, Gujarat',
        num_vehicles: scenario.vehicles?.length || scenario.numVehicles || 3,
        vehicle_capacity: scenario.vehicleCapacity || 120,
        vehicleType: scenario.vehicleType || 'van',
        vehicles: (scenario.vehicles && scenario.vehicles.length > 0)
          ? scenario.vehicles
          : Array.from({ length: scenario.numVehicles || 3 }, (_, i) => ({
              id: `VEH-${String(i + 1).padStart(2, '0')}`,
              type: scenario.vehicleType || 'van',
              capacity: scenario.vehicleCapacity || 120,
              available: true,
            })),
        weights: scenario.weights || { distance: 0.4, travelTime: 0.4, congestion: 0.2 },
        depot: scenario.depot,
        customers: (scenario.customers || []).map((c, idx) => ({
          customer_id: c.id || `CUST-${String(idx + 1).padStart(3, '0')}`,
          name: c.name || `Delivery Stop ${idx + 1}`,
          lat: Number(c.lat || c.latitude),
          lng: Number(c.lng || c.longitude),
          demand: c.demand != null ? Number(c.demand) : 15,
          earliest_arrival: c.earliestArrival || '09:00',
          latest_arrival: c.latestArrival || '18:00',
        })),
      },
      population_size: Number(populationSize) || 40,
      iterations: Number(iterations) || 80,
      random_seed: Number(randomSeed) || 42,
      weight_distance: scenario.weights?.distance ?? 0.4,
      weight_travel_time: scenario.weights?.travelTime ?? 0.4,
      weight_congestion: scenario.weights?.congestion ?? 0.2,
      include_road_geometry: true,
    };
  };

  const handleRunSingle = async (algoType) => {
    if (!scenario.depot || !scenario.depot.lat || !scenario.depot.lng) {
      setErrorMessage('Please set a depot in Scenario Lab before running optimization.');
      return;
    }
    if (!scenario.customers || scenario.customers.length === 0) {
      setErrorMessage('Please add delivery stops in Scenario Lab before running optimization.');
      return;
    }

    setRunningAlgo(algoType);
    setErrorMessage(null);
    setCompResults(null);

    try {
      // Ensure baseline exists
      if (!beforeOptimizationMetrics) {
        await calculateBaseline();
      }

      const payload = buildPayload();
      let res;
      if (algoType === 'pso') {
        res = await runPsoOptimization(payload);
      } else {
        res = await runQpsoOptimization(payload);
      }

      if (res.ok && res.data && res.data.status === 'success') {
        const runData = res.data;
        setSingleResult(runData);
        setOptimizationResults(runData);

        if (runData.routes_with_geometry && runData.routes_with_geometry.length > 0) {
          setOptimizedRoutes(runData.routes_with_geometry);
        }
      } else {
        setErrorMessage(res.data?.detail || res.error || `${algoType.toUpperCase()} optimization encountered an issue.`);
      }
    } catch (err) {
      setErrorMessage(err.message || `Error communicating with ${algoType.toUpperCase()} engine.`);
    } finally {
      setRunningAlgo(null);
    }
  };

  const handleRunComparison = async () => {
    if (!scenario.depot || !scenario.depot.lat || !scenario.depot.lng) {
      setErrorMessage('Please set a depot in Scenario Lab before running comparison.');
      return;
    }
    if (!scenario.customers || scenario.customers.length === 0) {
      setErrorMessage('Please add delivery stops in Scenario Lab before running comparison.');
      return;
    }

    setRunningAlgo('compare');
    setErrorMessage(null);
    setSingleResult(null);

    try {
      if (!beforeOptimizationMetrics) {
        await calculateBaseline();
      }

      const payload = buildPayload();
      const res = await runOptimizationComparison(payload);

      if (res.ok && res.data && res.data.status === 'success') {
        const compData = res.data;
        setCompResults(compData);

        const winnerAlgo = compData.comparison.winner === 'QPSO' ? compData.qpso : compData.pso;
        setOptimizationResults(winnerAlgo);

        if (compData.winning_routes_with_geometry && compData.winning_routes_with_geometry.length > 0) {
          setOptimizedRoutes(compData.winning_routes_with_geometry);
        }
      } else {
        setErrorMessage(res.data?.detail || res.error || 'Benchmark comparison encountered an unexpected issue.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error communicating with backend benchmark engine.');
    } finally {
      setRunningAlgo(null);
    }
  };

  const handleViewOnMap = () => {
    setActiveRouteView('optimized');
    navigate('/scenario');
  };

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">M2.3 Optimization Arena</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            DISCRETE VRP METAHEURISTIC DASHBOARD
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
          Optimization Algorithms
        </h1>
        <p className="text-body" style={{ maxWidth: '820px' }}>
          Live operational dashboard executing authentic discrete Particle Swarm Optimization (PSO) and Quantum-Behaved Particle Swarm Optimization (QPSO) on the active Scenario Lab road network.
        </p>
      </div>

      {/* Control Bar: Shared Scenario + Hyperparameters + Action Buttons */}
      <GlassCard style={{ padding: '1.75rem' }} accent={true}>
        {/* Scenario Status Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Database size={15} color="var(--cyan-core)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Scenario: {scenario.name || 'Ahmedabad Metropolitan'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
              {scenario.customers?.length || 0} Delivery Customers • {(scenario.vehicles?.length || scenario.numVehicles || 3)} Fleet Vehicles ({scenario.vehicleCapacity || 120} kg cap) • Region: {scenario.region || 'Ahmedabad, Gujarat'}
            </p>
          </div>

          {/* Action Buttons: [ Run PSO ], [ Run QPSO ], [ Compare PSO vs QPSO ] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              id="run-pso-btn"
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#818cf8',
              }}
              onClick={() => handleRunSingle('pso')}
              disabled={!!runningAlgo}
            >
              <Cpu size={16} />
              <span>{runningAlgo === 'pso' ? 'Solving PSO...' : 'Run PSO'}</span>
            </button>

            <button
              id="run-qpso-btn"
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(14, 165, 233, 0.5)',
                color: 'var(--cyan-bright)',
              }}
              onClick={() => handleRunSingle('qpso')}
              disabled={!!runningAlgo}
            >
              <Zap size={16} />
              <span>{runningAlgo === 'qpso' ? 'Solving QPSO...' : 'Run QPSO'}</span>
            </button>

            <button
              id="compare-pso-qpso-btn"
              type="button"
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onClick={handleRunComparison}
              disabled={!!runningAlgo}
            >
              <Scale size={16} />
              <span>{runningAlgo === 'compare' ? 'Benchmarking Both...' : 'Compare PSO vs QPSO'}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.8125rem',
              marginTop: '1rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Hyperparameter Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.25rem',
          }}
        >
          {/* Swarm Size */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Swarm Size: {populationSize} Particles
            </label>
            <input
              id="swarm-size-input"
              type="range"
              min="20"
              max="100"
              step="10"
              value={populationSize}
              onChange={(e) => setPopulationSize(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan-core)' }}
            />
          </div>

          {/* Iterations */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Max Iterations: {iterations} Cycles
            </label>
            <input
              id="iterations-input"
              type="range"
              min="30"
              max="200"
              step="10"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan-core)' }}
            />
          </div>

          {/* Reproducible Seed */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Random Seed (Fairness)
            </label>
            <input
              id="random-seed-input"
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </div>
      </GlassCard>

      {/* PHASE 13: LIVE RESULT DASHBOARD (Single Run: PSO or QPSO) */}
      {singleResult && !compResults && (
        <GlassCard
          id="single-run-live-dashboard"
          style={{
            padding: '2rem',
            border: `1px solid ${singleResult.algorithm === 'QPSO' ? 'var(--cyan-core)' : '#818cf8'}`,
          }}
        >
          {/* Dashboard Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: singleResult.algorithm === 'QPSO' ? 'rgba(14, 165, 233, 0.18)' : 'rgba(99, 102, 241, 0.18)',
                  color: singleResult.algorithm === 'QPSO' ? 'var(--cyan-bright)' : '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {singleResult.algorithm === 'QPSO' ? <Zap size={24} /> : <Cpu size={24} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className="text-h3" style={{ fontSize: '1.25rem' }}>
                    Live Dashboard: {singleResult.algorithm} Optimization Run
                  </h3>
                  <Badge variant={singleResult.algorithm === 'QPSO' ? 'cyan' : 'indigo'}>
                    {singleResult.algorithm}
                  </Badge>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Run ID: {singleResult.run_id || 'LOCAL-OPT'} • Scenario: {singleResult.scenario_id || scenario.id || 'ahmedabad-peak'}
                </span>
              </div>
            </div>

            <button
              id="view-optimized-routes-map-btn"
              type="button"
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
              }}
              onClick={handleViewOnMap}
            >
              <span>View Optimized Routes on Map</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Key Metric Indicators Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {/* Algorithm Info */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Algorithm</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: singleResult.algorithm === 'QPSO' ? 'var(--cyan-bright)' : '#818cf8', fontFamily: 'var(--font-mono)' }}>
                {singleResult.algorithm}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Discrete Permutation VRP
              </span>
            </div>

            {/* Swarm Size & Iterations */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Swarm / Iterations</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {singleResult.parameters?.population_size || populationSize} / {singleResult.parameters?.iterations || iterations}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Seed: {singleResult.parameters?.random_seed ?? randomSeed}
              </span>
            </div>

            {/* Runtime */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Solver Runtime</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {Number(singleResult.execution_time_ms || 0).toFixed(1)} ms
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                FastAPI Metaheuristic
              </span>
            </div>

            {/* Best Fitness */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Best Fitness</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono)' }}>
                {Number(singleResult.best_fitness || 0).toFixed(3)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Multi-objective cost
              </span>
            </div>

            {/* Distance */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Total Distance</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {Number(singleResult.total_distance_km || 0).toFixed(2)} km
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                OSRM Road Network
              </span>
            </div>

            {/* Travel Time */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Total Travel Time</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {Number(singleResult.total_travel_time_min || 0).toFixed(1)} min
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Traffic-aware duration
              </span>
            </div>

            {/* Feasibility */}
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Constraint Status</span>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: singleResult.is_feasible ? '#34d399' : '#f59e0b',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {singleResult.is_feasible ? (
                  <>
                    <CheckCircle2 size={16} /> Feasible
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} /> Penalized
                  </>
                )}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Cap: {singleResult.capacity_penalty || 0} • TW: {singleResult.time_window_penalty || 0}
              </span>
            </div>
          </div>

          {/* Actual Recorded Convergence Curve */}
          <div style={{ marginBottom: '1.5rem' }}>
            <ConvergenceChart
              psoData={singleResult.algorithm === 'PSO' ? singleResult.convergence_history : undefined}
              qpsoData={singleResult.algorithm === 'QPSO' ? singleResult.convergence_history : undefined}
              title={`${singleResult.algorithm} Convergence Trajectory (${singleResult.convergence_history?.length || 0} Iterations)`}
              height={260}
            />
          </div>

          {/* Vehicle Route Breakdown */}
          {singleResult.routes_with_geometry && singleResult.routes_with_geometry.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Fleet Route Allocations ({singleResult.routes_with_geometry.length} Active Vehicles)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {singleResult.routes_with_geometry.map((r, i) => (
                  <div
                    key={r.vehicle_id || i}
                    className="glass-panel-subtle"
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${r.color || 'var(--cyan-core)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {r.vehicle_id || `VEH-${String(i + 1).padStart(2, '0')}`}
                      </span>
                      <Badge variant="cyan" style={{ fontSize: '0.65rem' }}>
                        {r.stops_count || r.customer_ids?.length || 0} stops
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      <span>Dist: {r.distance_km ? `${r.distance_km} km` : `${(r.distance_m / 1000).toFixed(1)} km`}</span>
                      <span>Time: {r.duration_min ? `${r.duration_min} min` : `${(r.duration_s / 60).toFixed(1)} min`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Real Empirical Benchmark Results (Appears after Comparison run) */}
      {compResults && (
        <GlassCard id="comparison-benchmark-dashboard" style={{ padding: '2rem', border: '1px solid var(--cyan-core)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.18)',
                  color: 'var(--cyan-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-h3" style={{ fontSize: '1.25rem' }}>
                  Empirical Benchmark Result: {compResults.comparison.winner === 'QPSO' ? 'Quantum QPSO Outperformed PSO' : `${compResults.comparison.winner} Outperformed`}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Evaluated {compResults.problem_size.customers} Customers across {compResults.problem_size.vehicles} Fleet Vehicles
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Badge variant={compResults.comparison.winner === 'QPSO' ? 'cyan' : 'indigo'}>
                Winner: {compResults.comparison.winner}
              </Badge>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleViewOnMap}
              >
                <span>View on Map</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Differential Key Statistics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Fitness Advantage</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono)' }}>
                {compResults.comparison.fitness_improvement_percent > 0 ? `+${compResults.comparison.fitness_improvement_percent}%` : `${compResults.comparison.fitness_improvement_percent}%`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Δ {compResults.comparison.fitness_improvement_absolute} pts
              </span>
            </div>

            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Distance Delta</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {(compResults.pso.total_distance_km - compResults.qpso.total_distance_km).toFixed(1)} km
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                QPSO: {compResults.qpso.total_distance_km} km vs PSO: {compResults.pso.total_distance_km} km
              </span>
            </div>

            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Travel Time Delta</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {(compResults.pso.total_travel_time_min - compResults.qpso.total_travel_time_min).toFixed(1)} min
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                QPSO: {compResults.qpso.total_travel_time_min} min vs PSO: {compResults.pso.total_travel_time_min} min
              </span>
            </div>

            <div className="glass-panel-subtle" style={{ padding: '1rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Computation Speed</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {compResults.comparison.speedup_ratio}x
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                QPSO: {compResults.qpso.execution_time_ms} ms | PSO: {compResults.pso.execution_time_ms} ms
              </span>
            </div>
          </div>

          {/* Comparative Convergence Chart */}
          <div style={{ marginBottom: '2rem' }}>
            <ConvergenceChart
              psoData={compResults.pso.convergence_history}
              qpsoData={compResults.qpso.convergence_history}
              title="Dual Algorithm Convergence Comparison (PSO vs QPSO)"
              height={260}
            />
          </div>

          {/* Side-by-Side Verification Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '0.75rem' }}>Evaluation Metric</th>
                  <th style={{ padding: '0.75rem', color: '#818cf8' }}>Classical PSO (Baseline)</th>
                  <th style={{ padding: '0.75rem', color: 'var(--cyan-bright)' }}>Quantum QPSO</th>
                  <th style={{ padding: '0.75rem' }}>Differential / Result</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    Best Multi-Objective Cost
                  </td>
                  <td style={{ padding: '0.75rem' }}>{Number(compResults.pso.best_fitness).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--cyan-bright)' }}>
                    {Number(compResults.qpso.best_fitness).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', color: compResults.comparison.fitness_improvement_absolute >= 0 ? '#34d399' : '#f43f5e' }}>
                    {compResults.comparison.fitness_improvement_absolute >= 0 ? `-${compResults.comparison.fitness_improvement_absolute} pts` : `+${Math.abs(compResults.comparison.fitness_improvement_absolute)} pts`}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    Total Fleet Distance (km)
                  </td>
                  <td style={{ padding: '0.75rem' }}>{compResults.pso.total_distance_km} km</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--cyan-bright)' }}>
                    {compResults.qpso.total_distance_km} km
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {(compResults.qpso.total_distance_km - compResults.pso.total_distance_km).toFixed(1)} km
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    Total Travel Time (min)
                  </td>
                  <td style={{ padding: '0.75rem' }}>{compResults.pso.total_travel_time_min} min</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--cyan-bright)' }}>
                    {compResults.qpso.total_travel_time_min} min
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {(compResults.qpso.total_travel_time_min - compResults.pso.total_travel_time_min).toFixed(1)} min
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    Solver Runtime (ms)
                  </td>
                  <td style={{ padding: '0.75rem' }}>{compResults.pso.execution_time_ms} ms</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                    {compResults.qpso.execution_time_ms} ms
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {compResults.comparison.speedup_ratio}x ratio
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    Route Constraint Feasibility
                  </td>
                  <td style={{ padding: '0.75rem', color: compResults.pso.is_feasible ? '#34d399' : '#fbbf24' }}>
                    {compResults.pso.is_feasible ? 'Feasible (100%)' : 'Penalized'}
                  </td>
                  <td style={{ padding: '0.75rem', color: compResults.qpso.is_feasible ? '#34d399' : '#fbbf24' }}>
                    {compResults.qpso.is_feasible ? 'Feasible (100%)' : 'Penalized'}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#34d399' }}>
                    Capacity &amp; Time Windows Checked
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Head-to-Head Comparison Methodology Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Classical PSO Panel */}
        <GlassCard style={{ padding: '2rem' }} interactive={true}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--indigo-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cpu size={22} />
              </div>
              <div>
                <h3 className="text-h3">Classical PSO</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Velocity &amp; Position Swarm
                </div>
              </div>
            </div>
            <Badge variant="indigo">Classical</Badge>
          </div>

          <p className="text-body" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Discrete permutation PSO using swap-sequence velocity operators V = w ⊗ V ⊕ c1·r1 ⊗ (P_best ⊖ X) ⊕ c2·r2 ⊗ (G_best ⊖ X). Explores route spaces through sequential transposition steps.
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <li>▸ Permutation swap sequences maintain strict customer visit uniqueness.</li>
            <li>▸ Can plateau in local optima when swap sequences cancel or cycle.</li>
            <li>▸ Standard benchmark baseline for metaheuristic fleet routing.</li>
          </ul>
        </GlassCard>

        {/* Quantum-Inspired QPSO Panel */}
        <GlassCard style={{ padding: '2rem' }} accent={true} interactive={true}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(14, 165, 233, 0.15)',
                  color: 'var(--cyan-core)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <h3 className="text-h3">Quantum-Inspired QPSO</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Quantum Probability Model
                </div>
              </div>
            </div>
            <Badge variant="cyan">Quantum-Inspired</Badge>
          </div>

          <p className="text-body" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Employs quantum delta potential well dynamics, collective Mean Best (M_best) edge-precedence consensus, and contraction-expansion coefficient α (1.0 → 0.5).
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <li>▸ Discards classical velocity vectors, eliminating hyperparameter inertia tuning.</li>
            <li>▸ Quantum tunneling radius α · |M_best - X_i| · ln(1/u) escapes local traffic bottlenecks.</li>
            <li>▸ Demonstrates faster convergence across tightly constrained multi-vehicle delivery instances.</li>
          </ul>
        </GlassCard>
      </div>

      {/* Mathematical Formulation View */}
      <GlassCard style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Code2 size={20} color="var(--cyan-core)" />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Mathematical Formulations &amp; State Equations
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Discrete permutation operators and quantum wave function formulas implemented in backend.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="btn btn-secondary btn-sm"
          >
            <span>{showFormulas ? 'Hide Equations' : 'Show Equations'}</span>
            {showFormulas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showFormulas && (
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* PSO math */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: '8px',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Discrete PSO Velocity &amp; Position Updates:
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>V_i(t+1) = w ⊗ V_i(t) ⊕ c1·r1 ⊗ (Pbest_i ⊖ X_i) ⊕ c2·r2 ⊗ (Gbest ⊖ X_i)</div>
                <div>X_i(t+1) = X_i(t) ⊕ V_i(t+1)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Where ⊖ computes permutation difference swap sequence and ⊕ applies swaps.
                </div>
              </div>
            </div>

            {/* QPSO math */}
            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: '8px',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Quantum Potential Well &amp; Mean Best Consensus:
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>Mbest = Consensus edge-precedence graph across all Pbest_i</div>
                <div>P_i = φ · Pbest_i + (1 - φ) · Gbest, where φ ~ U(0,1)</div>
                <div>X_i(t+1) = QuantumTunnel(P_i, α · Distance(Mbest, X_i) · ln(1/u))</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Contraction-expansion α linearly decreases from 1.0 to 0.5.
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
