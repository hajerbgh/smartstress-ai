import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Target, XCircle, Waves } from 'lucide-react';
import Logo from '../components/Logo';

const API      = 'http://localhost:8000';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Clé Groq : à définir dans .env (VITE_GROQ_KEY=gsk_...) — ne jamais committer en clair
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY || '';

const SUGGESTIONS = [
  "Bilan de santé global cette semaine",
  "Pourquoi mon GSR est si élevé ?",
  "Techniques de respiration rapide",
  "Analyser mon rythme cardiaque",
  "Rédiger un résumé pour mon médecin"
];

export default function Chatbot({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [context, setContext]   = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${API}/readings/latest`),
          fetch(`${API}/stats/daily?days=7`),
        ]);
        let ctx = `=== DONNÉES DE ${user?.name?.toUpperCase() || 'L\'UTILISATEUR'} ===\n`;
        if (r1.ok) {
          const d = await r1.json();
          ctx += `Dernière mesure: GSR=${d.gsr?.toFixed(1)} µS, HR=${d.heart_rate?.toFixed(0)} bpm, Stress=${d.stress_name?.toUpperCase()}\n`;
        }
        if (r2.ok) {
          const days = await r2.json();
          ctx += `\nStats 7 jours:\n`;
          days.forEach(d => {
            ctx += `  ${d.date}: Calme ${d.pct_calm?.toFixed(0)}% | Modéré ${d.pct_moderate?.toFixed(0)}% | Élevé ${d.pct_high?.toFixed(0)}%\n`;
          });
        }
        setContext(ctx);
      } catch {}
    };
    fetchContext();

    setMessages([{
      role: 'bot',
      text: `Hello ${user?.name?.split(' ')[0] || ''} !\n\nJe suis **ChillBot**, ton guide bien-être assisté par IA. J'analyse tes ondes physiologiques pour te proposer un accompagnement sur-mesure.\n\nPar où souhaites-tu commencer aujourd'hui ?`,
      time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
    }]);
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text = null) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', text: msg, time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const prompt = `Tu es ChillBot, l'assistant IA de SmartStress AI, bienveillant, relaxant et professionnel. Tes couleurs de marque sont le Teal (vert d'eau) et le Corail.
Objectif de l'utilisateur : ${user?.goal || 'Se détendre'}

${context.slice(0, 2000)}

Question: ${msg}
Réponse en français, format Markdown léger:`;

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600, temperature: 0.7
        })
      });
      const data = await res.json();
      const response = data?.choices?.[0]?.message?.content || "Je n'ai pas pu répondre à ce moment précis.";
      setMessages(prev => [...prev, {
        role: 'bot', text: response,
        time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Impossible de me connecter au cœur de l'IA (vérifie tes accès).", time: '', error: true }]);
    }
    setLoading(false);
  }, [input, loading, context, user]);

  const renderText = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-[fadeUp_0.5s_ease_forwards] font-body pb-6">

      <div className="mb-6">
        <h2 className="font-heading font-black text-3xl md:text-4xl text-cw-neutral-900 tracking-tight flex items-center gap-3">
          ChillBot <Sparkles className="text-cw-teal" size={28} />
        </h2>
        <p className="text-cw-neutral-500 font-bold mt-2 text-sm md:text-base">Votre IA thérapeutique propulsée par Groq</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex flex-col overflow-hidden min-h-0">

          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 hide-scrollbar relative">
            {/* Absolute watermark background logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
              <Logo size={260} mono className="text-cw-teal" />
            </div>

            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full relative z-10 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-10 h-10 rounded-2xl bg-cw-mint/40 flex items-center justify-center text-cw-teal shrink-0 mr-3 mt-2">
                    <Logo size={24} mono className="text-cw-teal" />
                  </div>
                )}

                <div className={`max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 md:p-5 text-[15px] leading-relaxed font-medium ${
                      msg.role === 'user'
                        ? 'bg-cw-coral text-white rounded-[22px_22px_4px_22px] shadow-[0_4px_16px_rgba(242,140,126,0.3)]'
                        : msg.error
                          ? 'bg-cw-coral/10 border border-cw-coral/20 text-cw-coral rounded-[22px_22px_22px_4px] flex items-center gap-2'
                          : 'bg-cw-neutral-50 border border-cw-neutral-100 text-cw-neutral-900 rounded-[22px_22px_22px_4px]'
                    }`}
                  >
                    {msg.error && <XCircle size={18} className="shrink-0" />}
                    <span dangerouslySetInnerHTML={{ __html: renderText(msg.text) }} />
                  </div>
                  {msg.time && <div className="text-[10px] font-bold text-cw-neutral-400 mt-2 px-1 uppercase tracking-widest">{msg.time}</div>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-cw-mint/40 flex items-center justify-center text-cw-teal shrink-0 mr-3">
                  <Logo size={24} mono className="text-cw-teal animate-pulseGlow" />
                </div>
                <div className="bg-cw-neutral-50 border border-cw-neutral-100 px-5 py-4 rounded-[22px_22px_22px_4px] flex gap-2 items-center">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-cw-teal/50 animate-[bounce_1.4s_infinite]" style={{ animationDelay: `${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4"></div>
          </div>

          <div className="p-5 bg-white border-t border-cw-neutral-100">
            <div className="flex gap-3 p-2 pl-5 bg-cw-neutral-50 rounded-full border-2 border-transparent focus-within:border-cw-mint focus-within:bg-white transition-all shadow-inner">
              <input
                className="flex-1 bg-transparent border-none outline-none font-bold text-cw-neutral-900 placeholder:text-cw-neutral-400 min-w-0"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ressentez-vous une tension spécifique ?"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                aria-label="Envoyer"
                className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-all shrink-0
                  ${loading || !input.trim() ? 'bg-cw-neutral-200 cursor-not-allowed' : 'bg-cw-teal hover:bg-cw-mint hover:text-cw-teal shadow-md hover:-translate-y-0.5'}`}
              >
                <Send size={16} strokeWidth={3} className="mr-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Suggestions */}
        <div className="w-full lg:w-72 flex flex-col gap-5">
          <div className="bg-white rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-neutral-100 p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={16} className="text-cw-coral" />
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cw-neutral-500">Suggestions</div>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto hide-scrollbar">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="p-3.5 bg-cw-butter rounded-2xl text-sm font-bold text-cw-neutral-600 text-left transition-all border border-transparent hover:bg-white hover:border-cw-mint hover:text-cw-teal hover:shadow-[0_4px_12px_rgba(91,181,181,0.1)] hover:-translate-y-0.5 group flex items-center gap-2">
                  <Waves size={14} strokeWidth={2.8} className="opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                  <span className="flex-1">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {user?.goal && (
            <div className="bg-gradient-to-br from-cw-teal to-cw-mint p-6 rounded-[28px] shadow-sm text-white relative overflow-hidden">
              <Logo size={90} mono className="absolute -right-4 -bottom-4 opacity-20 text-white pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Target size={14} strokeWidth={2.8} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">Focus Principal</div>
              </div>
              <div className="font-heading font-black text-lg leading-tight relative z-10">{user.goal}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
