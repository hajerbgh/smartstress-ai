import React from 'react';

/**
 * ChillWaves brand logo — SVG reproduction of the official mark.
 * Combines: smiling wave crest (teal), heartbeat line (coral), sun (yellow), heart.
 *
 * Usage:
 *   <Logo size={40} />              full mark with accents
 *   <Logo size={40} mono />         single-color version (useful on solid bg)
 */
export default function Logo({ size = 40, mono = false, className = '' }) {
  // Palette (tuned to ChillWaves: teal #5BB5B5, mint #A8DCD1, coral #F28C7E, peach #F5C6A5, butter #FDF6EC)
  const TEAL   = mono ? 'currentColor' : '#5BB5B5';
  const MINT   = mono ? 'currentColor' : '#A8DCD1';
  const CORAL  = mono ? 'currentColor' : '#F28C7E';
  const SUN    = mono ? 'currentColor' : '#F7D88C';
  const PEACH  = mono ? 'currentColor' : '#F5C6A5';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ChillWaves"
      role="img"
    >
      {/* Soft back-arc (outer wave gesture) */}
      <path
        d="M8 34 C 14 12, 46 12, 56 30"
        stroke={CORAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={mono ? 0.35 : 0.55}
      />

      {/* Sun */}
      <circle cx="50" cy="16" r="4" fill={SUN} opacity={mono ? 0.8 : 1} />
      {!mono && (
        <g stroke={SUN} strokeWidth="1.4" strokeLinecap="round">
          <line x1="50" y1="8"  x2="50" y2="10.5" />
          <line x1="50" y1="21.5" x2="50" y2="24" />
          <line x1="42" y1="16" x2="44.5" y2="16" />
          <line x1="55.5" y1="16" x2="58" y2="16" />
          <line x1="44.5" y1="10.5" x2="46" y2="12" />
          <line x1="54" y1="20" x2="55.5" y2="21.5" />
          <line x1="44.5" y1="21.5" x2="46" y2="20" />
          <line x1="54" y1="12" x2="55.5" y2="10.5" />
        </g>
      )}

      {/* Wave body — stylised swoosh with smile */}
      <path
        d="M14 42
           C 10 28, 22 18, 32 22
           C 42 26, 38 40, 30 42
           C 24 43, 18 44, 14 42 Z"
        fill={TEAL}
        opacity={mono ? 1 : 0.95}
      />

      {/* Mint highlight on the wave */}
      <path
        d="M20 28 C 24 22, 32 23, 34 28"
        stroke={MINT}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity={mono ? 0.4 : 0.85}
      />

      {/* Smile face on wave */}
      <g fill={mono ? '#ffffff' : '#1f5a5a'}>
        <circle cx="22" cy="33" r="1.2" />
        <circle cx="28" cy="33" r="1.2" />
      </g>
      <path
        d="M22 37 C 23.5 39, 26.5 39, 28 37"
        stroke={mono ? '#ffffff' : '#1f5a5a'}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Soft bottom ribbons (peach + coral) */}
      <path
        d="M12 48 C 22 44, 42 54, 56 46"
        stroke={PEACH}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={mono ? 0.25 : 0.7}
      />
      <path
        d="M14 54 C 26 50, 44 58, 54 52"
        stroke={CORAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={mono ? 0.25 : 0.6}
      />

      {/* Heartbeat line (ECG) */}
      <path
        d="M34 30 L38 30 L40 24 L42 36 L44 30 L49 30"
        stroke={CORAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small heart */}
      <path
        d="M51 32 c 0 -1.6 1.3 -2.9 2.9 -2.9 c 0.9 0 1.7 0.4 2.2 1.1 c 0.5 -0.7 1.3 -1.1 2.2 -1.1 c 1.6 0 2.9 1.3 2.9 2.9 c 0 2.9 -5.1 5.7 -5.1 5.7 s -5.1 -2.8 -5.1 -5.7 z"
        fill={CORAL}
        opacity={0.9}
        transform="translate(-4 0) scale(0.55) translate(6 0)"
      />
    </svg>
  );
}

/**
 * Wordmark variant for inline branding.
 * Renders: [icon] ChillWaves
 */
export function LogoWordmark({ size = 28, className = '', subtitle = false, color = 'text-cw-neutral-900' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <div className="flex flex-col leading-none">
        <span className={`font-heading font-black tracking-tight ${color}`} style={{ fontSize: size * 0.72 }}>
          <span style={{ color: '#5BB5B5' }}>Chill</span><span style={{ color: '#F28C7E' }}>Waves</span>
        </span>
        {subtitle && (
          <span className="text-[9px] font-bold text-cw-neutral-500 uppercase tracking-[0.2em] mt-1">
            Smart Monitoring · Better You
          </span>
        )}
      </div>
    </div>
  );
}
