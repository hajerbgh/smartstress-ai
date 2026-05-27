import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState('login');
  const [form, setForm]       = useState({ name: '', email: '', password: '', goal: 'Réduire mon stress quotidien' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const GOALS = [
    'Réduire mon stress quotidien',
    'Améliorer ma concentration',
    'Mieux dormir',
    'Prévenir le burn-out',
    'Suivi médical',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!form.name || !form.email || !form.password) {
          setError('Tous les champs sont obligatoires.'); setLoading(false); return;
        }
        if (form.password.length < 6) {
          setError('Le mot de passe doit faire au moins 6 caractères.'); setLoading(false); return;
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://hajerbgh-smartstress-api.hf.space'}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, goal: form.goal }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.detail || 'Erreur lors de l\'inscription.'); setLoading(false); return; }
        const user = { ...data.user, joinedAt: data.user.created_at };
        localStorage.setItem('ss_user', JSON.stringify(user));
        localStorage.setItem('ss_token', data.access_token);
        onLogin(user);
        navigate('/dashboard');
      } else {
        if (!form.email || !form.password) {
          setError('Email et mot de passe requis.'); setLoading(false); return;
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://hajerbgh-smartstress-api.hf.space'}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.detail || 'Email ou mot de passe incorrect.'); setLoading(false); return; }
        const user = { ...data.user, joinedAt: data.user.created_at };
        localStorage.setItem('ss_user', JSON.stringify(user));
        localStorage.setItem('ss_token', data.access_token);
        onLogin(user);
        navigate('/dashboard');
      }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cw-butter flex items-center justify-center p-6 font-body">
      <div className="max-w-[1040px] w-full flex flex-col lg:flex-row items-stretch">

        {/* Panneau gauche */}
        <div className="flex-1 min-h-[580px] bg-cw-teal rounded-[32px] lg:rounded-r-none px-10 lg:px-14 py-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cw-mint opacity-20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cw-peach opacity-20 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
              <Logo size={42} mono className="text-white" />
            </div>
            <div className="font-heading font-black text-4xl md:text-5xl leading-[1.1] mb-6 tracking-tight">
              Prenez soin <br /> de votre <span className="text-cw-mint">esprit.</span>
            </div>
            <div className="text-cw-mint/90 text-base md:text-lg leading-relaxed max-w-sm font-medium">
              ChillWaves analyse vos signaux physiologiques en temps réel pour un bien-être optimal.
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap gap-6 md:gap-8 mt-10">
            {[['98%', 'Précision ML'], ['< 1s', 'Temps réel'], ['24/7', 'Surveillance']].map(([val, label]) => (
              <div key={label}>
                <div className="font-heading font-black text-2xl md:text-3xl text-white">{val}</div>
                <div className="text-[11px] font-bold text-cw-mint/80 uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau droit — plus large, padding top pour dégager le haut */}
        <div className="w-full lg:w-[500px] bg-white rounded-[32px] lg:rounded-l-none px-10 md:px-12 pt-10 pb-8 shadow-[0_16px_64px_rgba(0,0,0,0.08)] lg:-ml-12 z-20 flex flex-col">

          {/* En-tête de bienvenue — bien dégagé du bord */}
          <div className="mt-14 pb-12 border-b border-cw-neutral-100 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cw-mint/30 flex items-center justify-center mb-3">
              {mode === 'login'
                ? <Sparkles size={22} className="text-cw-teal" strokeWidth={2.2} />
                : <ArrowRight size={22} className="text-cw-teal" strokeWidth={2.2} />}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-cw-teal mb-1">
              Bienvenue sur ChillWaves
            </span>
            <h1 className="font-heading font-black text-2xl text-cw-neutral-900 tracking-tight">
              {mode === 'login' ? 'Heureux de vous revoir' : 'Créez votre espace bien-être'}
            </h1>
            <p className="text-sm font-medium text-cw-neutral-500 mt-1.5 max-w-xs leading-relaxed">
              {mode === 'login'
                ? 'Reconnectez-vous pour accéder à vos données physiologiques.'
                : 'Quelques secondes suffisent pour commencer votre suivi.'}
            </p>
          </div>

          {/* Onglets */}
          <div className="flex bg-cw-neutral-50 p-1.5 rounded-2xl mt-12">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all duration-300 ${
                  mode === m ? 'bg-white text-cw-teal shadow-sm' : 'text-cw-neutral-500 hover:text-cw-teal'
                }`}>
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          {/* Formulaire — mt-8 pour bien espacer des onglets, champs à 4/5 de largeur centrés */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
            {mode === 'register' && (
              <>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest block mb-2 w-4/5 text-left">Prénom et Nom</label>
                  <input className="w-4/5 px-5 py-3.5 rounded-xl border-2 border-cw-neutral-100 bg-cw-neutral-50 focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 outline-none transition-all font-semibold"
                    placeholder="Hajer Ben Ali"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest block mb-2 w-4/5 text-left">Objectif principal</label>
                  <select className="w-4/5 px-5 py-3.5 rounded-xl border-2 border-cw-neutral-100 bg-cw-neutral-50 focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 outline-none transition-all cursor-pointer font-semibold"
                    value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })}>
                    {GOALS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex flex-col items-center">
              <label className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest block mb-2 w-4/5 text-left">Adresse e-mail</label>
              <input className="w-4/5 px-5 py-3.5 rounded-xl border-2 border-cw-neutral-100 bg-cw-neutral-50 focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 outline-none transition-all font-semibold"
                type="email" placeholder="bonjour@chillwaves.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="flex flex-col items-center">
              <label className="text-xs font-bold text-cw-neutral-500 uppercase tracking-widest block mb-2 w-4/5 text-left">Mot de passe</label>
              <input className="w-4/5 px-5 py-3.5 rounded-xl border-2 border-cw-neutral-100 bg-cw-neutral-50 focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 outline-none transition-all font-semibold"
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            {error && (
              <div className="mx-auto w-4/5 bg-cw-coral/10 text-cw-coral border border-cw-coral/20 px-4 py-3 rounded-xl text-sm font-semibold text-center">
                {error}
              </div>
            )}

            <div className="flex justify-center mt-3">
              <button type="submit" disabled={loading}
                className={`bg-cw-coral hover:bg-orange-400 text-white font-bold py-3.5 px-12 rounded-xl transition-all shadow-[0_4px_16px_rgba(242,140,126,0.3)] hover:shadow-[0_8px_24px_rgba(242,140,126,0.4)] hover:-translate-y-0.5 flex items-center gap-2 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Chargement...</>
                  : <>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={18} strokeWidth={2.8} /></>
                }
              </button>
            </div>
          </form>

          
        </div>
      </div>
    </div>
  );
}