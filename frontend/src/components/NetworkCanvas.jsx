import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function NetworkCanvas() {
  const canvasRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const numNodes = 18;
    const nodes = [];
    const width = () => canvas.getBoundingClientRect().width;
    const height = () => canvas.getBoundingClientRect().height;

    for (let i = 0; i < numNodes; i++) {
      const isDepot = i === 0;
      nodes.push({
        id: i,
        x: isDepot ? width() * 0.45 : (0.1 + Math.random() * 0.8) * width(),
        y: isDepot ? height() * 0.5 : (0.12 + Math.random() * 0.76) * height(),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: isDepot ? 6 : Math.random() * 2 + 3,
        isDepot,
        pulse: Math.random() * Math.PI * 2,
        label: isDepot ? 'DEPOT' : `N-${i}`,
      });
    }

    const packets = [];
    for (let p = 0; p < 8; p++) {
      packets.push({
        sourceIdx: Math.floor(Math.random() * numNodes),
        targetIdx: Math.floor(Math.random() * numNodes),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.005,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      const w = width();
      const h = height();

      ctx.clearRect(0, 0, w, h);

      // Grid background lines
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.04)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Update nodes
      nodes.forEach((node) => {
        if (!node.isDepot) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < w * 0.08 || node.x > w * 0.92) node.vx *= -1;
          if (node.y < h * 0.08 || node.y > h * 0.92) node.vy *= -1;
        }
        node.pulse += 0.04;
      });

      // Draw edges
      const maxDistance = w * 0.35;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * (isDark ? 0.35 : 0.28);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = isDark
              ? `rgba(14, 165, 233, ${alpha * 0.85})`
              : `rgba(2, 132, 199, ${alpha * 0.9})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Subtle dash flow
            if (i % 3 === 0) {
              ctx.save();
              ctx.setLineDash([4, 12]);
              ctx.lineDashOffset = -time * 12;
              ctx.strokeStyle = isDark
                ? `rgba(99, 102, 241, ${alpha * 1.2})`
                : `rgba(79, 70, 229, ${alpha * 1.1})`;
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }

      // Draw packets
      packets.forEach((packet) => {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.sourceIdx = packet.targetIdx;
          packet.targetIdx = Math.floor(Math.random() * numNodes);
        }

        const source = nodes[packet.sourceIdx];
        const target = nodes[packet.targetIdx];
        if (source && target && source !== target) {
          const px = source.x + (target.x - source.x) * packet.progress;
          const py = source.y + (target.y - source.y) * packet.progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
          ctx.shadowColor = isDark ? '#0ea5e9' : '#38bdf8';
          ctx.shadowBlur = isDark ? 8 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        const pulseSize = node.radius + Math.sin(node.pulse) * 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, pulseSize + 4), 0, Math.PI * 2);
        ctx.strokeStyle = node.isDepot
          ? (isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.35)')
          : (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.2)');
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isDepot
          ? (isDark ? '#38bdf8' : '#0284c7')
          : (isDark ? '#818cf8' : '#4f46e5');
        ctx.shadowColor = node.isDepot ? '#0ea5e9' : '#6366f1';
        ctx.shadowBlur = isDark ? (node.isDepot ? 12 : 6) : 2;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.55)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(node.label, node.x + 8, node.y - 6);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '380px',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: isDark
            ? 'radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.8) 0%, rgba(7, 9, 14, 0.95) 100%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(241, 245, 249, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%)',
          transition: 'background 0.25s ease',
        }}
      />
      {/* Telemetry HUD overlay tags */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          display: 'flex',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: 'var(--cyan-core)', fontWeight: 600 }}>● ROUTE NETWORK MODEL</span>
        <span>|</span>
        <span>TRAFFIC WEIGHTED</span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          pointerEvents: 'none',
        }}
      >
        <span>AHMEDABAD–GANDHINAGAR (23.0338° N, 72.5850° E)</span>
      </div>
    </div>
  );
}
