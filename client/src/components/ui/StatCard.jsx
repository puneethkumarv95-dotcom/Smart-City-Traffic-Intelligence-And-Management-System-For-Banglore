import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'electric',
  className = ''
}) => {
  const colorMap = {
    electric: {
      bg: 'bg-electric/10',
      text: 'text-electric-light',
      border: 'border-electric/30',
      badge: 'bg-electric/20 text-electric-light'
    },
    cyan: {
      bg: 'bg-electric-cyan/10',
      text: 'text-electric-cyan',
      border: 'border-electric-cyan/30',
      badge: 'bg-electric-cyan/20 text-electric-cyan'
    },
    green: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/20 text-emerald-400'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-400'
    },
    red: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      badge: 'bg-rose-500/20 text-rose-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      badge: 'bg-purple-500/20 text-purple-400'
    }
  };

  const scheme = colorMap[color] || colorMap.electric;

  return (
    <div
      className={`bg-city-card/90 backdrop-blur-md border border-city-border/80 hover:border-slate-600/80 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${scheme.bg} ${scheme.text} ${scheme.border}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
          {trend && (
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                trend.startsWith('+')
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;

