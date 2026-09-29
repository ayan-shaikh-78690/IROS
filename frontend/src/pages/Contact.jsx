import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  Code2,
  Users,
  Award,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Building,
  MapPin,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    topic: 'Fleet Optimization Inquiries',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  const techStack = [
    { name: 'OpenStreetMap', role: 'Global Geographic Road Data Infrastructure' },
    { name: 'OSMnx', role: 'Geospatial Street Topology & Python Integration' },
    { name: 'NetworkX', role: 'Directed Weighted Multigraph Network Modeling' },
    { name: 'NumPy / SciPy', role: 'High-performance Numerical Vector Operations' },
    { name: 'PSO & QPSO', role: 'Classical & Quantum-Inspired Metaheuristic Solvers' },
    { name: 'FastAPI', role: 'Async RESTful High-throughput Backend API' },
    { name: 'React + Vite', role: 'Modern Glassmorphic Control-Center Interface' },
    { name: 'Leaflet (Upcoming)', role: 'Interactive GIS Polyline Map Layering' },
  ];

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Badge variant="cyan">Smart India Hackathon 2026</Badge>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            PROBLEM STATEMENT 26137
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.35rem' }}>
          About IROS &amp; Inquiries
        </h1>
        <p className="text-body" style={{ maxWidth: '750px' }}>
          Intelligent Route Optimization System developed by Team VEDIORA for Smart India Hackathon 2026.
        </p>
      </div>

      {/* Project Overview Card */}
      <GlassCard style={{ padding: '2rem' }} accent={true}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
            <Award size={22} />
          </div>
          <div>
            <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>
              IROS System Overview — SIH 2026
            </h2>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              PROBLEM STATEMENT 26137 • TEAM VEDIORA
            </div>
          </div>
        </div>

        <p className="text-body" style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
          <b>Title:</b> Quantum-Inspired Intelligent Traffic Route Optimization in Transportation Systems Using Metaheuristic Optimization.
        </p>
        <p className="text-body" style={{ lineHeight: 1.6 }}>
          IROS tackles the complex challenge of urban delivery dispatching and multi-vehicle routing. By converting real street maps into weighted graph models and leveraging Quantum-behaved Particle Swarm Optimization (QPSO), the platform generates traffic-aware multi-vehicle routing solutions with minimal congestion impact, reduced fuel burn, and guaranteed arrival time compliance.
        </p>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={15} color="var(--cyan-core)" />
            <span><b>Primary Demonstration Corridor:</b> Ahmedabad–Gandhinagar, Gujarat</span>
          </div>
        </div>
      </GlassCard>

      {/* Two Column Layout: Tech Stack & Team Placeholder */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {/* Technology Stack */}
        <GlassCard style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Code2 size={20} color="var(--cyan-core)" />
            <h3 className="text-h3">Technology Architecture</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {techStack.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.name}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {item.role}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Team Section Placeholder */}
        <GlassCard style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Users size={20} color="var(--indigo-core)" />
            <h3 className="text-h3">SIH 2026 Team</h3>
          </div>

          <p className="text-body-sm" style={{ marginBottom: '1.25rem' }}>
            Innovator team participating under Smart India Hackathon 2026.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Team VEDIORA Engineering Cohort
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cyan-core)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0' }}>
                Full-Stack GIS, Metaheuristic Optimization &amp; Systems Architecture
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                Engineering cohort building intelligent algorithms for smart city transportation challenges.
              </p>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Technical Mentorship
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--indigo-core)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0' }}>
                Operations Research &amp; Metaheuristic Optimization
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                Faculty and industry mentorship guiding mathematical convergence verification.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Contact Form UI */}
      <GlassCard style={{ padding: '2.5rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Mail size={32} color="var(--cyan-core)" style={{ margin: '0 auto 0.75rem' }} />
            <h2 className="text-h2" style={{ marginBottom: '0.5rem' }}>
              Project Inquiries &amp; Feedback
            </h2>
            <p className="text-body-sm">
              Connect with Team VEDIORA regarding technical evaluations, research collaborations, or SIH 2026 jury questions on IROS.
            </p>
          </div>

          {submitted ? (
            <div
              style={{
                padding: '2rem',
                borderRadius: '12px',
                background: 'var(--status-success-bg)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <CheckCircle size={36} color="var(--status-success)" />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600 }}>
                Inquiry Received
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px' }}>
                Thank you for your message regarding IROS. Team VEDIORA has recorded your submission.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSubmitted(false)}
                style={{ marginTop: '0.5rem' }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. rajesh@institute.ac.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Organization / Institution</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SIH 2026 Evaluation Committee"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Topic</label>
                  <select
                    className="form-select"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  >
                    <option value="Fleet Optimization Inquiries">Fleet Optimization Inquiries</option>
                    <option value="SIH Evaluation">SIH 2026 Evaluation</option>
                    <option value="Traffic Graph Modeling">Traffic Graph Modeling</option>
                    <option value="Research Collaboration">Research Collaboration</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  required
                  rows={4}
                  className="form-textarea"
                  placeholder="Inquire regarding technical architecture, benchmark methodology, or deployment..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.85rem', width: '100%', marginTop: '0.5rem' }}
              >
                <Send size={16} />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
