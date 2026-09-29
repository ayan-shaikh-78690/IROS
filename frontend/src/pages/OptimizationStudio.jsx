import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Zap,
  Play,
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
} from 'lucide-react';
import { useScenario } from '../context/ScenarioContext';
import { submitOptimizationJob } from '../services/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function OptimizationStudio() {
  const { scenario, optimizationSettings, updateOptimizationSettings, optimizationResults } =
    useScenario();

  const [isRunning, setIsRunning] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleRunOptimization = async () => {
    setIsRunning(true);
    setNotification(null);

    try {
      const response = await submitOptimizationJob({
        scenario: {
          name: scenario.name,
          region: scenario.region,
          num_vehicles: scenario.numVehicles,
          vehicle_capacity: scenario.vehicleCapacity,
          weights: scenario.weights,
          depot: scenario.depot,
          customers: scenario.customers.map((c) => ({
            customer_id: c.id,
            lat: c.lat,
            lng: c.lng,
            demand: c.demand,
            earliest_arrival: c.earliestArrival,
            latest_arrival: c.latestArrival,
          })),
        },
        algorithm: optimizationSettings.algorithm,
        population_size: optimizationSettings.populationSize,
        iterations: optimizationSettings.iterations,
        weights: optimizationSettings.weights,
      });

      if (response.status === 501) {
        setNotification({
          type: 'info',
          title: 'Optimization Engine Integration',
          message:
            'The route optimization solver will connect directly here once the road graph engine is linked. Scenario parameters and fleet rules are ready for dispatch.',
        });
      } else if (!response.ok) {
        setNotification({
          type: 'notice',
          title: 'Solver Connection in Progress',
          message:
            'The optimization solver is currently in scenario formulation mode. In accordance with platform integrity rules, no synthetic or fake routes are displayed.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'notice',
        title: 'Backend Solver Standby',
        message: 'The optimization solver will execute routes once the background engine is linked.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">Route Solver</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            OPTIMIZATION CONTROL
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
          Optimization Studio
        </h1>
        <p className="text-body">
          Configure search parameters, choose optimization methods, and execute fleet route planning.
        </p>
      </div>

      {/* Main Grid: Controls vs Results Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Configuration Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Scenario Summary Card */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="text-h3" style={{ fontSize: '1.1rem' }}>
                Scenario Summary
              </h3>
              <Link to="/scenario" style={{ fontSize: '0.8rem', color: 'var(--cyan-core)', textDecoration: 'none', fontWeight: 600 }}>
                Edit in Scenario Lab →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Scenario:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenario.name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Region:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scenario.region}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Fleet Size:</span>
                <span style={{ color: 'var(--cyan-core)', fontWeight: 600 }}>{scenario.numVehicles} Vehicles ({scenario.vehicleType || 'Van'})</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Delivery Stops:</span>
                <span style={{ color: 'var(--cyan-core)', fontWeight: 600 }}>{scenario.customers.length} Waypoints</span>
              </div>
            </div>
          </GlassCard>

          {/* Algorithm Selector Card */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <h3 className="text-h3" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
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
                    <Badge variant="indigo">Standard Swarm</Badge>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Evaluates delivery routes by simulating a swarm of search particles moving through permutation space with speed and direction adjustments.
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
                    Uses quantum probability mechanics to search across widespread routes simultaneously, preventing the algorithm from getting stuck in dead ends.
                  </p>
                </div>
              </label>
            </div>
          </GlassCard>

          {/* Hyperparameters Card */}
          <GlassCard style={{ padding: '1.5rem' }}>
            <h3 className="text-h3" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              Swarm Search Settings
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
                  max="200"
                  step="10"
                  value={optimizationSettings.populationSize}
                  onChange={(e) =>
                    updateOptimizationSettings({ populationSize: parseInt(e.target.value) })
                  }
                  style={{ width: '100%', accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  <span>20</span>
                  <span>100</span>
                  <span>200</span>
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
                  min="50"
                  max="500"
                  step="25"
                  value={optimizationSettings.iterations}
                  onChange={(e) =>
                    updateOptimizationSettings({ iterations: parseInt(e.target.value) })
                  }
                  style={{ width: '100%', accentColor: 'var(--cyan-core)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  <span>50</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>

              {/* Active Weights Summary */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Active Priorities:
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <span>Distance: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.distance}</b></span>
                  <span>Time: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.travelTime}</b></span>
                  <span>Traffic: <b style={{ color: 'var(--text-primary)' }}>{scenario.weights.congestion}</b></span>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                onClick={handleRunOptimization}
                disabled={isRunning}
              >
                <Play size={16} />
                <span>{isRunning ? 'Submitting Scenario...' : 'Run Route Optimization'}</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Telemetry & Results Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Notification Alert if user clicks Run */}
          {notification && (
            <GlassCard
              style={{
                padding: '1.25rem',
                borderLeft: '4px solid var(--cyan-core)',
                background: 'rgba(14, 165, 233, 0.1)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Info size={20} color="var(--cyan-core)" style={{ flexShrink: 0, marginTop: '2px' }} />
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

          {/* Results Telemetry Structure */}
          <GlassCard style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                Route Optimization Telemetry
              </h3>
              <Badge variant="neutral">Status: Ready for Run</Badge>
            </div>

            {/* Metrics cards grid in awaiting state */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Best Cost</span>
                <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>--</span>
                <span className="metric-sub">Multi-priority score</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Total Distance</span>
                <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>--</span>
                <span className="metric-sub">Kilometers</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Travel Time</span>
                <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>--</span>
                <span className="metric-sub">Minutes</span>
              </div>

              <div className="glass-panel-subtle metric-card">
                <span className="metric-label">Traffic Impact</span>
                <span className="metric-value" style={{ color: 'var(--text-tertiary)' }}>--</span>
                <span className="metric-sub">Congestion factor</span>
              </div>
            </div>

            {/* Convergence Chart Container (Empty state) */}
            <div
              className="empty-state-box"
              style={{ marginBottom: '1.5rem' }}
            >
              <Activity size={32} color="var(--text-tertiary)" />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Search Improvement Curve
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '380px' }}>
                Optimization engine will appear here after the scenario is ready. Real calculation graphs will plot how route quality improves across cycles.
              </p>
            </div>

            {/* Routes Container (Empty state) */}
            <div className="empty-state-box">
              <Navigation size={32} color="var(--text-tertiary)" />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Fleet Dispatch Route Assignments
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '380px' }}>
                Vehicle sequence assignments, waypoint arrival times, and capacity utilization will populate here following real algorithm execution.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
