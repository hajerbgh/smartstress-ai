"""
SmartStress AI — Service ML
=============================
Charge le modèle entraîné et expose une fonction de prédiction.
C'est ce module qui fait le lien entre les données capteurs et l'IA.
"""

import pickle
import json
import numpy as np
from datetime import datetime
from pathlib import Path

# ─── Chemins des fichiers du modèle ────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent  # = smartstress_ai/
MODEL_PATH  = BASE_DIR / "models" / "stress_model.pkl"
SCALER_PATH = BASE_DIR / "models" / "scaler.pkl"
FEATURES_PATH = BASE_DIR / "models" / "feature_names.json"

LABELS = {0: "calme", 1: "modéré", 2: "élevé"}
LABEL_COLORS = {0: "#4CAF50", 1: "#FF9800", 2: "#F44336"}


class MLService:
    """
    Service de prédiction ML.
    Chargé une seule fois au démarrage du serveur FastAPI.
    """

    def __init__(self):
        self.model        = None
        self.scaler       = None
        self.feature_names = None
        self.is_loaded    = False
        self._load()

    def _load(self):
        """Charge le modèle et le scaler depuis le disque."""
        try:
            with open(MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)

            with open(SCALER_PATH, "rb") as f:
                self.scaler = pickle.load(f)

            with open(FEATURES_PATH, "r") as f:
                self.feature_names = json.load(f)

            self.is_loaded = True
            print(f"[OK] Modele ML charge : {MODEL_PATH.name}")
            print(f"   Features : {self.feature_names}")

        except FileNotFoundError as e:
            print(f"[WARN] Modele introuvable : {e}")
            print("   Lance d'abord : python models/train_model.py")

    def extract_features(self, gsr_value: float, hr_value: float) -> dict:
        """
        Simule une fenêtre de 10 secondes à partir d'une seule valeur.
        En production réelle, on accumulera 100 échantillons avant de prédire.

        Pour l'instant on génère une petite fenêtre autour de la valeur reçue.
        """
        np.random.seed(None)  # Aléatoire à chaque appel

        # Simuler une petite fenêtre autour de la valeur reçue
        gsr_window = np.random.normal(gsr_value, gsr_value * 0.05, 100)
        gsr_window = np.clip(gsr_window, 0.1, 30.0)

        hr_window  = np.random.normal(hr_value, hr_value * 0.02, 100)
        hr_window  = np.clip(hr_window, 30.0, 220.0)

        features = {}

        # Features GSR
        features["gsr_mean"]    = np.mean(gsr_window)
        features["gsr_std"]     = np.std(gsr_window)
        features["gsr_max"]     = np.max(gsr_window)
        features["gsr_min"]     = np.min(gsr_window)
        features["gsr_range"]   = features["gsr_max"] - features["gsr_min"]
        features["gsr_slope"]   = np.polyfit(np.arange(len(gsr_window)), gsr_window, 1)[0]
        diff = np.diff(gsr_window)
        features["gsr_n_peaks"] = float(np.sum((diff[:-1] > 0) & (diff[1:] < 0)))

        # Features HR
        features["hr_mean"]     = np.mean(hr_window)
        features["hr_std"]      = np.std(hr_window)
        features["hr_max"]      = np.max(hr_window)
        features["hr_min"]      = np.min(hr_window)
        features["hr_range"]    = features["hr_max"] - features["hr_min"]
        hr_diff = np.diff(hr_window)
        features["hr_rmssd"]    = np.sqrt(np.mean(hr_diff**2))
        features["gsr_hr_ratio"] = features["gsr_mean"] / (features["hr_mean"] + 1e-6)

        return features

    def predict(self, gsr: float, heart_rate: float) -> dict:
        """
        Prédit le niveau de stress à partir des valeurs GSR et HR.

        Returns:
            dict avec stress_label, stress_name, confidence, probabilities
        """
        if not self.is_loaded:
            # Fallback si le modèle n'est pas chargé
            label = 0 if gsr < 4 else (1 if gsr < 8 else 2)
            return {
                "stress_label":  label,
                "stress_name":   LABELS[label],
                "confidence":    0.5,
                "probabilities": {v: (0.8 if k == label else 0.1) for k, v in LABELS.items()}
            }

        # Extraire les features
        features = self.extract_features(gsr, heart_rate)

        # Mettre dans le bon ordre
        X = np.array([[features[f] for f in self.feature_names]])

        # Normaliser
        X_scaled = self.scaler.transform(X)

        # Prédire
        label = int(self.model.predict(X_scaled)[0])
        probas = self.model.predict_proba(X_scaled)[0]

        return {
            "stress_label":  label,
            "stress_name":   LABELS[label],
            "confidence":    float(probas[label]),
            "probabilities": {LABELS[i]: float(p) for i, p in enumerate(probas)}
        }

    def get_stress_insight(self, stress_label: int, gsr: float, hr: float) -> str:
        """Génère un message court d'insight pour l'affichage."""
        insights = {
            0: f"Tu es calme 😌 — GSR faible ({gsr:.1f} µS), cœur régulier ({hr:.0f} bpm)",
            1: f"Stress modéré 😐 — GSR élevée ({gsr:.1f} µS), pouls accéléré ({hr:.0f} bpm)",
            2: f"Stress élevé 😰 — GSR très haute ({gsr:.1f} µS), pouls rapide ({hr:.0f} bpm)"
        }
        return insights.get(stress_label, "Données en cours d'analyse...")


# Instance unique partagée dans toute l'app (singleton)
ml_service = MLService()
