import FitParser from "fit-file-parser";
import { toLocalISODate } from "@/lib/dates";

export type FitSport =
  | "carrera"
  | "natacion"
  | "gimnasio"
  | "crossfit"
  | "caminata"
  | "ciclismo"
  | "remo"
  | "otro";

export interface FitLap {
  index: number;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  avgCadence?: number | null;
  // Métricas específicas según deporte
  avgSpeedKmh?: number | null;
  avgPowerWatts?: number | null;
  pace100mFormatted?: string | null;
  totalStrokes?: number | null;
  avgSwolf?: number | null;
}

export interface FitZoneDistribution {
  r0Pct: number; // > 5:25 min/km (Regenerativo)
  r1Pct: number; // 5:25 - 4:59 min/km (Base Aeróbica)
  r2Pct: number; // 4:59 - 4:35 min/km (Tempo)
  r3Pct: number; // 4:35 - 4:10 min/km (Ritmo Maratón / Umbral)
  r5Pct: number; // < 4:10 min/km (Series / VAM)
  r0TimeSec: number;
  r1TimeSec: number;
  r2TimeSec: number;
  r3TimeSec: number;
  r5TimeSec: number;
  targetZoneName?: string | null;
  targetCompliancePct?: number | null;
  complianceVerdict?: string | null;
  complianceTone?: "positive" | "warning" | "neutral" | null;
}

export interface FitHrZoneDistribution {
  z1Sec: number; // Recuperación activa (<60% FCmax)
  z2Sec: number; // Base Aeróbica / Quema grasas (60-70% FCmax)
  z3Sec: number; // Tempo / Resistencia (70-80% FCmax)
  z4Sec: number; // Umbral anaeróbico (80-90% FCmax)
  z5Sec: number; // Potencia máxima / VO2max (>90% FCmax)
  z1Pct: number;
  z2Pct: number;
  z3Pct: number;
  z4Pct: number;
  z5Pct: number;
}

export interface FitSwimmingMetrics {
  poolLengthM?: number | null;
  totalLengths?: number | null;
  totalStrokes?: number | null;
  avgSwolf?: number | null;
  avgStrokeRate?: number | null;
  pacePer100mSec?: number | null;
  pacePer100mFormatted?: string | null;
}

export interface FitCyclingMetrics {
  avgPowerWatts?: number | null;
  maxPowerWatts?: number | null;
  normalizedPowerWatts?: number | null;
  avgSpeedKmh?: number | null;
  maxSpeedKmh?: number | null;
}

export interface FitTimeSeriesPoint {
  timeSec: number;
  timeFormatted: string;
  distanceKm: number;
  paceMinKm: number | null;
  speedKmh: number | null;
  heartRate: number | null;
  altitudeM: number | null;
  cadence: number | null;
  strideLengthM: number | null;
  powerWatts?: number | null;
  temperatureC?: number | null;
}

export interface FitBestEffort {
  label: string;
  distanceM: number;
  timeSec: number;
  timeFormatted: string;
  paceMinKm: number;
  paceFormatted: string;
  avgHeartRate: number | null;
}

export interface FitSplitHalves {
  firstHalfDistKm: number;
  firstHalfTimeSec: number;
  firstHalfPaceMinKm: number;
  firstHalfPaceFormatted: string;
  firstHalfAvgHr: number | null;
  secondHalfDistKm: number;
  secondHalfTimeSec: number;
  secondHalfPaceMinKm: number;
  secondHalfPaceFormatted: string;
  secondHalfAvgHr: number | null;
  paceDiffSec: number;
  splitType: "negativo" | "parejo" | "positivo";
  splitDescription: string;
}

export interface FitSlopeAnalysis {
  uphillPaceMinKm: number | null;
  uphillPaceFormatted: string;
  uphillDistanceKm: number;
  uphillTimeSec: number;
  flatPaceMinKm: number | null;
  flatPaceFormatted: string;
  flatDistanceKm: number;
  flatTimeSec: number;
  downhillPaceMinKm: number | null;
  downhillPaceFormatted: string;
  downhillDistanceKm: number;
  downhillTimeSec: number;
}

export interface FitPacingAnalysis {
  bestEfforts: FitBestEffort[];
  splitHalves: FitSplitHalves | null;
  slopeAnalysis: FitSlopeAnalysis | null;
  avgStrideLengthM?: number | null;
  maxStrideLengthM?: number | null;
  elevationGainM?: number | null;
  elevationLossM?: number | null;
  minAltitudeM?: number | null;
  maxAltitudeM?: number | null;
}

export interface FitDeepAnalysis {
  avgCadence?: number | null;
  maxCadence?: number | null;
  avgStrideLengthM?: number | null;
  maxStrideLengthM?: number | null;
  elevationGainM?: number | null;
  elevationLossM?: number | null;
  minAltitudeM?: number | null;
  maxAltitudeM?: number | null;
  aerobicDecouplingPct?: number | null; // % deriva cardiovascular
  pacingStabilityScore?: number | null; // 0-100 regularidad
  zoneDistribution?: FitZoneDistribution | null;
  hrZoneDistribution?: FitHrZoneDistribution | null;
  swimmingMetrics?: FitSwimmingMetrics | null;
  cyclingMetrics?: FitCyclingMetrics | null;
  trainingEffect?: number | null;
  anaerobicTrainingEffect?: number | null;
  recoveryTimeHours?: number | null;
  timeSeries?: FitTimeSeriesPoint[];
  pacingAnalysis?: FitPacingAnalysis;
}

export interface FitSummary {
  date: string; // YYYY-MM-DD
  startTime: string; // ISO completo
  sport: FitSport;
  sportRaw: string | null;
  subSportRaw: string | null;
  activityName: string;
  durationMin: number | null;
  distanceKm: number | null;
  avgPaceMinKm: number | null;
  avgSpeedKmh?: number | null;
  avgPowerWatts?: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  avgCadence: number | null;
  elevationGainM: number | null;
  laps: FitLap[];
  deepAnalysis: FitDeepAnalysis;
  timeSeries?: FitTimeSeriesPoint[];
  pacingAnalysis?: FitPacingAnalysis;
}

export function formatPace(minKm: number | null | undefined): string {
  if (minKm === null || minKm === undefined || !Number.isFinite(minKm) || minKm <= 0) return "—";
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  if (sec === 60) return `${min + 1}:00 min/km`;
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

export function mapSport(
  raw: string | undefined | null,
  subRaw?: string | undefined | null,
  workoutName?: string | undefined | null,
  distanceKm?: number | null
): FitSport {
  const s = (raw ?? "").toLowerCase();
  const sub = (subRaw ?? "").toLowerCase();
  const wkt = (workoutName ?? "").toLowerCase();
  const combined = `${s} ${sub} ${wkt}`;

  // 1. Detección de CrossFit / WOD / HIIT / Funcional
  if (
    combined.includes("crossfit") ||
    combined.includes("cross_fit") ||
    combined.includes("wod") ||
    combined.includes("freedom") ||
    combined.includes("emom") ||
    combined.includes("amrap") ||
    combined.includes("cross_training") ||
    combined.includes("crosstraining") ||
    combined.includes("funcional") ||
    combined.includes("functional") ||
    combined.includes("bootcamp") ||
    combined.includes("metcon")
  ) {
    return "crossfit";
  }

  // 2. Detección de Natación
  if (
    combined.includes("swim") ||
    combined.includes("piscina") ||
    combined.includes("openwater") ||
    combined.includes("open_water") ||
    combined.includes("aguas abiertas") ||
    combined.includes("natacion") ||
    combined.includes("natación")
  ) {
    return "natacion";
  }

  // 3. Detección de Caminata / Senderismo / Marcha
  if (
    combined.includes("walk") ||
    combined.includes("caminata") ||
    combined.includes("marcha") ||
    combined.includes("hike") ||
    combined.includes("hiking") ||
    combined.includes("senderismo") ||
    combined.includes("trek") ||
    combined.includes("trekking") ||
    combined.includes("mountaineering")
  ) {
    return "caminata";
  }

  // 4. Detección de Ciclismo / Bici / Rodillo
  if (
    combined.includes("cycl") ||
    combined.includes("bici") ||
    combined.includes("bike") ||
    combined.includes("ciclismo") ||
    combined.includes("spinning") ||
    combined.includes("gravel") ||
    combined.includes("mountain_bike") ||
    combined.includes("mtb") ||
    combined.includes("e_bike")
  ) {
    return "ciclismo";
  }

  // 5. Detección de Remo / SkiErg
  if (
    combined.includes("rowing") ||
    combined.includes("indoor_rowing") ||
    combined.includes("remo") ||
    combined.includes("skierg") ||
    combined.includes("ski_erg") ||
    combined.includes("kayak") ||
    combined.includes("paddle")
  ) {
    return "remo";
  }

  // 6. Detección de Gimnasio / Fuerza / Pesas / Musculación
  if (
    combined.includes("strength") ||
    combined.includes("fuerza") ||
    combined.includes("gimnasio") ||
    combined.includes("gym") ||
    combined.includes("pesas") ||
    combined.includes("weight") ||
    combined.includes("calistenia") ||
    combined.includes("fitness") ||
    combined.includes("training") ||
    combined.includes("cardio") ||
    combined.includes("pilates") ||
    combined.includes("bodybuilding") ||
    combined.includes("yoga") ||
    combined.includes("stretching") ||
    combined.includes("mobility")
  ) {
    return "gimnasio";
  }

  // 7. Detección de Carrera
  if (
    combined.includes("run") ||
    combined.includes("carrera") ||
    combined.includes("treadmill") ||
    combined.includes("trail") ||
    combined.includes("track") ||
    combined.includes("jogging")
  ) {
    if (
      distanceKm !== null &&
      distanceKm !== undefined &&
      distanceKm < 0.25 &&
      !combined.includes("treadmill") &&
      !combined.includes("indoor_running")
    ) {
      return "gimnasio";
    }
    return "carrera";
  }

  if (distanceKm !== null && distanceKm !== undefined && distanceKm < 0.25 && (s === "generic" || s === "")) {
    return "gimnasio";
  }

  return "otro";
}

export function detectActivityName(
  sport: FitSport,
  rawSport: string | null,
  rawSubSport: string | null,
  rawWorkoutName: string | null
): string {
  if (rawWorkoutName && rawWorkoutName.trim().length > 0) {
    return rawWorkoutName.trim();
  }

  const s = (rawSport ?? "").toLowerCase();
  const sub = (rawSubSport ?? "").toLowerCase();

  if (sport === "caminata") {
    if (s.includes("hike") || sub.includes("hike") || sub.includes("mountaineering")) return "Senderismo / Montaña";
    if (sub.includes("speed_walking") || sub.includes("marcha")) return "Marcha Rápida";
    return "Caminata";
  }

  if (sport === "ciclismo") {
    if (sub.includes("mountain") || sub.includes("mtb")) return "Ciclismo MTB";
    if (sub.includes("gravel")) return "Ciclismo Gravel";
    if (sub.includes("indoor") || sub.includes("spin")) return "Ciclismo Indoor / Rodillo";
    return "Ciclismo de Carretera";
  }

  if (sport === "crossfit") {
    if (sub.includes("hiit")) return "CrossFit (Metcon / HIIT)";
    if (sub.includes("strength")) return "CrossFit (Fuerza / Skill)";
    return "CrossFit WOD";
  }

  if (sport === "natacion") {
    if (sub.includes("open_water") || sub.includes("openwater")) return "Natación (Aguas abiertas)";
    if (sub.includes("lap") || sub.includes("pool")) return "Natación (Piscina)";
    return "Natación";
  }

  if (sport === "remo") {
    if (sub.includes("indoor") || s.includes("indoor")) return "Remo Indoor (Ergómetro)";
    if (s.includes("skierg")) return "SkiErg";
    return "Remo";
  }

  if (sport === "carrera") {
    if (sub.includes("trail")) return "Carrera Trail / Montaña";
    if (sub.includes("treadmill") || sub.includes("indoor")) return "Carrera en Cinta";
    if (sub.includes("track")) return "Carrera en Pista";
    return "Carrera";
  }

  if (sport === "gimnasio") {
    if (sub.includes("strength")) return "Fuerza / Musculación";
    if (sub.includes("cardio")) return "Cardio en Sala";
    if (sub.includes("hiit") || sub.includes("interval")) return "HIIT / Circuito";
    if (sub.includes("calisthenics") || sub.includes("calistenia")) return "Calistenia";
    if (sub.includes("yoga") || s.includes("yoga")) return "Yoga";
    if (sub.includes("pilates") || s.includes("pilates")) return "Pilates";
    if (sub.includes("stretch") || s.includes("mobility")) return "Movilidad y Estiramientos";
    return "Gimnasio";
  }

  return "Actividad .fit";
}

// Helpers de extracción polimórfica para múltiples marcas (Suunto, Garmin, Polar, Coros, Zepp, Apple, Wahoo)

export function extractHeartRate(obj: Record<string, unknown> | null | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;

  const directKeys = [
    "heart_rate",
    "avg_heart_rate",
    "avg_heartrate",
    "enhanced_heart_rate",
    "enhanced_avg_heart_rate",
    "heartRate",
    "avgHeartRate",
    "current_heart_rate",
    "hr",
    "heart_rate_bpm",
    "heartRateBpm",
    "average_heart_rate",
    "suunto_hr",
  ];

  for (const k of directKeys) {
    const val = obj[k];
    if (typeof val === "number" && !Number.isNaN(val) && val > 35 && val < 240) {
      return Math.round(val);
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    const lk = key.toLowerCase();
    if (lk.includes("max") || lk.includes("peak")) continue;
    if (
      lk.includes("heart") ||
      lk.includes("pulse") ||
      lk.includes("cardio") ||
      lk.includes("bpm") ||
      lk === "hr" ||
      lk.startsWith("hr_") ||
      lk.endsWith("_hr")
    ) {
      if (typeof val === "number" && !Number.isNaN(val) && val > 35 && val < 240) {
        return Math.round(val);
      }
    }
  }

  return null;
}

export function extractMaxHeartRate(obj: Record<string, unknown> | null | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;

  const directKeys = [
    "max_heart_rate",
    "max_heartrate",
    "enhanced_max_heart_rate",
    "maxHeartRate",
    "maximum_heart_rate",
    "peak_heart_rate",
  ];

  for (const k of directKeys) {
    const val = obj[k];
    if (typeof val === "number" && !Number.isNaN(val) && val > 35 && val < 240) {
      return Math.round(val);
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    const lk = key.toLowerCase();
    if (
      (lk.includes("max") || lk.includes("peak")) &&
      (lk.includes("heart") || lk.includes("hr") || lk.includes("pulse") || lk.includes("bpm"))
    ) {
      if (typeof val === "number" && !Number.isNaN(val) && val > 35 && val < 240) {
        return Math.round(val);
      }
    }
  }

  return null;
}

export function extractSpeedKmH(obj: Record<string, unknown> | null | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;

  const candidates = [
    obj.enhanced_speed,
    obj.speed,
    obj.speed_kmh,
    (obj as any).speedKmh,
    obj.avg_speed,
    obj.enhanced_avg_speed,
  ];

  for (const val of candidates) {
    if (typeof val === "number" && !Number.isNaN(val) && val > 0) {
      return Number(val.toFixed(2));
    }
  }
  return null;
}

export function extractDistanceKm(dist: unknown): number | null {
  if (typeof dist !== "number" || Number.isNaN(dist) || dist < 0) return null;
  if (dist > 50000) return Number((dist / 100000).toFixed(3)); // cm -> km
  if (dist > 50) return Number((dist / 1000).toFixed(3)); // m -> km
  return Number(dist.toFixed(3)); // ya en km
}

export function normalizeCadence(raw: unknown, isCycling: boolean = false): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 25) return null;
  // En ciclismo la cadencia suele ser 60-115 rpm (no se multiplica por 2)
  if (isCycling) return Math.round(raw);
  // En carrera/caminata, si viene en revoluciones de una sola pierna (<115), convertir a pasos/min
  if (raw < 115) return Math.round(raw * 2);
  return Math.round(raw);
}

export function extractCadence(obj: Record<string, unknown> | null | undefined, isCycling: boolean = false): number | null {
  if (!obj || typeof obj !== "object") return null;

  const candidates = [
    obj.cadence,
    obj.running_cadence,
    obj.avg_running_cadence,
    obj.avg_cadence,
    obj.fractional_cadence,
    (obj as any).runningCadence,
    (obj as any).avgCadence,
    (obj as any).steps_per_minute,
  ];

  for (const val of candidates) {
    const norm = normalizeCadence(val, isCycling);
    if (norm !== null) return norm;
  }
  return null;
}

export function extractPowerWatts(obj: Record<string, unknown> | null | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;
  const candidates = [
    obj.power,
    obj.avg_power,
    obj.normalized_power,
    obj.instantaneous_power,
    (obj as any).watts,
  ];
  for (const val of candidates) {
    if (typeof val === "number" && !Number.isNaN(val) && val > 0 && val < 2500) {
      return Math.round(val);
    }
  }
  return null;
}

export function computeHrZonesFromRecords(
  records: Record<string, unknown>[],
  maxHrUser: number = 190
): FitHrZoneDistribution | null {
  if (!records || records.length === 0) return null;

  let z1Sec = 0;
  let z2Sec = 0;
  let z3Sec = 0;
  let z4Sec = 0;
  let z5Sec = 0;
  let validRecords = 0;

  const z1Threshold = maxHrUser * 0.60;
  const z2Threshold = maxHrUser * 0.70;
  const z3Threshold = maxHrUser * 0.80;
  const z4Threshold = maxHrUser * 0.90;

  for (const r of records) {
    const hr = extractHeartRate(r);
    if (typeof hr !== "number" || hr < 40) continue;
    validRecords++;
    if (hr < z1Threshold) {
      z1Sec++;
    } else if (hr < z2Threshold) {
      z2Sec++;
    } else if (hr < z3Threshold) {
      z3Sec++;
    } else if (hr < z4Threshold) {
      z4Sec++;
    } else {
      z5Sec++;
    }
  }

  if (validRecords < 10) return null;
  const total = validRecords;
  return {
    z1Sec,
    z2Sec,
    z3Sec,
    z4Sec,
    z5Sec,
    z1Pct: Math.round((z1Sec / total) * 100),
    z2Pct: Math.round((z2Sec / total) * 100),
    z3Pct: Math.round((z3Sec / total) * 100),
    z4Pct: Math.round((z4Sec / total) * 100),
    z5Pct: Math.round((z5Sec / total) * 100),
  };
}

// Calcula la distribución en zonas VAM (R0, R1, R2, R3/R4, R5) para carrera
function computeZoneDistributionFromRecords(records: Record<string, unknown>[]): FitZoneDistribution | null {
  if (!records || records.length === 0) return null;

  let r0Sec = 0;
  let r1Sec = 0;
  let r2Sec = 0;
  let r3Sec = 0;
  let r5Sec = 0;
  let validRecords = 0;

  for (const r of records) {
    const speedKmH = extractSpeedKmH(r);
    if (typeof speedKmH !== "number" || speedKmH <= 1.0) continue;

    const paceMinKm = 60 / speedKmH;
    if (paceMinKm > 20 || paceMinKm < 2.2) continue;

    validRecords++;
    if (paceMinKm > 5.416) {
      r0Sec++;
    } else if (paceMinKm >= 4.983) {
      r1Sec++;
    } else if (paceMinKm >= 4.583) {
      r2Sec++;
    } else if (paceMinKm >= 4.166) {
      r3Sec++;
    } else {
      r5Sec++;
    }
  }

  if (validRecords < 10) return null;

  const total = validRecords;
  return {
    r0Pct: Math.round((r0Sec / total) * 100),
    r1Pct: Math.round((r1Sec / total) * 100),
    r2Pct: Math.round((r2Sec / total) * 100),
    r3Pct: Math.round((r3Sec / total) * 100),
    r5Pct: Math.round((r5Sec / total) * 100),
    r0TimeSec: r0Sec,
    r1TimeSec: r1Sec,
    r2TimeSec: r2Sec,
    r3TimeSec: r3Sec,
    r5TimeSec: r5Sec,
  };
}

// Genera splits por kilómetro a partir de los registros segundo a segundo
function buildKmSplitsFromRecords(records: Record<string, unknown>[], isCycling: boolean = false): FitLap[] {
  if (!records || records.length < 10) return [];

  const validRecords = records.filter((r) => r.timestamp);
  if (validRecords.length === 0) return [];

  let runningDist = 0;
  const processed = validRecords.map((r) => {
    const rawDist = extractDistanceKm(r.distance ?? (r as any).enhanced_distance);
    if (rawDist !== null && rawDist >= runningDist) {
      runningDist = rawDist;
    }
    return {
      raw: r,
      timestamp: new Date(r.timestamp as string | Date).getTime(),
      distKm: runningDist,
      hr: extractHeartRate(r),
      cadence: extractCadence(r, isCycling),
      speedKmH: extractSpeedKmH(r),
      power: extractPowerWatts(r),
    };
  });

  const splits: FitLap[] = [];
  let currentKm = 1;
  let kmStartIdx = 0;
  let kmStartDist = processed[0].distKm;
  let kmStartTime = processed[0].timestamp;
  const splitIntervalKm = isCycling ? 5.0 : 1.0;

  for (let i = 0; i < processed.length; i++) {
    const p = processed[i];
    const distDelta = p.distKm - kmStartDist;
    const isKmPassed = distDelta >= splitIntervalKm;
    const isLastRecord = i === processed.length - 1;

    if (isKmPassed || isLastRecord) {
      const segRecords = processed.slice(kmStartIdx, i + 1);
      const segDist = Math.max(0.05, p.distKm - kmStartDist);
      const segTimeMs = Math.max(3000, p.timestamp - kmStartTime);
      const segDurationMin = Number((segTimeMs / 60000).toFixed(2));
      const segPace = segDist > 0.05 ? Number((segDurationMin / segDist).toFixed(2)) : null;
      const segSpeed = segDurationMin > 0 ? Number((segDist / (segDurationMin / 60)).toFixed(1)) : null;

      const hrList = segRecords
        .map((x) => x.hr)
        .filter((h): h is number => typeof h === "number" && h > 40 && h < 235);
      const avgHr = hrList.length > 0 ? Math.round(hrList.reduce((a, b) => a + b, 0) / hrList.length) : null;
      const maxHr = hrList.length > 0 ? Math.max(...hrList) : null;

      const cadList = segRecords
        .map((x) => x.cadence)
        .filter((c): c is number => typeof c === "number" && c > 30);
      const avgCad = cadList.length > 0 ? Math.round(cadList.reduce((a, b) => a + b, 0) / cadList.length) : null;

      const powList = segRecords
        .map((x) => x.power)
        .filter((pw): pw is number => typeof pw === "number" && pw > 0);
      const avgPow = powList.length > 0 ? Math.round(powList.reduce((a, b) => a + b, 0) / powList.length) : null;

      if (segDist >= 0.1 || splits.length === 0 || !isLastRecord) {
        splits.push({
          index: currentKm,
          distanceKm: Number(segDist.toFixed(2)),
          durationMin: segDurationMin,
          avgPaceMinKm: segPace,
          avgSpeedKmh: segSpeed,
          avgPowerWatts: avgPow,
          avgHeartRate: avgHr,
          maxHeartRate: maxHr,
          avgCadence: avgCad,
        });
        currentKm++;
      }

      kmStartIdx = i + 1;
      kmStartDist = p.distKm;
      kmStartTime = p.timestamp;
    }
  }

  return splits;
}

function extractAltitudeM(r: Record<string, unknown> | undefined): number | null {
  if (!r) return null;
  const val = (r.enhanced_altitude as number | undefined) ?? (r.altitude as number | undefined) ?? (r.elevation as number | undefined);
  if (typeof val === "number" && Number.isFinite(val) && val > -500 && val < 9000) {
    return Math.round(val * 10) / 10;
  }
  return null;
}

function extractTemperatureC(r: Record<string, unknown> | undefined): number | null {
  if (!r) return null;
  const val = r.temperature as number | undefined;
  if (typeof val === "number" && Number.isFinite(val) && val >= -30 && val <= 60) {
    return Math.round(val);
  }
  return null;
}

function formatDurationSeconds(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m ${remS}s`;
  }
  return `${m}m ${remS.toString().padStart(2, "0")}s`;
}

function formatTimeMmSs(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m}:${remS.toString().padStart(2, "0")}`;
}

// Extrae una serie temporal continua optimizada para visualización gráfica (downsampled ~180-220 pts)
function buildTimeSeriesFromRecords(
  records: Record<string, unknown>[],
  isCycling: boolean = false,
  totalDurationMin: number | null = null,
  totalDistanceKm: number | null = null,
  targetCount: number = 200
): FitTimeSeriesPoint[] {
  if (!records || records.length === 0) return [];

  const validRecords = records.filter((r) => r.timestamp);
  if (validRecords.length < 5) return [];

  const startMs = new Date(validRecords[0].timestamp as string | Date).getTime();
  let runningDistKm = 0;

  // 1. Extraer y pre-procesar puntos
  const allPoints: FitTimeSeriesPoint[] = [];

  for (let i = 0; i < validRecords.length; i++) {
    const r = validRecords[i];
    const tMs = new Date(r.timestamp as string | Date).getTime();
    const timeSec = Math.max(0, Math.round((tMs - startMs) / 1000));

    const rawDist = extractDistanceKm(r.distance ?? (r as any).enhanced_distance);
    if (rawDist !== null && rawDist >= runningDistKm) {
      runningDistKm = rawDist;
    }

    const speedKmH = extractSpeedKmH(r);
    let paceMinKm: number | null = null;
    if (speedKmH && speedKmH > 1.2) {
      const rawPace = 60 / speedKmH;
      if (rawPace >= 2.0 && rawPace <= 18.0) {
        paceMinKm = Number(rawPace.toFixed(2));
      }
    }

    const hr = extractHeartRate(r);
    const altitude = extractAltitudeM(r);
    const cadence = extractCadence(r, isCycling);
    const power = extractPowerWatts(r);
    const temp = extractTemperatureC(r);

    let strideLengthM: number | null = null;
    if (!isCycling && cadence && cadence > 45 && speedKmH && speedKmH > 2.5) {
      const speedMS = speedKmH / 3.6;
      const stride = (speedMS * 60) / cadence;
      if (stride >= 0.4 && stride <= 2.6) {
        strideLengthM = Math.round(stride * 100) / 100;
      }
    }

    allPoints.push({
      timeSec,
      timeFormatted: formatTimeMmSs(timeSec),
      distanceKm: Number(runningDistKm.toFixed(3)),
      paceMinKm,
      speedKmh: speedKmH !== null ? Number(speedKmH.toFixed(1)) : null,
      heartRate: hr,
      altitudeM: altitude,
      cadence,
      strideLengthM,
      powerWatts: power,
      temperatureC: temp,
    });
  }

  if (allPoints.length <= targetCount) {
    return allPoints;
  }

  // 2. Downsampling uniforme preservando los extremos y suavizando el ritmo
  const step = allPoints.length / targetCount;
  const sampled: FitTimeSeriesPoint[] = [];

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(allPoints.length - 1, Math.round(i * step));
    const pt = allPoints[idx];

    // Ventana local de 5 puntos para suavizar ruido de GPS en ritmo
    const windowStart = Math.max(0, idx - 2);
    const windowEnd = Math.min(allPoints.length, idx + 3);
    const localPaces = allPoints
      .slice(windowStart, windowEnd)
      .map((p) => p.paceMinKm)
      .filter((p): p is number => typeof p === "number" && p > 0);

    const smoothedPace =
      localPaces.length > 0
        ? Number((localPaces.reduce((a, b) => a + b, 0) / localPaces.length).toFixed(2))
        : pt.paceMinKm;

    sampled.push({
      ...pt,
      paceMinKm: smoothedPace,
    });
  }

  // Asegurar que el último punto represente el final
  const lastOriginal = allPoints[allPoints.length - 1];
  sampled[sampled.length - 1] = {
    ...lastOriginal,
    paceMinKm: lastOriginal.paceMinKm,
  };

  return sampled;
}

// Calcula los mejores parciales de la sesión (400m, 1k, 2k, 3k, 5k, 10k)
function computeBestEffortsFromRecords(
  records: Record<string, unknown>[],
  laps: FitLap[],
  totalDistanceKm: number | null
): FitBestEffort[] {
  const targets = [
    { label: "400m", distM: 400 },
    { label: "1 km", distM: 1000 },
    { label: "2 km", distM: 2000 },
    { label: "3 km", distM: 3000 },
    { label: "5 km", distM: 5000 },
    { label: "10 km", distM: 10000 },
  ];

  const totalMeters = (totalDistanceKm ?? 0) * 1000;
  const bestEfforts: FitBestEffort[] = [];

  if (records && records.length >= 20) {
    const valid = records.filter((r) => r.timestamp);
    let runningM = 0;
    const series = valid.map((r) => {
      const dKm = extractDistanceKm(r.distance ?? (r as any).enhanced_distance);
      if (dKm !== null && dKm * 1000 >= runningM) {
        runningM = dKm * 1000;
      }
      return {
        distM: runningM,
        timeSec: Math.round(new Date(r.timestamp as string | Date).getTime() / 1000),
        hr: extractHeartRate(r),
      };
    });

    for (const tgt of targets) {
      if (totalMeters < tgt.distM * 0.95) continue;

      let bestTimeSec = Infinity;
      let bestPaceMinKm = Infinity;
      let bestAvgHr: number | null = null;
      let j = 0;

      for (let i = 0; i < series.length; i++) {
        while (j < series.length && series[j].distM - series[i].distM < tgt.distM) {
          j++;
        }
        if (j >= series.length) break;

        const deltaDistM = series[j].distM - series[i].distM;
        const deltaTimeSec = series[j].timeSec - series[i].timeSec;

        if (deltaDistM >= tgt.distM * 0.98 && deltaTimeSec > 10) {
          const paceMinKm = deltaTimeSec / 60 / (deltaDistM / 1000);
          if (paceMinKm < bestPaceMinKm && paceMinKm >= 2.0) {
            bestPaceMinKm = paceMinKm;
            bestTimeSec = Math.round(paceMinKm * (tgt.distM / 1000) * 60);

            const hrSlice = series
              .slice(i, j + 1)
              .map((s) => s.hr)
              .filter((h): h is number => typeof h === "number");
            bestAvgHr = hrSlice.length > 0 ? Math.round(hrSlice.reduce((a, b) => a + b, 0) / hrSlice.length) : null;
          }
        }
      }

      if (Number.isFinite(bestPaceMinKm)) {
        bestEfforts.push({
          label: tgt.label,
          distanceM: tgt.distM,
          timeSec: bestTimeSec,
          timeFormatted: formatDurationSeconds(bestTimeSec),
          paceMinKm: Number(bestPaceMinKm.toFixed(2)),
          paceFormatted: formatPace(bestPaceMinKm),
          avgHeartRate: bestAvgHr,
        });
      }
    }
  }

  // Fallback si no hay records continuos o quedaron vacíos, usar laps
  if (bestEfforts.length === 0 && laps.length > 0) {
    const valid1kLaps = laps.filter((l) => (l.distanceKm ?? 0) >= 0.85 && l.avgPaceMinKm && l.avgPaceMinKm > 2.0);
    if (valid1kLaps.length > 0) {
      const sortedByPace = [...valid1kLaps].sort((a, b) => (a.avgPaceMinKm as number) - (b.avgPaceMinKm as number));
      const fastest = sortedByPace[0];
      const timeSec = Math.round((fastest.durationMin as number) * 60);
      bestEfforts.push({
        label: "1 km",
        distanceM: 1000,
        timeSec,
        timeFormatted: formatDurationSeconds(timeSec),
        paceMinKm: fastest.avgPaceMinKm as number,
        paceFormatted: formatPace(fastest.avgPaceMinKm),
        avgHeartRate: fastest.avgHeartRate ?? null,
      });
    }
  }

  return bestEfforts;
}

// Analiza los splits de la 1ª mitad vs la 2ª mitad (Split Negativo vs Positivo)
function computeSplitHalves(
  records: Record<string, unknown>[],
  laps: FitLap[],
  totalDistanceKm: number | null
): FitSplitHalves | null {
  if (!totalDistanceKm || totalDistanceKm < 0.8) return null;
  const halfDist = totalDistanceKm / 2;

  // Intento 1: Calcular con records continuos
  if (records && records.length >= 30) {
    const valid = records.filter((r) => r.timestamp);
    let runningM = 0;
    const startSec = Math.round(new Date(valid[0].timestamp as string | Date).getTime() / 1000);
    const series = valid.map((r) => {
      const dKm = extractDistanceKm(r.distance ?? (r as any).enhanced_distance);
      if (dKm !== null && dKm * 1000 >= runningM) {
        runningM = dKm * 1000;
      }
      return {
        distKm: runningM / 1000,
        timeSec: Math.round(new Date(r.timestamp as string | Date).getTime() / 1000) - startSec,
        hr: extractHeartRate(r),
      };
    });

    const midIdx = series.findIndex((s) => s.distKm >= halfDist);
    if (midIdx > 5 && midIdx < series.length - 5) {
      const midPoint = series[midIdx];
      const lastPoint = series[series.length - 1];

      const h1Dist = midPoint.distKm;
      const h1Time = midPoint.timeSec;
      const h1Pace = h1Dist > 0.2 ? Number((h1Time / 60 / h1Dist).toFixed(2)) : 0;
      const h1Hrs = series
        .slice(0, midIdx)
        .map((s) => s.hr)
        .filter((h): h is number => typeof h === "number");
      const h1AvgHr = h1Hrs.length > 0 ? Math.round(h1Hrs.reduce((a, b) => a + b, 0) / h1Hrs.length) : null;

      const h2Dist = Math.max(0.1, lastPoint.distKm - midPoint.distKm);
      const h2Time = Math.max(10, lastPoint.timeSec - midPoint.timeSec);
      const h2Pace = h2Dist > 0.2 ? Number((h2Time / 60 / h2Dist).toFixed(2)) : 0;
      const h2Hrs = series
        .slice(midIdx)
        .map((s) => s.hr)
        .filter((h): h is number => typeof h === "number");
      const h2AvgHr = h2Hrs.length > 0 ? Math.round(h2Hrs.reduce((a, b) => a + b, 0) / h2Hrs.length) : null;

      const paceDiffSec = Math.round((h2Pace - h1Pace) * 60);
      let splitType: FitSplitHalves["splitType"] = "parejo";
      let splitDescription = "";

      if (paceDiffSec <= -3) {
        splitType = "negativo";
        splitDescription = `Segunda mitad ${Math.abs(paceDiffSec)}s/km más rápida (${formatPace(h2Pace)} vs ${formatPace(h1Pace)}). Excelente progresión y reserva de energía.`;
      } else if (Math.abs(paceDiffSec) < 3) {
        splitType = "parejo";
        splitDescription = `Ritmo parejo y uniforme en ambas mitades (diferencia de solo ${Math.abs(paceDiffSec)}s/km). Gran control del ritmo crucero.`;
      } else {
        splitType = "positivo";
        splitDescription = `Segunda mitad ${paceDiffSec}s/km más lenta (${formatPace(h2Pace)} vs ${formatPace(h1Pace)}). Ligera desaceleración o fatiga en el tramo final.`;
      }

      return {
        firstHalfDistKm: Number(h1Dist.toFixed(2)),
        firstHalfTimeSec: h1Time,
        firstHalfPaceMinKm: h1Pace,
        firstHalfPaceFormatted: formatPace(h1Pace),
        firstHalfAvgHr: h1AvgHr,
        secondHalfDistKm: Number(h2Dist.toFixed(2)),
        secondHalfTimeSec: h2Time,
        secondHalfPaceMinKm: h2Pace,
        secondHalfPaceFormatted: formatPace(h2Pace),
        secondHalfAvgHr: h2AvgHr,
        paceDiffSec,
        splitType,
        splitDescription,
      };
    }
  }

  // Intento 2: Calcular a partir de laps si hay al menos 2
  if (laps && laps.length >= 2) {
    const midLap = Math.floor(laps.length / 2);
    const h1Laps = laps.slice(0, midLap);
    const h2Laps = laps.slice(midLap);

    const calcLapHalf = (arr: FitLap[]) => {
      const d = arr.reduce((acc, cur) => acc + (cur.distanceKm ?? 0), 0);
      const tMin = arr.reduce((acc, cur) => acc + (cur.durationMin ?? 0), 0);
      const pace = d > 0.2 ? Number((tMin / d).toFixed(2)) : 0;
      const hrs = arr.map((l) => l.avgHeartRate).filter((h): h is number => typeof h === "number");
      const avgHr = hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
      return { d, tSec: Math.round(tMin * 60), pace, avgHr };
    };

    const h1 = calcLapHalf(h1Laps);
    const h2 = calcLapHalf(h2Laps);
    const paceDiffSec = Math.round((h2.pace - h1.pace) * 60);

    let splitType: FitSplitHalves["splitType"] = "parejo";
    let splitDescription = "";
    if (paceDiffSec <= -3) {
      splitType = "negativo";
      splitDescription = `Segunda mitad ${Math.abs(paceDiffSec)}s/km más rápida (${formatPace(h2.pace)} vs ${formatPace(h1.pace)}). Excelente split negativo.`;
    } else if (Math.abs(paceDiffSec) < 3) {
      splitType = "parejo";
      splitDescription = `Ritmo uniforme y regular en ambas mitades (${formatPace(h1.pace)} y ${formatPace(h2.pace)}).`;
    } else {
      splitType = "positivo";
      splitDescription = `Segunda mitad ${paceDiffSec}s/km más lenta (${formatPace(h2.pace)} vs ${formatPace(h1.pace)}).`;
    }

    return {
      firstHalfDistKm: Number(h1.d.toFixed(2)),
      firstHalfTimeSec: h1.tSec,
      firstHalfPaceMinKm: h1.pace,
      firstHalfPaceFormatted: formatPace(h1.pace),
      firstHalfAvgHr: h1.avgHr,
      secondHalfDistKm: Number(h2.d.toFixed(2)),
      secondHalfTimeSec: h2.tSec,
      secondHalfPaceMinKm: h2.pace,
      secondHalfPaceFormatted: formatPace(h2.pace),
      secondHalfAvgHr: h2.avgHr,
      paceDiffSec,
      splitType,
      splitDescription,
    };
  }

  return null;
}

// Analiza los ritmos en subida, llano y bajada a partir del perfil altimétrico
function computeSlopeAnalysis(records: Record<string, unknown>[]): FitSlopeAnalysis | null {
  if (!records || records.length < 30) return null;

  const valid = records.filter((r) => r.timestamp && extractAltitudeM(r) !== null);
  if (valid.length < 20) return null;

  let upDist = 0,
    upTime = 0;
  let flatDist = 0,
    flatTime = 0;
  let downDist = 0,
    downTime = 0;

  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const curr = valid[i];

    const d1 = extractDistanceKm(prev.distance ?? (prev as any).enhanced_distance) ?? 0;
    const d2 = extractDistanceKm(curr.distance ?? (curr as any).enhanced_distance) ?? 0;
    const distDeltaM = Math.max(0, (d2 - d1) * 1000);

    const t1 = new Date(prev.timestamp as string | Date).getTime();
    const t2 = new Date(curr.timestamp as string | Date).getTime();
    const timeDeltaSec = Math.max(0, (t2 - t1) / 1000);

    const a1 = extractAltitudeM(prev) ?? 0;
    const a2 = extractAltitudeM(curr) ?? 0;
    const altDeltaM = a2 - a1;

    if (distDeltaM >= 1 && distDeltaM <= 120 && timeDeltaSec >= 1 && timeDeltaSec <= 30) {
      const grade = (altDeltaM / distDeltaM) * 100;
      if (grade > 2.0) {
        upDist += distDeltaM / 1000;
        upTime += timeDeltaSec;
      } else if (grade < -2.0) {
        downDist += distDeltaM / 1000;
        downTime += timeDeltaSec;
      } else {
        flatDist += distDeltaM / 1000;
        flatTime += timeDeltaSec;
      }
    }
  }

  const calcPace = (distKm: number, timeSec: number) => {
    if (distKm >= 0.08 && timeSec >= 10) {
      return Number((timeSec / 60 / distKm).toFixed(2));
    }
    return null;
  };

  const uphillPace = calcPace(upDist, upTime);
  const flatPace = calcPace(flatDist, flatTime);
  const downhillPace = calcPace(downDist, downTime);

  if (!uphillPace && !flatPace && !downhillPace) return null;

  return {
    uphillPaceMinKm: uphillPace,
    uphillPaceFormatted: formatPace(uphillPace),
    uphillDistanceKm: Number(upDist.toFixed(2)),
    uphillTimeSec: Math.round(upTime),
    flatPaceMinKm: flatPace,
    flatPaceFormatted: formatPace(flatPace),
    flatDistanceKm: Number(flatDist.toFixed(2)),
    flatTimeSec: Math.round(flatTime),
    downhillPaceMinKm: downhillPace,
    downhillPaceFormatted: formatPace(downhillPace),
    downhillDistanceKm: Number(downDist.toFixed(2)),
    downhillTimeSec: Math.round(downTime),
  };
}

// Combina todos los análisis avanzados de ritmo y biomecánica
function computePacingAnalysis(
  records: Record<string, unknown>[],
  laps: FitLap[],
  isCycling: boolean,
  totalDistanceKm: number | null,
  durationMin: number | null,
  elevationGainM: number | null,
  elevationLossM: number | null
): FitPacingAnalysis {
  const bestEfforts = computeBestEffortsFromRecords(records, laps, totalDistanceKm);
  const splitHalves = computeSplitHalves(records, laps, totalDistanceKm);
  const slopeAnalysis = computeSlopeAnalysis(records);

  let avgStrideLengthM: number | null = null;
  let maxStrideLengthM: number | null = null;
  let minAltitudeM: number | null = null;
  let maxAltitudeM: number | null = null;

  if (records && records.length >= 10) {
    const altitudes = records.map(extractAltitudeM).filter((a): a is number => typeof a === "number");
    if (altitudes.length > 0) {
      minAltitudeM = Math.round(Math.min(...altitudes));
      maxAltitudeM = Math.round(Math.max(...altitudes));
    }

    if (!isCycling) {
      const strides: number[] = [];
      for (const r of records) {
        const sp = extractSpeedKmH(r);
        const cad = extractCadence(r, isCycling);
        if (sp && sp > 2.5 && cad && cad > 45) {
          const s = ((sp / 3.6) * 60) / cad;
          if (s >= 0.4 && s <= 2.5) strides.push(s);
        }
      }
      if (strides.length > 10) {
        avgStrideLengthM = Math.round((strides.reduce((a, b) => a + b, 0) / strides.length) * 100) / 100;
        maxStrideLengthM = Math.round(Math.max(...strides) * 100) / 100;
      }
    }
  }

  // Fallback para zancada a partir de distancia y cadencia media
  if (avgStrideLengthM === null && !isCycling && totalDistanceKm && durationMin && durationMin > 0) {
    const avgCad = laps.find((l) => l.avgCadence)?.avgCadence ?? null;
    if (avgCad && avgCad > 45) {
      const totalSteps = avgCad * durationMin;
      const stride = (totalDistanceKm * 1000) / totalSteps;
      if (stride >= 0.4 && stride <= 2.5) {
        avgStrideLengthM = Math.round(stride * 100) / 100;
      }
    }
  }

  return {
    bestEfforts,
    splitHalves,
    slopeAnalysis,
    avgStrideLengthM,
    maxStrideLengthM,
    elevationGainM,
    elevationLossM,
    minAltitudeM,
    maxAltitudeM,
  };
}

export function parseFitBuffer(buffer: Buffer): Promise<FitSummary> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "km",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    parser.parse(buffer as unknown as ArrayBuffer, (error, parsed) => {
      if (error || !parsed) {
        reject(new Error(typeof error === "string" ? error : "No se pudo leer el archivo .fit"));
        return;
      }
      const data = parsed as unknown as Record<string, unknown>;

      const sessions = (data.sessions as Record<string, unknown>[] | undefined) ?? [];
      const activity = (data.activity as Record<string, unknown> | undefined) ?? {};
      const workout = (data.workout as Record<string, unknown> | undefined) ?? {};
      const session = sessions[0] ?? {};

      const startRaw = (session.start_time ?? activity.timestamp) as string | Date | undefined;
      const startDate = startRaw ? new Date(startRaw) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) {
        reject(new Error("El archivo .fit no trae una fecha de inicio reconocible."));
        return;
      }

      const rawRecords = (data.records as Record<string, unknown>[] | undefined) ?? [];

      const totalTimerTimeSec = (session.total_timer_time as number | undefined) ?? (session.total_elapsed_time as number | undefined) ?? null;
      let totalDistanceKm = extractDistanceKm(session.total_distance ?? (session as any).enhanced_distance);
      if ((totalDistanceKm === null || totalDistanceKm === 0) && rawRecords.length > 0) {
        const lastDist = extractDistanceKm(rawRecords[rawRecords.length - 1].distance ?? (rawRecords[rawRecords.length - 1] as any).enhanced_distance);
        if (typeof lastDist === "number" && lastDist > 0) {
          totalDistanceKm = Number(lastDist.toFixed(2));
        }
      }

      const durationMin = totalTimerTimeSec !== null
        ? Math.round((totalTimerTimeSec / 60) * 10) / 10
        : rawRecords.length > 0
        ? Math.round((rawRecords.length / 60) * 10) / 10
        : null;

      const avgPaceMinKm =
        durationMin !== null && totalDistanceKm && totalDistanceKm > 0
          ? Number((durationMin / totalDistanceKm).toFixed(2))
          : null;

      const rawSport = (session.sport as string | undefined) ?? null;
      const rawSubSport = (session.sub_sport as string | undefined) ?? null;
      const rawWorkoutName =
        (workout.wkt_name as string | undefined) ??
        (workout.workout_name as string | undefined) ??
        (session.workout_name as string | undefined) ??
        (session.sport_name as string | undefined) ??
        null;

      const sport = mapSport(rawSport, rawSubSport, rawWorkoutName, totalDistanceKm);
      const activityName = detectActivityName(sport, rawSport, rawSubSport, rawWorkoutName);
      const isCycling = sport === "ciclismo";
      const isSwimming = sport === "natacion";

      // Desglose de vueltas / laps
      const rawLaps = (data.laps as Record<string, unknown>[] | undefined) ?? [];
      let laps: FitLap[] = [];

      if (rawLaps.length > 1) {
        laps = rawLaps.map((lap, i) => {
          const lapTimeSec = (lap.total_timer_time as number | undefined) ?? (lap.total_elapsed_time as number | undefined) ?? null;
          const lapDistKm = extractDistanceKm(lap.total_distance ?? (lap as any).enhanced_distance);
          const lapDurationMin = lapTimeSec !== null ? Math.round((lapTimeSec / 60) * 100) / 100 : null;
          const lapPace =
            lapDurationMin !== null && lapDistKm && lapDistKm > 0
              ? Number((lapDurationMin / lapDistKm).toFixed(2))
              : null;
          const lapSpeed =
            lapDurationMin !== null && lapDurationMin > 0 && lapDistKm && lapDistKm > 0
              ? Number((lapDistKm / (lapDurationMin / 60)).toFixed(1))
              : null;

          const rawCad = extractCadence(lap, isCycling);
          const avgLapHr = extractHeartRate(lap);
          const maxLapHr = extractMaxHeartRate(lap);
          const lapPower = extractPowerWatts(lap);

          let pace100mFormatted: string | null = null;
          if (isSwimming && lapDistKm && lapDistKm > 0 && lapDurationMin) {
            const distM = lapDistKm * 1000;
            const sec100m = (lapDurationMin * 60) / (distM / 100);
            const m = Math.floor(sec100m / 60);
            const s = Math.round(sec100m % 60);
            pace100mFormatted = `${m}:${s.toString().padStart(2, "0")} /100m`;
          }

          return {
            index: i + 1,
            distanceKm: lapDistKm !== null ? Number(lapDistKm.toFixed(2)) : null,
            durationMin: lapDurationMin,
            avgPaceMinKm: lapPace,
            avgSpeedKmh: lapSpeed,
            avgPowerWatts: lapPower,
            pace100mFormatted,
            avgHeartRate: avgLapHr,
            maxHeartRate: maxLapHr,
            avgCadence: rawCad,
            totalStrokes: (lap.total_strokes as number | undefined) ?? null,
            avgSwolf: (lap.avg_swolf as number | undefined) ?? null,
          };
        });

        const hasHrInLaps = laps.some((l) => l.avgHeartRate !== null);
        if (!hasHrInLaps && rawRecords.length >= 20 && !isSwimming) {
          const splitLaps = buildKmSplitsFromRecords(rawRecords, isCycling);
          if (splitLaps.length > 0 && splitLaps.some((s) => s.avgHeartRate !== null)) {
            laps = splitLaps;
          }
        }
      } else if (rawRecords.length >= 20 && (sport === "carrera" || sport === "caminata" || isCycling)) {
        laps = buildKmSplitsFromRecords(rawRecords, isCycling);
      }

      // Pulso cardíaco global
      const allHrs = rawRecords
        .map(extractHeartRate)
        .filter((h): h is number => typeof h === "number" && h > 40 && h < 235);
      const calculatedAvgHr = allHrs.length > 0 ? Math.round(allHrs.reduce((a, b) => a + b, 0) / allHrs.length) : null;
      const calculatedMaxHr = allHrs.length > 0 ? Math.max(...allHrs) : null;

      const sessionAvgHr = extractHeartRate(session) ?? (activity ? extractHeartRate(activity) : null);
      const sessionMaxHr = extractMaxHeartRate(session) ?? (activity ? extractMaxHeartRate(activity) : null);

      const avgHeartRate = sessionAvgHr ?? calculatedAvgHr;
      const maxHeartRate = sessionMaxHr ?? calculatedMaxHr;

      // Cadencia global
      const allCads = rawRecords
        .map((r) => extractCadence(r, isCycling))
        .filter((c): c is number => typeof c === "number" && c > 25);
      const calculatedAvgCad = allCads.length > 0 ? Math.round(allCads.reduce((a, b) => a + b, 0) / allCads.length) : null;
      const calculatedMaxCad = allCads.length > 0 ? Math.max(...allCads) : null;
      const avgCadence = extractCadence(session, isCycling) ?? calculatedAvgCad;
      const maxCadence = (session.max_running_cadence as number | undefined) ? normalizeCadence(session.max_running_cadence, isCycling) : calculatedMaxCad;

      // Velocidad y Potencia
      const avgSpeedKmh =
        durationMin && totalDistanceKm && totalDistanceKm > 0
          ? Number((totalDistanceKm / (durationMin / 60)).toFixed(1))
          : (session.avg_speed as number | undefined) ?? null;
      const avgPowerWatts = extractPowerWatts(session);

      // Altimetría
      const elevationGainM = (session.total_ascent as number | undefined) ?? (session.enhanced_total_ascent as number | undefined) ?? null;
      const elevationLossM = (session.total_descent as number | undefined) ?? (session.enhanced_total_descent as number | undefined) ?? null;

      // Métricas de Natación
      let swimmingMetrics: FitSwimmingMetrics | null = null;
      if (isSwimming) {
        let pacePer100mSec: number | null = null;
        let pacePer100mFormatted: string | null = null;
        if (totalDistanceKm && totalDistanceKm > 0 && durationMin) {
          const totalMeters = totalDistanceKm * 1000;
          pacePer100mSec = Math.round((durationMin * 60) / (totalMeters / 100));
          const m = Math.floor(pacePer100mSec / 60);
          const s = Math.round(pacePer100mSec % 60);
          pacePer100mFormatted = `${m}:${s.toString().padStart(2, "0")} /100m`;
        }
        swimmingMetrics = {
          poolLengthM: (session.pool_length as number | undefined) ?? null,
          totalLengths: (session.num_lengths as number | undefined) ?? (session.num_active_lengths as number | undefined) ?? null,
          totalStrokes: (session.total_strokes as number | undefined) ?? null,
          avgSwolf: (session.avg_swolf as number | undefined) ?? null,
          avgStrokeRate: (session.avg_stroke_rate as number | undefined) ?? null,
          pacePer100mSec,
          pacePer100mFormatted,
        };
      }

      // Métricas de Ciclismo
      let cyclingMetrics: FitCyclingMetrics | null = null;
      if (isCycling) {
        cyclingMetrics = {
          avgPowerWatts,
          maxPowerWatts: (session.max_power as number | undefined) ?? null,
          normalizedPowerWatts: (session.normalized_power as number | undefined) ?? null,
          avgSpeedKmh,
          maxSpeedKmh: (session.max_speed as number | undefined) ?? null,
        };
      }

      // Distribución de Zonas VAM (para carrera) y Zonas FC (para todos los deportes)
      let zoneDistribution: FitZoneDistribution | null = null;
      if (sport === "carrera") {
        zoneDistribution = computeZoneDistributionFromRecords(rawRecords);
      }
      const hrZoneDistribution = computeHrZonesFromRecords(rawRecords, maxHeartRate ?? 190);

      // Desacoplamiento cardiovascular
      let aerobicDecouplingPct: number | null = null;
      if (laps.length >= 3 && (sport === "carrera" || isCycling)) {
        const validLaps = laps.filter((l) => l.avgPaceMinKm !== null && l.avgHeartRate !== null && (l.avgHeartRate ?? 0) > 80);
        if (validLaps.length >= 3) {
          const mid = Math.floor(validLaps.length / 2);
          const firstHalf = validLaps.slice(0, mid);
          const secondHalf = validLaps.slice(mid);
          const calcEfficiency = (arr: typeof validLaps) => {
            const avgP = arr.reduce((acc, cur) => acc + (cur.avgPaceMinKm as number), 0) / arr.length;
            const avgHr = arr.reduce((acc, cur) => acc + (cur.avgHeartRate as number), 0) / arr.length;
            const speedMMin = avgP > 0 ? 1000 / avgP : 0;
            return speedMMin / avgHr;
          };
          const eff1 = calcEfficiency(firstHalf);
          const eff2 = calcEfficiency(secondHalf);
          if (eff1 > 0 && eff2 > 0) {
            aerobicDecouplingPct = Math.round(((eff1 - eff2) / eff1) * 1000) / 10;
          }
        }
      }

      // Estabilidad de ritmo
      let pacingStabilityScore: number | null = null;
      if (laps.length >= 3) {
        const paces = laps.map((l) => l.avgPaceMinKm).filter((p): p is number => typeof p === "number" && p > 0);
        if (paces.length >= 3) {
          const meanPace = paces.reduce((a, b) => a + b, 0) / paces.length;
          const variance = paces.reduce((acc, val) => acc + Math.pow(val - meanPace, 2), 0) / paces.length;
          const stdDev = Math.sqrt(variance);
          const score = Math.max(0, Math.min(100, Math.round(100 - (stdDev * 60) * 1.6)));
          pacingStabilityScore = score;
        }
      }

      const trainingEffect = (session.total_training_effect as number | undefined) ?? null;
      const anaerobicTrainingEffect = (session.total_anaerobic_effect as number | undefined) ?? null;
      const recoveryTimeHours = (session.recovery_time as number | undefined) ? Math.round((session.recovery_time as number) / 60) : null;

      const timeSeries = buildTimeSeriesFromRecords(rawRecords, isCycling, durationMin, totalDistanceKm);
      const pacingAnalysis = computePacingAnalysis(rawRecords, laps, isCycling, totalDistanceKm, durationMin, elevationGainM, elevationLossM);

      const deepAnalysis: FitDeepAnalysis = {
        avgCadence,
        maxCadence,
        avgStrideLengthM: pacingAnalysis.avgStrideLengthM,
        maxStrideLengthM: pacingAnalysis.maxStrideLengthM,
        elevationGainM,
        elevationLossM,
        minAltitudeM: pacingAnalysis.minAltitudeM,
        maxAltitudeM: pacingAnalysis.maxAltitudeM,
        aerobicDecouplingPct,
        pacingStabilityScore,
        zoneDistribution,
        hrZoneDistribution,
        swimmingMetrics,
        cyclingMetrics,
        trainingEffect,
        anaerobicTrainingEffect,
        recoveryTimeHours,
        timeSeries,
        pacingAnalysis,
      };

      // Lap por defecto si no hay vueltas
      if (laps.length === 0 && durationMin !== null) {
        laps = [
          {
            index: 1,
            distanceKm: totalDistanceKm,
            durationMin,
            avgPaceMinKm,
            avgSpeedKmh,
            avgPowerWatts,
            avgHeartRate,
            maxHeartRate,
            avgCadence,
          },
        ];
      }

      resolve({
        date: toLocalISODate(startDate),
        startTime: startDate.toISOString(),
        sport,
        sportRaw: rawSport,
        subSportRaw: rawSubSport,
        activityName,
        durationMin,
        distanceKm: totalDistanceKm !== null ? Number(totalDistanceKm.toFixed(2)) : null,
        avgPaceMinKm,
        avgSpeedKmh,
        avgPowerWatts,
        avgHeartRate,
        maxHeartRate,
        calories: (session.total_calories as number | undefined) ?? null,
        avgCadence,
        elevationGainM,
        laps,
        deepAnalysis,
        timeSeries,
        pacingAnalysis,
      });
    });
  });
}
