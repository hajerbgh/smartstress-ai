import React from 'react';

const STRESS_LEVELS = {
  0: { label: 'Calme', bg: 'bg-cw-mint/30', text: 'text-cw-teal', dot: 'bg-cw-teal' },
  1: { label: 'Modéré', bg: 'bg-cw-peach/30', text: 'text-orange-600', dot: 'bg-orange-500' },
  2: { label: 'Élevé', bg: 'bg-cw-coral/20', text: 'text-cw-coral', dot: 'bg-cw-coral' },
};

export default function StressBadge({ level = 0, className = '' }) {
  const active = STRESS_LEVELS[level] || STRESS_LEVELS[0];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-heading font-bold text-sm tracking-wide ${active.bg} ${active.text} ${className}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${active.dot} animate-pulseGlow`}></span>
      {active.label}
    </div>
  );
}
