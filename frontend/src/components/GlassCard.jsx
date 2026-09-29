import React from 'react';

export default function GlassCard({
  children,
  className = '',
  accent = false,
  interactive = false,
  onClick,
  style = {},
  id,
  ...rest
}) {
  const classes = [
    'glass-panel',
    accent ? 'glass-panel-accent' : '',
    interactive ? 'glass-panel-interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div id={id} className={classes} onClick={onClick} style={style} {...rest}>
      {children}
    </div>
  );
}
