import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({ title, value, unit, trend, subLabel, icon: Icon, colorClass = "text-cw-teal" }) {
  return (
    <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col justify-between group hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[180px]">
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        {Icon && <Icon size={120} />}
      </div>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="text-cw-neutral-500 font-heading font-semibold text-sm">{title}</div>
        {Icon && <div className={`p-2.5 rounded-2xl bg-cw-butter ${colorClass}`}><Icon size={20} /></div>}
      </div>
      <div className="flex items-baseline gap-1 relative z-10">
        <span className={`font-heading font-bold text-5xl tabular-nums tracking-tight ${colorClass}`}>{value}</span>
        {unit && <span className="text-cw-neutral-500 font-bold ml-1">{unit}</span>}
      </div>
      {(trend || subLabel) && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold relative z-10 tracking-wide">
          {trend === 'up' && <span className="flex items-center text-cw-coral bg-cw-coral/10 px-2 py-1 rounded-lg"><TrendingUp size={16} className="mr-1.5"/> Élevé</span>}
          {trend === 'down' && <span className="flex items-center text-cw-teal bg-cw-mint/30 px-2 py-1 rounded-lg"><TrendingDown size={16} className="mr-1.5"/> Baisse</span>}
          {trend === 'normal' && <span className="flex items-center text-cw-neutral-500 bg-cw-neutral-100 px-2 py-1 rounded-lg"><Minus size={16} className="mr-1.5"/> Normal</span>}
          {!trend && <span className="text-cw-neutral-500 bg-cw-neutral-100 px-2 py-1 rounded-lg">{subLabel}</span>}
        </div>
      )}
    </div>
  );
}
