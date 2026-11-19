import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import Logo from './components/Logo';
import './theme.css';

import Sidebar    from './components/Sidebar';
import Landing    from './pages/Landing';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Analytics  from './pages/Analytics';
import Chatbot    from './pages/Chatbot';
import Reports    from './pages/Reports';
import Profile    from './pages/Profile';

function Header() {
  const location = useLocation();
  const pageTitles = {
    '/dashboard': 'Dashboard',
    '/analytics': 'Analyses',
    '/chatbot': 'Assistant IA',
    '/reports': 'Rapports',
    '/profile': 'Profil',
  };
  const title = pageTitles[location.pathname] || 'SmartStress AI';

  return (
    <header className="h-20 px-10 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-cw-butter/80 border-b border-cw-neutral-100/60">
      <h1 className="font-heading font-black text-2xl md:text-3xl text-cw-neutral-900 tracking-tight truncate">{title}</h1>
      <div className="flex items-center gap-4 shrink-0">
        <button className="relative w-11 h-11 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-cw-neutral-100 flex items-center justify-center text-cw-neutral-500 hover:text-cw-teal transition-colors" aria-label="Notifications">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-cw-coral rounded-full border-2 border-white animate-pulseGlow"></span>
        </button>
      </div>
    </header>
  );
}

function ProtectedLayout({ user, onStressUpdate, onUpdate, onLogout }) {
  return (
    <div className="flex min-h-screen bg-cw-butter">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: '256px' }}>
        <Header />
        <div className="flex-1 px-8 md:px-12 py-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} onStressUpdate={onStressUpdate} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/chatbot"   element={<Chatbot user={user} />} />
            <Route path="/reports"   element={<Reports user={user} />} />
            <Route path="/profile"   element={<Profile user={user} onUpdate={onUpdate} onLogout={onLogout} />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ss_user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const handleLogin        = (u) => setUser(u);
  const handleLogout       = () => { localStorage.removeItem('ss_user'); localStorage.removeItem('ss_token'); setUser(null); };
  const handleUpdate       = (u) => { setUser(u); localStorage.setItem('ss_user', JSON.stringify(u)); };
  const handleStressUpdate = (level) => setUser(prev => prev ? { ...prev, lastStress: level } : prev);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cw-butter gap-4">
      <Logo size={64} />
      <div className="font-heading font-bold text-lg text-cw-teal flex items-center gap-2">
        <Loader2 size={18} className="animate-spin" />
        Chargement...
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/*" element={
          user
            ? <ProtectedLayout user={user} onStressUpdate={handleStressUpdate} onUpdate={handleUpdate} onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}