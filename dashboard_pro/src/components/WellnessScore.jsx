import React, { useEffect, useState } from 'react';

export default function WellnessScore({ stressLevel = 0, gsr = 5, heartRate = 70 }) {
  const [animScore, setAnimScore] = useState(0);

  // Calculate wellness score (inverse of stress)
  const rawScore = Math.max(0, Math.min(100,
    100 - (stressLevel * 30) - (Math.max(0, gsr - 4) * 2) - (Math.max(0, heartRate - 75) * 0.5)
  ));
  const score = Math.round(rawScore);

  const color = score >= 70 ? '#5BB5B5' : score >= 40 ? '#F5C6A5' : '#F28C7E';
  const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Correct' : 'À améliorer';

  // Animate score on change
  useEffect(() => {
    let start = animScore;
    const diff = score - start;
    const steps = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setAnimScore(Math.round(start + diff * (step / steps)));
      if (step >= steps) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [score]);

  // SVG circle params
  const R = 64, C = 2 * Math.PI * R;
  const offset = C - (animScore / 100) * C;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background track */}
          <circle cx="80" cy="80" r={R} fill="none" stroke="#FDF6EC" strokeWidth="12" />
          {/* Progress */}
          <circle cx="80" cy="80" r={R} fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            className="transition-all duration-500 ease-out"
            style={{ filter: `drop-shadow(0 4px 12px ${color}66)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-1">
          <div className="font-heading font-black text-5xl tabular-nums leading-none tracking-tight" style={{ color }}>
            {animScore}
          </div>
          <div className="text-xs font-bold text-cw-neutral-500 mt-1 uppercase tracking-widest pl-1">/100</div>
        </div>
      </div>

      <div className="font-heading font-bold text-lg mt-4" style={{ color }}>{label}</div>
      <div className="text-sm font-semibold text-cw-neutral-500 mb-6 uppercase tracking-wider">Score Global</div>

      {/* Mini breakdown */}
      <div className="w-full flex flex-col gap-3">
        {[
          { label: 'GSR', value: Math.max(0, 100 - gsr * 5), color: '#5BB5B5' }, // Teal
          { label: 'Pouls', value: Math.max(0, 100 - Math.max(0, heartRate - 60) * 0.8), color: '#F28C7E' }, // Coral
          { label: 'Stress', value: Math.max(0, 100 - stressLevel * 40), color: '#A8DCD1' }, // Mint
        ].map(({ label, value, color: c }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="text-xs font-bold text-cw-neutral-500 w-10 uppercase tracking-wide">{label}</div>
            <div className="flex-1 h-2 bg-cw-neutral-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: c }} 
              />
            </div>
            <div className="text-xs font-bold w-6 text-right" style={{ color: c }}>
              {Math.round(Math.min(100, Math.max(0, value)))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
