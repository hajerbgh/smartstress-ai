import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, Calendar, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';

const API = import.meta.env.VITE_API_URL || 'https://hajerbgh-smartstress-api.hf.space';
const STRESS_COLOR = (s) => s > 1.2 ? '#F28C7E' : s > 0.5 ? '#F5C6A5' : '#5BB5B5';

export default function Reports({ user }) {
  const [weekly, setWeekly]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/stats/daily?days=7`).then(r => r.ok ? r.json() : []),
      fetch(`${API}/stats/weekly`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([w, s]) => { setWeekly(w); setSummary(s); });
  }, []);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; // A4 width mm
      const MARGIN = 14;
      const COL = W - MARGIN * 2;
      let y = 0;

      // ── Header band ─────────────────────────────────────────────────
      pdf.setFillColor(91, 181, 181); // cw-teal
      pdf.rect(0, 0, W, 42, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('ChillWaves Official Report', MARGIN, 18);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Généré le ${new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
        MARGIN, 27,
      );
      if (user?.name) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${user.name}  •  ${user.goal || ''}`, MARGIN, 36);
      }
      y = 54;

      // ── Summary cards ────────────────────────────────────────────────
      if (summary) {
        const cards = [
          { label: 'Score Moyen', value: `${(summary.avg_stress_score * 50).toFixed(0)}/100` },
          { label: 'Tendance',    value: summary.trend === 'croissant' ? 'Critique (+)' : summary.trend === 'décroissant' ? 'Optimal (-)' : 'Stable (=)' },
          { label: 'Data Points', value: String(summary.total_readings) },
        ];
        const cardW = (COL - 8) / 3;
        cards.forEach((c, i) => {
          const x = MARGIN + i * (cardW + 4);
          pdf.setFillColor(247, 249, 249);
          pdf.roundedRect(x, y, cardW, 22, 3, 3, 'F');
          pdf.setTextColor(91, 181, 181);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(15);
          pdf.text(c.value, x + cardW / 2, y + 12, { align: 'center' });
          pdf.setTextColor(160, 170, 175);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.text(c.label.toUpperCase(), x + cardW / 2, y + 19, { align: 'center' });
        });
        y += 32;
      }

      // ── Section title ────────────────────────────────────────────────
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Matrice Chronologique', MARGIN, y);
      y += 6;

      // ── Table header ─────────────────────────────────────────────────
      const cols = [
        { label: 'Date',        w: 30 },
        { label: 'GSR Moy.',    w: 22 },
        { label: 'HR Moy.',     w: 22 },
        { label: 'Calme',       w: 20 },
        { label: 'Modéré',      w: 20 },
        { label: 'Élevé',       w: 20 },
        { label: 'Score',       w: 0  }, // fills remaining
      ];
      const filledW = cols.slice(0, -1).reduce((a, c) => a + c.w, 0);
      cols[cols.length - 1].w = COL - filledW;

      pdf.setFillColor(247, 249, 249);
      pdf.rect(MARGIN, y, COL, 7, 'F');
      pdf.setTextColor(160, 170, 175);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      let cx = MARGIN + 2;
      cols.forEach(col => {
        pdf.text(col.label.toUpperCase(), cx, y + 4.8);
        cx += col.w;
      });
      y += 7;

      // ── Table rows ───────────────────────────────────────────────────
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      weekly.forEach((day, i) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        if (i % 2 === 1) {
          pdf.setFillColor(252, 253, 253);
          pdf.rect(MARGIN, y, COL, 8, 'F');
        }
        const stressColor = day.avg_stress > 1.2 ? [242, 140, 126] : day.avg_stress > 0.5 ? [245, 198, 165] : [91, 181, 181];
        const row = [
          new Date(day.date + 'T12:00:00').toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' }),
          `${day.avg_gsr?.toFixed(1)} µS`,
          `${day.avg_hr?.toFixed(0)} bpm`,
          `${day.pct_calm?.toFixed(0)}%`,
          `${day.pct_moderate?.toFixed(0)}%`,
          `${day.pct_high?.toFixed(0)}%`,
          `${day.avg_stress?.toFixed(2)}/2`,
        ];
        cx = MARGIN + 2;
        row.forEach((val, j) => {
          if (j === row.length - 1) {
            pdf.setTextColor(...stressColor);
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setTextColor(30, 41, 59);
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(val, cx, y + 5.5);
          cx += cols[j].w;
        });
        y += 8;
      });

      // ── Separator + footer ───────────────────────────────────────────
      y += 6;
      pdf.setDrawColor(230, 235, 235);
      pdf.line(MARGIN, y, W - MARGIN, y);
      y += 5;
      pdf.setTextColor(180, 190, 195);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(
        'SmartStress AI v3.0 / ChillWaves  •  Ce rapport ne constitue pas un avis médical.',
        W / 2, y, { align: 'center' },
      );

      pdf.save(`ChillWaves_${new Date().toLocaleDateString('fr').replace(/\//g, '-')}.pdf`);
    } catch (e) {
      alert('Erreur export PDF : ' + e.message);
    }
    setExporting(false);
  };

  return (
    <div className="animate-[fadeUp_0.5s_ease_forwards] font-body max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-start mb-8">
        <div className="min-w-0">
          <h2 className="font-heading font-black text-3xl md:text-4xl text-cw-neutral-900 tracking-tight">Rapports d'Expertise</h2>
          <p className="text-cw-neutral-500 font-bold mt-2 text-sm md:text-base">Générez et exportez vos données physiologiques détaillées</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting}
          className={`flex items-center gap-2 bg-cw-coral hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-[0_4px_16px_rgba(242,140,126,0.3)] hover:shadow-[0_8px_24px_rgba(242,140,126,0.4)] hover:-translate-y-0.5 shrink-0 ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} strokeWidth={2.5} />}
          {exporting ? 'Génération...' : 'Exporter PDF'}
        </button>
      </div>

      {/* Rapport imprimable */}
      <div className="bg-white rounded-[32px] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-cw-neutral-100">
        
        {/* En-tête du rapport */}
        <div className="bg-cw-teal rounded-[24px] p-6 md:p-8 text-white flex flex-wrap gap-5 justify-between items-center mb-10 overflow-hidden relative">
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>

          <div className="relative z-10 min-w-0 flex-1">
            <h1 className="font-heading font-black text-2xl md:text-3xl mb-2 flex items-center gap-3">
              <Logo size={42} mono className="text-white shrink-0" />
              <span>ChillWaves Official Report</span>
            </h1>
            <p className="text-cw-mint font-bold flex items-center gap-2 text-sm">
              <FileText size={16} /> Généré le {new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right relative z-10 bg-black/10 px-5 py-3 rounded-2xl backdrop-blur-sm shrink-0">
            <div className="font-heading font-black text-xl md:text-2xl">{user?.name}</div>
            <div className="text-xs md:text-sm font-bold text-cw-mint">Objectif : {user?.goal}</div>
          </div>
        </div>

        {/* Résumé hebdomadaire */}
        {summary && (
          <div className="mb-14">
            <div className="font-heading font-black text-xl text-cw-neutral-900 mb-6 flex items-center gap-2">
              <CheckCircle size={20} className="text-cw-teal" /> Résumé Paramétrique
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '32px' }}>
              <div className="bg-cw-neutral-50 rounded-2xl p-6 border border-cw-neutral-100 text-center flex flex-col items-center justify-center">
                <div className="font-heading font-black text-5xl mb-1 tabular-nums" style={{ color: STRESS_COLOR(summary.avg_stress_score) }}>
                  {(summary.avg_stress_score * 50).toFixed(0)}<span className="text-xl font-bold text-cw-neutral-400">/100</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-cw-neutral-500">Score Moyen</div>
              </div>
              
              <div className="bg-cw-neutral-50 rounded-2xl p-6 border border-cw-neutral-100 text-center flex flex-col items-center justify-center">
                <div className="font-heading font-black text-5xl mb-1 tabular-nums" style={{ color: summary.trend === 'croissant' ? '#F28C7E' : '#5BB5B5' }}>
                  {summary.trend === 'croissant' ? 'Critique ↑' : summary.trend === 'décroissant' ? 'Optimal ↓' : 'Stable →'}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-cw-neutral-500">Tendance Globale</div>
              </div>
              
              <div className="bg-cw-neutral-50 rounded-2xl p-6 border border-cw-neutral-100 text-center flex flex-col items-center justify-center">
                <div className="font-heading font-black text-5xl mb-1 tabular-nums text-cw-teal">
                  {summary.total_readings}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-cw-neutral-500">Data Points Collectés</div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau journalier */}
        <div>
          <div className="font-heading font-black text-xl text-cw-neutral-900 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-cw-teal" /> Matrice Chronologique
          </div>
          
          <div className="overflow-hidden border border-cw-neutral-100 rounded-[20px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cw-neutral-50 border-b border-cw-neutral-100">
                  {['Date', 'GSR Moy.', 'HR Moy.', 'Calme', 'Modéré', 'Élevé', 'Score Global'].map(h => (
                    <th key={h} className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-cw-neutral-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekly.map((day, i) => (
                  <tr key={day.date} className={`border-b border-cw-neutral-50 font-bold text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="py-4 px-6 text-cw-neutral-900 border-r border-cw-neutral-50">
                      {new Date(day.date).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-cw-teal tabular-nums">{day.avg_gsr?.toFixed(1)} µS</td>
                    <td className="py-4 px-6 text-cw-coral tabular-nums">{day.avg_hr?.toFixed(0)} bpm</td>
                    <td className="py-4 px-6">
                      <span className="bg-cw-mint/30 text-cw-teal px-3 py-1 rounded-full">{day.pct_calm?.toFixed(0)}%</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-cw-peach/20 text-orange-600 px-3 py-1 rounded-full">{day.pct_moderate?.toFixed(0)}%</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-cw-coral/10 text-cw-coral px-3 py-1 rounded-full">{day.pct_high?.toFixed(0)}%</span>
                    </td>
                    <td className="py-4 px-6 border-l border-cw-neutral-50 font-heading font-black text-xl tabular-nums" style={{ color: STRESS_COLOR(day.avg_stress) }}>
                      {day.avg_stress?.toFixed(2)}/2
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer du rapport */}
        <div className="mt-12 text-center text-[10px] font-bold text-cw-neutral-400 uppercase tracking-[0.2em]">
          SmartStress AI v3.0 / ChillWaves Component • Ce rapport ne constitue pas un avis médical.
        </div>
        
      </div>
    </div>
  );
}

