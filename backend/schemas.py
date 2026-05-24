"""
SmartStress AI — Schémas Pydantic
===================================
Structure des données échangées via l'API.
"""

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List


# ─── Auth ──────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email:    str
    password: str = Field(..., min_length=6)
    name:     str
    goal:     Optional[str] = ""

class UserLogin(BaseModel):
    email:    str
    password: str

class UserOut(BaseModel):
    id:         int
    email:      str
    name:       str
    goal:       Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


# ─── Capteurs / ML ─────────────────────────────────────────────────────────

class SensorDataInput(BaseModel):
    gsr:        float = Field(..., ge=0.0, le=30.0)
    heart_rate: float = Field(..., ge=30.0, le=220.0)
    source:     str   = Field(default="simulator")

    class Config:
        json_schema_extra = {"example": {"gsr": 7.5, "heart_rate": 85.0, "source": "mobile"}}


class StressReadingOut(BaseModel):
    id:           int
    timestamp:    datetime
    gsr:          float
    heart_rate:   float
    stress_label: int
    stress_name:  str
    confidence:   Optional[float]
    source:       str

    class Config:
        from_attributes = True


class PredictionResult(BaseModel):
    stress_label:  int
    stress_name:   str
    confidence:    float
    probabilities: dict
    gsr:           float
    heart_rate:    float
    timestamp:     datetime


# ─── Stats ─────────────────────────────────────────────────────────────────

class DailyStatsOut(BaseModel):
    date:             str
    avg_gsr:          float
    avg_hr:           float
    avg_stress:       float
    pct_calm:         float
    pct_moderate:     float
    pct_high:         float
    n_readings:       int
    peak_stress_hour: Optional[int]

    class Config:
        from_attributes = True


class WeeklySummary(BaseModel):
    period:           str
    avg_stress_score: float
    most_stressed_day: str
    calmest_day:      str
    total_readings:   int
    trend:            str
    daily_stats:      list


class SleepEstimate(BaseModel):
    sleep_hours:          float
    sleep_minutes:        int
    avg_hr_during_sleep:  Optional[float]
    n_readings_analyzed:  int
    data_available:       bool
    method:               str = "heart_rate_threshold"


class SimulateInput(BaseModel):
    n_readings: int   = Field(default=50, le=500)
    hours_back: float = Field(default=24.0)


class HealthStatus(BaseModel):
    status:        str
    model_loaded:  bool
    db_connected:  bool
    total_readings: int
    version:       str = "2.0.0"
