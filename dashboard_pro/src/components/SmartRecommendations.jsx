import React, { useState } from 'react';
import { Sparkles, Music, Activity, Droplets, BookOpen, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Leaf, Clock, ArrowUpRight } from 'lucide-react';

const RECOMMENDATIONS = {
  2: { // Élevé
    title: "Le stress monte",
    subtitle: "Régulons votre système nerveux",
    headerIcon: AlertTriangle,
    color: 'text-cw-coral',
    bg: 'bg-cw-coral/10',
    border: 'border-cw-coral/20',
    items: [
      { icon: Activity, type: 'Yoga', action: 'Cohérence cardiaque 4-7-8', duration: '5 min', link: 'https://www.youtube.com/watch?v=Q3bvMwB6sAo' },
      { icon: Music, type: 'Musique', action: 'Fréquences 432 Hz', duration: 'Maintenant', link: 'https://www.youtube.com/watch?v=74YUd5FxGSo' },
      { icon: Sparkles, type: 'Respiration', action: 'Inspire 4s → Retiens 4s → Expire 4s', duration: '3 min', link: null },
    ]
  },
  1: { // Modéré
    title: "Tension modérée",
    subtitle: "Quelques petits ajustements",
    headerIcon: TrendingUp,
    color: 'text-orange-500',
    bg: 'bg-cw-peach/20',
    border: 'border-cw-peach/30',
    items: [
      { icon: Music, type: 'Focus', action: 'Lo-fi beats relaxants', duration: 'En continu', link: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
      { icon: Activity, type: 'Pause', action: 'Étirements profonds', duration: '2 min', link: null },
      { icon: Droplets, type: 'Hydratation', action: 'Verre d\'eau immédiat', duration: 'Immédiat', link: null },
    ]
  },
  0: { // Calme
    title: "Calme & Serein",
    subtitle: "État optimal atteint",
    headerIcon: Leaf,
    color: 'text-cw-teal',
    bg: 'bg-cw-mint/30',
    border: 'border-cw-mint',
    items: [
      { icon: BookOpen, type: 'Productivité', action: 'Idéal pour le travail complexe', duration: 'Maintenant', link: null },
      { icon: Sparkles, type: 'Bien-être', action: 'Méditation pleine conscience', duration: '5 min', link: null },
      { icon: Activity, type: 'Mouvement', action: 'Petite marche saine', duration: '10 min', link: null },
    ]
  }
};

export default function SmartRecommendations({ stressLevel = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const rec = RECOMMENDATIONS[stressLevel] || RECOMMENDATIONS[0];
  const HeaderIcon = rec.headerIcon;

  return (
    <div className={`rounded-[24px] border ${rec.bg} ${rec.border} p-6 transition-all duration-300`}>
      <div className="flex justify-between items-start mb-6 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center shrink-0 ${rec.color}`}>
            <HeaderIcon size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-black text-xl md:text-2xl text-cw-neutral-900 mb-0.5 tracking-tight">{rec.title}</h3>
            <p className="text-sm font-bold text-cw-neutral-500">{rec.subtitle}</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className={`p-2 rounded-full hover:bg-white/60 transition-colors shrink-0 ${rec.color}`} aria-label={expanded ? 'Réduire' : 'Développer'}>
          {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {rec.items.map(({ icon: Icon, type, action, duration, link }, i) => (
            <div key={i} onClick={() => link && window.open(link, '_blank')}
                 className={`bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-white hover:shadow-sm ${link ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
              <div className={`p-3 rounded-xl bg-white shadow-sm ${rec.color} shrink-0`}>
                <Icon size={22} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-bold uppercase tracking-widest ${rec.color} mb-0.5`}>{type}</div>
                <div className="font-bold text-cw-neutral-900 leading-tight mb-1.5">{action}</div>
                <div className="text-[11px] font-bold text-cw-neutral-500 flex items-center gap-1.5">
                  <Clock size={11} strokeWidth={2.8} />
                  <span>{duration}</span>
                  {link && <ArrowUpRight size={11} strokeWidth={2.8} className="ml-1" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
