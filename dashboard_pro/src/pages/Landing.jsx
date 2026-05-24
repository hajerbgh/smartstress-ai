import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Brain, FileText, Lightbulb, Smartphone, Waves, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

export default function Landing() {
  const navigate  = useNavigate();
  const [visible, setVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const accuracy  = useCounter(98, 2000, visible);
  const users     = useCounter(1247, 2500, visible);
  const uptime    = useCounter(99, 1800, visible);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

  const FEATURES = [
    { icon: Brain, title: 'Monitor', desc: 'Edge AI embarqué sur ESP32 mesurant vos constantes vitales en continu.', color: 'text-cw-teal bg-cw-mint/30' },
    { icon: Activity, title: 'Analyze', desc: 'Classification Random Forest avec une précision de détection du stress de 98%.', color: 'text-cw-coral bg-cw-coral/20' },
    { icon: Waves, title: 'Connect', desc: 'Synchronisation cloud instantanée entre vos capteurs et votre dashboard web.', color: 'text-orange-500 bg-cw-peach/30' },
    { icon: Smartphone, title: 'Track', desc: 'Retrouvez votre historique complet et vos évolutions physiologiques en un clin d’œil.', color: 'text-cw-teal bg-cw-neutral-100' },
    { icon: Lightbulb, title: 'Advise', desc: 'Assistant ChillBot propulsé par LLaMA3 pour des conseils psychologiques concrets.', color: 'text-cw-coral bg-cw-coral/10' },
    { icon: FileText, title: 'Wellness', desc: 'Génération automatique de rapports d’expertise au format PDF pour votre médecin.', color: 'text-cw-teal bg-cw-mint/40' },
  ];

  return (
    <div className="bg-cw-butter min-h-screen text-cw-neutral-900 font-body overflow-x-hidden selection:bg-cw-mint/50">
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-500 ${scrollY > 50 ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="font-heading font-black text-2xl tracking-tight">
            <span className="text-cw-teal">Chill</span><span className="text-cw-coral">Waves</span>
          </span>
        </div>
        <div className="hidden md:flex gap-10 font-bold text-cw-neutral-500">
          <a href="#features" className="hover:text-cw-teal transition-colors">Fonctionnalités</a>
          <a href="#how" className="hover:text-cw-teal transition-colors">Comment ça marche</a>
        </div>
        <button onClick={() => navigate('/login')} className="bg-cw-coral hover:bg-orange-500 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-[0_4px_16px_rgba(242,140,126,0.2)] hover:shadow-[0_8px_24px_rgba(242,140,126,0.3)] hover:-translate-y-0.5">
          Connexion
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-8 text-center overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-cw-mint/20 to-cw-peach/20 rounded-full blur-[100px] animate-pulseGlow pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-cw-mint/30 shadow-sm mb-10 opacity-0 animate-[fadeUp_0.8s_ease_0.2s_forwards]">
          <span className="w-2.5 h-2.5 rounded-full bg-cw-teal animate-pulseGlow"></span>
          <span className="text-sm font-bold tracking-widest text-cw-teal uppercase">Monitoring Intelligent</span>
        </div>

        <h1 className="font-heading font-black text-6xl md:text-8xl tracking-tight leading-[1.05] mb-8 max-w-5xl opacity-0 animate-[fadeUp_0.8s_ease_0.3s_forwards]">
          Le calme <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cw-teal to-cw-mint animate-wave inline-block">à portée d'onde.</span>
        </h1>

        <p className="text-xl md:text-2xl text-cw-neutral-500 font-medium max-w-3xl mb-12 opacity-0 animate-[fadeUp_0.8s_ease_0.4s_forwards] leading-relaxed">
          Smart monitoring. Better you. Analysez vos ondes physiologiques en temps réel avec une interface pensée pour votre sérénité.
        </p>

        <div className="flex gap-6 opacity-0 animate-[fadeUp_0.8s_ease_0.5s_forwards]">
          <button onClick={() => navigate('/login')} className="bg-cw-coral hover:bg-orange-400 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_8px_24px_rgba(242,140,126,0.3)] hover:shadow-[0_12px_32px_rgba(242,140,126,0.4)] hover:-translate-y-1 flex items-center gap-2">
            Get Started
            <ArrowRight size={20} strokeWidth={2.8} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-16 mt-24 opacity-0 animate-[fadeUp_0.8s_ease_0.7s_forwards] bg-white/60 backdrop-blur-md border border-cw-neutral-100 p-8 rounded-[32px] shadow-sm">
          {[
            { value: accuracy, suffix: '%', label: 'Précision ML' },
            { value: users, suffix: '+', label: 'Abonnés' },
            { value: uptime, suffix: '.9%', label: 'Uptime' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-heading font-black text-5xl tabular-nums tracking-tight text-cw-teal mb-2">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-cw-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-heading font-black text-5xl mb-6">Un écosystème conçu pour vous.</h2>
          <p className="text-lg text-cw-neutral-500 font-medium max-w-2xl mx-auto">Tout ce dont vous avez besoin pour comprendre, monitorer et réguler votre stress de manière scientifique et intuitive.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feat, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-cw-neutral-100 hover:shadow-[0_12px_48px_rgba(91,181,181,0.1)] hover:-translate-y-2 transition-all duration-300 group">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feat.color} group-hover:scale-110 transition-transform`}>
                <feat.icon size={32} strokeWidth={2.5} />
              </div>
              <h3 className="font-heading font-black text-2xl mb-4">{feat.title}</h3>
              <p className="text-cw-neutral-500 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-cw-neutral-100 mt-20">
        <div className="max-w-7xl mx-auto px-8 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-heading font-bold text-xl tracking-tight">
              <span className="text-cw-teal">Chill</span><span className="text-cw-coral">Waves</span>
            </span>
          </div>
          <p className="text-sm font-semibold text-cw-neutral-500 uppercase tracking-widest">© 2026 SmartStress AI</p>
        </div>
      </footer>
    </div>
  );
}
