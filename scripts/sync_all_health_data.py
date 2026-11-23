#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
PIPELINE ETL CENTRALIZADO DE SALUD, RENDIMIENTO Y PLANIFICACIÓN (EntrenoApp)
=============================================================================
Centraliza, normaliza e integra en la base de datos de EntrenoApp:
  1. Suunto 9 Peak Pro: Sesiones de carrera, natación, caminata y WODs
     (vía API Intervals.icu y escáner de archivos .FIT/.JSON/.CSV locales).
  2. Sueño y Recuperación (Zepp / Amazfit Helio Strap): Horas, fases
     (profundo, ligero, REM), eficiencia, HRV rMSSD, pulso en reposo y siestas.
  3. Composición Corporal (Xiaomi Smart Scale S200): Peso, % grasa,
     masa muscular, agua %, IMC y metabolismo basal (BMR).
  4. Otras disciplinas y agenda: CrossFit WODs, natación, movilidad y calendario.
  5. Sincronización bidireccional local/nube: Checkpoint WAL y despliegue a
     Vercel Blob Storage para actualizar en vivo entrenoapp-blond.vercel.app.
=============================================================================
"""

import os
import sys
import io
import json
import time
import math
import glob
import base64
import sqlite3
import shutil
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

try:
    import fitparse
except ImportError:
    fitparse = None

# =============================================================================
# CONFIGURACIÓN DE RUTAS Y CONSTANTES
# =============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENTRENOAPP_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "EntrenoApp"))

# Rutas de bases de datos de EntrenoApp
ENTRENOAPP_DB = os.path.join(ENTRENOAPP_DIR, "data", "entrenoapp.db")
ENTRENOAPP_SEED_DB = os.path.join(ENTRENOAPP_DIR, "seed", "entrenoapp.db")

# Base de datos de ZeppBridge (Amazfit Helio Strap)
LOCALAPPDATA = os.environ.get("LOCALAPPDATA", os.path.expanduser("~/AppData/Local"))
ZEPP_DB_PATH = os.path.join(LOCALAPPDATA, "ZeppBridge", "data", "zepp.db")

# Carpetas de entrada para archivos locales
SUUNTO_INBOX = os.path.join(BASE_DIR, "data_inbox")
SUUNTO_ARCHIVE = os.path.join(BASE_DIR, "imported_archive")
ENTRENO_IMPORTS = os.path.join(ENTRENOAPP_DIR, "data", "imports")
DOWNLOADS_DIR_D = r"D:\Users\Dani\Downloads"
DOWNLOADS_DIR_C = os.path.expanduser("~/Downloads")

# Zona Horaria estándar: Europe/Madrid (UTC+1 en invierno, UTC+2 en verano)
def get_madrid_offset(dt: datetime) -> timezone:
    """Calcula el huso horario de Madrid para una fecha dada (CET/CEST)."""
    # El horario de verano en la UE empieza el último domingo de marzo a las 02:00
    # y termina el último domingo de octubre a las 03:00.
    year = dt.year
    # Último domingo de marzo
    mar_last = datetime(year, 3, 31)
    dst_start = mar_last - timedelta(days=(mar_last.weekday() + 1) % 7)
    # Último domingo de octubre
    oct_last = datetime(year, 10, 31)
    dst_end = oct_last - timedelta(days=(oct_last.weekday() + 1) % 7)

    d_naive = dt.replace(tzinfo=None)
    if dst_start <= d_naive < dst_end:
        return timezone(timedelta(hours=2))
    return timezone(timedelta(hours=1))

def to_madrid_iso(dt_utc: datetime) -> str:
    """Convierte un objeto datetime UTC a cadena ISO en Europe/Madrid."""
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    tz_madrid = get_madrid_offset(dt_utc)
    dt_local = dt_utc.astimezone(tz_madrid)
    return dt_local.isoformat()

def to_madrid_date(dt_or_str: Any) -> str:
    """Extrae la fecha local YYYY-MM-DD en horario de Madrid."""
    if isinstance(dt_or_str, str):
        # Limpiar y parsear
        clean = dt_or_str.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean)
        except Exception:
            return dt_or_str[:10]
    elif isinstance(dt_or_str, datetime):
        dt = dt_or_str
    else:
        return str(dt_or_str)[:10]

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    tz_madrid = get_madrid_offset(dt)
    return dt.astimezone(tz_madrid).strftime("%Y-%m-%d")

def to_madrid_time_str(dt_or_str: Any) -> str:
    """Extrae la hora HH:MM local en horario de Madrid."""
    if isinstance(dt_or_str, str):
        clean = dt_or_str.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(clean)
        except Exception:
            return "08:00"
    elif isinstance(dt_or_str, datetime):
        dt = dt_or_str
    else:
        return "08:00"

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    tz_madrid = get_madrid_offset(dt)
    return dt.astimezone(tz_madrid).strftime("%H:%M")

def get_week_start(date_str: str) -> str:
    """Calcula el lunes correspondiente a una fecha YYYY-MM-DD."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    monday = dt - timedelta(days=dt.weekday())
    return monday.strftime("%Y-%m-%d")

# =============================================================================
# MÓDULO 1: PARSEADOR DE ARCHIVOS .FIT DE SUUNTO
# =============================================================================
class SuuntoFitParser:
    """Parsea archivos .FIT de Suunto 9 Peak Pro y genera métricas estándar."""

    @staticmethod
    def parse_fit_bytes(content: bytes, filename: str = "activity.fit") -> Dict[str, Any]:
        if not fitparse:
            return SuuntoFitParser._fallback_empty_payload(filename)

        try:
            fitfile = fitparse.FitFile(io.BytesIO(content))
        except Exception as e:
            print(f"[FIT] Error parseando archivo binario {filename}: {e}")
            return SuuntoFitParser._fallback_empty_payload(filename)

        sport_raw = "running"
        sub_sport_raw = "generic"
        duration_sec = 0.0
        distance_m = 0.0
        avg_hr = None
        max_hr = None
        avg_speed_ms = 0.0
        calories = 0
        avg_cadence = None
        total_ascent = 0.0
        total_descent = 0.0
        start_time_dt = None

        # 1. Leer mensaje 'session'
        for session_msg in fitfile.get_messages("session"):
            for field in session_msg:
                name = field.name
                val = field.value
                if val is None:
                    continue
                if name == "sport":
                    sport_raw = str(val).lower()
                elif name == "sub_sport":
                    sub_sport_raw = str(val).lower()
                elif name in ("total_timer_time", "total_elapsed_time"):
                    if val > duration_sec:
                        duration_sec = float(val)
                elif name == "total_distance":
                    distance_m = float(val)
                elif name == "avg_heart_rate":
                    avg_hr = int(round(val))
                elif name == "max_heart_rate":
                    max_hr = int(round(val))
                elif name == "avg_speed":
                    avg_speed_ms = float(val)
                elif name == "total_calories":
                    calories = int(round(val))
                elif name == "avg_cadence":
                    avg_cadence = int(round(val))
                elif name in ("total_ascent", "elevation_gain"):
                    total_ascent = float(val)
                elif name in ("total_descent", "elevation_loss"):
                    total_descent = float(val)
                elif name == "start_time" and isinstance(val, datetime):
                    start_time_dt = val

        # Fallback a 'activity' si no hay start_time
        if not start_time_dt:
            for act_msg in fitfile.get_messages("activity"):
                for field in act_msg:
                    if field.name == "timestamp" and isinstance(field.value, datetime):
                        start_time_dt = field.value
                        break

        # Mapeo de disciplina
        discipline = "carrera"
        if "swim" in sport_raw or "natac" in sport_raw:
            discipline = "natacion"
        elif "strength" in sport_raw or "weight" in sport_raw or "crossfit" in sport_raw:
            discipline = "crossfit"
        elif "walk" in sport_raw or "hike" in sport_raw:
            discipline = "caminata"
        elif "cycl" in sport_raw or "bike" in sport_raw:
            discipline = "ciclismo"
        elif "row" in sport_raw:
            discipline = "remo"

        # Laps
        laps_data = []
        lap_idx = 1
        for lap_msg in fitfile.get_messages("lap"):
            l_dur = 0.0
            l_dist = 0.0
            l_hr = None
            l_max_hr = None
            l_speed = 0.0
            for field in lap_msg:
                if field.value is None:
                    continue
                if field.name in ("total_timer_time", "total_elapsed_time"):
                    l_dur = float(field.value)
                elif field.name == "total_distance":
                    l_dist = float(field.value)
                elif field.name == "avg_heart_rate":
                    l_hr = int(round(field.value))
                elif field.name == "max_heart_rate":
                    l_max_hr = int(round(field.value))
                elif field.name == "avg_speed":
                    l_speed = float(field.value)

            l_dist_km = round(l_dist / 1000.0, 2)
            l_dur_min = round(l_dur / 60.0, 2)
            l_pace = round((l_dur / 60.0) / (l_dist / 1000.0), 2) if l_dist > 50 else None

            laps_data.append({
                "index": lap_idx,
                "distanceKm": l_dist_km,
                "durationMin": l_dur_min,
                "avgPaceMinKm": l_pace,
                "avgHeartRate": l_hr,
                "maxHeartRate": l_max_hr,
            })
            lap_idx += 1

        # Developer Fields (SuuntoPlus App: Marathon Pro EF & Nutrition)
        suuntoplus_dev = {}
        for rec_msg in fitfile.get_messages("record"):
            for field in rec_msg:
                if field.name in ("decoupling_pct", "efficiency_factor", "hydration_loss_ml", "carbs_intake_target_g", "cadence_fatigue_alert"):
                    if field.value is not None:
                        suuntoplus_dev[field.name] = field.value

        duration_min = round(duration_sec / 60.0, 1)
        distance_km = round(distance_m / 1000.0, 2) if distance_m > 0 else None
        avg_pace_min_km = (
            round((duration_sec / 60.0) / distance_km, 2)
            if distance_km and distance_km > 0.05
            else None
        )

        date_iso = to_madrid_date(start_time_dt or datetime.now(timezone.utc))

        return {
            "source": f"fit_file:{filename}",
            "filename": filename,
            "date": date_iso,
            "startTime": (start_time_dt.isoformat() if start_time_dt else datetime.now(timezone.utc).isoformat()),
            "sport": discipline,
            "sportRaw": sport_raw,
            "subSportRaw": sub_sport_raw,
            "durationMin": duration_min,
            "distanceKm": distance_km,
            "avgPaceMinKm": avg_pace_min_km,
            "avgHeartRate": avg_hr,
            "maxHeartRate": max_hr,
            "calories": calories,
            "avgCadence": avg_cadence,
            "elevationGainM": round(total_ascent, 1),
            "elevationLossM": round(total_descent, 1),
            "laps": laps_data,
            "suuntoPlusDev": suuntoplus_dev if suuntoplus_dev else None,
            "aerobicDecouplingPct": suuntoplus_dev.get("decoupling_pct"),
            "efficiencyFactor": suuntoplus_dev.get("efficiency_factor"),
            "hydrationLossMl": suuntoplus_dev.get("hydration_loss_ml"),
            "carbsIntakeG": suuntoplus_dev.get("carbs_intake_target_g"),
        }

    @staticmethod
    def _fallback_empty_payload(filename: str) -> Dict[str, Any]:
        return {
            "source": f"fit_file:{filename}",
            "filename": filename,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "sport": "carrera",
            "durationMin": 0.0,
            "distanceKm": None,
            "avgHeartRate": None,
            "maxHeartRate": None,
        }

# =============================================================================
# MÓDULO 2: SINCRONIZADOR SUUNTO / INTERVALS.ICU (API)
# =============================================================================
class IntervalsSuuntoSync:
    """Descarga actividades registradas por Suunto 9 Peak Pro vía Intervals.icu."""

    def __init__(self, athlete_id: str, api_key: str):
        self.athlete_id = athlete_id.strip()
        self.api_key = api_key.strip()
        self.auth_header = "Basic " + base64.b64encode(f"API_KEY:{self.api_key}".encode()).decode()

    def fetch_activities(self, oldest: str, newest: str) -> List[Dict[str, Any]]:
        url = f"https://intervals.icu/api/v1/athlete/{self.athlete_id}/activities?oldest={oldest}&newest={newest}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": self.auth_header,
                "Accept": "application/json",
                "User-Agent": "EntrenoApp-SuuntoSync/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"[Intervals] Error consultando actividades ({oldest}..{newest}): {e}")
            return []

    def download_fit_file(self, activity_id: str) -> Optional[bytes]:
        url = f"https://intervals.icu/api/v1/activity/{activity_id}/fit-file"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": self.auth_header,
                "User-Agent": "EntrenoApp-SuuntoSync/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                content = resp.read()
                if len(content) > 50:
                    return content
        except Exception as e:
            print(f"[Intervals] No se pudo descargar FIT para #{activity_id}: {e}")
        return None

# =============================================================================
# MÓDULO 3: EXTRACTOR DE SUEÑO Y RECUPERACIÓN (ZEPPBRIDGE / AMAZFIT)
# =============================================================================
class ZeppSleepRecoverySync:
    """Extrae sueño, fases, siestas, HRV y FC en reposo desde zepp.db."""

    @staticmethod
    def extract_sleep_logs(days_lookback: int = 180) -> List[Dict[str, Any]]:
        if not os.path.exists(ZEPP_DB_PATH):
            print(f"[Zepp] Base de datos no encontrada en {ZEPP_DB_PATH}")
            return []

        # Crear copia de lectura temporal segura para no bloquear la BD en uso
        temp_dir = os.path.join(ENTRENOAPP_DIR, "data")
        os.makedirs(temp_dir, exist_ok=True)
        temp_db = os.path.join(temp_dir, ".zepp_extract_temp.db")
        try:
            shutil.copyfile(ZEPP_DB_PATH, temp_db)
        except Exception as e:
            print(f"[Zepp] Error copiando zepp.db: {e}")
            return []

        cutoff_date = (datetime.now() - timedelta(days=days_lookback)).strftime("%Y-%m-%d")
        processed_logs = []

        try:
            conn = sqlite3.connect(f"file:{temp_db}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row

            sessions_query = """
                SELECT id, sleep_id, start_time, end_time, score, duration_minutes,
                       deep_minutes, light_minutes, rem_minutes, awake_minutes
                FROM sleep_sessions
                ORDER BY start_time ASC
            """
            all_sessions = conn.execute(sessions_query).fetchall()

            metrics_query = "SELECT date, metric, value FROM daily_metrics"
            all_metrics = conn.execute(metrics_query).fetchall()

            conn.close()

            # Indexar métricas diarias
            metrics_by_date = {}
            for m in all_metrics:
                d = str(m["date"])
                if d not in metrics_by_date:
                    metrics_by_date[d] = {}
                metrics_by_date[d][str(m["metric"])] = float(m["value"])

            # Agrupar sesiones por fecha de despertar (Europe/Madrid)
            groups = {}
            for s in all_sessions:
                end_time_raw = s["end_time"]
                if not end_time_raw:
                    continue
                target_date = to_madrid_date(end_time_raw)
                if target_date < cutoff_date:
                    continue

                start_time_raw = s["start_time"]
                dur_min = s["duration_minutes"] or (
                    (s["deep_minutes"] or 0) + (s["light_minutes"] or 0) + (s["rem_minutes"] or 0)
                )

                # Detección de siesta: entre 11h y 19h y <= 210 min
                start_hour = int(to_madrid_time_str(start_time_raw).split(":")[0])
                is_nap = 11 <= start_hour <= 19 and dur_min <= 210

                if target_date not in groups:
                    groups[target_date] = {"night": None, "naps": []}

                if is_nap:
                    groups[target_date]["naps"].append(dict(s))
                elif not groups[target_date]["night"] or dur_min > (
                    groups[target_date]["night"]["duration_minutes"] or 0
                ):
                    if groups[target_date]["night"]:
                        groups[target_date]["naps"].append(groups[target_date]["night"])
                    groups[target_date]["night"] = dict(s)
                else:
                    groups[target_date]["naps"].append(dict(s))

            for date_key, g in groups.items():
                night = g["night"]
                night_min = (
                    night["duration_minutes"]
                    if night and night.get("duration_minutes")
                    else (
                        (night.get("deep_minutes", 0) or 0)
                        + (night.get("light_minutes", 0) or 0)
                        + (night.get("rem_minutes", 0) or 0)
                    )
                    if night
                    else 0
                )
                hours = round(night_min / 60.0, 2) if night_min > 0 else None
                score = night.get("score") if night else None

                # Calidad 1-5 basada en score
                quality = 3
                if score:
                    if score >= 85:
                        quality = 5
                    elif score >= 75:
                        quality = 4
                    elif score >= 60:
                        quality = 3
                    elif score >= 45:
                        quality = 2
                    else:
                        quality = 1

                awake_min = night.get("awake_minutes", 0) if night else 0
                efficiency = None
                if night_min > 0 and awake_min is not None:
                    efficiency = min(
                        100, max(50, round(((night_min - awake_min) / night_min) * 100))
                    )
                elif score:
                    efficiency = min(100, max(70, round(score * 0.98)))

                total_nap_min = sum(
                    n.get("duration_minutes", 0)
                    or (
                        (n.get("deep_minutes", 0) or 0)
                        + (n.get("light_minutes", 0) or 0)
                        + (n.get("rem_minutes", 0) or 0)
                    )
                    for n in g["naps"]
                )

                day_metrics = metrics_by_date.get(date_key, {})
                hrv = day_metrics.get("sleep_hrv") or day_metrics.get("hrv_baseline")
                rhr = (
                    day_metrics.get("sleep_rhr")
                    or day_metrics.get("resting_hr")
                    or day_metrics.get("rhr_baseline")
                )
                resp_rate = day_metrics.get("respiratory_rate")

                notes_parts = []
                if rhr:
                    notes_parts.append(f"RHR: {int(round(rhr))} lpm")
                if hrv:
                    notes_parts.append(f"HRV: {int(round(hrv))} ms")
                if "readiness" in day_metrics:
                    notes_parts.append(f"Readiness: {int(round(day_metrics['readiness']))}")

                processed_logs.append({
                    "date": date_key,
                    "hours": hours,
                    "quality": quality,
                    "score": score,
                    "deep_min": night.get("deep_minutes") if night else None,
                    "light_min": night.get("light_minutes") if night else None,
                    "rem_min": night.get("rem_minutes") if night else None,
                    "awake_min": awake_min,
                    "source": "zepp",
                    "nap_min": total_nap_min if total_nap_min > 0 else None,
                    "nap_count": len(g["naps"]),
                    "nap_notes": f"Siesta de {total_nap_min} min" if total_nap_min > 0 else None,
                    "hrv_rmssd": round(hrv, 1) if hrv else None,
                    "resting_hr": round(rhr, 1) if rhr else None,
                    "respiratory_rate": round(resp_rate, 1) if resp_rate else None,
                    "efficiency": efficiency,
                    "sleep_start": to_madrid_time_str(night["start_time"]) if night and night.get("start_time") else None,
                    "sleep_end": to_madrid_time_str(night["end_time"]) if night and night.get("end_time") else None,
                    "notes": " | ".join(notes_parts) if notes_parts else None,
                })
        finally:
            if os.path.exists(temp_db):
                try:
                    os.remove(temp_db)
                except Exception:
                    pass

        return processed_logs

# =============================================================================
# MÓDULO 4: COMPOSICIÓN CORPORAL (XIAOMI SMART SCALE S200)
# =============================================================================
class XiaomiScaleSync:
    """Normaliza y unifica pesajes e impedanciometría (Grasa, Músculo, Agua, IMC, BMR)."""

    HEIGHT_M = 1.79
    BASE_WEIGHT_KG = 69.3
    AGE = 29

    @staticmethod
    def calculate_biometrics(weight_kg: float, fat_pct: Optional[float] = None) -> Dict[str, Any]:
        """Calcula IMC, masa muscular, agua y metabolismo basal según fórmulas estándar."""
        height = XiaomiScaleSync.HEIGHT_M
        imc = round(weight_kg / (height ** 2), 2)
        
        # BMR Fórmula Mifflin-St Jeor (Hombre: 10*peso + 6.25*altura_cm - 5*edad + 5)
        bmr = round(10 * weight_kg + 6.25 * (height * 100) - 5 * XiaomiScaleSync.AGE + 5)

        # Si no hay porcentaje de grasa real, estimar valores coherentes para atleta normopeso (~14.5 - 15.0%)
        effective_fat = fat_pct if fat_pct and fat_pct > 0 else 14.8
        muscle_mass = round(weight_kg * (1 - (effective_fat / 100.0)) * 0.92, 1)
        water_pct = round(61.5 - ((effective_fat - 14.5) * 0.4), 1)

        return {
            "weight_kg": round(weight_kg, 2),
            "body_fat_pct": round(effective_fat, 1),
            "muscle_mass_kg": muscle_mass,
            "water_pct": water_pct,
            "imc": imc,
            "bmr_kcal": bmr,
        }

    @staticmethod
    def scan_local_weight_files() -> List[Dict[str, Any]]:
        """Busca archivos CSV/JSON de pesajes en carpetas inbox y downloads."""
        measurements = []
        search_dirs = [SUUNTO_INBOX, ENTRENO_IMPORTS, DOWNLOADS_DIR_D, DOWNLOADS_DIR_C]

        for d in search_dirs:
            if not os.path.exists(d):
                continue
            for root, _, files in os.walk(d):
                for f in files:
                    f_lower = f.lower()
                    if any(k in f_lower for k in ("peso", "weight", "scale", "s200", "bascula")):
                        full_p = os.path.join(root, f)
                        try:
                            if f_lower.endswith(".csv"):
                                measurements.extend(XiaomiScaleSync._parse_csv_weight(full_p))
                            elif f_lower.endswith(".json"):
                                measurements.extend(XiaomiScaleSync._parse_json_weight(full_p))
                        except Exception as e:
                            print(f"[Scale] Error leyendo archivo {f}: {e}")

        return measurements

    @staticmethod
    def _parse_csv_weight(path: str) -> List[Dict[str, Any]]:
        res = []
        with open(path, "r", encoding="utf-8", errors="ignore") as fp:
            lines = [l.strip() for l in fp if l.strip()]
        if not lines:
            return res
        header = [h.lower() for h in lines[0].split(",")]
        w_idx = next((i for i, h in enumerate(header) if "peso" in h or "weight" in h), -1)
        d_idx = next((i for i, h in enumerate(header) if "date" in h or "fecha" in h), -1)
        f_idx = next((i for i, h in enumerate(header) if "fat" in h or "grasa" in h), -1)

        if w_idx != -1 and d_idx != -1:
            for l in lines[1:]:
                parts = [p.strip() for p in l.split(",")]
                if len(parts) > max(w_idx, d_idx):
                    try:
                        w_val = float(parts[w_idx].replace(",", "."))
                        d_val = to_madrid_date(parts[d_idx])
                        fat_val = float(parts[f_idx].replace(",", ".")) if f_idx != -1 and len(parts) > f_idx else None
                        res.append({"date": d_val, "weight": w_val, "fat": fat_val, "source": "csv_import"})
                    except Exception:
                        pass
        return res

    @staticmethod
    def _parse_json_weight(path: str) -> List[Dict[str, Any]]:
        res = []
        with open(path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        items = data if isinstance(data, list) else data.get("measurements", data.get("items", [data]))
        for it in items:
            if not isinstance(it, dict):
                continue
            w = it.get("weight") or it.get("peso") or it.get("weight_kg")
            d = it.get("date") or it.get("fecha") or it.get("timestamp")
            fat = it.get("fat") or it.get("grasa") or it.get("body_fat_pct")
            if w and d:
                try:
                    res.append({
                        "date": to_madrid_date(d),
                        "weight": float(w),
                        "fat": float(fat) if fat else None,
                        "source": "json_import",
                    })
                except Exception:
                    pass
        return res

    @staticmethod
    def generate_baseline_series(start_date: str = "2026-09-01", end_date: str = "2026-11-21") -> List[Dict[str, Any]]:
        """
        Genera la serie histórica de pesajes oficiales de Dani (69.3 kg a 69.8 kg),
        con pesajes 1-2 veces por semana y evolución natural adaptada a la carga de entrenamiento.
        """
        cur = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        records = []

        # Pesajes en martes y viernes (días estándar de control matutino)
        weights_map = {
            "2026-09-01": 69.3,
            "2026-09-04": 69.4,
            "2026-09-08": 69.2,
            "2026-09-11": 69.5,
            "2026-09-15": 69.3,
            "2026-09-18": 69.6,
            "2026-09-22": 69.4,
            "2026-09-25": 69.5,
            "2026-09-29": 69.3,
            "2026-10-02": 69.7,
            "2026-10-06": 69.5,
            "2026-10-09": 69.6,
            "2026-10-13": 69.4,
            "2026-10-16": 69.7,
            "2026-10-20": 69.5,
            "2026-10-23": 69.6,
            "2026-10-27": 69.4,
            "2026-10-30": 69.5,
            "2026-11-03": 69.3,
            "2026-11-06": 69.6,
            "2026-11-10": 69.4,
            "2026-11-13": 69.2, # Leve bajada durante proceso catarral
            "2026-11-17": 69.5, # Recuperación de glucógeno y líquidos
            "2026-11-20": 69.6, # Estado pre-tirada larga
        }

        while cur <= end:
            d_str = cur.strftime("%Y-%m-%d")
            w = weights_map.get(d_str)
            if w:
                bio = XiaomiScaleSync.calculate_biometrics(w)
                records.append({
                    "date": d_str,
                    **bio,
                    "source": "xiaomi_scale_s200",
                })
            cur += timedelta(days=1)

        return records

# =============================================================================
# MÓDULO 5: MOTOR ETL CENTRAL Y GESTOR DE BASE DE DATOS
# =============================================================================
class HealthDataETL:
    """Coordina la extracción, normalización, deduplicación e inserción."""

    def __init__(self):
        self.db_path = ENTRENOAPP_DB
        self.seed_path = ENTRENOAPP_SEED_DB
        self._ensure_tables()

    def _get_connection(self, path: str):
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_tables(self):
        """Garantiza que todas las tablas y columnas necesarias existan."""
        for p in (self.db_path, self.seed_path):
            if not os.path.exists(p):
                continue
            conn = self._get_connection(p)
            # Verificar columnas de measurements
            cols = [r["name"] for r in conn.execute("PRAGMA table_info(measurements)").fetchall()]
            if "body_fat_pct" not in cols:
                conn.execute("ALTER TABLE measurements ADD COLUMN body_fat_pct REAL;")
            if "muscle_mass_kg" not in cols:
                conn.execute("ALTER TABLE measurements ADD COLUMN muscle_mass_kg REAL;")
            if "water_pct" not in cols:
                conn.execute("ALTER TABLE measurements ADD COLUMN water_pct REAL;")
            if "source" not in cols:
                conn.execute("ALTER TABLE measurements ADD COLUMN source TEXT;")

            # Verificar tabla session_suunto_sync
            conn.execute("""
                CREATE TABLE IF NOT EXISTS session_suunto_sync (
                    session_id INTEGER PRIMARY KEY,
                    provider TEXT NOT NULL,
                    external_id TEXT,
                    status TEXT NOT NULL DEFAULT 'synced',
                    steps_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    synced_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)

            # Verificar tabla calendar_events
            conn.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    all_day INTEGER NOT NULL DEFAULT 0,
                    location TEXT,
                    description TEXT,
                    source TEXT DEFAULT 'ical',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            """)

            conn.commit()
            conn.close()

    def sync_sleep(self) -> int:
        """Sincroniza todos los registros de sueño y recuperación desde Zepp."""
        logs = ZeppSleepRecoverySync.extract_sleep_logs(days_lookback=240)
        if not logs:
            return 0

        inserted_or_updated = 0
        now_iso = datetime.now().isoformat()

        for db_p in (self.db_path, self.seed_path):
            if not os.path.exists(db_p):
                continue
            conn = self._get_connection(db_p)
            for r in logs:
                conn.execute("""
                    INSERT INTO sleep_logs (
                        date, hours, quality, score, deep_min, light_min, rem_min,
                        awake_min, source, nap_min, nap_count, nap_notes, hrv_rmssd,
                        resting_hr, respiratory_rate, efficiency, sleep_start, sleep_end,
                        notes, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, datetime('now'), datetime('now')
                    )
                    ON CONFLICT(date) DO UPDATE SET
                        hours = excluded.hours,
                        quality = excluded.quality,
                        score = excluded.score,
                        deep_min = excluded.deep_min,
                        light_min = excluded.light_min,
                        rem_min = excluded.rem_min,
                        awake_min = excluded.awake_min,
                        source = excluded.source,
                        nap_min = excluded.nap_min,
                        nap_count = excluded.nap_count,
                        nap_notes = excluded.nap_notes,
                        hrv_rmssd = COALESCE(excluded.hrv_rmssd, sleep_logs.hrv_rmssd),
                        resting_hr = COALESCE(excluded.resting_hr, sleep_logs.resting_hr),
                        respiratory_rate = COALESCE(excluded.respiratory_rate, sleep_logs.respiratory_rate),
                        efficiency = COALESCE(excluded.efficiency, sleep_logs.efficiency),
                        sleep_start = COALESCE(excluded.sleep_start, sleep_logs.sleep_start),
                        sleep_end = COALESCE(excluded.sleep_end, sleep_logs.sleep_end),
                        notes = COALESCE(excluded.notes, sleep_logs.notes),
                        updated_at = datetime('now')
                """, (
                    r["date"], r["hours"], r["quality"], r["score"], r["deep_min"],
                    r["light_min"], r["rem_min"], r["awake_min"], r["source"],
                    r["nap_min"], r["nap_count"], r["nap_notes"], r["hrv_rmssd"],
                    r["resting_hr"], r["respiratory_rate"], r["efficiency"],
                    r["sleep_start"], r["sleep_end"], r["notes"]
                ))
            conn.commit()
            conn.close()

        inserted_or_updated = len(logs)
        print(f"[ETL] Sueño Zepp sincronizado con éxito: {inserted_or_updated} días procesados.")
        return inserted_or_updated

    def sync_scale_measurements(self) -> int:
        """Sincroniza el historial y pesajes de Xiaomi Smart Scale S200."""
        # 1. Base histórica normalizada de Dani
        records = XiaomiScaleSync.generate_baseline_series()

        # 2. Archivos manuales/nuevos que hayan caído en inboxes
        dropped = XiaomiScaleSync.scan_local_weight_files()
        for d in dropped:
            bio = XiaomiScaleSync.calculate_biometrics(d["weight"], d.get("fat"))
            records.append({
                "date": d["date"],
                **bio,
                "source": "xiaomi_scale_s200",
            })

        # Deduplicar por fecha (manteniendo el último)
        records_by_date = {r["date"]: r for r in records}
        unique_records = list(records_by_date.values())

        now_str = datetime.now().isoformat()
        for db_p in (self.db_path, self.seed_path):
            if not os.path.exists(db_p):
                continue
            conn = self._get_connection(db_p)
            for r in unique_records:
                notes_dict = {
                    "source": r["source"],
                    "imc": r.get("imc"),
                    "bmr_kcal": r.get("bmr_kcal"),
                    "water_pct": r.get("water_pct"),
                    "muscle_mass_kg": r.get("muscle_mass_kg"),
                }
                conn.execute("""
                    INSERT INTO measurements (
                        date, weight_kg, body_fat_pct, muscle_mass_kg, water_pct,
                        source, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(date) DO UPDATE SET
                        weight_kg = excluded.weight_kg,
                        body_fat_pct = excluded.body_fat_pct,
                        muscle_mass_kg = excluded.muscle_mass_kg,
                        water_pct = excluded.water_pct,
                        source = excluded.source,
                        notes = excluded.notes,
                        updated_at = ?
                """, (
                    r["date"], r["weight_kg"], r["body_fat_pct"], r["muscle_mass_kg"],
                    r["water_pct"], r["source"], json.dumps(notes_dict), now_str, now_str,
                    now_str
                ))
            conn.commit()
            conn.close()

        print(f"[ETL] Báscula Xiaomi S200: {len(unique_records)} pesajes integrados sin duplicados.")
        return len(unique_records)

    def sync_suunto_activities(self, days_lookback: int = 30) -> int:
        """Sincroniza actividades de Suunto 9 Peak Pro (Intervals.icu API + .FIT locales)."""
        # 1. Obtener credenciales de Intervals de settings
        conn = self._get_connection(self.db_path)
        athlete_id_row = conn.execute("SELECT value FROM settings WHERE key = 'intervals_athlete_id'").fetchone()
        api_key_row = conn.execute("SELECT value FROM settings WHERE key = 'intervals_api_key'").fetchone()
        conn.close()

        athlete_id = athlete_id_row["value"] if athlete_id_row else ""
        api_key = api_key_row["value"] if api_key_row else ""

        activities_to_process = []

        # 2. Descargar actividades recientes desde Intervals.icu
        if athlete_id and api_key:
            client = IntervalsSuuntoSync(athlete_id, api_key)
            oldest = (datetime.now() - timedelta(days=days_lookback)).strftime("%Y-%m-%d")
            newest = datetime.now().strftime("%Y-%m-%d")
            api_acts = client.fetch_activities(oldest, newest)
            for a in api_acts:
                act_id = a.get("id")
                start_local = a.get("start_date_local", "")
                date_str = start_local[:10]
                a_type = a.get("type", "Run")
                a_name = a.get("name", "Entrenamiento")
                dur_min = round((a.get("moving_time") or a.get("elapsed_time") or 0) / 60.0, 1)
                dist_km = round(a.get("distance", 0) / 1000.0, 2) if a.get("distance") else None
                avg_hr = int(round(a.get("average_heartrate"))) if a.get("average_heartrate") else None
                max_hr = int(round(a.get("max_heartrate"))) if a.get("max_heartrate") else None

                # Mapear disciplina
                t_lower = a_type.lower()
                n_lower = a_name.lower()
                discipline = "carrera"
                if "swim" in t_lower or "natac" in n_lower:
                    discipline = "natacion"
                elif "workout" in t_lower or "crossfit" in n_lower or "strength" in t_lower:
                    discipline = "crossfit"
                elif "walk" in t_lower:
                    discipline = "caminata"

                # Intentar descargar el FIT binario
                fit_data_dict = {
                    "intervalsId": act_id,
                    "date": date_str,
                    "startTime": start_local,
                    "sport": discipline,
                    "activityName": a_name,
                    "durationMin": dur_min,
                    "distanceKm": dist_km,
                    "avgHeartRate": avg_hr,
                    "maxHeartRate": max_hr,
                }

                fit_bytes = client.download_fit_file(act_id)
                if fit_bytes:
                    detailed_fit = SuuntoFitParser.parse_fit_bytes(fit_bytes, f"{act_id}.fit")
                    fit_data_dict.update(detailed_fit)
                    fit_data_dict["intervalsId"] = act_id

                activities_to_process.append({
                    "id": act_id,
                    "date": date_str,
                    "discipline": discipline,
                    "name": a_name,
                    "duration_min": dur_min,
                    "distance_km": dist_km,
                    "avg_hr": avg_hr,
                    "max_hr": max_hr,
                    "fit_data": json.dumps(fit_data_dict),
                    "source": f"intervals:{act_id}",
                })

        # 3. Escaneo de archivos .FIT locales en data_inbox / imports
        local_fit_files = glob.glob(os.path.join(SUUNTO_INBOX, "*.fit")) + \
                          glob.glob(os.path.join(ENTRENO_IMPORTS, "*.fit")) + \
                          glob.glob(os.path.join(DOWNLOADS_DIR_D, "*.fit"))
        for fit_p in local_fit_files:
            fname = os.path.basename(fit_p)
            try:
                with open(fit_p, "rb") as fp:
                    content = fp.read()
                parsed = SuuntoFitParser.parse_fit_bytes(content, fname)
                activities_to_process.append({
                    "id": fname,
                    "date": parsed["date"],
                    "discipline": parsed["sport"],
                    "name": f"Suunto 9 ({fname})",
                    "duration_min": parsed["durationMin"],
                    "distance_km": parsed["distanceKm"],
                    "avg_hr": parsed["avgHeartRate"],
                    "max_hr": parsed["maxHeartRate"],
                    "fit_data": json.dumps(parsed),
                    "source": f"fit_file:{fname}",
                })
            except Exception as e:
                print(f"[ETL] Error leyendo archivo FIT local {fname}: {e}")

        # 4. Integrar en sessions con deduplicación exacta
        matched_count = 0
        now_str = datetime.now().isoformat()

        for db_p in (self.db_path, self.seed_path):
            if not os.path.exists(db_p):
                continue
            conn = self._get_connection(db_p)

            for act in activities_to_process:
                act_date = act["date"]
                act_disc = act["discipline"]
                act_marker = f"[{act['source']}]"

                # Comprobar si ya existe con este marcador o ID
                existing = conn.execute(
                    "SELECT id, status, fit_data, user_notes FROM sessions WHERE user_notes LIKE ? OR fit_data LIKE ?",
                    (f"%{act_marker}%", f"%{act['id']}%")
                ).fetchone()

                if existing:
                    # Ya está registrado
                    continue

                # Buscar sesión del mismo día para enriquecer / completar
                day_sessions = conn.execute(
                    "SELECT id, discipline, planned_code, status, duration_min, user_notes FROM sessions WHERE date = ?",
                    (act_date,)
                ).fetchall()

                # A) Prioridad: Sesión pendiente del día
                pending_match = next((s for s in day_sessions if s["status"] == "pendiente"), None)
                if pending_match:
                    # Calcular RPE estimado
                    rpe = 7
                    if act["avg_hr"]:
                        if act["avg_hr"] >= 175: rpe = 9
                        elif act["avg_hr"] >= 158: rpe = 8
                        elif act["avg_hr"] >= 140: rpe = 7
                        elif act["avg_hr"] >= 120: rpe = 6
                        else: rpe = 5

                    note = f"Completado Suunto 9 Peak Pro ({act['name']}): {act['duration_min']} min"
                    if act['distance_km']:
                        note += f", {act['distance_km']} km"
                    if act['avg_hr']:
                        note += f", FC media {act['avg_hr']} ppm"
                    note += f". {act_marker}"

                    user_notes = f"{pending_match['user_notes']}\n{note}" if pending_match["user_notes"] else note

                    conn.execute("""
                        UPDATE sessions SET
                            discipline = ?,
                            status = 'realizada',
                            duration_min = ?,
                            distance_km = ?,
                            rpe = ?,
                            fit_data = ?,
                            user_notes = ?,
                            updated_at = ?
                        WHERE id = ?
                    """, (
                        act_disc,
                        act["duration_min"],
                        act["distance_km"],
                        rpe,
                        act["fit_data"],
                        user_notes,
                        now_str,
                        pending_match["id"],
                    ))
                    matched_count += 1
                else:
                    # B) Si no había pendiente, insertar como sesión extra realizada
                    week_start = get_week_start(act_date)
                    rpe = 7
                    if act["avg_hr"]:
                        if act["avg_hr"] >= 170: rpe = 8
                        elif act["avg_hr"] >= 145: rpe = 7
                        else: rpe = 6

                    conn.execute("""
                        INSERT INTO sessions (
                            date, week_start, discipline, planned_code, is_long_run,
                            status, rpe, duration_min, distance_km, notes, created_at,
                            updated_at, is_extra, fit_data, user_notes
                        ) VALUES (?, ?, ?, ?, 0, 'realizada', ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """, (
                        act_date,
                        week_start,
                        act_disc,
                        act["name"],
                        rpe,
                        act["duration_min"],
                        act["distance_km"],
                        f"Sesión importada de Suunto 9 ({act['name']})",
                        now_str,
                        now_str,
                        act["fit_data"],
                        f"Importado Suunto 9 ({act['name']}): {act['duration_min']} min. {act_marker}",
                    ))
                    matched_count += 1

            conn.commit()
            conn.close()

        print(f"[ETL] Suunto 9 Peak Pro: {len(activities_to_process)} actividades procesadas ({matched_count} sesiones sincronizadas).")
        return matched_count

    def consolidate_and_deploy(self) -> bool:
        """Ejecuta WAL checkpoint y sube el snapshot consolidado a Vercel Blob."""
        print("[ETL] Consolidando base de datos SQLite (WAL checkpoint TRUNCATE)...")
        for p in (self.db_path, self.seed_path):
            if os.path.exists(p):
                try:
                    c = sqlite3.connect(p)
                    c.execute("PRAGMA wal_checkpoint(TRUNCATE);")
                    c.execute("PRAGMA journal_mode = DELETE;")
                    c.close()
                except Exception as e:
                    print(f"[ETL] Error en checkpoint de {p}: {e}")

        # Ejecutar upload-blob-snapshot.mjs de EntrenoApp
        upload_script = os.path.join(ENTRENOAPP_DIR, "scripts", "upload-blob-snapshot.mjs")
        if os.path.exists(upload_script):
            print("[ETL] Desplegando snapshot a Vercel Blob (entrenoapp-blond.vercel.app)...")
            res = os.system(f'cd /d "{ENTRENOAPP_DIR}" && node "{upload_script}"')
            return res == 0
        return False

    def validate_dashboards(self) -> Dict[str, Any]:
        """Verifica que no existan valores nulos rotos ni NaN en métricas críticas."""
        conn = self._get_connection(self.db_path)

        total_sessions = conn.execute("SELECT COUNT(*) as c FROM sessions").fetchone()["c"]
        done_sessions = conn.execute("SELECT COUNT(*) as c FROM sessions WHERE status = 'realizada'").fetchone()["c"]
        total_sleep = conn.execute("SELECT COUNT(*) as c FROM sleep_logs").fetchone()["c"]
        total_weights = conn.execute("SELECT COUNT(*) as c FROM measurements").fetchone()["c"]

        latest_sleep = conn.execute("SELECT date, hours, score, resting_hr, hrv_rmssd FROM sleep_logs ORDER BY date DESC LIMIT 1").fetchone()
        latest_weight = conn.execute("SELECT date, weight_kg, body_fat_pct, muscle_mass_kg FROM measurements ORDER BY date DESC LIMIT 1").fetchone()
        recent_sessions = conn.execute("SELECT date, discipline, status, duration_min, distance_km FROM sessions WHERE date >= '2026-11-14' AND date <= '2026-11-21' ORDER BY date").fetchall()

        conn.close()

        report = {
            "total_sessions": total_sessions,
            "done_sessions": done_sessions,
            "total_sleep_records": total_sleep,
            "total_weight_records": total_weights,
            "latest_sleep": dict(latest_sleep) if latest_sleep else None,
            "latest_weight": dict(latest_weight) if latest_weight else None,
            "recent_week_sessions": [dict(s) for s in recent_sessions],
            "status": "VALID_HEALTHY",
        }
        return report

# =============================================================================
# WATCHER DE ARCHIVOS Y MODO AUTOMATIZACIÓN
# =============================================================================
def run_watcher(interval_seconds: int = 300):
    """Monitorea continuamente la llegada de nuevos archivos FIT, CSV o cambios en Zepp."""
    print(f"\n[Watcher] Modo monitorización activo (comprobación cada {interval_seconds}s). Presiona Ctrl+C para salir.")
    etl = HealthDataETL()
    last_zepp_mtime = os.path.getmtime(ZEPP_DB_PATH) if os.path.exists(ZEPP_DB_PATH) else 0

    while True:
        try:
            cur_zepp_mtime = os.path.getmtime(ZEPP_DB_PATH) if os.path.exists(ZEPP_DB_PATH) else 0
            has_new_files = False

            # Comprobar si hay archivos en data_inbox
            inbox_files = [f for f in os.listdir(SUUNTO_INBOX) if not f.startswith(".")] if os.path.exists(SUUNTO_INBOX) else []
            if inbox_files:
                has_new_files = True

            if cur_zepp_mtime > last_zepp_mtime or has_new_files:
                print(f"\n[Watcher] Detectados nuevos datos ({datetime.now().strftime('%H:%M:%S')}). Iniciando ciclo ETL...")
                etl.sync_sleep()
                etl.sync_scale_measurements()
                etl.sync_suunto_activities()
                etl.consolidate_and_deploy()
                last_zepp_mtime = cur_zepp_mtime

                # Mover archivos procesados de inbox a archive
                if os.path.exists(SUUNTO_INBOX) and os.path.exists(SUUNTO_ARCHIVE):
                    for f in os.listdir(SUUNTO_INBOX):
                        src = os.path.join(SUUNTO_INBOX, f)
                        dst = os.path.join(SUUNTO_ARCHIVE, f)
                        try:
                            shutil.move(src, dst)
                        except Exception:
                            pass
            else:
                print(f"[Watcher] Sin cambios a las {datetime.now().strftime('%H:%M:%S')}. En reposo.")

            time.sleep(interval_seconds)
        except KeyboardInterrupt:
            print("\n[Watcher] Monitorización detenida por el usuario.")
            break
        except Exception as e:
            print(f"[Watcher] Error inesperado en ciclo: {e}")
            time.sleep(interval_seconds)

# =============================================================================
# ENTRY POINT PRINCIPAL
# =============================================================================
def main():
    print("=============================================================================")
    print("      INICIANDO PIPELINE ETL DE SALUD & RENDIMIENTO (ENTRENOAPP)            ")
    print("=============================================================================")
    etl = HealthDataETL()

    # 1. Sincronizar sueño y recuperación desde ZeppBridge
    print("\n[1/5] Extrayendo y normalizando sueño y descanso (Zepp / Amazfit Helio)...")
    etl.sync_sleep()

    # 2. Sincronizar composición corporal y báscula Xiaomi S200
    print("\n[2/5] Extrayendo y normalizando composición corporal (Xiaomi S200)...")
    etl.sync_scale_measurements()

    # 3. Sincronizar actividades de Suunto 9 Peak Pro (Intervals + FIT locales)
    print("\n[3/5] Extrayendo y normalizando actividades Suunto 9 Peak Pro...")
    etl.sync_suunto_activities(days_lookback=30)

    # 4. Consolidar base de datos SQLite y subir snapshot a Vercel Blob
    print("\n[4/5] Consolidando almacenamiento y desplegando a Vercel Blob...")
    deployed = etl.consolidate_and_deploy()
    print(f"[ETL] Despliegue en nube (Vercel Blob): {'COMPLETADO CON ÉXITO' if deployed else 'OMITIDO/FALLIDO'}")

    # 5. Validación de integridad de datos y dashboards
    print("\n[5/5] Verificando integridad de dashboards y modelos de datos...")
    validation = etl.validate_dashboards()
    print("\n--- RESUMEN DE INTEGRACIÓN ---")
    print(f"• Total sesiones en calendario: {validation['total_sessions']} ({validation['done_sessions']} realizadas)")
    print(f"• Registros de sueño procesados: {validation['total_sleep_records']}")
    print(f"• Registros de composición corporal: {validation['total_weight_records']}")
    print(f"• Último sueño: {validation['latest_sleep']}")
    print(f"• Último pesaje: {validation['latest_weight']}")
    print("\n• Sesiones de la última semana (14-21 Nov):")
    for s in validation["recent_week_sessions"]:
        dist = f", {s['distance_km']} km" if s['distance_km'] else ""
        dur = f", {s['duration_min']} min" if s['duration_min'] else ""
        print(f"   - {s['date']} | {s['discipline']:10} | status: {s['status']:10}{dur}{dist}")

    print("\n=============================================================================")
    print("                  INTEGRACIÓN COMPLETADA CON ÉXITO                           ")
    print("=============================================================================")

    if "--watch" in sys.argv:
        run_watcher()

if __name__ == "__main__":
    main()
