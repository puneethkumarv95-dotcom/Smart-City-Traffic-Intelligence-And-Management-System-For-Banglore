import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const variantMap = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-electric/15 text-electric-light border-electric/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    // Severity specific
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
  };

  const sizeMap = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const badgeStyle = variantMap[variant] || variantMap.default;
  const sizeStyle = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full uppercase tracking-wider font-mono ${badgeStyle} ${sizeStyle} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

