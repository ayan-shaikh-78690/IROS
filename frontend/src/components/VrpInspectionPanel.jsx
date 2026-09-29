import React, { useState } from 'react';
import {
  Layers,
  Truck,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Table,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Activity,
  ArrowRight,
} from 'lucide-react';
import GlassCard from './GlassCard';
import Badge from './Badge';
import { useScenario } from '../context/ScenarioContext';

export default function VrpInspectionPanel() {
  const {
    scenario,
    vrpSolution,
    vrpMatrix,
    isVrpLoading,
    vrpError,
    calculateVrpSolution,
  } = useScenario();

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'matrix', 'fitness', 'provenance'
  const [matrixMetric, setMatrixMetric] = useState('distance'); // 'distance' or 'duration'

  const hasSolution = !!vrpSolution && vrpSolution.routes && vrpSolution.routes.length > 0;
  const isOverallFeasible = vrpSolution?.is_overall_feasible;

  return (
    <GlassCard style={{ padding: '1.25rem 1.35rem', marginTop: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(14, 165, 233, 0.3)',
            }}
          >
            <Layers size={18} color="var(--cyan-core)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Discrete VRP Representation &amp; Constraint Engine
              </span>
              <Badge variant="cyan">M2.2-B</Badge>
              {hasSolution && (
                <Badge variant={isOverallFeasible ? 'emerald' : 'rose'}>
                  {isOverallFeasible ? 'High-Quality Feasible' : 'Constraint Violations'}
                </Badge>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.725rem',
                color: 'var(--text-tertiary)',
              }}
            >
              CVRP-TW Combinatorial State • Asymmetric Road Matrix • Decoded Multi-Vehicle Schedules
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              calculateVrpSolution();
            }}
            disabled={isVrpLoading}
            title="Recalculate VRP Solution"
            style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} className={isVrpLoading ? 'spin-animation' : ''} />
            <span style={{ fontSize: '0.75rem' }}>Evaluate VRP</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.5rem', border: 'none' }}
            aria-label="Toggle VRP details"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Methodological Context Note */}
          <div
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.775rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <b style={{ color: 'var(--text-primary)' }}>Combinatorial Search Space Foundation:</b>{' '}
            The discrete representation provides the combinatorial search space that will later be coupled with a problem-specific QPSO update/mapping strategy in M4.
            Evaluates near-optimal candidate solutions and high-quality feasible solutions across heterogeneous vehicle fleets.
          </div>

          {/* Live Constraint Status Badges */}
          {hasSolution && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {/* Coverage */}
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '7px',
                  background: vrpSolution.is_coverage_feasible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${vrpSolution.is_coverage_feasible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {vrpSolution.is_coverage_feasible ? (
                  <CheckCircle2 size={16} color="var(--status-success)" />
                ) : (
                  <AlertCircle size={16} color="var(--status-danger)" />
                )}
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Coverage Constraint</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: vrpSolution.is_coverage_feasible ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {vrpSolution.is_coverage_feasible ? '100% Visited (Exact)' : `${vrpSolution.unassigned_customers.length} Omitted / ${vrpSolution.duplicate_customers.length} Dups`}
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '7px',
                  background: vrpSolution.is_capacity_feasible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${vrpSolution.is_capacity_feasible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {vrpSolution.is_capacity_feasible ? (
                  <CheckCircle2 size={16} color="var(--status-success)" />
                ) : (
                  <AlertTriangle size={16} color="var(--status-danger)" />
                )}
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fleet Capacity</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: vrpSolution.is_capacity_feasible ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {vrpSolution.is_capacity_feasible ? 'All Fleets Feasible' : `Excess: +${vrpSolution.total_capacity_violations} units`}
                  </div>
                </div>
              </div>

              {/* Time Window */}
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '7px',
                  background: vrpSolution.is_time_window_feasible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${vrpSolution.is_time_window_feasible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {vrpSolution.is_time_window_feasible ? (
                  <CheckCircle2 size={16} color="var(--status-success)" />
                ) : (
                  <Clock size={16} color="var(--status-danger)" />
                )}
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Time Windows</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: vrpSolution.is_time_window_feasible ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {vrpSolution.is_time_window_feasible ? '100% On-Time Arrival' : `Delay: +${vrpSolution.total_time_window_violations_min} min`}
                  </div>
                </div>
              </div>

              {/* Asymmetric Road Matrix Provider */}
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '7px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Activity size={16} color="var(--cyan-core)" />
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Routing Matrix Provider</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {vrpMatrix?.provider || 'OSRM'}{' '}
                    {vrpMatrix?.is_fallback ? (
                      <span style={{ color: 'var(--status-warning)', fontSize: '0.7rem' }}>(Fallback)</span>
                    ) : (
                      <span style={{ color: 'var(--status-success)', fontSize: '0.7rem' }}>(Road Network)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.4rem',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'routes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('routes')}
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <Truck size={13} style={{ marginRight: '0.35rem' }} />
              Decoded Routes &amp; Schedules ({vrpSolution?.routes?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('matrix')}
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <Table size={13} style={{ marginRight: '0.35rem' }} />
              Asymmetric Cost Matrix ({vrpMatrix?.location_count || 0}&times;{vrpMatrix?.location_count || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'fitness' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('fitness')}
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <Scale size={13} style={{ marginRight: '0.35rem' }} />
              Fitness &amp; Penalty Function
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'provenance' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('provenance')}
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              <ShieldCheck size={13} style={{ marginRight: '0.35rem' }} />
              Data Provenance (Audit)
            </button>
          </div>

          {/* Tab 1: Decoded Multi-Vehicle Routes & Schedules */}
          {activeTab === 'routes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {vrpSolution?.routes?.map((route, rIdx) => {
                const capPct = Math.min(100, Math.round((route.total_demand_loaded / (route.capacity_limit || 1)) * 100));
                return (
                  <div
                    key={route.vehicle_id || rIdx}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    {/* Vehicle Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={15} color="var(--cyan-core)" />
                        <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                          {route.vehicle_name} ({route.vehicle_id})
                        </span>
                        <Badge variant="neutral">{route.vehicle_type.toUpperCase()}</Badge>
                        <Badge variant={route.is_feasible ? 'emerald' : 'rose'}>
                          {route.is_feasible ? 'Feasible' : 'Violations'}
                        </Badge>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Road: <b>{route.distance_km} km</b></span>
                        <span>Duration: <b>{route.total_duration_min} min</b></span>
                        <span>Demand: <b>{route.total_demand_loaded} / {route.capacity_limit}</b> ({capPct}%)</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div style={{ width: '100%', height: '5px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${capPct}%`,
                          background: route.is_capacity_feasible ? 'var(--status-success)' : 'var(--status-danger)',
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>

                    {/* Sequence Path */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.725rem' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Itinerary:</span>
                      {route.full_sequence?.map((nodeId, idx) => (
                        <React.Fragment key={idx}>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: nodeId.startsWith('DEPOT') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                              border: `1px solid ${nodeId.startsWith('DEPOT') ? 'rgba(99, 102, 241, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
                              color: 'var(--text-primary)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {nodeId}
                          </span>
                          {idx < route.full_sequence.length - 1 && (
                            <ArrowRight size={11} color="var(--text-tertiary)" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Chronological Schedule Table */}
                    <div style={{ overflowX: 'auto', marginTop: '0.35rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Stop Node</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Arrival</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Wait Time</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Service Start</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Service Duration</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Departure</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Time Window</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {route.schedule?.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.stop_id} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({item.stop_name})</span>
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.arrival_clock}</td>
                              <td style={{ padding: '0.35rem 0.5rem', color: item.wait_time_s > 0 ? 'var(--cyan-core)' : 'var(--text-tertiary)' }}>
                                {item.wait_time_s > 0 ? `${Math.round(item.wait_time_s)}s` : '—'}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                                {item.service_duration_s > 0 ? item.arrival_clock : '—'}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>
                                {item.service_duration_s > 0 ? `${item.service_duration_s}s (Default)` : '—'}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{item.departure_clock}</td>
                              <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                                {item.time_window_start && item.time_window_end ? `${item.time_window_start}–${item.time_window_end}` : '—'}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                {item.is_late ? (
                                  <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                                    Late +{Math.round(item.lateness_s)}s
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--status-success)' }}>On Schedule</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Directional Asymmetric Cost Matrix */}
          {activeTab === 'matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  <b>Asymmetric Driving Network:</b> Real road driving costs differ by direction (D[i][j] &ne; D[j][i]) due to one-way corridors and turn restrictions.
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${matrixMetric === 'distance' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMatrixMetric('distance')}
                  >
                    Distance (m)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${matrixMetric === 'duration' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMatrixMetric('duration')}
                  >
                    Duration (s)
                  </button>
                </div>
              </div>

              {vrpMatrix ? (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-tertiary)' }}>Origin \ Destination</th>
                        {vrpMatrix.location_ids?.map((id, colIdx) => (
                          <th key={colIdx} style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            {id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vrpMatrix.location_ids?.map((fromId, rowIdx) => (
                        <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-elevated)', fontFamily: 'var(--font-mono)' }}>
                            {fromId}
                          </td>
                          {vrpMatrix.location_ids?.map((toId, colIdx) => {
                            const matrix = matrixMetric === 'distance' ? vrpMatrix.distances_matrix_m : vrpMatrix.durations_matrix_s;
                            const val = matrix && matrix[rowIdx] ? matrix[rowIdx][colIdx] : 0;
                            const isDiagonal = rowIdx === colIdx;
                            return (
                              <td
                                key={colIdx}
                                style={{
                                  padding: '0.45rem 0.5rem',
                                  textAlign: 'center',
                                  fontFamily: 'var(--font-mono)',
                                  background: isDiagonal ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                  color: isDiagonal ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                }}
                              >
                                {isDiagonal ? '0.0' : val?.toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>No matrix available. Click "Evaluate VRP" above.</div>
              )}
            </div>
          )}

          {/* Tab 3: Multi-Objective Fitness & Cost Breakdown */}
          {activeTab === 'fitness' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(99, 102, 241, 0.1))',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Composite Solution Fitness Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan-bright)' }}>
                    {vrpSolution?.fitness_cost ?? '—'}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                  Minimization Objective<br />
                  <span style={{ color: isOverallFeasible ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {isOverallFeasible ? 'All operational constraints satisfied' : 'Penalties applied for violations'}
                  </span>
                </div>
              </div>

              {vrpSolution?.fitness_breakdown && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Distance Cost (w_d = 0.4)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {vrpSolution.fitness_breakdown.distance_cost} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({vrpSolution.fitness_breakdown.raw_fleet_distance_km} km)</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Duration Cost (w_t = 0.4)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {vrpSolution.fitness_breakdown.duration_cost} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({vrpSolution.fitness_breakdown.raw_fleet_duration_min} min)</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Congestion Cost (w_c = 0.2)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {vrpSolution.fitness_breakdown.congestion_cost} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>(Free-Flow M5 Simulation)</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Capacity Penalty (&lambda;_cap = 100)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: vrpSolution.fitness_breakdown.capacity_penalty > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      +{vrpSolution.fitness_breakdown.capacity_penalty} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({vrpSolution.fitness_breakdown.raw_capacity_violations} excess)</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Time-Window Penalty (&lambda;_tw = 10)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: vrpSolution.fitness_breakdown.time_window_penalty > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      +{vrpSolution.fitness_breakdown.time_window_penalty} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({vrpSolution.fitness_breakdown.raw_time_window_violations_min} min delay)</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Coverage Penalty (&lambda;_cov = 500)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: vrpSolution.fitness_breakdown.coverage_penalty > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      +{vrpSolution.fitness_breakdown.coverage_penalty} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>({vrpSolution.fitness_breakdown.raw_unassigned_stops} missing)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Data Provenance (Audit) */}
          {activeTab === 'provenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <b>Transparent Data Provenance:</b> All parameters, matrices, and scores trace their origins to verifiable providers or explicit inputs.
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.725rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                      <th style={{ padding: '0.45rem 0.65rem' }}>Domain Parameter</th>
                      <th style={{ padding: '0.45rem 0.65rem' }}>Verified Origin</th>
                      <th style={{ padding: '0.45rem 0.65rem' }}>Methodological Integrity Rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Stop Coordinates (Lat/Lng)</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)' }}>user/dataset</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Explicitly chosen landmark or user map pin</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Road Distance</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>OSRM (Driving Profile)</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Real OpenStreetMap street network; never silently Haversine</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Road Duration</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>OSRM (Driving Profile)</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Directional asymmetric travel times (D[i][j] &ne; D[j][i])</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Cargo Demand (Units)</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)' }}>dataset/user</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Delivery parcel payloads per customer</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Vehicle Capacity</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)' }}>scenario/user</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Configured fleet vehicle capacity limit</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Time Windows</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-core)' }}>dataset/user</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Customer opening/closing availability intervals</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Service Duration</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>dataset/user/default (300s)</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Configurable default, not assumed as real ground truth</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Congestion Factor</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>future M5 simulation</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Target for Milestone 5 dynamic simulation</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600 }}>Fitness Score</td>
                      <td style={{ padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>IROS calculation</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>Multi-objective composite minimization function</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
