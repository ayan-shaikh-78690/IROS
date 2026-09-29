import React, { useState } from 'react';
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
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function AlgorithmArena() {
  const [showFormulas, setShowFormulas] = useState(false);

  const emptyContainers = [
    {
      title: 'Fitness Convergence Comparison',
      metric: 'Objective Cost vs Iterations',
      icon: TrendingDown,
      desc: 'Comparative curve plotting particle best global fitness across iterations for both classical PSO and quantum-inspired QPSO.',
    },
    {
      title: 'Execution Runtime Analysis',
      metric: 'Wall-clock Solver Execution Time (ms)',
      icon: Clock,
      desc: 'Computational time required to compute discrete swarm solution iterations under varying problem dimensionalities.',
    },
    {
      title: 'Route Quality & Feasibility',
      metric: 'Pareto Optimal Solution Evaluation',
      icon: ShieldCheck,
      desc: 'Evaluation of constraint violation penalties, time-window overlaps, and vehicle capacity satisfaction rates.',
    },
    {
      title: 'Total Route Distance (km)',
      metric: 'Spatial Euclidean & Network Length',
      icon: Navigation,
      desc: 'Sum of real-road driving distances traversed by the multi-vehicle fleet across all completed tours.',
    },
    {
      title: 'Travel Time Performance',
      metric: 'Congestion-adjusted Duration (mins)',
      icon: Activity,
      desc: 'Aggregate vehicle hours traveled considering dynamic peak-hour bottleneck delays along road segments.',
    },
    {
      title: 'Fleet Scalability Analysis',
      metric: 'N-Waypoints vs Convergence Time',
      icon: Scale,
      desc: 'Algorithmic scalability profiling when customer stops expand from 10 to 100+ delivery locations.',
    },
  ];

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">Benchmarking Lab</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            ALGORITHM COMPARISON
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
          Algorithm Arena
        </h1>
        <p className="text-body" style={{ maxWidth: '750px' }}>
          Comparative evaluation platform contrasting Classical Particle Swarm Optimization (PSO) against Quantum-Behaved Particle Swarm Optimization (QPSO).
        </p>
      </div>

      {/* Head-to-Head Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
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
            Simulates a flock of search particles. Each particle explores different route combinations with a position and velocity, adjusting speed based on its own past best route and the flock's overall best route.
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <li>▸ Works well for standard routing permutations.</li>
            <li>▸ Can sometimes get trapped in local traffic bottlenecks without finding better alternative shortcuts.</li>
            <li>▸ Requires velocity bounds to prevent unstable search behavior.</li>
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
            Inspired by quantum physics. Instead of rigid velocity vectors, search particles can "tunnel" through difficult barrier combinations, allowing the algorithm to discover high-quality global delivery plans much faster.
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <li>▸ Discards velocity vectors, requiring fewer tuning knobs.</li>
            <li>▸ Quantum tunneling mechanics help jump past local dead-ends.</li>
            <li>▸ Demonstrates superior convergence across tightly constrained delivery networks.</li>
          </ul>
        </GlassCard>
      </div>

      {/* Optional Mathematical Formulation View */}
      <GlassCard style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Code2 size={20} color="var(--cyan-core)" />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Mathematical Formulations &amp; State Equations
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                View the exact vector and wave-function formulas behind the two solvers.
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
                Classical PSO Update Mechanics:
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>v_i(t+1) = w·v_i(t) + c1·r1·(pbest_i - x_i) + c2·r2·(gbest - x_i)</div>
                <div>x_i(t+1) = x_i(t) + v_i(t+1)</div>
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
                QPSO Wave Function &amp; Mean Best Position (mbest):
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>mbest = (1/N) · Σ pbest_i</div>
                <div>x_i(t+1) = p_i ± α · |mbest - x_i(t)| · ln(1/u)</div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Empty Visualization Containers Grid */}
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>
            Empirical Benchmark Telemetry Matrix
          </h3>
          <p className="text-body-sm">
            All comparison metrics will populate dynamically following algorithm execution. No synthetic numbers are displayed.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {emptyContainers.map((item) => {
            const Icon = item.icon;
            return (
              <GlassCard
                key={item.title}
                interactive={true}
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'rgba(14, 165, 233, 0.1)',
                        color: 'var(--cyan-core)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                      {item.title}
                    </h4>
                  </div>
                  <Badge variant="neutral">Benchmark Ready</Badge>
                </div>

                <div
                  style={{
                    height: '140px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textAlign: 'center',
                    padding: '1rem',
                  }}
                >
                  <Activity size={22} color="var(--text-tertiary)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Run an optimization scenario to generate benchmark results.
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    {item.metric}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
