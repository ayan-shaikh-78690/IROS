import React from 'react';

export default function Badge({ variant = 'cyan', children, className = '' }) {
  const variantClass = {
    cyan: 'badge-cyan',
    indigo: 'badge-indigo',
    success: 'badge-success',
    warning: 'badge-warning',
    neutral: 'badge-neutral',
  }[variant] || 'badge-cyan';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
