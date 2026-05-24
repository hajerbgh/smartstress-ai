import React from 'react';

const COLORS = {
  0: '#5BB5B5', // teal
  1: '#F5C6A5', // peach
  2: '#F28C7E', // coral
};

export default function StressGauge({ level = 0, size = 220, value = 50 }) {
  const color = COLORS[level] || COLORS[0];
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Arc from -225deg to 45deg = 270deg total
  const offset = circumference - (value / 100) * (circumference * 0.75);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform rotate-[135deg]">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#FDF6EC" strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={circumference * 0.75 - ((value / 100) * circumference * 0.75)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center translate-y-4">
        <span className="font-heading font-extrabold text-5xl tabular-nums" style={{ color }}>{value}%</span>
        <span className="text-sm font-bold text-cw-neutral-500 uppercase tracking-[0.2em] mt-1">Niveau</span>
      </div>
    </div>
  );
}
