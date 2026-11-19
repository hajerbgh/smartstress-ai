import React, { useState, useEffect, useMemo } from 'react';
import { Footprints, Moon, Flame, Sun } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HealthTracking() {
  const [steps, setSteps]       = useState(0);
  const [sleep, setSleep]       = useState({ total: '--', deep: '--', rem: '--', light: '--', quality: '--', wake: '--' });
  const [calories, setCalories] = useState(0);
  const [activeTab, setActiveTab] = useState('steps');

  const GOAL_STEPS = 10000;
  const stepsPct = Math.min((steps / GOAL_STEPS) * 100, 100);

  const barHeights = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const current = new Date().getHours();
    return i * 2 <= current ? Math.random() * 40 + 20 : 8;
  }), []);

  useEffect(() => {
    const fetchWellness = async () => {
      try {
        const [stepsRes, sleepRes] = await Promise.all([
          fetch(`${API}/steps/today`),
          fetch(`${API}/sleep/estimate`),
        ]);
        if (stepsRes.ok) {
          const d = await stepsRes.json();
          setSteps(d.steps || 0);
          setCalories(Math.round((d.steps || 0) * 0.04));
        }
        if (sleepRes.ok) {
          const d = await sleepRes.json();
          if (d.data_available && d.sleep_hours > 0) {
            const total = d.sleep_hours;
            setSleep({
              total:   total.toFixed(1),
              deep:    (total * 0.2).toFixed(1),
              rem:     (total * 0.15).toFixed(1),
              light:   (total * 0.55).toFixed(1),
              quality: Math.min(Math.round((total / 8) * 100), 100),
              wake:    new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
            });
          }
        }
      } catch {}
    };
    fetchWellness();
    const timer = setInterval(fetchWellness, 30000);
    return () => clearInterval(timer);
  }, []);

  const TABS = [
    { id: 'steps', label: 'Pas', icon: Footprints },
    { id: 'sleep', label: 'Sommeil', icon: Moon },
    { id: 'calories', label: 'Calories', icon: Flame },
  ];

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2 bg-cw-neutral-50 p-1.5 rounded-2xl mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === id 
              ? 'bg-white text-cw-teal shadow-[0_2px_8px_rgba(0,0,0,0.04)]' 
              : 'text-cw-neutral-500 hover:text-cw-teal'
          }`}>
            <Icon size={18} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {/* Steps */}
        {activeTab === 'steps' && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="font-heading font-black text-5xl tabular-nums tracking-tight text-cw-teal mb-1">
                  {steps.toLocaleString('fr')}
                </div>
                <div className="text-sm font-bold text-cw-neutral-500 uppercase tracking-widest">pas aujourd'hui</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest mb-1">Objectif</div>
                <div className="text-lg font-bold text-cw-neutral-900">{GOAL_STEPS.toLocaleString('fr')}</div>
              </div>
            </div>

            <div className="h-4 bg-cw-neutral-100 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-cw-teal to-cw-mint rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${stepsPct}%` }} 
              />
            </div>
            <div className="text-xs font-bold text-cw-neutral-500">
              {stepsPct.toFixed(0)}% complété — {Math.max(0, GOAL_STEPS - steps).toLocaleString('fr')} restants
            </div>

            <div className="flex gap-1.5 items-end h-[70px] mt-8">
              {barHeights.map((height, i) => {
                const h = i * 2;
                const isActive = height > 8;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${isActive ? 'bg-cw-teal group-hover:bg-cw-mint' : 'bg-cw-neutral-100'}`}
                      style={{ height: `${height}%` }}
                    />
                    {i % 3 === 0 && <div className="text-[10px] font-bold text-cw-neutral-500 tracking-wider hidden sm:block">{h}h</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sleep */}
        {activeTab === 'sleep' && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="font-heading font-black text-5xl tabular-nums tracking-tight text-[#818CF8] mb-1">
                  {sleep.total}h
                </div>
                <div className="text-sm font-bold text-cw-neutral-500 uppercase tracking-widest">cette nuit</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-cw-mint/30 text-cw-teal font-bold text-sm tracking-wide border border-cw-mint">
                {sleep.quality}% qualité
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { label: 'Profond', value: sleep.deep, max: 2, color: 'bg-[#6366F1]' },
                { label: 'REM', value: sleep.rem, max: 1.5, color: 'bg-[#0EA5E9]' },
                { label: 'Léger', value: sleep.light, max: 4, color: 'bg-[#A78BFA]' },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-bold text-cw-neutral-900">{value}h</span>
                  </div>
                  <div className="h-2.5 bg-cw-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${Math.min((parseFloat(value) / max) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-cw-butter border border-cw-mint/20 text-sm font-bold text-cw-neutral-900 flex flex-wrap gap-3 justify-between">
              <span className="flex items-center gap-2"><Moon size={14} className="text-[#6366F1]" strokeWidth={2.5} /> Couché : <span className="text-cw-neutral-500">23h30</span></span>
              <span className="flex items-center gap-2"><Sun size={14} className="text-cw-peach" strokeWidth={2.5} /> Levé : <span className="text-cw-neutral-500">{sleep.wake}</span></span>
            </div>
          </div>
        )}

        {/* Calories */}
        {activeTab === 'calories' && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="font-heading font-black text-5xl tabular-nums tracking-tight text-cw-coral mb-1">
                  {calories.toLocaleString('fr')}
                </div>
                <div className="text-sm font-bold text-cw-neutral-500 uppercase tracking-widest">kcal brûlées</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest mb-1">Objectif</div>
                <div className="text-lg font-bold text-cw-neutral-900">2 000 kcal</div>
              </div>
            </div>

            <div className="h-4 bg-cw-neutral-100 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-cw-peach to-cw-coral rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min((calories / 2000) * 100, 100)}%` }} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Métabolisme', value: Math.round(calories * 0.7), color: 'text-cw-coral', icon: Flame },
                { label: 'Activité', value: Math.round(calories * 0.2), color: 'text-cw-teal', icon: Footprints },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="p-4 rounded-2xl bg-cw-neutral-50 border border-cw-neutral-100 flex flex-col gap-2">
                  <Icon size={20} className={color} />
                  <div>
                    <div className={`font-heading font-black text-2xl ${color}`}>{value}</div>
                    <div className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
