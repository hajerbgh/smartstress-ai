"""
SmartStress AI — Générateur de données simulées réalistes
=========================================================
Simule des signaux GSR (Galvanic Skin Response) et pouls cardiaques
pour 3 niveaux de stress : calme (0), modéré (1), élevé (2)

Basé sur la littérature scientifique :
- GSR repos    : 1–4 µS  | modéré : 4–8 µS  | élevé : 8–20 µS
- Pouls repos  : 55–70 bpm | modéré : 70–90 bpm | élevé : 90–120 bpm
"""

import numpy as np
import pandas as pd
import os

# Reproductibilité
np.random.seed(42)

# ─── Paramètres des signaux par niveau de stress ───────────────────────────
STRESS_PARAMS = {
    0: {  # Calme
        "label": "calme",
        "gsr_mean": 2.5,   "gsr_std": 0.5,   "gsr_noise": 0.1,
        "hr_mean":  62,    "hr_std":  4,      "hr_noise":  1.5,
        "gsr_drift": 0.002,   # Dérive lente (réaliste)
        "hr_variability": 0.8  # HRV élevée = calme
    },
    1: {  # Modéré
        "label": "modéré",
        "gsr_mean": 6.0,   "gsr_std": 1.2,   "gsr_noise": 0.3,
        "hr_mean":  80,    "hr_std":  6,      "hr_noise":  2.5,
        "gsr_drift": 0.005,
        "hr_variability": 0.4
    },
    2: {  # Élevé
        "label": "élevé",
        "gsr_mean": 13.0,  "gsr_std": 2.5,   "gsr_noise": 0.8,
        "hr_mean":  105,   "hr_std":  8,      "hr_noise":  4.0,
        "gsr_drift": 0.012,
        "hr_variability": 0.2
    }
}

# ─── Fonctions de génération ───────────────────────────────────────────────

def generate_gsr_signal(n_samples, params, fs=10):
    """
    Génère un signal GSR réaliste avec :
    - Composante basse fréquence (niveau de base)
    - Pics SCR (Skin Conductance Response) aléatoires
    - Bruit haute fréquence
    """
    t = np.arange(n_samples) / fs

    # Composante de base avec dérive lente
    baseline = params["gsr_mean"] + params["gsr_drift"] * t
    baseline += np.random.normal(0, params["gsr_std"] * 0.3, n_samples)

    # Oscillations lentes (onde de Traube-Hering ~0.1 Hz)
    slow_wave = 0.3 * np.sin(2 * np.pi * 0.05 * t)

    # Pics SCR (événements de stress ponctuels)
    scr_signal = np.zeros(n_samples)
    n_scr = int(n_samples * 0.02 * (1 + params["gsr_mean"] / 10))
    scr_positions = np.random.choice(n_samples - 20, n_scr, replace=False)
    for pos in scr_positions:
        amplitude = np.random.exponential(params["gsr_std"])
        # Forme asymétrique réaliste : montée rapide, descente lente
        peak = np.concatenate([
            amplitude * np.linspace(0, 1, 5),
            amplitude * np.exp(-np.linspace(0, 3, 15))
        ])
        end = min(pos + 20, n_samples)
        scr_signal[pos:end] += peak[:end - pos]

    # Bruit haute fréquence
    noise = np.random.normal(0, params["gsr_noise"], n_samples)

    gsr = baseline + slow_wave + scr_signal + noise
    return np.clip(gsr, 0.1, 30.0)  # Valeurs physiologiquement plausibles


def generate_hr_signal(n_samples, params, fs=10):
    """
    Génère un signal de fréquence cardiaque réaliste avec :
    - Variabilité de la fréquence cardiaque (HRV)
    - Arythmie sinusale respiratoire (~0.25 Hz)
    - Bruit de mesure
    """
    t = np.arange(n_samples) / fs

    # Fréquence de base
    baseline = params["hr_mean"] + np.random.normal(0, params["hr_std"] * 0.2, n_samples)

    # Arythmie sinusale respiratoire (RSA) — plus marquée au repos
    rsa_amplitude = params["hr_variability"] * 3
    rsa = rsa_amplitude * np.sin(2 * np.pi * 0.25 * t)

    # Oscillations Mayer (~0.1 Hz)
    mayer = params["hr_variability"] * 1.5 * np.sin(2 * np.pi * 0.1 * t)

    # Bruit
    noise = np.random.normal(0, params["hr_noise"], n_samples)

    hr = baseline + rsa + mayer + noise
    return np.clip(hr, 35, 200)


def extract_features(gsr_window, hr_window):
    """
    Extrait les features d'une fenêtre temporelle de 10 secondes.
    Ces features sont calculables sur ESP32 (pas de FFT complexe).

    Returns: dict de 14 features
    """
    features = {}

    # ── Features GSR ──
    features["gsr_mean"]    = np.mean(gsr_window)
    features["gsr_std"]     = np.std(gsr_window)
    features["gsr_max"]     = np.max(gsr_window)
    features["gsr_min"]     = np.min(gsr_window)
    features["gsr_range"]   = features["gsr_max"] - features["gsr_min"]
    # Pente (tendance montante = stress qui monte)
    features["gsr_slope"]   = np.polyfit(np.arange(len(gsr_window)), gsr_window, 1)[0]
    # Nombre de pics SCR dans la fenêtre
    diff = np.diff(gsr_window)
    peaks = np.sum((diff[:-1] > 0) & (diff[1:] < 0))
    features["gsr_n_peaks"] = peaks

    # ── Features HR ──
    features["hr_mean"]     = np.mean(hr_window)
    features["hr_std"]      = np.std(hr_window)
    features["hr_max"]      = np.max(hr_window)
    features["hr_min"]      = np.min(hr_window)
    features["hr_range"]    = features["hr_max"] - features["hr_min"]
    # HRV approchée (RMSSD simplifié)
    hr_diff = np.diff(hr_window)
    features["hr_rmssd"]    = np.sqrt(np.mean(hr_diff**2))
    # Ratio GSR/HR (feature combinée puissante)
    features["gsr_hr_ratio"] = features["gsr_mean"] / (features["hr_mean"] + 1e-6)

    return features


def generate_dataset(n_samples_per_class=1000, window_size=100, step=20, fs=10):
    """
    Génère le dataset complet.

    Paramètres :
        n_samples_per_class : nombre de fenêtres par classe
        window_size         : taille fenêtre = 10 secondes à 10 Hz
        step                : pas de glissement entre fenêtres
        fs                  : fréquence d'échantillonnage (Hz)
    """
    print("🔄 Génération des données simulées...")
    all_features = []
    all_labels   = []

    for stress_level, params in STRESS_PARAMS.items():
        print(f"  → Classe '{params['label']}' (label={stress_level})...")

        # Générer un signal long puis découper en fenêtres
        signal_length = n_samples_per_class * step + window_size
        gsr_signal = generate_gsr_signal(signal_length, params, fs)
        hr_signal  = generate_hr_signal(signal_length, params, fs)

        # Fenêtrage glissant
        count = 0
        i = 0
        while count < n_samples_per_class and i + window_size <= signal_length:
            gsr_win = gsr_signal[i:i + window_size]
            hr_win  = hr_signal[i:i + window_size]

            features = extract_features(gsr_win, hr_win)
            all_features.append(features)
            all_labels.append(stress_level)

            i += step
            count += 1

    df = pd.DataFrame(all_features)
    df["label"] = all_labels

    # Mélanger
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"\n✅ Dataset généré : {len(df)} échantillons")
    print(f"   Distribution des classes :")
    for label, name in [(0, "Calme"), (1, "Modéré"), (2, "Élevé")]:
        n = (df["label"] == label).sum()
        print(f"   - {name} : {n} échantillons ({n/len(df)*100:.1f}%)")

    return df


def generate_timeseries_dataset(duration_hours=24, fs=10):
    """
    Génère une journée complète de données brutes (pour le dashboard et le chatbot).
    Simule une vraie journée avec des patterns réalistes.
    """
    print("\n🔄 Génération de la série temporelle journalière...")

    n_total = duration_hours * 3600 * fs
    gsr_full = np.zeros(n_total)
    hr_full  = np.zeros(n_total)
    labels_full = np.zeros(n_total, dtype=int)

    # Scénario d'une journée type
    # Format : (heure_debut, heure_fin, niveau_stress)
    schedule = [
        (0,  7,  0),   # 00h-07h : sommeil → calme
        (7,  9,  1),   # 07h-09h : réveil, trajet → modéré
        (9,  11, 2),   # 09h-11h : réunion matinale → élevé
        (11, 12, 1),   # 11h-12h : travail normal → modéré
        (12, 13, 0),   # 12h-13h : déjeuner → calme
        (13, 15, 1),   # 13h-15h : travail → modéré
        (15, 17, 2),   # 15h-17h : deadline → élevé
        (17, 19, 1),   # 17h-19h : trajet retour → modéré
        (19, 21, 0),   # 19h-21h : dîner, détente → calme
        (21, 24, 0),   # 21h-24h : soirée → calme
    ]

    for (h_start, h_end, stress_level) in schedule:
        i_start = h_start * 3600 * fs
        i_end   = h_end   * 3600 * fs
        n_seg   = i_end - i_start
        params  = STRESS_PARAMS[stress_level]

        gsr_full[i_start:i_end] = generate_gsr_signal(n_seg, params, fs)
        hr_full[i_start:i_end]  = generate_hr_signal(n_seg, params, fs)
        labels_full[i_start:i_end] = stress_level

    # Créer un DataFrame avec timestamps
    import pandas as pd
    from datetime import datetime, timedelta

    start_time = datetime(2025, 3, 1, 0, 0, 0)
    timestamps = [start_time + timedelta(seconds=i/fs) for i in range(n_total)]

    # Sous-échantillonner à 1 point/seconde pour la DB (plus léger)
    step = fs
    df_ts = pd.DataFrame({
        "timestamp": timestamps[::step],
        "gsr":       gsr_full[::step],
        "heart_rate": hr_full[::step],
        "stress_label": labels_full[::step],
        "stress_name": [["calme", "modéré", "élevé"][l] for l in labels_full[::step]]
    })

    print(f"✅ Série temporelle : {len(df_ts)} points (1 Hz, {duration_hours}h)")
    return df_ts


# ─── Main ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)

    # 1. Dataset de features pour entraîner le modèle ML
    df_ml = generate_dataset(n_samples_per_class=1000)
    df_ml.to_csv("data/stress_features_dataset.csv", index=False)
    print("\n💾 Sauvegardé : data/stress_features_dataset.csv")

    # 2. Série temporelle brute pour le dashboard/chatbot
    df_ts = generate_timeseries_dataset(duration_hours=24)
    df_ts.to_csv("data/stress_timeseries_day.csv", index=False)
    print("💾 Sauvegardé : data/stress_timeseries_day.csv")

    print("\n🎉 Données prêtes ! Lance maintenant : python models/train_model.py")
