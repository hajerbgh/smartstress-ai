"""
SmartStress AI — Serveur FastAPI v2.0
=======================================
Routes :
  POST /auth/register  → Créer un compte
  POST /auth/login     → Connexion (retourne JWT)
  GET  /auth/me        → Profil utilisateur connecté
  POST /predict        → Prédiction ML en temps réel
  GET  /readings       → Historique (filtré par user si connecté)
  GET  /readings/latest
  GET  /stats/daily
  GET  /stats/weekly
  GET  /sleep/estimate → Estimation sommeil via rythme cardiaque
  POST /simulate       → Injecter N mesures simulées
  GET  /health
"""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()  # charge .env si présent (ignoré si variables déjà injectées par Docker/AWS)

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
import random

from backend.database import init_db, get_db, StressReading, DailyStats, User
from backend.schemas import (
    SensorDataInput, StressReadingOut, PredictionResult,
    DailyStatsOut, WeeklySummary, HealthStatus,
    UserRegister, UserLogin, TokenResponse, UserOut,
    SleepEstimate, SimulateInput,
)
from backend.ml_service import ml_service
from backend.auth import (
    hash_password, verify_password,
    create_access_token, get_current_user, get_optional_user,
)

# ─── App ────────────────────────────────────────────────────────────────────

app = FastAPI(title="SmartStress AI Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    print("[START] SmartStress AI Backend v2.0 — http://localhost:8000/docs")


# ─── Général ────────────────────────────────────────────────────────────────

@app.get("/", tags=["Général"])
def root():
    return {"message": "SmartStress AI Backend v2.0", "status": "running", "docs": "/docs"}

@app.get("/health", response_model=HealthStatus, tags=["Général"])
def health(db: Session = Depends(get_db)):
    total = db.query(func.count(StressReading.id)).scalar()
    return HealthStatus(status="ok", model_loaded=ml_service.is_loaded, db_connected=True, total_readings=total or 0)


# ─── Authentification ───────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse, tags=["Auth"])
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Crée un nouveau compte. Retourne un token JWT."""
    if db.query(User).filter(User.email == data.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé.")

    user = User(
        email         = data.email.lower().strip(),
        name          = data.name.strip(),
        goal          = data.goal or "",
        password_hash = hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Connexion par email + mot de passe. Retourne un token JWT."""
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@app.get("/auth/me", response_model=UserOut, tags=["Auth"])
def me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


# ─── Prédiction ML ──────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResult, tags=["ML"])
def predict(
    data: SensorDataInput,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = ml_service.predict(data.gsr, data.heart_rate)

    reading = StressReading(
        timestamp    = datetime.utcnow(),
        gsr          = data.gsr,
        heart_rate   = data.heart_rate,
        stress_label = result["stress_label"],
        stress_name  = result["stress_name"],
        confidence   = result["confidence"],
        source       = data.source,
        user_id      = current_user.id if current_user else None,
    )
    db.add(reading)
    db.commit()

    return PredictionResult(
        stress_label  = result["stress_label"],
        stress_name   = result["stress_name"],
        confidence    = result["confidence"],
        probabilities = result["probabilities"],
        gsr           = data.gsr,
        heart_rate    = data.heart_rate,
        timestamp     = reading.timestamp,
    )


# ─── Historique ─────────────────────────────────────────────────────────────

@app.get("/readings", response_model=List[StressReadingOut], tags=["Données"])
def get_readings(
    limit:        int            = Query(default=100, le=1000),
    offset:       int            = Query(default=0),
    stress_level: Optional[int]  = Query(default=None),
    db:           Session        = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    query = db.query(StressReading)
    # Filtrer par user si connecté (sinon retourner toutes les données publiques)
    if current_user:
        query = query.filter(
            (StressReading.user_id == current_user.id) | (StressReading.user_id == None)
        )
    if stress_level is not None:
        query = query.filter(StressReading.stress_label == stress_level)
    return query.order_by(StressReading.timestamp.desc()).offset(offset).limit(limit).all()


@app.get("/readings/latest", response_model=StressReadingOut, tags=["Données"])
def get_latest(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    query = db.query(StressReading)
    if current_user:
        query = query.filter(
            (StressReading.user_id == current_user.id) | (StressReading.user_id == None)
        )
    reading = query.order_by(StressReading.timestamp.desc()).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Aucune mesure")
    return reading


# ─── Statistiques ───────────────────────────────────────────────────────────

@app.get("/stats/daily", response_model=List[DailyStatsOut], tags=["Statistiques"])
def get_daily_stats(
    days: int = Query(default=7),
    db:   Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(StressReading).filter(StressReading.timestamp >= since)
    if current_user:
        query = query.filter(
            (StressReading.user_id == current_user.id) | (StressReading.user_id == None)
        )
    readings = query.all()
    if not readings:
        return []

    from collections import defaultdict
    by_date = defaultdict(list)
    for r in readings:
        by_date[r.timestamp.strftime("%Y-%m-%d")].append(r)

    stats_list = []
    for date, day_readings in sorted(by_date.items()):
        labels = [r.stress_label for r in day_readings]
        gsrs   = [r.gsr for r in day_readings]
        hrs    = [r.heart_rate for r in day_readings]
        n      = len(day_readings)
        high   = [r for r in day_readings if r.stress_label == 2]
        peak   = max(high, key=lambda r: r.gsr).timestamp.hour if high else None

        stats_list.append(DailyStatsOut(
            date=date,
            avg_gsr=round(sum(gsrs) / n, 2),
            avg_hr=round(sum(hrs) / n, 2),
            avg_stress=round(sum(labels) / n, 3),
            pct_calm=round(labels.count(0) / n * 100, 1),
            pct_moderate=round(labels.count(1) / n * 100, 1),
            pct_high=round(labels.count(2) / n * 100, 1),
            n_readings=n,
            peak_stress_hour=peak,
        ))
    return stats_list


@app.get("/stats/weekly", response_model=WeeklySummary, tags=["Statistiques"])
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    since = datetime.utcnow() - timedelta(days=7)
    query = db.query(StressReading).filter(StressReading.timestamp >= since)
    if current_user:
        query = query.filter(
            (StressReading.user_id == current_user.id) | (StressReading.user_id == None)
        )
    readings = query.all()
    if not readings:
        raise HTTPException(status_code=404, detail="Pas assez de données")

    from collections import defaultdict
    by_date = defaultdict(list)
    for r in readings:
        by_date[r.timestamp.strftime("%Y-%m-%d")].append(r.stress_label)

    daily_avgs = {d: sum(v) / len(v) for d, v in by_date.items()}
    most_stressed = max(daily_avgs, key=daily_avgs.get)
    calmest       = min(daily_avgs, key=daily_avgs.get)

    sorted_dates = sorted(daily_avgs.keys())
    mid = len(sorted_dates) // 2
    if mid > 0:
        f = sum(daily_avgs[d] for d in sorted_dates[:mid]) / mid
        s = sum(daily_avgs[d] for d in sorted_dates[mid:]) / max(len(sorted_dates) - mid, 1)
        trend = "croissant" if s - f > 0.1 else ("décroissant" if f - s > 0.1 else "stable")
    else:
        trend = "stable"

    all_labels = [r.stress_label for r in readings]
    return WeeklySummary(
        period=f"{min(r.timestamp for r in readings):%Y-%m-%d} → {max(r.timestamp for r in readings):%Y-%m-%d}",
        avg_stress_score=round(sum(all_labels) / len(all_labels), 3),
        most_stressed_day=most_stressed,
        calmest_day=calmest,
        total_readings=len(readings),
        trend=trend,
        daily_stats=[{"date": d, "avg_stress": round(v, 3)} for d, v in sorted(daily_avgs.items())],
    )


# ─── Estimation du sommeil ──────────────────────────────────────────────────

@app.get("/sleep/estimate", response_model=SleepEstimate, tags=["Santé"])
def estimate_sleep(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Estime les heures de sommeil à partir du rythme cardiaque.
    Pendant le sommeil, le HR descend typiquement en dessous de 65 bpm.
    Détecte les fenêtres de HR bas (> 20 min) sur la nuit écoulée.
    """
    now = datetime.utcnow()
    # Fenêtre : 9h du soir hier → 9h du matin aujourd'hui
    today_9am    = now.replace(hour=9, minute=0, second=0, microsecond=0)
    yesterday_9pm = today_9am - timedelta(hours=12)

    query = db.query(StressReading).filter(
        StressReading.timestamp >= yesterday_9pm,
        StressReading.timestamp <= today_9am,
    )
    if current_user:
        query = query.filter(
            (StressReading.user_id == current_user.id) | (StressReading.user_id == None)
        )
    readings = query.order_by(StressReading.timestamp).all()

    if not readings:
        return SleepEstimate(
            sleep_hours=0.0, sleep_minutes=0,
            avg_hr_during_sleep=None,
            n_readings_analyzed=0, data_available=False,
        )

    # Détection des fenêtres de sommeil (HR < seuil soutenu)
    SLEEP_HR   = 65.0      # seuil HR sommeil (bpm)
    MIN_WINDOW = 20 * 60   # fenêtre min pour compter (20 min en secondes)

    sleep_seconds   = 0
    sleep_hr_values = []
    in_sleep        = False
    sleep_start     = None

    for r in readings:
        if r.heart_rate < SLEEP_HR:
            if not in_sleep:
                in_sleep    = True
                sleep_start = r.timestamp
            sleep_hr_values.append(r.heart_rate)
        else:
            if in_sleep:
                duration = (r.timestamp - sleep_start).total_seconds()
                if duration >= MIN_WINDOW:
                    sleep_seconds += duration
                in_sleep = False

    # Fenêtre ouverte jusqu'à la fin du dataset
    if in_sleep and sleep_start:
        duration = (readings[-1].timestamp - sleep_start).total_seconds()
        if duration >= MIN_WINDOW:
            sleep_seconds += duration

    avg_hr = round(sum(sleep_hr_values) / len(sleep_hr_values), 1) if sleep_hr_values else None

    return SleepEstimate(
        sleep_hours         = round(sleep_seconds / 3600, 1),
        sleep_minutes       = int(sleep_seconds // 60),
        avg_hr_during_sleep = avg_hr,
        n_readings_analyzed = len(readings),
        data_available      = True,
    )


# ─── Simulateur ─────────────────────────────────────────────────────────────

@app.post("/simulate", tags=["Simulateur"])
def simulate(data: SimulateInput = None, db: Session = Depends(get_db)):
    """Injecte N mesures simulées réalistes basées sur l'heure du jour."""
    n          = data.n_readings if data else 50
    hours_back = data.hours_back if data else 24.0

    stress_params = {
        0: {"gsr_mean": 2.5, "gsr_std": 0.5, "hr_mean": 62, "hr_std": 4},
        1: {"gsr_mean": 6.0, "gsr_std": 1.2, "hr_mean": 80, "hr_std": 6},
        2: {"gsr_mean": 13.0, "gsr_std": 2.5, "hr_mean": 105, "hr_std": 8},
    }
    now = datetime.utcnow()

    for _ in range(n):
        offset_h  = random.uniform(0, max(hours_back, 0.001))
        timestamp = now - timedelta(hours=offset_h)
        hour      = timestamp.hour

        if 0 <= hour < 7:
            label = 0
        elif hour in range(9, 12) or hour in range(15, 18):
            label = random.choices([1, 2], weights=[0.4, 0.6])[0]
        else:
            label = random.choices([0, 1], weights=[0.5, 0.5])[0]

        p   = stress_params[label]
        gsr = max(0.5, random.gauss(p["gsr_mean"], p["gsr_std"]))
        hr  = max(40.0, random.gauss(p["hr_mean"],  p["hr_std"]))

        result = ml_service.predict(gsr, hr)
        db.add(StressReading(
            timestamp    = timestamp,
            gsr          = round(gsr, 3),
            heart_rate   = round(hr, 1),
            stress_label = result["stress_label"],
            stress_name  = result["stress_name"],
            confidence   = result["confidence"],
            source       = "simulator",
        ))

    db.commit()
    return {"message": f"[OK] {n} mesures simulées injectées", "hours_back": hours_back}
