/**
 * Parser universal y resiliente para ingesta de datos de sueño de wearables:
 * Zepp / Amazfit Helio Strap, ZeppBridge, Apple Health / iOS Shortcuts,
 * Health Connect (Android), Gadgetbridge, Make, Zapier y webhooks HTTP.
 */

import type { SleepLogInput } from "@/lib/repo/sleep";

export interface NormalizedSleepRecord extends SleepLogInput {
  raw_source?: string;
}

/**
 * Convierte un timestamp unix (segundos o ms) o string ISO a fecha YYYY-MM-DD en zona horaria Europe/Madrid
 */
export function toMadridISODate(val: unknown): string | null {
  if (!val) return null;

  // Si ya viene como YYYY-MM-DD
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }

  let dt: Date | null = null;
  if (typeof val === "number") {
    // Si es timestamp en segundos vs milisegundos
    dt = new Date(val > 1e11 ? val : val * 1000);
  } else if (typeof val === "string") {
    // Si viene como ISO o formato fecha con hora
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      dt = new Date(parsed);
    }
  }

  if (dt && !isNaN(dt.getTime())) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dt);
    } catch {
      return dt.toISOString().split("T")[0];
    }
  }

  return null;
}

/**
 * Convierte un valor horario a formato "HH:mm" en zona horaria Europe/Madrid
 */
export function toMadridTimeString(val: unknown): string | null {
  if (!val) return null;

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(":");
      return `${h.padStart(2, "0")}:${m}`;
    }
  }

  let dt: Date | null = null;
  if (typeof val === "number") {
    dt = new Date(val > 1e11 ? val : val * 1000);
  } else if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      dt = new Date(parsed);
    }
  }

  if (dt && !isNaN(dt.getTime())) {
    try {
      return new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(dt);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Normaliza la duración total a horas decimales (ej. 7.5)
 * Soporta segundos (>1000), minutos (>24 y <=1000) u horas (<=24).
 */
export function normalizeSleepDurationHours(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  if (isNaN(n) || n <= 0) return null;

  if (n > 1000) {
    // Viene en segundos
    return Number((n / 3600).toFixed(2));
  }
  if (n > 24) {
    // Viene en minutos
    return Number((n / 60).toFixed(2));
  }
  // Viene en horas
  return Number(n.toFixed(2));
}

/**
 * Normaliza minutos de una fase (profundo, REM, ligero, despierto, siesta)
 * Soporta segundos (>1000) o minutos directos.
 */
export function normalizePhaseMinutes(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  if (isNaN(n) || n < 0) return null;

  if (n > 1000) {
    // Viene en segundos
    return Math.round(n / 60);
  }
  return Math.round(n);
}

/**
 * Estima la calidad 1-5 a partir de un score 0-100 si no se provee calidad
 */
export function scoreToQuality(score: number | null): number {
  if (!score || score <= 0) return 3;
  if (score >= 85) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 45) return 2;
  return 1;
}

/**
 * Parsea y normaliza un objeto individual de sueño proveniente de cualquier fuente wearable
 */
export function parseSingleSleepItem(raw: Record<string, unknown>): NormalizedSleepRecord | null {
  if (!raw || typeof raw !== "object") return null;

  // 1. Determinar la fecha de despertar en hora local Europe/Madrid
  // Prioridad 1: Fecha de fin de sueño / despertar (end_time, wake_time, sleep_end)
  const rawEnd =
    raw.end_time ??
    raw.endTime ??
    raw.sleep_end ??
    raw.wake_time ??
    raw.wake_up_time ??
    raw.wakeUpTime ??
    raw.stop_time ??
    raw.stopTime;

  let wakeDate = toMadridISODate(rawEnd);

  // Prioridad 2: Campo fecha explícito (date, fecha, day)
  if (!wakeDate) {
    wakeDate = toMadridISODate(raw.date ?? raw.fecha ?? raw.day);
  }

  // Prioridad 3: Fecha de inicio de sueño
  const rawStart =
    raw.start_time ??
    raw.startTime ??
    raw.sleep_start ??
    raw.bedtime ??
    raw.bed_time;

  if (!wakeDate && rawStart) {
    const startDate = toMadridISODate(rawStart);
    if (startDate) {
      // Si la hora de inicio es noche tardía (20:00 - 23:59), el despertar es el día siguiente
      const startHourStr = toMadridTimeString(rawStart);
      const startHour = startHourStr ? parseInt(startHourStr.split(":")[0], 10) : 23;
      if (startHour >= 19) {
        const [y, m, d] = startDate.split("-").map(Number);
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
        wakeDate = nextDay.toISOString().split("T")[0];
      } else {
        wakeDate = startDate;
      }
    }
  }

  if (!wakeDate) {
    // Fallback: Fecha local de hoy en Madrid
    wakeDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  // 2. Duración del sueño
  const rawDuration =
    raw.hours ??
    raw.sleep_duration ??
    raw.duration ??
    raw.duration_minutes ??
    raw.total_sleep_time ??
    raw.totalSleepTime ??
    raw.time_asleep ??
    raw.timeAsleep ??
    raw.minutes ??
    raw.total_minutes;

  const hours = normalizeSleepDurationHours(rawDuration);

  // 3. Fases de sueño
  const deepMin = normalizePhaseMinutes(
    raw.deep_min ??
      raw.deep_minutes ??
      raw.deep ??
      raw.deep_sleep_min ??
      raw.deepSleepTime ??
      raw.deep_sleep_time ??
      raw.deep_sleep_minutes
  );

  const remMin = normalizePhaseMinutes(
    raw.rem_min ??
      raw.rem_minutes ??
      raw.rem ??
      raw.rem_sleep_min ??
      raw.remSleepTime ??
      raw.rem_time ??
      raw.rem_sleep_time
  );

  const lightMin = normalizePhaseMinutes(
    raw.light_min ??
      raw.light_minutes ??
      raw.light ??
      raw.light_sleep_min ??
      raw.shallowSleepTime ??
      raw.light_sleep_time
  );

  const awakeMin = normalizePhaseMinutes(
    raw.awake_min ??
      raw.awake_minutes ??
      raw.awake ??
      raw.wake_min ??
      raw.wakeTime ??
      raw.wake_duration
  );

  // 4. Puntuación de recuperación / sueño (0-100)
  let score: number | null = null;
  const rawScore =
    raw.score ??
    raw.recovery_score ??
    raw.sleep_score ??
    raw.sleepScore ??
    raw.quality_score;
  if (rawScore != null && rawScore !== "") {
    const sc = Number(rawScore);
    if (!isNaN(sc) && sc >= 0 && sc <= 100) {
      score = Math.round(sc);
    }
  }

  // 5. Calidad subjetiva (1-5)
  let quality: number | null = null;
  if (raw.quality != null && raw.quality !== "") {
    const q = Number(raw.quality);
    if (!isNaN(q) && q >= 1 && q <= 5) {
      quality = Math.round(q);
    }
  }
  if (!quality && score) {
    quality = scoreToQuality(score);
  }

  // 6. Frecuencia cardíaca en reposo y HRV
  let restingHr: number | null = null;
  const rawRhr =
    raw.resting_hr ??
    raw.rest_hr ??
    raw.resting_heart_rate ??
    raw.restingHeartRate ??
    raw.min_hr ??
    raw.heart_rate_min ??
    raw.rhr ??
    raw.avg_hr;
  if (rawRhr != null && rawRhr !== "") {
    const r = Number(rawRhr);
    if (!isNaN(r) && r >= 30 && r <= 220) {
      restingHr = Math.round(r);
    }
  }

  let hrvRmssd: number | null = null;
  const rawHrv =
    raw.hrv_rmssd ??
    raw.hrv ??
    raw.rmssd ??
    raw.hrv_night ??
    raw.avg_hrv ??
    raw.hrvNight;
  if (rawHrv != null && rawHrv !== "") {
    const h = Number(rawHrv);
    if (!isNaN(h) && h >= 10 && h <= 300) {
      hrvRmssd = Math.round(h);
    }
  }

  // 7. Horarios acostarse / levantarse
  const sleepStart = toMadridTimeString(rawStart);
  const sleepEnd = toMadridTimeString(rawEnd);

  // 8. Eficiencia y Frecuencia Respiratoria
  let efficiency: number | null = null;
  const rawEff = raw.efficiency ?? raw.sleep_efficiency ?? raw.sleepEfficiency;
  if (rawEff != null && rawEff !== "") {
    const eff = Number(rawEff);
    if (!isNaN(eff) && eff >= 0 && eff <= 100) {
      efficiency = Math.round(eff);
    }
  }

  let respiratoryRate: number | null = null;
  const rawResp =
    raw.respiratory_rate ??
    raw.avg_respiratory_rate ??
    raw.breathing_rate ??
    raw.respiratoryRate;
  if (rawResp != null && rawResp !== "") {
    const resp = Number(rawResp);
    if (!isNaN(resp) && resp >= 5 && resp <= 40) {
      respiratoryRate = Number(resp.toFixed(1));
    }
  }

  // 9. Siestas
  const napMin = normalizePhaseMinutes(raw.nap_min ?? raw.nap_minutes ?? raw.naps_min);
  const napCount = raw.nap_count != null ? Number(raw.nap_count) : napMin ? 1 : null;
  const napNotes = raw.nap_notes ? String(raw.nap_notes) : null;

  return {
    date: wakeDate,
    hours: hours ?? undefined,
    score: score ?? undefined,
    quality: quality ?? undefined,
    deep_min: deepMin ?? undefined,
    rem_min: remMin ?? undefined,
    light_min: lightMin ?? undefined,
    awake_min: awakeMin ?? undefined,
    resting_hr: restingHr ?? undefined,
    hrv_rmssd: hrvRmssd ?? undefined,
    sleep_start: sleepStart ?? undefined,
    sleep_end: sleepEnd ?? undefined,
    efficiency: efficiency ?? undefined,
    respiratory_rate: respiratoryRate ?? undefined,
    nap_min: napMin ?? undefined,
    nap_count: napCount ?? undefined,
    nap_notes: napNotes ?? undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    source: (raw.source as string) || "zepp",
    raw_source: JSON.stringify(raw),
  };
}

/**
 * Parsea un payload entrante que puede ser un objeto, array, o contenedor de registros
 */
export function parseUniversalSleepPayload(payload: unknown): NormalizedSleepRecord[] {
  if (!payload) return [];

  // 1. Si es un array
  if (Array.isArray(payload)) {
    return payload
      .map((item) => parseSingleSleepItem(item))
      .filter((rec): rec is NormalizedSleepRecord => rec !== null);
  }

  // 2. Si es un objeto contenedor
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    // ZeppBridge / Make / Zapier contenedor: logs, sleep_sessions, records, data
    const list = obj.logs || obj.sleep_sessions || obj.sessions || obj.records || obj.data;
    if (Array.isArray(list)) {
      return list
        .map((item) => parseSingleSleepItem(item))
        .filter((rec): rec is NormalizedSleepRecord => rec !== null);
    }

    // Objeto único
    const single = parseSingleSleepItem(obj);
    return single ? [single] : [];
  }

  return [];
}
