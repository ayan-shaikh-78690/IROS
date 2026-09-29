import React, { useState } from 'react';
import {
  Map,
  Network,
  Sliders,
  Cpu,
  BarChart,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Layers,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp,
  Compass,
  Truck,
  Activity,
  Navigation,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function HowItWorks() {
  const [showTechnicalView, setShowTechnicalView] = useState(false);

  const userSteps = [
    {
      step: '01',
      title: 'Choose an Area',
      subtitle: 'Pick your city or delivery district',
      icon: Map,
      description:
        'Select the target urban area, such as Ahmedabad–Gandhinagar. The platform loads real road layouts, intersection connectivity, and one-way rules directly from real street maps.',
      userBenefit: 'Your delivery plans will always follow actual drivable streets rather than unrealistic straight lines.',
      details: [
        'Real-world street networks with correct road types.',
        'Directional one-way streets and turn restrictions.',
        'Accurate street intersection connections.',
      ],
    },
    {
      step: '02',
      title: 'Build Your Delivery Scenario',
      subtitle: 'Set up your dispatch hub and priorities',
      icon: Compass,
      description:
        'Specify where your vehicles start and return (your warehouse or depot). Choose what matters most for your operation: minimizing total driving distance, saving travel time, or avoiding traffic bottlenecks.',
      userBenefit: 'Customizable trade-offs tailored to your business priorities and delivery promises.',
      details: [
        'Central depot location for vehicle departure and return.',
        'Choose how you balance distance vs. travel time vs. traffic.',
        'Presets available for common delivery routes and stress tests.',
      ],
    },
    {
      step: '03',
      title: 'Add Vehicles and Delivery Stops',
      subtitle: 'Input customer orders and fleet capacities',
      icon: Truck,
      description:
        'Add the delivery stops your fleet must make. Specify order package demands, customer delivery time windows (e.g. 09:00 — 11:00), and choose vehicle types such as bikes, delivery vans, or cargo trucks.',
      userBenefit: 'No vehicle is overloaded, and customers receive deliveries within their requested time frames.',
      details: [
        'Customer delivery locations and parcel load demands.',
        'Customer arrival time windows (earliest and latest delivery times).',
        'Fleet definitions for cargo bikes, delivery vans, and trucks.',
      ],
    },
    {
      step: '04',
      title: 'Simulate Traffic & Road Conditions',
      subtitle: 'Traffic changes the cost of a road',
      icon: Activity,
      description:
        'A short 2 km road during morning rush hour can take longer than a 5 km open bypass. IROS considers estimated traffic delays on specific corridors so vehicles avoid known choke points.',
      userBenefit: 'Fleet drivers avoid sitting idle in morning and evening traffic congestion.',
      details: [
        'Time-varying road speeds based on peak-hour congestion patterns.',
        'Dynamic road cost calculation (short congested roads vs. faster clear bypasses).',
        'Support for road rule checks (like truck bans during rush hours).',
      ],
    },
    {
      step: '05',
      title: 'Optimize and Compare Routes',
      subtitle: 'Advanced search finds better delivery schedules',
      icon: Zap,
      description:
        'Intelligent optimization algorithms test thousands of order sequences across your fleet in seconds. The system produces clear, step-by-step driving schedules and lets you compare different routing options.',
      userBenefit: 'Fewer kilometers driven, lower fuel bills, and on-time customer deliveries.',
      details: [
        'Intelligent swarm search testing millions of route permutations.',
        'Side-by-side comparison of routes on travel time and fuel impact.',
        'Clear turn-by-turn waypoint schedules for dispatchers.',
      ],
    },
  ];

  const technicalComponents = [
    {
      title: 'OpenStreetMap (OSM)',
      category: 'Geospatial Foundation',
      tech: 'Open Data / Overpass API',
      description:
        'Provides open, community-verified geospatial vector road features, including lane counts, speed limits, surface types, and turn restrictions.',
    },
    {
      title: 'OSMnx',
      category: 'Graph Extraction',
      tech: 'Python Geospatial Library',
      description:
        'Downloads and constructs topologically clean road networks from OpenStreetMap within specified geographic bounding boxes.',
    },
    {
      title: 'NetworkX',
      category: 'Network Modeling',
      tech: 'Directed Weighted Multigraph',
      description:
        'Represents road intersections as nodes (V) and drivable roadway segments as directed edges (E) containing impedance attributes.',
    },
    {
      title: 'Classical PSO',
      category: 'Metaheuristic Optimization',
      tech: 'Particle Swarm Optimization',
      description:
        'Explores discrete permutation solution space using velocity and position vector updates guided by cognitive (pbest) and social (gbest) memory.',
    },
    {
      title: 'Quantum-Inspired QPSO',
      category: 'Advanced Solver',
      tech: 'Delta Potential Well Model',
      description:
        'Discards velocity vectors in favor of wave function probability distributions and mean best position (mbest) dynamics to avoid local minima traps.',
    },
    {
      title: 'FastAPI Backend',
      category: 'API Engine',
      tech: 'Python 3.11 / Async ASGI',
      description:
        'High-performance REST API handling scenario submissions, graph processing jobs, and structured JSON route responses.',
    },
  ];

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">Platform Guide</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            USER WORKFLOW
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
          How IROS Works
        </h1>
        <p className="text-body" style={{ maxWidth: '780px' }}>
          A simple five-step process designed to turn complex city street grids and customer orders into efficient, realistic delivery schedules. Built by Team VEDIORA for SIH 2026.
        </p>
      </div>

      {/* 5 User Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {userSteps.map((step) => {
          const Icon = step.icon;

          return (
            <GlassCard
              key={step.step}
              interactive={true}
              style={{
                padding: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
                alignItems: 'center',
              }}
            >
              {/* Left Column: Step Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--cyan-core)',
                      background: 'rgba(14, 165, 233, 0.12)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                    }}
                  >
                    Step {step.step}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {step.subtitle}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(14, 165, 233, 0.12)',
                      color: 'var(--cyan-core)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <h2 className="text-h2" style={{ fontSize: '1.4rem' }}>
                    {step.title}
                  </h2>
                </div>

                <p className="text-body">
                  {step.description}
                </p>

                <div
                  style={{
                    background: 'var(--status-success-bg)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.8125rem',
                    color: 'var(--status-success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span><b>Benefit:</b> {step.userBenefit}</span>
                </div>
              </div>

              {/* Right Column: Key Elements */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan-core)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  What happens in this step:
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: 0, padding: 0 }}>
                  {step.details.map((detail, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--cyan-core)', marginTop: '3px' }}>▸</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Technical Architecture Toggle Section */}
      <GlassCard style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--indigo-core)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code2 size={20} />
            </div>
            <div>
              <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                Technical Deep Dive (For Evaluators &amp; Engineers)
              </h3>
              <p className="text-body-sm">
                Explore the underlying mathematics, OpenStreetMap graph modeling, and metaheuristic algorithms.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTechnicalView(!showTechnicalView)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>{showTechnicalView ? 'Hide Technical View' : 'Show Technical View'}</span>
            {showTechnicalView ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showTechnicalView && (
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {technicalComponents.map((comp) => (
              <div
                key={comp.title}
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                    {comp.title}
                  </h4>
                  <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                    {comp.category}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: 'var(--cyan-core)' }}>
                  {comp.tech}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45, marginTop: '0.25rem' }}>
                  {comp.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
