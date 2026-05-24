"""
SmartStress AI — Constructeur de contexte RAG
===============================================
Récupère les données réelles depuis le backend FastAPI
et les formate en contexte lisible pour Gemini.

C'est le cœur du RAG (Retrieval Augmented Generation) :
au lieu de répondre de manière générique, le LLM a accès
à TES vraies données de stress.
"""

import requests
from datetime import datetime
from typing import Optional

BACKEND_URL = "http://localhost:8000"


class ContextBuilder:
    """
    Récupère les données du backend et construit
    un contexte structuré pour le chatbot.
    """

    def __init__(self, backend_url: str = BACKEND_URL):
        self.backend_url = backend_url

    def _get(self, endpoint: str) -> Optional[dict]:
        """Appel GET vers le backend, retourne None si erreur."""
        try:
            r = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
            if r.status_code == 200:
                return r.json()
        except requests.exceptions.ConnectionError:
            pass
        return None

    def get_latest_reading(self) -> str:
        """Dernière mesure enregistrée."""
        data = self._get("/readings/latest")
        if not data:
            return "Aucune mesure récente disponible."
        return (
            f"Dernière mesure ({data['timestamp'][:16]}) : "
            f"GSR={data['gsr']:.1f} µS, "
            f"Pouls={data['heart_rate']:.0f} bpm, "
            f"Stress={data['stress_name'].upper()} "
            f"(confiance: {data['confidence']*100:.0f}%)"
        )

    def get_weekly_summary(self) -> str:
        """Résumé hebdomadaire structuré."""
        data = self._get("/stats/weekly")
        if not data:
            return "Pas assez de données pour un résumé hebdomadaire."

        lines = [
            f"Période : {data['period']}",
            f"Score de stress moyen : {data['avg_stress_score']:.2f}/2.0",
            f"Tendance : {data['trend']}",
            f"Jour le plus stressé : {data['most_stressed_day']}",
            f"Jour le plus calme   : {data['calmest_day']}",
            f"Nombre de mesures    : {data['total_readings']}",
            "",
            "Détail par jour :",
        ]
        for day in data.get("daily_stats", []):
            score = day["avg_stress"]
            emoji = "😌" if score < 0.5 else ("😐" if score < 1.2 else "😰")
            bar = "█" * int(score * 5)
            lines.append(f"  {day['date']} : {emoji} {bar} ({score:.2f})")

        return "\n".join(lines)

    def get_daily_stats(self, days: int = 7) -> str:
        """Statistiques journalières sur N jours."""
        data = self._get(f"/stats/daily?days={days}")
        if not data:
            return "Pas de statistiques journalières disponibles."

        lines = [f"Statistiques des {days} derniers jours :"]
        for day in data:
            lines.append(
                f"  {day['date']} — "
                f"Calme: {day['pct_calm']:.0f}% | "
                f"Modéré: {day['pct_moderate']:.0f}% | "
                f"Élevé: {day['pct_high']:.0f}% | "
                f"GSR moy: {day['avg_gsr']:.1f} µS | "
                f"HR moy: {day['avg_hr']:.0f} bpm"
                + (f" | Pic à {day['peak_stress_hour']}h" if day.get('peak_stress_hour') else "")
            )
        return "\n".join(lines)

    def get_recent_readings(self, limit: int = 20) -> str:
        """Dernières mesures pour détecter les patterns récents."""
        data = self._get(f"/readings?limit={limit}")
        if not data:
            return "Pas de mesures récentes."

        high = [r for r in data if r["stress_label"] == 2]
        moderate = [r for r in data if r["stress_label"] == 1]
        calm = [r for r in data if r["stress_label"] == 0]

        lines = [
            f"Sur les {limit} dernières mesures :",
            f"  😌 Calme   : {len(calm)} ({len(calm)/limit*100:.0f}%)",
            f"  😐 Modéré  : {len(moderate)} ({len(moderate)/limit*100:.0f}%)",
            f"  😰 Élevé   : {len(high)} ({len(high)/limit*100:.0f}%)",
        ]

        if high:
            avg_gsr_high = sum(r["gsr"] for r in high) / len(high)
            lines.append(f"  GSR moyenne en stress élevé : {avg_gsr_high:.1f} µS")

        return "\n".join(lines)

    def build_full_context(self) -> str:
        """
        Construit le contexte RAG complet à injecter dans le prompt Gemini.
        C'est ce qui rend le chatbot intelligent et personnalisé.
        """
        now = datetime.now().strftime("%A %d %B %Y, %H:%M")

        context = f"""
=== DONNÉES RÉELLES DE L'UTILISATEUR — SmartStress AI ===
Date et heure actuelle : {now}

--- MESURE LA PLUS RÉCENTE ---
{self.get_latest_reading()}

--- RÉSUMÉ HEBDOMADAIRE ---
{self.get_weekly_summary()}

--- STATISTIQUES DES 7 DERNIERS JOURS ---
{self.get_daily_stats(7)}

--- ANALYSE DES 20 DERNIÈRES MESURES ---
{self.get_recent_readings(20)}
=== FIN DES DONNÉES ===
""".strip()

        return context


# Instance partagée
context_builder = ContextBuilder()
