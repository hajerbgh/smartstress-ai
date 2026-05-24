"""
SmartStress AI - Chatbot Groq + RAG
"""

import os
import requests
from typing import List, Dict, Optional
from chatbot.context_builder import context_builder

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """Tu es SmartStress AI, un assistant intelligent specialise dans l'analyse du stress.
Tu as acces aux donnees physiologiques reelles (GSR et frequence cardiaque).
Reponds en francais, avec empathie. Cite des chiffres precis. Ne fais pas de diagnostic medical."""


class SmartStressBot:

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Cle API Groq manquante ! Ajoute GROQ_API_KEY=ta_cle dans .env")
        self.conversation_history = []
        self._message_count = 0
        self._cached_context = None
        print("OK SmartStress Chatbot initialise avec Groq LLaMA3")

    def _get_context(self, force_refresh=False):
        if force_refresh or self._cached_context is None or self._message_count % 5 == 0:
            self._cached_context = context_builder.build_full_context()
        return self._cached_context

    def _build_prompt(self, user_message, include_context=True):
      parts = [SYSTEM_PROMPT]
      if include_context:
        # Limiter le contexte à 1500 caractères max
        ctx = self._get_context()[:1500]
        parts.append(f"\n--- DONNEES ---\n{ctx}\n---")
      if self.conversation_history:
        # Garder seulement les 4 derniers échanges
        for msg in self.conversation_history[-4:]:
            role = "Utilisateur" if msg["role"] == "user" else "Assistant"
            parts.append(f"{role}: {msg['content'][:300]}")
      parts.append(f"\nUtilisateur: {user_message}\nAssistant:")
      return "\n".join(parts)

    def _call_groq(self, prompt):
        try:
            r = requests.post(
                GROQ_API_URL,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}],
                      "max_tokens": 1024, "temperature": 0.7},
                timeout=30
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except requests.exceptions.Timeout:
            return "Delai depasse. Verifie ta connexion."
        except requests.exceptions.HTTPError as e:
            if "401" in str(e): return "Cle API Groq invalide."
            return f"Erreur API : {str(e)}"
        except Exception as e:
            return f"Erreur : {str(e)}"

    def chat(self, user_message):
        self._message_count += 1
        keywords = ["stress","semaine","aujourd","hier","gsr","pouls","mesure","niveau",
                    "comment","pourquoi","pic","tendance","calme","eleve","modere","matin","soir","jour"]
        include_ctx = any(kw in user_message.lower() for kw in keywords)
        response = self._call_groq(self._build_prompt(user_message, include_ctx))
        self.conversation_history.append({"role": "user", "content": user_message})
        self.conversation_history.append({"role": "assistant", "content": response})
        return response

    def get_proactive_alert(self):
        ctx = self._get_context(force_refresh=True)
        prompt = f"{SYSTEM_PROMPT}\n\n{ctx}\n\nY a-t-il une alerte ? Si oui, 2 phrases max. Sinon : NO_ALERT"
        response = self._call_groq(prompt)
        return None if "NO_ALERT" in response else response

    def generate_weekly_report(self):
        ctx = self._get_context(force_refresh=True)
        prompt = f"{SYSTEM_PROMPT}\n\n{ctx}\n\nGenere un rapport hebdomadaire : resume, tendances, points d'attention, 3 recommandations, objectif semaine prochaine."
        return self._call_groq(prompt)

    def reset_conversation(self):
        self.conversation_history = []
        self._message_count = 0
        print("Conversation reinitialisee")
