import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Activity,
  Sliders,
  Clock,
  Truck,
  Zap,
  GitCompare,
  RotateCcw,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import NetworkCanvas from '../components/NetworkCanvas';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function Home() {
  // 5 Step Workflow (Section 13)
  const workflowSteps = [
    {
      step: '01',
      title: 'Create a Scenario',
      description: 'Define your dispatch hub, city region, and service area boundary.',
    },
    {
      step: '02',
      title: 'Add Vehicles and Stops',
      description: 'Specify fleet capacities, vehicle types, and customer drop-off locations.',
    },
    {
      step: '03',
      title: 'Set Traffic & Conditions',
      description: 'Factor in peak-hour congestion, road slowdowns, and customer delivery windows.',
    },
    {
      step: '04',
      title: 'Optimize the Routes',
      description: 'Run intelligent multi-vehicle search algorithms to balance distance, time, and rules.',
    },
    {
      step: '05',
      title: 'Compare the Results',
      description: 'Evaluate driving time, fuel expenditure, and arrival punctuality before dispatch.',
    },
  ];

  // 6 Core Feature Cards (Section 13)
  const featureCards = [
    {
      title: 'Traffic-Aware Routing',
      category: 'Real-Time Conditions',
      icon: Activity,
      description:
        'Accounts for peak-hour congestion, signal delays, and corridor bottlenecks so vehicles avoid heavy gridlock instead of blindly following straight-line distances.',
    },
    {
      title: 'Vehicle Constraints',
      category: 'Fleet Limits',
      icon: Sliders,
      description:
        'Enforces strict payload capacities, volumetric volume limits, and vehicle-specific roadway access restrictions so no vehicle is overloaded or misrouted.',
    },
    {
      title: 'Delivery Time Windows',
      category: 'Customer Punctuality',
      icon: Clock,
      description:
        'Guarantees deliveries land precisely within committed customer arrival windows (e.g. 09:00–10:00 or 14:00–16:00), penalizing early or late arrivals.',
    },
    {
      title: 'Dynamic Re-Routing',
      category: 'Adaptive Dispatch',
      icon: RotateCcw,
      description:
        'As road conditions evolve throughout the day, the system recalculates route costs to seamlessly navigate around spontaneous delays and road closures.',
    },
    {
      title: 'Route Comparison',
      category: 'Decision Intelligence',
      icon: GitCompare,
      description:
        'Compare multiple candidate routing plans side by side across total mileage, drive time, fuel usage, and driver workload before assigning orders.',
    },
    {
      title: 'Fleet Optimization',
      category: 'Multi-Vehicle Logistics',
      icon: Truck,
      description:
        'Intelligently partitions deliveries across mixed fleets of cargo two-wheelers, parcel delivery vans, and logistics trucks for maximum efficiency.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5rem' }}>
      {/* 1. Hero Section (Section 10 & Section 2) */}
      <section
        style={{
          position: 'relative',
          padding: '2.5rem 0 1.5rem',
          overflow: 'hidden',
        }}
      >
        <div className="content-wrapper" style={{ paddingBottom: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            {/* Left Hero Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Product Hierarchy & Team Identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--cyan-core)',
                    background: 'rgba(14, 165, 233, 0.12)',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  SIH 2026 • Team VEDIORA
                </span>
                <span
                  style={{
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                  }}
                >
                  PROBLEM STATEMENT 26137
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <h1 className="text-hero" style={{ letterSpacing: '0.02em', margin: 0 }}>
                    IROS
                  </h1>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '0.75rem',
                  }}
                >
                  Intelligent Route Optimization System
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--cyan-core)',
                    marginBottom: '1rem',
                  }}
                >
                  Quantum-Inspired Traffic &amp; Fleet Routing
                </div>
                <h2
                  className="text-h2 text-gradient-cyan"
                  style={{ fontWeight: 700, marginBottom: '1.25rem' }}
                >
                  Smarter routes for urban delivery fleets.
                </h2>
                <p className="text-body" style={{ fontSize: '1.1rem', maxWidth: '540px' }}>
                  Build a delivery scenario, simulate traffic, and find better routes while considering vehicle limits, delivery times and road conditions.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <Link to="/scenario" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>
                  <span>Create a Scenario</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/how-it-works" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem' }}>
                  <span>See How It Works</span>
                </Link>
              </div>

              {/* Region & Focus Metadata */}
              <div
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  marginTop: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Demo Region:</span> Ahmedabad–Gandhinagar, Gujarat
                </div>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Target:</span> Urban Delivery Fleets (Vans, Bikes, Trucks)
                </div>
              </div>
            </div>

            {/* Right Interactive Network Canvas */}
            <div style={{ height: '420px', position: 'relative' }}>
              <GlassCard
                style={{
                  height: '100%',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <NetworkCanvas />
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Simple Explanation Banner (Section 13) */}
      <section className="content-wrapper" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <GlassCard
          style={{
            padding: '1.5rem 2rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--cyan-core)', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>1</span>
              <span>Create a delivery scenario</span>
            </div>
            <ChevronRight size={18} color="var(--text-tertiary)" className="flow-arrow" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--cyan-core)', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>2</span>
              <span>Simulate traffic</span>
            </div>
            <ChevronRight size={18} color="var(--text-tertiary)" className="flow-arrow" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--cyan-core)', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>3</span>
              <span>Optimize routes</span>
            </div>
            <ChevronRight size={18} color="var(--text-tertiary)" className="flow-arrow" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--cyan-core)', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>4</span>
              <span>Compare results</span>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 3. How It Works (Section 13: 5 Steps) */}
      <section className="content-wrapper" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="cyan" style={{ marginBottom: '0.75rem' }}>How It Works</Badge>
          <h2 className="text-h2">Five Steps to Smarter Delivery Schedules</h2>
          <p className="text-body" style={{ maxWidth: '640px', margin: '0.5rem auto 0' }}>
            A straightforward process to configure city logistics, model actual congestion, and generate dispatch-ready routes.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {workflowSteps.map((step) => (
            <GlassCard
              key={step.step}
              interactive={true}
              style={{
                padding: '1.5rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: 'var(--cyan-core)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.step}
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>
                {step.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                {step.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 4. Core Feature Cards (Section 13: 6 Cards) */}
      <section className="content-wrapper" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Badge variant="indigo" style={{ marginBottom: '0.75rem' }}>Product Features</Badge>
          <h2 className="text-h2">Intelligent Capabilities Built for Real Fleets</h2>
          <p className="text-body" style={{ maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Practical optimization capabilities designed for urban dispatchers balancing deadlines, cargo weight, and road gridlock.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {featureCards.map((item) => {
            const Icon = item.icon;
            return (
              <GlassCard
                key={item.title}
                interactive={true}
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                    <Icon size={20} />
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                    {item.category}
                  </span>
                </div>

                <h3 className="text-h3" style={{ fontSize: '1.15rem' }}>
                  {item.title}
                </h3>

                <p className="text-body-sm" style={{ lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* 5. Product Focus & Positioning (Section 11 & Section 13) */}
      <section className="content-wrapper" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <GlassCard style={{ padding: '2.25rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Truck size={20} color="var(--cyan-core)" />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--cyan-core)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Product Focus
                </span>
              </div>
              <h3 className="text-h3" style={{ marginBottom: '1rem', fontSize: '1.35rem' }}>
                Built for Urban Delivery Fleets
              </h3>
              <p className="text-body" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
                The system primarily targets urban logistics and delivery vehicles such as trucks, vans, and other fleet vehicles, while the framework can be extended to buses, emergency vehicles, and passenger vehicles.
              </p>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span className="badge badge-cyan">Delivery Vans</span>
                <span className="badge badge-cyan">Logistics Trucks</span>
                <span className="badge badge-cyan">Two-Wheelers &amp; Bikes</span>
                <span className="badge badge-cyan">Fleet Vehicles</span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Future System Extensions:
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                While currently optimized for commercial multi-stop delivery dispatches, IROS's flexible routing objective formulation cleanly accommodates:
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--indigo-core)' }}>▸</span>
                  <span><b>Municipal Bus Transit:</b> Scheduled loop routing and headway regularity</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--indigo-core)' }}>▸</span>
                  <span><b>Emergency Response Vehicles:</b> Real-time dynamic signal priority routing</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--indigo-core)' }}>▸</span>
                  <span><b>Passenger Vehicles:</b> Congestion-aware navigation with toll avoidance</span>
                </li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 6. Team Identity Banner (Section 13) */}
      <section className="content-wrapper" style={{ paddingTop: 0 }}>
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--cyan-core)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Smart India Hackathon 2026 • Problem Statement 26137
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '600px', margin: 0 }}>
            Built by <b>Team VEDIORA</b> for Smart India Hackathon 2026.
          </p>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/scenario" className="btn btn-primary btn-sm">
              <Compass size={14} />
              <span>Launch Scenario Lab</span>
            </Link>
            <Link to="/contact" className="btn btn-secondary btn-sm">
              <span>About &amp; Inquiries</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
