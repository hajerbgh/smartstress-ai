#!/usr/bin/env python3
"""
Simulateur continu SmartStress AI
Envoie une mesure de stress au backend toutes les N secondes.
Patterns réalistes basés sur l'heure du jour.

Usage:
    python backend/simulator.py
    python backend/simulator.py --url http://192.168.1.x:8000 --interval 3
"""
import time
import argparse
import requests
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description="SmartStress AI Simulator")
    parser.add_argument("--url",      default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--interval", default=4, type=int,             help="Seconds between readings")
    args = parser.parse_args()

    print("=" * 55)
    print("  SmartStress AI — Simulateur Continu")
    print(f"  Backend  : {args.url}")
    print(f"  Intervalle: {args.interval}s  |  Ctrl+C pour stopper")
    print("=" * 55)
    print()

    LABELS = {"calme": "😌 Calme", "modéré": "😐 Modéré", "élevé": "😰 Élevé"}
    count = 0

    while True:
        try:
            resp = requests.post(
                f"{args.url}/simulate",
                json={"n_readings": 1, "hours_back": 0.001},
                timeout=5,
            )
            if resp.status_code == 200:
                lr = requests.get(f"{args.url}/readings/latest", timeout=3).json()
                count += 1
                name  = LABELS.get(lr.get("stress_name", ""), lr.get("stress_name", "?"))
                ts    = datetime.now().strftime("%H:%M:%S")
                conf  = lr.get("confidence", 0) * 100
                print(
                    f"[{ts}] #{count:04d}  "
                    f"GSR={lr['gsr']:6.2f} µS  "
                    f"HR={lr['heart_rate']:5.1f} bpm  "
                    f"{name:<18}  conf={conf:.0f}%"
                )
            else:
                print(f"[{datetime.now():%H:%M:%S}] HTTP {resp.status_code}: {resp.text[:80]}")

        except requests.ConnectionError:
            print(f"[{datetime.now():%H:%M:%S}] ❌ Backend non accessible → {args.url}")
        except KeyboardInterrupt:
            print(f"\n[{datetime.now():%H:%M:%S}] Simulateur arrêté ({count} mesures envoyées)")
            break
        except Exception as e:
            print(f"[{datetime.now():%H:%M:%S}] Erreur: {e}")

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
