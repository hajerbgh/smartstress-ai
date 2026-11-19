import React from 'react';

export default function RecommendationCard({ title, description, action, icon: Icon }) {
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-cw-mint/20 flex gap-5 transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-cw-mint/40 flex items-center justify-center text-cw-teal animate-breathing">
        {Icon && <Icon size={28} />}
      </div>
      <div className="flex-1">
        <h4 className="font-heading font-bold text-cw-neutral-900 text-lg mb-1">{title}</h4>
        <p className="text-cw-neutral-500 text-sm mb-4 leading-relaxed font-medium">{description}</p>
        <button className="text-sm font-bold text-cw-coral hover:text-orange-500 transition-colors uppercase tracking-widest bg-cw-coral/10 px-4 py-2 rounded-xl">
          {action}
        </button>
      </div>
    </div>
  );
}
