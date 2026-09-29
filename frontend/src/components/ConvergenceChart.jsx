import React, { useState, useMemo } from 'react';

/**
 * ConvergenceChart - Pure SVG Responsive Convergence Visualization
 * Supports single algorithm convergence or dual head-to-head comparison (PSO vs QPSO).
 * Features linear/logarithmic scale toggle, hover inspector, and area fill.
 */
export default function ConvergenceChart({
  psoData = null,
  qpsoData = null,
  singleData = null,
  singleLabel = 'Best Fitness',
  singleColor = '#38bdf8',
  title = 'Fitness Convergence Curve',
  height = 240,
}) {
  const [scaleType, setScaleType] = useState('linear'); // 'linear' | 'log'
  const [hoverIndex, setHoverIndex] = useState(null);

  // Normalize data series
  const series = useMemo(() => {
    if (singleData && Array.isArray(singleData) && singleData.length > 0) {
      return [{ id: 'single', name: singleLabel, data: singleData, color: singleColor }];
    }
    const list = [];
    if (psoData && Array.isArray(psoData) && psoData.length > 0) {
      list.push({ id: 'pso', name: 'Classical PSO', data: psoData, color: '#818cf8' });
    }
    if (qpsoData && Array.isArray(qpsoData) && qpsoData.length > 0) {
      list.push({ id: 'qpso', name: 'Quantum QPSO', data: qpsoData, color: '#38bdf8' });
    }
    return list;
  }, [psoData, qpsoData, singleData, singleLabel, singleColor]);

  // Max iterations across all series
  const maxLen = useMemo(() => {
    if (series.length === 0) return 0;
    return Math.max(...series.map((s) => s.data.length));
  }, [series]);

  // Min and Max values for Y-axis scaling
  const { minY, maxY, rawMinY, rawMaxY } = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    series.forEach((s) => {
      s.data.forEach((val) => {
        if (Number.isFinite(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      });
    });

    if (minVal === Infinity) {
      minVal = 0;
      maxVal = 100;
    }

    const rawMin = minVal;
    const rawMax = maxVal;

    if (scaleType === 'log') {
      const safeMin = Math.max(0.01, minVal);
      const safeMax = Math.max(safeMin * 1.1, maxVal);
      return {
        minY: Math.log10(safeMin),
        maxY: Math.log10(safeMax),
        rawMinY: rawMin,
        rawMaxY: rawMax,
      };
    } else {
      const padding = (maxVal - minVal) * 0.08 || 1;
      return {
        minY: Math.max(0, minVal - padding),
        maxY: maxVal + padding,
        rawMinY: rawMin,
        rawMaxY: rawMax,
      };
    }
  }, [series, scaleType]);

  if (series.length === 0 || maxLen < 2) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1px dashed var(--border-subtle)',
          color: 'var(--text-tertiary)',
          fontSize: '0.8125rem',
        }}
      >
        <span>No convergence history recorded yet. Run optimization to plot curve.</span>
      </div>
    );
  }

  // Chart Dimensions & Margins
  const svgWidth = 600;
  const svgHeight = height;
  const margin = { top: 20, right: 30, bottom: 32, left: 55 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Coordinate Mapping
  const getX = (index) => {
    if (maxLen <= 1) return margin.left;
    return margin.left + (index / (maxLen - 1)) * chartWidth;
  };

  const getY = (val) => {
    let scaled = val;
    if (scaleType === 'log') {
      scaled = Math.log10(Math.max(0.01, val));
    }
    const range = maxY - minY || 1;
    const normalized = (scaled - minY) / range;
    return margin.top + chartHeight - normalized * chartHeight;
  };

  // Generate SVG path for a series
  const buildPath = (data) => {
    if (!data || data.length === 0) return '';
    return data
      .map((val, idx) => {
        const x = getX(idx).toFixed(1);
        const y = getY(val).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const buildAreaPath = (data) => {
    if (!data || data.length === 0) return '';
    const linePath = buildPath(data);
    const lastX = getX(data.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    const bottomY = (margin.top + chartHeight).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Generate 5 horizontal grid lines
  const numGridLines = 4;
  const gridTicks = [];
  for (let i = 0; i <= numGridLines; i++) {
    const fraction = i / numGridLines;
    const yCoord = margin.top + chartHeight - fraction * chartHeight;
    let labelVal = '';
    if (scaleType === 'log') {
      const logVal = minY + fraction * (maxY - minY);
      labelVal = Math.pow(10, logVal).toFixed(1);
    } else {
      labelVal = (minY + fraction * (maxY - minY)).toFixed(1);
    }
    gridTicks.push({ y: yCoord, label: labelVal });
  }

  // Handle Mouse Hover
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * svgWidth;
    const boundedX = Math.max(margin.left, Math.min(margin.left + chartWidth, relativeX));
    const fraction = (boundedX - margin.left) / chartWidth;
    const nearestIdx = Math.round(fraction * (maxLen - 1));
    setHoverIndex(nearestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      {/* Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            {title}
          </span>
          {/* Series Legends */}
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {series.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: s.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scale Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => setScaleType('linear')}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              background: scaleType === 'linear' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: scaleType === 'linear' ? 'var(--cyan-bright)' : 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            Linear
          </button>
          <button
            type="button"
            onClick={() => setScaleType('log')}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              background: scaleType === 'log' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: scaleType === 'log' ? 'var(--cyan-bright)' : 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            Log₁₀
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          borderRadius: '8px',
          background: 'rgba(8, 14, 28, 0.6)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={`grad-${s.id}`} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines and Y Labels */}
          {gridTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={margin.left + chartWidth}
                y2={tick.y}
                stroke="var(--border-subtle)"
                strokeDasharray="3, 3"
                strokeWidth="0.8"
                opacity="0.6"
              />
              <text
                x={margin.left - 8}
                y={tick.y + 3}
                fill="var(--text-tertiary)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Axis Borders */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />

          {/* X-Axis Ticks & Labels */}
          <text
            x={margin.left}
            y={margin.top + chartHeight + 18}
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="start"
          >
            Iter 1
          </text>
          <text
            x={margin.left + chartWidth / 2}
            y={margin.top + chartHeight + 18}
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            Iter {Math.round(maxLen / 2)}
          </text>
          <text
            x={margin.left + chartWidth}
            y={margin.top + chartHeight + 18}
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            Iter {maxLen}
          </text>

          {/* Render Area Fills */}
          {series.map((s) => (
            <path
              key={`area-${s.id}`}
              d={buildAreaPath(s.data)}
              fill={`url(#grad-${s.id})`}
            />
          ))}

          {/* Render Lines */}
          {series.map((s) => (
            <path
              key={`line-${s.id}`}
              d={buildPath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover Crosshair & Indicators */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < maxLen && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={margin.top}
                x2={getX(hoverIndex)}
                y2={margin.top + chartHeight}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="2, 2"
                strokeWidth="1"
              />
              {series.map((s) => {
                const val = s.data[hoverIndex];
                if (val === undefined) return null;
                const ptX = getX(hoverIndex);
                const ptY = getY(val);
                return (
                  <circle
                    key={`hover-pt-${s.id}`}
                    cx={ptX}
                    cy={ptY}
                    r="4"
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Tooltip during hover */}
        {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < maxLen && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.4rem 0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem' }}>
              Generation #{hoverIndex + 1}
            </div>
            {series.map((s) => (
              <div key={`tip-${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ color: s.color, fontWeight: 600 }}>{s.name}:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {s.data[hoverIndex] !== undefined ? Number(s.data[hoverIndex]).toFixed(2) : '--'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          padding: '0 0.25rem',
        }}
      >
        <span>Initial Cost: <b style={{ color: 'var(--text-primary)' }}>{rawMaxY.toFixed(1)}</b></span>
        <span>Final Best: <b style={{ color: 'var(--cyan-bright)' }}>{rawMinY.toFixed(1)}</b></span>
        <span>
          Reduction:{' '}
          <b style={{ color: '#34d399' }}>
            {rawMaxY > 0 ? (((rawMaxY - rawMinY) / rawMaxY) * 100).toFixed(1) : 0}%
          </b>
        </span>
      </div>
    </div>
  );
}
