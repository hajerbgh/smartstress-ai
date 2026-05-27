import React, { useState, useEffect, useCallback } from 'react';
import ECGWave from '../components/ECGWave';
import WellnessScore from '../components/WellnessScore';
import SmartRecommendations from '../components/SmartRecommendations';
import HealthTracking from '../components/HealthTracking';
import MetricCard from '../components/MetricCard';
import StressGauge from '../components/StressGauge';
import StressBadge from '../components/StressBadge';
import { Activity, Heart, Brain, AlertTriangle, X, Target, Zap, Hand } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'https://hajerbgh-smartstress-api.hf.space';
const STRESS_COLOR = { 0: '#5BB5B5', 1: '#F5C6A5', 2: '#F28C7E' };

export default function Dashboard({ user, onStressUpdate }) {
  const [latest, setLatest]     = useState(null);
  const [readings, setReadings] = useState([]);
  const [connected, setConnected] = useState(false);
  const [alertShown, setAlertShown] = useState(false);
  const [notification, setNotification] = useState(null);

  // Request push notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendPushAlert = useCallback((stressLevel, gsr) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ChillWaves — Alerte stress', {
        body: `Niveau de stress ÉLEVÉ détecté ! GSR: ${gsr?.toFixed(1)} µS. Consultez vos recommandations.`,
      });
    }
    setNotification({ type: 'alert', msg: `Stress élevé détecté — GSR: ${gsr?.toFixed(1)} µS` });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/readings/latest`),
        fetch(`${API}/readings?limit=40`),
      ]);
      if (r1.ok) {
        const data = await r1.json();
        setLatest(data);
        setConnected(true);
        onStressUpdate?.(data.stress_label);

        // Push alert for high stress
        if (data.stress_label === 2 && !alertShown) {
          sendPushAlert(data.stress_label, data.gsr);
          setAlertShown(true);
          setTimeout(() => setAlertShown(false), 60000); // Reset after 1 min
        }
      }
      if (r2.ok) {
        const data = await r2.json();
        setReadings(data.reverse().map(r => ({
          ...r,
          time: new Date(r.timestamp).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
        })));
      }
    } catch { setConnected(false); }
  }, [onStressUpdate, alertShown, sendPushAlert]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sl = latest?.stress_label ?? 0;
  const sc = STRESS_COLOR[sl];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-cw-neutral-100 rounded-xl p-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <div className="text-xs font-bold text-cw-neutral-500 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="font-bold text-sm tracking-wide" style={{ color: p.color }}>
            {p.name}: {p.value?.toFixed(1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-[fadeUp_0.5s_ease_forwards]">


      {/* Push notification banner */}
      {notification && (
        <div className="fixed top-24 right-10 z-[100] px-5 py-3 rounded-2xl bg-cw-coral text-white shadow-[0_8px_32px_rgba(242,140,126,0.4)] font-bold flex items-center gap-3 max-w-sm animate-[fadeUp_0.3s_ease_forwards]">
          <AlertTriangle size={20} strokeWidth={2.5} className="shrink-0" />
          <span className="flex-1">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100 ml-2 shrink-0" aria-label="Fermer">
            <X size={16} strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Welcome & Status */}
      <div className="flex flex-wrap gap-4 justify-between items-start mb-10">
        <div className="min-w-0">
          <div className="text-cw-neutral-500 font-bold text-sm mb-1 uppercase tracking-wider">
            {new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h2 className="font-heading font-black text-4xl text-cw-neutral-900 tracking-tight flex items-center gap-3 flex-wrap">
            Bonjour, {user?.name?.split(' ')[0]}
            <Hand className="text-cw-peach -rotate-12" size={32} strokeWidth={2.2} />
          </h2>
          {user?.goal && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cw-teal bg-cw-mint/30 px-3 py-1.5 rounded-full">
              <Target size={14} strokeWidth={2.8} />
              {user.goal}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shrink-0 ${connected ? 'bg-cw-mint/30 border-cw-mint text-cw-teal' : 'bg-cw-coral/10 border-cw-coral/20 text-cw-coral'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-cw-teal animate-pulseGlow' : 'bg-cw-coral'}`}></span>
          <span className="text-xs font-bold uppercase tracking-widest">{connected ? 'Capteurs Synchronisés' : 'Hors ligne'}</span>
        </div>
      </div>

      {/* Top Section: Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 mb-12" style={{ gap: '32px' }}>
        <MetricCard
          title="Conductance Cutanée" value={latest?.gsr?.toFixed(1) ?? '—'} unit="µS"
          trend={latest?.gsr > 8 ? 'up' : 'normal'} icon={Activity} colorClass="text-cw-teal"
        />
        <MetricCard
          title="Fréquence Cardiaque" value={latest?.heart_rate?.toFixed(0) ?? '—'} unit="bpm"
          trend={latest?.heart_rate > 90 ? 'up' : 'normal'} icon={Heart} colorClass="text-cw-coral"
        />
      </div>

      {/* Row: Score + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 mb-12" style={{ gap: '32px' }}>
        {/* Stress Gauge */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col items-center justify-center min-h-[320px]">
          <div className="text-[11px] font-bold text-cw-neutral-500 uppercase tracking-[0.18em] mb-4 text-center">Niveau de Stress Actuel</div>
          <StressGauge level={sl} size={180} value={latest?.confidence ? Math.round(latest.confidence * 100) : 10} />
        </div>

        {/* Wellness Score */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex items-center justify-center min-h-[320px]">
          <WellnessScore stressLevel={sl} gsr={latest?.gsr || 5} heartRate={latest?.heart_rate || 70} />
        </div>
      </div>

      {/* ECG Banner */}
      <div className="bg-white border border-cw-neutral-100 rounded-[24px] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] mb-12">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-cw-neutral-500 uppercase tracking-[0.18em] mb-1">Signal Électrique En Direct</div>
            <h3 className="font-heading font-black text-2xl text-cw-neutral-900">Activité Physiologique</h3>
          </div>
          <StressBadge level={sl} />
        </div>
        <ECGWave stressLevel={sl} gsr={latest?.gsr || 5} heartRate={latest?.heart_rate || 70} />
      </div>

      {/* Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 mb-12" style={{ gap: '32px' }}>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100">
          <h3 className="font-heading font-bold text-xl mb-1">Activité Électrodermale (GSR)</h3>
          <p className="text-sm text-cw-neutral-500 font-medium mb-6">Conductance cutanée sur les 40 dernières mesures</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readings} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGsr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5BB5B5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5BB5B5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} interval={7} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="gsr" stroke="#5BB5B5" strokeWidth={3} fillOpacity={1} fill="url(#colorGsr)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100">
          <h3 className="font-heading font-bold text-xl mb-1">Fréquence Cardiaque</h3>
          <p className="text-sm text-cw-neutral-500 font-medium mb-6">Battements par minute (bpm)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readings} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F28C7E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F28C7E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} interval={7} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="heart_rate" stroke="#F28C7E" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recommendations & Health Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 pb-20" style={{ gap: '32px' }}>
        <SmartRecommendations stressLevel={sl} gsr={latest?.gsr} heartRate={latest?.heart_rate} />
        <HealthTracking />
      </div>
    </div>
  );
}
