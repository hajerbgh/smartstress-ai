import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API = 'http://localhost:8000';
const STRESS_COLOR = (s) => s > 1.2 ? '#F28C7E' : s > 0.5 ? '#F5C6A5' : '#5BB5B5';

export default function Analytics() {
  const [weekly, setWeekly]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/stats/daily?days=7`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/stats/weekly`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([w, s]) => { setWeekly(w); setSummary(s); setLoading(false); });
  }, []);

  // Totaux pour le PieChart (somme sur tous les jours disponibles)
  const pieData = weekly.length > 0 ? (() => {
    const n = weekly.length;
    return [
      { name: 'Calme',   value: Math.round(weekly.reduce((s, d) => s + d.pct_calm, 0) / n),     fill: '#5BB5B5' },
      { name: 'Modéré',  value: Math.round(weekly.reduce((s, d) => s + d.pct_moderate, 0) / n), fill: '#F5C6A5' },
      { name: 'Élevé',   value: Math.round(weekly.reduce((s, d) => s + d.pct_high, 0) / n),     fill: '#F28C7E' },
    ].filter(d => d.value > 0);
  })() : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="font-heading font-bold text-lg text-cw-teal flex items-center gap-3">
        <Loader2 size={22} className="animate-spin" />
        Chargement des analyses...
      </div>
    </div>
  );

  return (
    <div className="animate-[fadeUp_0.5s_ease_forwards] font-body">
      <div className="mb-8">
        <h2 className="font-heading font-black text-3xl md:text-4xl text-cw-neutral-900 tracking-tight">Analyses Complètes</h2>
        <p className="text-cw-neutral-500 font-bold mt-2 text-sm md:text-base">Tendances et patterns physiologiques sur 7 jours</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 mb-12" style={{ gap: '32px' }}>
          {[
            { label: 'Score stress moyen', value: (summary.avg_stress_score * 50).toFixed(0), unit: '/100', color: STRESS_COLOR(summary.avg_stress_score) },
            { label: 'Tendance', value: summary.trend === 'croissant' ? '↑' : summary.trend === 'décroissant' ? '↓' : '→', unit: summary.trend, color: summary.trend === 'croissant' ? '#F28C7E' : '#5BB5B5' },
            { label: 'Jour le + stressé', value: new Date(summary.most_stressed_day).toLocaleDateString('fr', { weekday: 'short', day: 'numeric' }), unit: '', color: '#F28C7E' },
            { label: 'Jour le + calme', value: new Date(summary.calmest_day).toLocaleDateString('fr', { weekday: 'short', day: 'numeric' }), unit: '', color: '#5BB5B5' },
          ].map(({ label, value, unit, color }, i) => (
            <div key={i} className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col justify-center">
              <div className="text-xs font-bold text-cw-neutral-500 mb-2 uppercase tracking-widest">{label}</div>
              <div className="font-heading font-black text-4xl tabular-nums tracking-tight" style={{ color }}>
                {value}<span className="text-sm font-bold text-cw-neutral-500 ml-1.5 uppercase tracking-widest">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 mb-12">
        <h3 className="font-heading font-black text-2xl mb-1">Répartition du stress</h3>
        <p className="text-sm text-cw-neutral-500 font-bold mb-8">Pourcentage du temps passé à chaque niveau physiologique</p>
        
        <div className="flex flex-col gap-4">
          {weekly.map(day => (
            <div key={day.date} className="flex items-center gap-4">
              <div className="w-24 text-sm font-bold text-cw-neutral-500 uppercase tracking-widest">
                {new Date(day.date).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div className="flex-1 flex h-8 rounded-xl overflow-hidden gap-1 bg-cw-neutral-50">
                {day.pct_calm > 0 && (
                  <div className="bg-cw-teal flex items-center justify-center transition-all duration-500" style={{ width: `${day.pct_calm}%` }}>
                    {day.pct_calm > 15 && <span className="text-[10px] text-white font-bold">{day.pct_calm.toFixed(0)}%</span>}
                  </div>
                )}
                {day.pct_moderate > 0 && (
                  <div className="bg-cw-peach flex items-center justify-center transition-all duration-500" style={{ width: `${day.pct_moderate}%` }}>
                    {day.pct_moderate > 15 && <span className="text-[10px] text-orange-700 font-bold">{day.pct_moderate.toFixed(0)}%</span>}
                  </div>
                )}
                {day.pct_high > 0 && (
                  <div className="bg-cw-coral flex items-center justify-center transition-all duration-500" style={{ width: `${day.pct_high}%` }}>
                    {day.pct_high > 15 && <span className="text-[10px] text-white font-bold">{day.pct_high.toFixed(0)}%</span>}
                  </div>
                )}
              </div>
              <div className="w-12 text-sm font-black text-right" style={{ color: STRESS_COLOR(day.avg_stress) }}>
                {day.avg_stress?.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-6 mt-8 p-4 bg-cw-neutral-50 rounded-xl inline-flex w-full justify-center">
          {[['#5BB5B5', 'Calme'], ['#F5C6A5', 'Modéré'], ['#F28C7E', 'Élevé']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 pb-12" style={{ gap: '32px' }}>
        <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col h-[360px]">
          <h3 className="font-heading font-black text-2xl mb-1">GSR moyen par jour</h3>
          <p className="text-sm text-cw-neutral-500 font-bold mb-6">Conductance cutanée moyenne (µS)</p>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date"
                  tickFormatter={d => new Date(d).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                  tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v.toFixed(1) + ' µS', 'GSR']} cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: 16, border: '1px solid #F3F4F6', boxShadow: '0 4px 16px rgba(0,0,0,0.08)'}} />
                <Bar dataKey="avg_gsr" radius={[8, 8, 0, 0]}>
                  {weekly.map((e, i) => (
                    <Cell key={i} fill={STRESS_COLOR(e.avg_stress)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col h-[360px]">
          <h3 className="font-heading font-black text-2xl mb-1">Profil hebdomadaire</h3>
          <p className="text-sm text-cw-neutral-500 font-bold mb-6">Volume global des états physiologiques</p>
          <div className="flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="45%"
                    innerRadius="45%" outerRadius="70%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: 12, border: '1px solid #F3F4F6', fontSize: 13 }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-cw-neutral-500 text-sm font-bold bg-cw-neutral-50 rounded-2xl">
                Pas assez de données
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
