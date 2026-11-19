"""
SmartStress AI — Base de données MySQL
=======================================
Connexion via variables d'environnement.
Pour le dev local : fichier .env à la racine du projet.
Pour AWS : RDS MySQL + Secrets Manager (injectés comme variables d'env).
"""

import os
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "smartstress")
DB_USER = os.getenv("DB_USER", "smartstress_user")
DB_PASS = os.getenv("DB_PASS", "smartstress_pass")
DB_SSL  = os.getenv("DB_SSL", "false").lower() == "true"

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

_connect_args = {"ssl": {"ssl": True}} if DB_SSL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── Tables ────────────────────────────────────────────────────────────────

class User(Base):
    """Compte utilisateur avec email + mot de passe hashé."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    name          = Column(String(255), nullable=False)
    goal          = Column(String(500), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    readings = relationship("StressReading", back_populates="user", lazy="select")


class StressReading(Base):
    """Une mesure de stress à un instant T."""
    __tablename__ = "stress_readings"

    id            = Column(Integer, primary_key=True, index=True)
    timestamp     = Column(DateTime, default=datetime.utcnow, index=True)
    gsr           = Column(Float, nullable=False)
    heart_rate    = Column(Float, nullable=False)
    stress_label  = Column(Integer, nullable=False)
    stress_name   = Column(String(50), nullable=False)
    confidence    = Column(Float, nullable=True)
    source        = Column(String(50), default="simulator")
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    user = relationship("User", back_populates="readings")


class DailyActivity(Base):
    """Activité physique quotidienne (pas depuis l'app mobile)."""
    __tablename__ = "daily_activity"

    id    = Column(Integer, primary_key=True, index=True)
    date  = Column(String(20), unique=True, index=True)
    steps = Column(Integer, default=0)


class DailyStats(Base):
    """Statistiques agrégées par jour."""
    __tablename__ = "daily_stats"

    id               = Column(Integer, primary_key=True, index=True)
    date             = Column(String(20), unique=True, index=True)
    avg_gsr          = Column(Float)
    avg_hr           = Column(Float)
    avg_stress       = Column(Float)
    pct_calm         = Column(Float)
    pct_moderate     = Column(Float)
    pct_high         = Column(Float)
    n_readings       = Column(Integer)
    peak_stress_hour = Column(Integer)


# ─── Initialisation ────────────────────────────────────────────────────────

def init_db():
    """Crée toutes les tables si elles n'existent pas (idempotent)."""
    Base.metadata.create_all(bind=engine)
    print(f"[OK] Base de données MySQL initialisée : {DB_NAME}@{DB_HOST}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
