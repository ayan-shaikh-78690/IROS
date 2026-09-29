import React from 'react';
import {
  BarChart3,
  TrendingDown,
  Layers,
  Clock,
  Gauge,
  MapPin,
  Route,
  Activity,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function Analytics() {
  const metricCards = [
    { label: 'Best Objective Cost', value: '--', unit: 'Quality score', icon: Gauge, desc: 'Multi-objective aggregated cost' },
    { label: 'Route Distance', value: '--', unit: 'Kilometers', icon: Route, desc: 'Total network driving distance' },
    { label: 'Travel Time', value: '--', unit: 'Minutes', icon: Clock, desc: 'Congestion-weighted trip duration' },
    { label: 'Congestion Index', value: '--', unit: 'Traffic factor', icon: Activity, desc: 'Network impedance penalty' },
    { label: 'Solver Runtime', value: '--', unit: 'Milliseconds', icon: Clock, desc: 'Wall-clock computation latency' },
    { label: 'Search Cycles', value: '--', unit: 'Generations', icon: Layers, desc: 'Convergence stopping epoch' },
  ];

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <Badge variant="indigo">Fleet Telemetry</Badge>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              REPORTS &amp; METRICS
            </span>
          </div>
          <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
            Analytics Dashboard
          </h1>
          <p className="text-body">
            Performance metrics, objective trade-off curves, and multi-algorithm efficiency comparisons.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={true}
            title="Export available once optimization runs"
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <GlassCard key={metric.label} className="metric-card" interactive={true}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">{metric.label}</span>
                <Icon size={16} color="var(--text-tertiary)" />
              </div>
              <div className="metric-value" style={{ color: 'var(--text-tertiary)' }}>
                {metric.value}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-sub">{metric.unit}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                  Awaiting Run
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Empty Chart Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Chart 1: Convergence Profile */}
        <GlassCard style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                Optimization Improvement Profile
              </h3>
              <p className="text-body-sm">
                Cost reduction trajectory over successive search generations.
              </p>
            </div>
            <Badge variant="neutral">Convergence Chart</Badge>
          </div>

          <div className="empty-state-box" style={{ height: '240px' }}>
            <TrendingDown size={36} color="var(--text-tertiary)" />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              No Active Convergence Data
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px' }}>
              Execute an optimization job in Optimization Studio to visualize route cost reduction in real-time.
            </p>
          </div>
        </GlassCard>

        {/* Chart 2: Algorithm Comparison & Scalability Dual Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Algorithm Comparison Chart */}
          <GlassCard style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                  Algorithm Benchmark Comparison
                </h3>
                <p className="text-body-sm">
                  Classical PSO vs Quantum-Inspired QPSO.
                </p>
              </div>
              <Badge variant="neutral">Comparison</Badge>
            </div>

            <div className="empty-state-box" style={{ height: '200px' }}>
              <BarChart3 size={32} color="var(--text-tertiary)" />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Benchmark Matrix Awaiting Telemetry
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '320px' }}>
                Side-by-side bar distributions will compare distance, travel time, and objective scores once calculated.
              </p>
            </div>
          </GlassCard>

          {/* Scalability Chart */}
          <GlassCard style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                  Fleet Scalability Analysis
                </h3>
                <p className="text-body-sm">
                  Convergence latency as delivery stops scale.
                </p>
              </div>
              <Badge variant="neutral">Scalability</Badge>
            </div>

            <div className="empty-state-box" style={{ height: '200px' }}>
              <Activity size={32} color="var(--text-tertiary)" />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Scalability Curves Awaiting Multi-Run Data
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '320px' }}>
                Profiles execution time and memory footprint as network graph size and stop count scale.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
