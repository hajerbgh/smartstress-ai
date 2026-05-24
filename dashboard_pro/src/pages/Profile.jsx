import React, { useState, useRef } from 'react';
import { Camera, Check, Target, Cpu, Server, Brain, LogOut } from 'lucide-react';

const GOALS = [
  'Réduire mon stress quotidien',
  'Améliorer ma concentration',
  'Mieux dormir',
  'Prévenir le burn-out',
  'Suivi médical',
];

export default function Profile({ user, onUpdate, onLogout }) {
  const [form, setForm]     = useState({ name: user?.name || '', email: user?.email || '', goal: user?.goal || GOALS[0] });
  const [saved, setSaved]   = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const fileRef             = useRef(null);

  const handleSave = () => {
    const updated = { ...user, ...form, avatar };
    onUpdate?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatar(dataUrl);
      const updated = { ...user, ...form, avatar: dataUrl };
      onUpdate?.(updated);
    };
    reader.readAsDataURL(file);
  };

  const joinedDate = user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Aujourd\'hui';

  const TECH_ICONS = [
    { label: 'Matériel',    val: 'ESP32 IoT + GSR', icon: Cpu },
    { label: 'Traitement',  val: 'FastAPI Python',  icon: Server },
    { label: 'Intelligence', val: 'LLaMA3 (Groq)',  icon: Brain },
  ];

  return (
    <div className="animate-[fadeUp_0.5s_ease_forwards] font-body max-w-5xl mx-auto pb-20">

      <div className="mb-8">
        <h2 className="font-heading font-black text-3xl md:text-4xl text-cw-neutral-900 tracking-tight">Espace Personnel</h2>
        <p className="text-cw-neutral-500 font-bold mt-2 text-sm md:text-base">Gérez vos préférences et votre profil de bien-être</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

        {/* Colonne gauche (Infos Générales & Formulaire) */}
        <div className="md:col-span-2 flex flex-col gap-8">

          <div className="bg-white rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 overflow-hidden">
            {/* Header décoratif — fixed height banner */}
            <div className="relative h-28 bg-gradient-to-r from-cw-teal to-cw-mint">
              <div className="absolute top-4 right-6 text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">
                Profil Utilisateur
              </div>
            </div>

            {/* Avatar + info — pulled up to sit on the banner */}
            <div className="px-8 md:px-10 -mt-14 pb-8 flex flex-col sm:flex-row gap-6 items-start sm:items-end">
              <div className="relative group shrink-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-cw-butter border-4 border-white shadow-md overflow-hidden flex items-center justify-center font-heading font-black text-4xl md:text-5xl text-cw-teal">
                  {avatar
                    ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    : (user?.name?.[0]?.toUpperCase() || 'U')
                  }
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-cw-coral text-white flex items-center justify-center hover:bg-orange-500 transition-colors shadow-lg shadow-cw-coral/30"
                  aria-label="Changer photo"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="min-w-0 pb-1">
                <h3 className="font-heading font-black text-2xl md:text-3xl text-cw-neutral-900 truncate">{user?.name || 'Utilisateur'}</h3>
                <p className="font-bold text-cw-neutral-500 mb-2 truncate text-sm md:text-base">{user?.email || 'N/A'}</p>
                <div className="inline-block px-3 py-1 bg-cw-mint/30 text-cw-teal text-[10px] font-bold uppercase tracking-widest rounded-full">
                  Inscrit le {joinedDate}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="px-8 md:px-10 pb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-cw-neutral-500 pl-1">Prénom Nom</label>
                  <input
                    className="p-4 bg-cw-neutral-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 transition-all font-bold text-cw-neutral-900 outline-none"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-cw-neutral-500 pl-1">Email Personnel</label>
                  <input
                    type="email"
                    className="p-4 bg-cw-neutral-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 transition-all font-bold text-cw-neutral-900 outline-none"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-8">
                <label className="text-[11px] font-bold uppercase tracking-widest text-cw-neutral-500 pl-1">Objectif Thérapeutique Actuel</label>
                <select
                  className="p-4 bg-cw-neutral-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-cw-teal focus:ring-4 focus:ring-cw-teal/10 transition-all font-bold text-cw-neutral-900 outline-none cursor-pointer appearance-none"
                  value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })}
                >
                  {GOALS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <button onClick={handleSave} className="bg-cw-coral hover:bg-orange-400 text-white font-bold py-3.5 px-7 rounded-xl transition-all shadow-[0_4px_16px_rgba(242,140,126,0.2)] hover:shadow-[0_8px_24px_rgba(242,140,126,0.3)] hover:-translate-y-0.5">
                    Sauvegarder les modifications
                  </button>
                  {saved && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-cw-mint/30 text-cw-teal font-bold rounded-xl whitespace-nowrap animate-[fadeIn_0.3s_ease]">
                      <Check size={18} strokeWidth={3} />
                      Mise à jour réussie
                    </div>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 text-sm font-bold text-cw-neutral-500 hover:text-cw-coral border border-cw-neutral-200 hover:border-cw-coral/40 bg-white hover:bg-cw-coral/5 py-3 px-5 rounded-xl transition-all"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite (Focus & System) */}
        <div className="flex flex-col gap-6">

          <div className="bg-cw-teal rounded-[28px] p-7 shadow-[0_8px_24px_rgba(91,181,181,0.25)] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:scale-150 transition-transform duration-1000 pointer-events-none"></div>

            <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-80">Direction Ciblée</div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <Target size={26} strokeWidth={2.5} />
            </div>
            <h4 className="font-heading font-black text-xl md:text-2xl leading-tight mb-3">{form.goal}</h4>
            <p className="text-cw-mint font-medium text-sm leading-relaxed">
              L'algorithme IA ajuste l'ensemble des métriques Dashboard et les conseils ChillBot autour de ce prisme de priorité absolue.
            </p>
          </div>

          <div className="bg-white rounded-[28px] p-7 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-5 text-cw-neutral-500">Sous le capot</div>

            <div className="flex flex-col gap-4">
              {TECH_ICONS.map(({ label, val, icon: Icon }, i) => (
                <div key={i} className="flex justify-between items-center gap-3 pb-4 border-b border-cw-neutral-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-cw-butter text-cw-teal shrink-0">
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-cw-neutral-500 text-sm truncate">{label}</span>
                  </div>
                  <span className="font-black text-cw-neutral-900 bg-cw-butter px-3 py-1 rounded-lg text-[11px] tracking-tight whitespace-nowrap shrink-0">{val}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-[9px] font-bold text-cw-neutral-400 uppercase tracking-widest leading-relaxed">
              SmartStress AI v3.0<br/>ChillWaves Design Edition
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
