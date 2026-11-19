"""
SmartStress AI — Pipeline d'entraînement ML
============================================
Entraîne un modèle de classification du stress sur les features extraites.

Pipeline :
1. Chargement & exploration des données
2. Preprocessing (normalisation, split)
3. Entraînement Random Forest (optimisé pour ESP32 via TFLite)
4. Évaluation complète (accuracy, matrice de confusion, feature importance)
5. Export du modèle + scaler (prêts pour TFLite et le backend)

Usage : python models/train_model.py
"""

import numpy as np
import pandas as pd
import os
import json
import pickle
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# ─── Configuration ─────────────────────────────────────────────────────────
DATA_PATH   = "data/stress_features_dataset.csv"
MODEL_DIR   = "models"
REPORT_DIR  = "models/reports"
LABELS      = {0: "Calme", 1: "Modéré", 2: "Élevé"}
COLORS      = {0: "#4CAF50", 1: "#FF9800", 2: "#F44336"}

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# ─── 1. Chargement des données ─────────────────────────────────────────────

def load_and_explore(path):
    print("=" * 60)
    print("📊 CHARGEMENT & EXPLORATION DES DONNÉES")
    print("=" * 60)

    df = pd.read_csv(path)
    print(f"\n✅ Dataset chargé : {df.shape[0]} lignes × {df.shape[1]} colonnes")

    print("\n📈 Distribution des classes :")
    for label, name in LABELS.items():
        n = (df["label"] == label).sum()
        bar = "█" * (n // 50)
        print(f"  {name:8s} (label={label}) : {n:4d} | {bar}")

    print("\n📐 Statistiques des features :")
    feature_cols = [c for c in df.columns if c != "label"]
    print(df[feature_cols].describe().round(3).to_string())

    return df

# ─── 2. Preprocessing ──────────────────────────────────────────────────────

def preprocess(df):
    print("\n" + "=" * 60)
    print("⚙️  PREPROCESSING")
    print("=" * 60)

    feature_cols = [c for c in df.columns if c != "label"]
    X = df[feature_cols].values
    y = df["label"].values

    # Split stratifié (garde les proportions des classes)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Normalisation (important pour SVM et réseau de neurones)
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)

    print(f"\n✅ Split : {len(X_train)} train | {len(X_test)} test")
    print(f"   Features utilisées : {feature_cols}")

    # Sauvegarder le scaler (indispensable pour le backend)
    scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"\n💾 Scaler sauvegardé : {scaler_path}")

    # Sauvegarder les noms des features (pour l'ESP32 et le backend)
    with open(os.path.join(MODEL_DIR, "feature_names.json"), "w") as f:
        json.dump(feature_cols, f, indent=2)

    return X_train_sc, X_test_sc, y_train, y_test, scaler, feature_cols

# ─── 3. Entraînement & comparaison de modèles ─────────────────────────────

def train_and_compare(X_train, X_test, y_train, y_test):
    print("\n" + "=" * 60)
    print("🏋️  ENTRAÎNEMENT & COMPARAISON DES MODÈLES")
    print("=" * 60)

    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=8,          # Limité → léger pour ESP32
            min_samples_leaf=5,
            random_state=42,
            n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42
        ),
        "SVM (RBF)": SVC(
            kernel="rbf",
            C=10,
            gamma="scale",
            probability=True,
            random_state=42
        )
    }

    results = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, model in models.items():
        print(f"\n  🔄 {name}...")
        model.fit(X_train, y_train)

        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_macro")
        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        f1  = f1_score(y_test, y_pred, average="macro")

        results[name] = {
            "model":    model,
            "accuracy": acc,
            "f1_macro": f1,
            "cv_mean":  cv_scores.mean(),
            "cv_std":   cv_scores.std(),
            "y_pred":   y_pred
        }

        print(f"     Accuracy   : {acc:.4f}")
        print(f"     F1-macro   : {f1:.4f}")
        print(f"     CV (5fold) : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    return results

# ─── 4. Sélection du meilleur modèle ──────────────────────────────────────

def select_best(results, y_test, feature_cols):
    print("\n" + "=" * 60)
    print("🏆 SÉLECTION DU MEILLEUR MODÈLE")
    print("=" * 60)

    best_name = max(results, key=lambda k: results[k]["f1_macro"])
    best = results[best_name]

    print(f"\n  🥇 Meilleur modèle : {best_name}")
    print(f"     F1-macro  : {best['f1_macro']:.4f}")
    print(f"     Accuracy  : {best['accuracy']:.4f}")

    print(f"\n📋 Rapport de classification complet :")
    print(classification_report(
        y_test, best["y_pred"],
        target_names=[LABELS[i] for i in sorted(LABELS)]
    ))

    return best_name, best["model"]

# ─── 5. Visualisations ─────────────────────────────────────────────────────

def plot_confusion_matrix(y_test, y_pred, model_name):
    cm = confusion_matrix(y_test, y_pred)
    cm_pct = cm.astype(float) / cm.sum(axis=1)[:, np.newaxis] * 100

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(f"SmartStress AI — {model_name}", fontsize=14, fontweight="bold")

    # Matrice de confusion absolue
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=list(LABELS.values()),
                yticklabels=list(LABELS.values()),
                ax=axes[0], linewidths=0.5)
    axes[0].set_title("Matrice de confusion (comptes)")
    axes[0].set_ylabel("Vrai label")
    axes[0].set_xlabel("Label prédit")

    # Matrice de confusion en pourcentage
    sns.heatmap(cm_pct, annot=True, fmt=".1f", cmap="Greens",
                xticklabels=list(LABELS.values()),
                yticklabels=list(LABELS.values()),
                ax=axes[1], linewidths=0.5)
    axes[1].set_title("Matrice de confusion (%)")
    axes[1].set_ylabel("Vrai label")
    axes[1].set_xlabel("Label prédit")

    plt.tight_layout()
    path = os.path.join(REPORT_DIR, "confusion_matrix.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"\n💾 Matrice de confusion : {path}")


def plot_feature_importance(model, feature_cols):
    if not hasattr(model, "feature_importances_"):
        return

    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]

    fig, ax = plt.subplots(figsize=(10, 6))
    colors_feat = ["#F44336" if "gsr" in feature_cols[i] else "#2196F3"
                   for i in indices]

    bars = ax.barh(
        [feature_cols[i] for i in indices],
        [importances[i] for i in indices],
        color=colors_feat, edgecolor="white", height=0.7
    )

    # Ajouter les valeurs
    for bar, val in zip(bars, [importances[i] for i in indices]):
        ax.text(bar.get_width() + 0.002, bar.get_y() + bar.get_height()/2,
                f"{val:.3f}", va="center", fontsize=9)

    ax.set_xlabel("Importance (Gini)", fontsize=11)
    ax.set_title("Importance des features — SmartStress AI", fontsize=13, fontweight="bold")

    patch_gsr = mpatches.Patch(color="#F44336", label="Features GSR")
    patch_hr  = mpatches.Patch(color="#2196F3", label="Features HR")
    ax.legend(handles=[patch_gsr, patch_hr], loc="lower right")
    ax.invert_yaxis()

    plt.tight_layout()
    path = os.path.join(REPORT_DIR, "feature_importance.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"💾 Feature importance : {path}")


def plot_model_comparison(results):
    names  = list(results.keys())
    accs   = [results[n]["accuracy"]  for n in names]
    f1s    = [results[n]["f1_macro"]  for n in names]
    cv_m   = [results[n]["cv_mean"]   for n in names]
    cv_s   = [results[n]["cv_std"]    for n in names]

    x = np.arange(len(names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 5))
    b1 = ax.bar(x - width, accs, width, label="Accuracy (test)",  color="#2196F3", alpha=0.85)
    b2 = ax.bar(x,          f1s, width, label="F1-macro (test)",  color="#4CAF50", alpha=0.85)
    b3 = ax.bar(x + width, cv_m, width, label="F1-macro (CV)",    color="#FF9800", alpha=0.85,
                yerr=cv_s, capsize=4)

    ax.set_xticks(x)
    ax.set_xticklabels(names, fontsize=11)
    ax.set_ylim(0.7, 1.02)
    ax.set_ylabel("Score", fontsize=11)
    ax.set_title("Comparaison des modèles — SmartStress AI", fontsize=13, fontweight="bold")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    for bars in [b1, b2, b3]:
        for bar in bars:
            ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.005,
                    f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=8)

    plt.tight_layout()
    path = os.path.join(REPORT_DIR, "model_comparison.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"💾 Comparaison modèles : {path}")


def plot_timeseries_preview():
    """Visualise la série temporelle journalière générée."""
    ts_path = "data/stress_timeseries_day.csv"
    if not os.path.exists(ts_path):
        return

    df = pd.read_csv(ts_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    fig, axes = plt.subplots(3, 1, figsize=(14, 9), sharex=True)
    fig.suptitle("SmartStress AI — Journée simulée (24h)", fontsize=14, fontweight="bold")

    # Couleurs par niveau de stress
    stress_colors = df["stress_label"].map(COLORS)

    # GSR
    axes[0].scatter(df["timestamp"], df["gsr"], c=stress_colors, s=1, alpha=0.6)
    axes[0].set_ylabel("GSR (µS)", fontsize=10)
    axes[0].set_title("Signal GSR (Galvanic Skin Response)")
    axes[0].grid(alpha=0.3)

    # Fréquence cardiaque
    axes[1].scatter(df["timestamp"], df["heart_rate"], c=stress_colors, s=1, alpha=0.6)
    axes[1].set_ylabel("BPM", fontsize=10)
    axes[1].set_title("Fréquence cardiaque")
    axes[1].grid(alpha=0.3)

    # Niveau de stress
    axes[2].fill_between(df["timestamp"], df["stress_label"],
                         step="post", alpha=0.5,
                         color="#2196F3")
    axes[2].set_yticks([0, 1, 2])
    axes[2].set_yticklabels(["Calme", "Modéré", "Élevé"])
    axes[2].set_ylabel("Stress", fontsize=10)
    axes[2].set_title("Niveau de stress réel")
    axes[2].grid(alpha=0.3)

    # Légende
    patches = [mpatches.Patch(color=COLORS[i], label=LABELS[i]) for i in LABELS]
    fig.legend(handles=patches, loc="lower center", ncol=3,
               bbox_to_anchor=(0.5, -0.02), fontsize=10)

    plt.tight_layout()
    path = os.path.join(REPORT_DIR, "timeseries_preview.png")
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"💾 Aperçu série temporelle : {path}")


# ─── 6. Export du modèle ───────────────────────────────────────────────────

def export_model(model, model_name, feature_cols):
    print("\n" + "=" * 60)
    print("📦 EXPORT DU MODÈLE")
    print("=" * 60)

    # Sauvegarder le modèle sklearn
    model_path = os.path.join(MODEL_DIR, "stress_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"\n✅ Modèle sklearn sauvegardé : {model_path}")

    # Métadonnées du modèle
    meta = {
        "model_type":   model_name,
        "n_features":   len(feature_cols),
        "feature_names": feature_cols,
        "classes":      {str(k): v for k, v in LABELS.items()},
        "version":      "1.0.0",
        "notes": (
            "Ce modèle est optimisé pour déploiement embarqué. "
            "Pour l'ESP32, convertir en TFLite via un réseau de neurones équivalent. "
            "Le scaler.pkl doit être appliqué avant toute inférence."
        )
    }
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    print(f"✅ Métadonnées : {MODEL_DIR}/model_metadata.json")
    print(f"\n🔧 Prochaines étapes pour TFLite :")
    print(f"   1. Entraîner un réseau de neurones équivalent (MLP) avec TensorFlow")
    print(f"   2. Convertir avec tf.lite.TFLiteConverter")
    print(f"   3. Quantiser en INT8 pour l'ESP32 (réduction ×4 de la taille)")
    print(f"   4. Déployer via Arduino IDE avec TensorFlowLite_ESP32")

    return model_path


# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    print("\n🧠 SmartStress AI — Pipeline d'entraînement ML")
    print("━" * 60)

    # Générer les données si elles n'existent pas
    if not os.path.exists(DATA_PATH):
        print("⚠️  Données introuvables, génération automatique...")
        import sys
        sys.path.insert(0, "data")
        from generate_data import generate_dataset, generate_timeseries_dataset
        df_ml = generate_dataset()
        df_ml.to_csv(DATA_PATH, index=False)
        df_ts = generate_timeseries_dataset()
        df_ts.to_csv("data/stress_timeseries_day.csv", index=False)

    # Pipeline
    df = load_and_explore(DATA_PATH)
    X_train, X_test, y_train, y_test, scaler, feature_cols = preprocess(df)
    results = train_and_compare(X_train, X_test, y_train, y_test)
    best_name, best_model = select_best(results, y_test, feature_cols)

    # Visualisations
    print("\n" + "=" * 60)
    print("📊 GÉNÉRATION DES VISUALISATIONS")
    print("=" * 60)
    plot_confusion_matrix(y_test, results[best_name]["y_pred"], best_name)
    plot_feature_importance(best_model, feature_cols)
    plot_model_comparison(results)
    plot_timeseries_preview()

    # Export
    export_model(best_model, best_name, feature_cols)

    print("\n" + "━" * 60)
    print("🎉 Pipeline terminé avec succès !")
    print(f"   Modèle : {MODEL_DIR}/stress_model.pkl")
    print(f"   Scaler : {MODEL_DIR}/scaler.pkl")
    print(f"   Graphs : {REPORT_DIR}/")
    print("━" * 60)


if __name__ == "__main__":
    main()
