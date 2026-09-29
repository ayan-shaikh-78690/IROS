import React from 'react';
import { Link } from 'react-router-dom';
import { Network, GitBranch, Terminal, ShieldCheck, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        padding: '3rem 1.5rem 2rem',
        marginTop: 'auto',
        transition: 'background 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
        }}
      >
        {/* Col 1: Project Vision */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Network size={18} color="#ffffff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              IROS
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            Intelligent Route Optimization System — Quantum-Inspired Traffic &amp; Fleet Routing.
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Built by Team VEDIORA for Smart India Hackathon 2026.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">SIH 2026</span>
            <span className="badge badge-indigo">PS 26137</span>
            <span className="badge badge-neutral">Team VEDIORA</span>
          </div>
        </div>

        {/* Col 2: Pipeline Architecture */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Architecture Pipeline
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            <div><span style={{ color: 'var(--cyan-core)' }}>01.</span> OpenStreetMap Geographic Primitives</div>
            <div><span style={{ color: 'var(--cyan-core)' }}>02.</span> NetworkX Weighted Multigraph</div>
            <div><span style={{ color: 'var(--cyan-core)' }}>03.</span> Dynamic Traffic Modeling</div>
            <div><span style={{ color: 'var(--cyan-core)' }}>04.</span> Classical PSO &amp; QPSO Solver</div>
            <div><span style={{ color: 'var(--cyan-core)' }}>05.</span> FastAPI + Interactive Leaflet GIS</div>
          </div>
        </div>

        {/* Col 3: Navigation */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Platform Modules
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Link to="/scenario" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Scenario Lab</Link>
            <Link to="/how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>How It Works</Link>
            <Link to="/optimization" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Optimization Studio</Link>
            <Link to="/algorithms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Algorithm Arena</Link>
            <Link to="/analytics" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Fleet Analytics</Link>
            <Link to="/contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About &amp; Inquiries</Link>
          </div>
        </div>

        {/* Col 4: Platform Integrity */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Integrity Standard
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            IROS strictly adheres to scientific integrity. Algorithmic solvers will calculate real solutions upon execution without pre-cooked or synthetic results.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <ShieldCheck size={15} />
            <span>Zero Fabricated Benchmarks</span>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '2rem auto 0',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <div>
          IROS — Intelligent Route Optimization System • Built by Team VEDIORA • SIH 2026 PS 26137
        </div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          Optimize • Simulate • Compare • Decide
        </div>
      </div>
    </footer>
  );
}
