import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Network,
  X,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { useScenario } from '../context/ScenarioContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { backendHealth } = useScenario();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const mobileMenuRef = useRef(null);

  const isBackendOnline = backendHealth?.status === 'ok';

  // Navigation Links as specified
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Scenario Lab', path: '/scenario' },
    { name: 'Optimization Algorithms', path: '/algorithms' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'About & Inquiries', path: '/contact' },
  ];

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mobileMenuOpen]);

  return (
    <header className="glass-nav-bar">
      <div className="glass-nav-inner">
        {/* LEFT: IROS Brand & Team VEDIORA Identity */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          aria-label="IROS Homepage"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)',
              flexShrink: 0,
            }}
          >
            <Network size={22} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-main)',
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                }}
              >
                IROS
              </span>
              <span
                className="brand-sih-badge"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--cyan-core)',
                  background: 'rgba(14, 165, 233, 0.12)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                SIH 2026 • Team VEDIORA
              </span>
            </div>
            <span
              className="brand-descriptor-text"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.675rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              Intelligent Route Optimization System
            </span>
          </div>
        </Link>

        {/* CENTER: Horizontal Desktop Navigation (Single Premium Glass Capsule with SaaS Tabs) */}
        <nav className="desktop-nav-capsule" aria-label="Main Navigation">
          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* RIGHT: Theme Toggle, API Status & Launch Scenario Lab */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}
        >
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#0284c7" />}
          </button>

          {/* API Status indicator */}
          <div
            className="backend-indicator"
            title={isBackendOnline ? 'FastAPI Backend Online' : 'FastAPI Backend Standby'}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isBackendOnline ? 'var(--status-success)' : 'var(--status-warning)',
                boxShadow: isBackendOnline ? '0 0 6px var(--status-success)' : 'none',
              }}
            />
            <span>{isBackendOnline ? 'API Online' : 'API Standby'}</span>
          </div>

          {/* Launch Scenario Lab CTA */}
          <Link
            to="/scenario"
            className="btn btn-primary cta-button"
          >
            <Compass size={15} />
            <span>Launch Scenario Lab</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.5rem',
              borderRadius: '9px',
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Panel */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          style={{
            position: 'absolute',
            top: '76px',
            left: 0,
            right: 0,
            background: 'var(--nav-bg)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            backdropFilter: 'blur(20px)',
            boxShadow: 'var(--shadow-card-hover)',
          }}
        >
          <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              IROS • TEAM VEDIORA (SIH 2026)
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: isBackendOnline ? 'var(--status-success)' : 'var(--status-warning)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isBackendOnline ? 'var(--status-success)' : 'var(--status-warning)' }} />
              {isBackendOnline ? 'API Online' : 'API Standby'}
            </span>
          </div>

          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
            >
              {item.name}
            </NavLink>
          ))}

          <div
            style={{
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Color Theme:</span>
              <button
                onClick={toggleTheme}
                className="theme-toggle-btn"
                style={{ padding: '0.35rem 0.75rem', gap: '0.5rem', width: 'auto' }}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#0284c7" />}
                <span style={{ fontSize: '0.8rem' }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
            <Link
              to="/scenario"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Compass size={15} />
              <span>Launch Scenario Lab</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
