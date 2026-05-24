import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, MessageCircle, FileText, User, LogOut } from 'lucide-react';
import StressBadge from './StressBadge';
import Logo from './Logo';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: Activity, label: 'Analyses' },
  { to: '/chatbot',   icon: MessageCircle, label: 'Assistant IA' },
  { to: '/reports',   icon: FileText, label: 'Rapports' },
  { to: '/profile',   icon: User, label: 'Profil' },
];

export default function Sidebar({ user, onLogout }) {

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-cw-neutral-100 flex flex-col p-6 z-50 overflow-y-auto hide-scrollbar">
      {/* Logo */}
      <div className="mb-8 mt-2 flex items-center gap-3">
        <Logo size={42} className="shrink-0" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-heading text-xl font-black tracking-tight whitespace-nowrap">
            <span className="text-cw-teal">Chill</span><span className="text-cw-coral">Waves</span>
          </span>
          <span className="text-[9px] font-bold text-cw-neutral-500 uppercase tracking-[0.18em] mt-0.5 whitespace-nowrap">
            Smart · Better You
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-3">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              isActive
                ? 'bg-cw-teal text-white shadow-[0_4px_16px_rgba(91,181,181,0.3)]'
                : 'text-cw-neutral-500 hover:bg-cw-teal/10 hover:text-cw-teal'
            }`
          }>
            <Icon size={20} strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      {user && (
        <div className="bg-cw-butter rounded-2xl p-4 mb-3 border border-cw-neutral-100">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-cw-mint flex items-center justify-center text-cw-teal font-heading font-bold text-lg shrink-0 overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                : (user.name?.[0]?.toUpperCase() || 'U')
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-cw-neutral-900 text-sm truncate">{user.name}</div>
              <div className="text-[11px] text-cw-neutral-500 font-medium truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-cw-neutral-500 uppercase tracking-wider">Live</span>
            <StressBadge level={user?.lastStress || 0} />
          </div>
        </div>
      )}

      {/* Logout */}
      <button onClick={onLogout} className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-cw-neutral-500 hover:bg-cw-coral/10 hover:text-cw-coral transition-all duration-300 w-full">
        <LogOut size={20} strokeWidth={2.5} />
        Déconnexion
      </button>
    </aside>
  );
}
