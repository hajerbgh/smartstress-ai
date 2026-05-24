"""
SmartStress AI — Interface CLI du chatbot
==========================================
Permet de tester le chatbot directement dans le terminal
avant d'avoir le dashboard React.

Usage :
    python chatbot/cli_chat.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

# Ajouter le dossier racine au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from chatbot.chatbot import SmartStressBot

# ─── Couleurs terminal ──────────────────────────────────────────────────────
class Colors:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    CYAN   = "\033[96m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    GRAY   = "\033[90m"
    PURPLE = "\033[95m"

def print_banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔══════════════════════════════════════════════╗
║         🧠 SmartStress AI Chatbot            ║
║      Powered by Gemini + RAG                 ║
╚══════════════════════════════════════════════╝
{Colors.RESET}""")

def print_help():
    print(f"""
{Colors.YELLOW}Commandes disponibles :{Colors.RESET}
  {Colors.GREEN}/rapport{Colors.RESET}   → Générer le rapport hebdomadaire complet
  {Colors.GREEN}/alerte{Colors.RESET}    → Vérifier s'il y a une alerte proactive
  {Colors.GREEN}/reset{Colors.RESET}     → Réinitialiser la conversation
  {Colors.GREEN}/context{Colors.RESET}   → Afficher le contexte RAG actuel
  {Colors.GREEN}/aide{Colors.RESET}      → Afficher cette aide
  {Colors.GREEN}/quitter{Colors.RESET}   → Quitter le chatbot

{Colors.YELLOW}Exemples de questions :{Colors.RESET}
  → "Comment s'est passée ma semaine ?"
  → "Pourquoi je suis stressée le matin ?"
  → "Quel est mon niveau de stress actuel ?"
  → "Donne-moi des conseils pour me détendre"
  → "Compare cette semaine avec la précédente"
""")

def main():
    print_banner()

    # Vérifier la clé API
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print(f"{Colors.RED}❌ Clé API manquante !{Colors.RESET}")
        print(f"Crée un fichier {Colors.BOLD}.env{Colors.RESET} dans smartstress_ai/ avec :")
        print(f"  {Colors.GREEN}GROQ_API_KEY=ta_clé_ici{Colors.RESET}")
        sys.exit(1)

    # Initialiser le chatbot
    try:
        bot = SmartStressBot(api_key=api_key)
    except Exception as e:
        print(f"{Colors.RED}❌ Erreur : {e}{Colors.RESET}")
        sys.exit(1)

    print(f"{Colors.GRAY}💡 Tape /aide pour voir les commandes disponibles{Colors.RESET}")
    print(f"{Colors.GRAY}⚠️  Assure-toi que le backend tourne (uvicorn backend.main:app --reload){Colors.RESET}\n")

    # Message de bienvenue
    print(f"{Colors.PURPLE}🤖 SmartStress AI :{Colors.RESET}")
    welcome = bot.chat("Bonjour ! Présente-toi brièvement et dis-moi comment tu peux m'aider.")
    print(f"  {welcome}\n")

    # Boucle principale
    while True:
        try:
            user_input = input(f"{Colors.CYAN}{Colors.BOLD}👤 Toi : {Colors.RESET}").strip()

            if not user_input:
                continue

            # Commandes spéciales
            if user_input.lower() in ["/quitter", "/quit", "/exit", "exit", "quit"]:
                print(f"\n{Colors.GREEN}Au revoir ! Prends soin de toi 😊{Colors.RESET}")
                break

            elif user_input.lower() == "/aide":
                print_help()
                continue

            elif user_input.lower() == "/rapport":
                print(f"\n{Colors.YELLOW}📊 Génération du rapport hebdomadaire...{Colors.RESET}")
                report = bot.generate_weekly_report()
                print(f"\n{Colors.PURPLE}🤖 Rapport :{Colors.RESET}\n{report}\n")
                continue

            elif user_input.lower() == "/alerte":
                print(f"\n{Colors.YELLOW}🔍 Analyse des alertes...{Colors.RESET}")
                alert = bot.get_proactive_alert()
                if alert:
                    print(f"\n{Colors.RED}⚠️  ALERTE : {alert}{Colors.RESET}\n")
                else:
                    print(f"\n{Colors.GREEN}✅ Aucune alerte — tout semble normal.{Colors.RESET}\n")
                continue

            elif user_input.lower() == "/reset":
                bot.reset_conversation()
                print(f"{Colors.GREEN}✅ Conversation réinitialisée.{Colors.RESET}\n")
                continue

            elif user_input.lower() == "/context":
                from chatbot.context_builder import context_builder
                ctx = context_builder.build_full_context()
                print(f"\n{Colors.GRAY}{ctx}{Colors.RESET}\n")
                continue

            # Message normal → chatbot
            print(f"\n{Colors.GRAY}⏳ Analyse en cours...{Colors.RESET}")
            response = bot.chat(user_input)
            print(f"\n{Colors.PURPLE}🤖 SmartStress AI :{Colors.RESET}")
            print(f"  {response}\n")

        except KeyboardInterrupt:
            print(f"\n\n{Colors.GREEN}Au revoir ! Prends soin de toi 😊{Colors.RESET}")
            break

if __name__ == "__main__":
    main()
