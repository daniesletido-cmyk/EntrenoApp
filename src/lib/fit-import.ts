import FitParser from "fit-file-parser";
import { toLocalISODate } from "@/lib/dates";

export type FitSport = "carrera" | "natacion" | "gimnasio" | "crossfit" | "otro";

export interface FitLap {
  index: number;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  avgCadence?: number | null;
}

export interface FitZoneDistribution {
  r0Pct: number; // > 5:25 min/km
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

export interface FitDeepAnalysis {
  avgCadence?: number | null;
  maxCadence?: number | null;
  elevationGainM?: number | null;
  elevationLossM?: number | null;
  aerobicDecouplingPct?: number | null; // % deriva cardiovascular
  pacingStabilityScore?: number | null; // 0-100 regularidad
  zoneDistribution?: FitZoneDistribution | null;
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
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  avgCadence: number | null;
  elevationGainM: number | null;
  laps: FitLap[];
  deepAnalysis: FitDeepAnalysis;
}

function mapSport(
  raw: string | undefined | null,
  subRaw?: string | undefined | null,
  workoutName?: string | undefined | null,
  distanceKm?: number | null
): FitSport {
  const s = (raw ?? "").toLowerCase();
  const sub = (subRaw ?? "").toLowerCase();
  const wkt = (workoutName ?? "").toLowerCase();
  const combined = `${s} ${sub} ${wkt}`;

  // 1. Detección específica de CrossFit / WOD / Funcional / HIIT
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
    combined.includes("functional")
  ) {
    return "crossfit";
  }

  // 2. Detección de Natación
  if (
    combined.includes("swim") ||
    combined.includes("piscina") ||
    combined.includes("openwater") ||
    combined.includes("aguas abiertas") ||
    combined.includes("natacion") ||
    combined.includes("natación")
  ) {
    return "natacion";
  }

  // 3. Detección de Gimnasio / Fuerza / Pesas
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
    combined.includes("bodybuilding")
  ) {
    return "gimnasio";
  }

  // 4. Detección de Carrera
  if (
    combined.includes("run") ||
    combined.includes("carrera") ||
    combined.includes("treadmill") ||
    combined.includes("trail") ||
    combined.includes("track") ||
    combined.includes("jogging")
  ) {
    // Si la distancia es insignificante (<0.25 km) con duración > 10 min y no es cinta explícita, suele ser sala/gimnasio
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

function detectActivityName(
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

  if (sport === "crossfit") {
    if (sub.includes("hiit")) return "CrossFit (Metcon / HIIT)";
    if (sub.includes("strength")) return "CrossFit (Fuerza / Skill)";
    return "CrossFit WOD";
  }

  if (s.includes("walk") || sub.includes("walk")) return "Caminata";
  if (s.includes("hike") || sub.includes("hike")) return "Senderismo";

  if (sport === "carrera") {
    if (sub.includes("trail")) return "Carrera Trail / Montaña";
    if (sub.includes("treadmill") || sub.includes("indoor")) return "Carrera en Cinta";
    if (sub.includes("track")) return "Carrera en Pista";
    return "Carrera";
  }

  if (sport === "gimnasio") {
    if (sub.includes("strength")) return "Fuerza / Gimnasio";
    if (sub.includes("cardio")) return "Cardio";
    if (sub.includes("hiit") || sub.includes("interval")) return "HIIT / Circuito";
    return "Gimnasio";
  }

  if (sport === "natacion") {
    if (sub.includes("open_water") || sub.includes("openwater")) return "Natación (Aguas abiertas)";
    if (sub.includes("lap") || sub.includes("pool")) return "Natación (Piscina)";
    return "Natación";
  }

  if (s.includes("cycl") || sub.includes("cycl") || s.includes("bici") || s.includes("bike")) {
    return "Ciclismo";
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

  // Búsqueda en campos secundarios o developer fields
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
      // Si la velocidad es < 10 y parece m/s (en carrera 2.5 - 6 m/s), convertir si no está en km/h
      // En fit-file-parser con speedUnit: "km/h", suele estar ya escalado a km/h
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

export function normalizeCadence(raw: unknown): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 30) return null;
  // Si viene en revoluciones de una sola pierna (ej 85 rpm), convertir a pasos/min (170 ppm)
  if (raw < 115) return Math.round(raw * 2);
  return Math.round(raw);
}

export function extractCadence(obj: Record<string, unknown> | null | undefined): number | null {
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
    const norm = normalizeCadence(val);
    if (norm !== null) return norm;
  }
  return null;
}

// Calcula la distribución en zonas VAM (R0, R1, R2, R3/R4, R5) a partir de records
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
    if (typeof speedKmH !== "number" || speedKmH <= 1.0) continue; // filtrar paradas

    const paceMinKm = 60 / speedKmH;
    if (paceMinKm > 20 || paceMinKm < 2.2) continue; // filtrar valores atípicos

    validRecords++;
    if (paceMinKm > 5.416) {
      // > 5:25 min/km (R0 Regenerativo)
      r0Sec++;
    } else if (paceMinKm >= 4.983) {
      // 4:59 a 5:25 min/km (R1 Base Aeróbica)
      r1Sec++;
    } else if (paceMinKm >= 4.583) {
      // 4:35 a 4:59 min/km (R2 Tempo)
      r2Sec++;
    } else if (paceMinKm >= 4.166) {
      // 4:10 a 4:35 min/km (R3/R4 Ritmo Maratón / Umbral)
      r3Sec++;
    } else {
      // < 4:10 min/km (R5 / VAM)
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
function buildKmSplitsFromRecords(records: Record<string, unknown>[]): FitLap[] {
  if (!records || records.length < 10) return [];

  const validRecords = records.filter((r) => r.timestamp);
  if (validRecords.length === 0) return [];

  // Normalizar distancias acumuladas de cada record
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
      cadence: extractCadence(r),
      speedKmH: extractSpeedKmH(r),
    };
  });

  const splits: FitLap[] = [];
  let currentKm = 1;
  let kmStartIdx = 0;
  let kmStartDist = processed[0].distKm;
  let kmStartTime = processed[0].timestamp;

  for (let i = 0; i < processed.length; i++) {
    const p = processed[i];
    const distDelta = p.distKm - kmStartDist;
    const isKmPassed = distDelta >= 1.0;
    const isLastRecord = i === processed.length - 1;

    if (isKmPassed || isLastRecord) {
      const segRecords = processed.slice(kmStartIdx, i + 1);
      const segDist = Math.max(0.05, p.distKm - kmStartDist);
      const segTimeMs = Math.max(3000, p.timestamp - kmStartTime);
      const segDurationMin = Number((segTimeMs / 60000).toFixed(2));
      const segPace = segDist > 0.05 ? Number((segDurationMin / segDist).toFixed(2)) : null;

      // Pulso medio y máximo en este km
      const hrList = segRecords
        .map((x) => x.hr)
        .filter((h): h is number => typeof h === "number" && h > 40 && h < 235);
      const avgHr = hrList.length > 0 ? Math.round(hrList.reduce((a, b) => a + b, 0) / hrList.length) : null;
      const maxHr = hrList.length > 0 ? Math.max(...hrList) : null;

      // Cadencia media en este km
      const cadList = segRecords
        .map((x) => x.cadence)
        .filter((c): c is number => typeof c === "number" && c > 100);
      const avgCad = cadList.length > 0 ? Math.round(cadList.reduce((a, b) => a + b, 0) / cadList.length) : null;

      // Solo registrar si el segmento tiene una distancia o tiempo mínimo representativo
      if (segDist >= 0.1 || splits.length === 0 || !isLastRecord) {
        splits.push({
          index: currentKm,
          distanceKm: Number(segDist.toFixed(2)),
          durationMin: segDurationMin,
          avgPaceMinKm: segPace,
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

      // Desglose de vueltas / laps
      const rawLaps = (data.laps as Record<string, unknown>[] | undefined) ?? [];
      let laps: FitLap[] = [];

      // Si el reloj guardó vueltas específicas por km (>1 laps)
      if (rawLaps.length > 1) {
        laps = rawLaps.map((lap, i) => {
          const lapTimeSec = (lap.total_timer_time as number | undefined) ?? (lap.total_elapsed_time as number | undefined) ?? null;
          const lapDistKm = extractDistanceKm(lap.total_distance ?? (lap as any).enhanced_distance);
          const lapDurationMin = lapTimeSec !== null ? Math.round((lapTimeSec / 60) * 100) / 100 : null;
          const lapPace =
            lapDurationMin !== null && lapDistKm && lapDistKm > 0
              ? Number((lapDurationMin / lapDistKm).toFixed(2))
              : null;

          const rawCad = extractCadence(lap);
          const avgLapHr = extractHeartRate(lap);
          const maxLapHr = extractMaxHeartRate(lap);

          return {
            index: i + 1,
            distanceKm: lapDistKm !== null ? Number(lapDistKm.toFixed(2)) : null,
            durationMin: lapDurationMin,
            avgPaceMinKm: lapPace,
            avgHeartRate: avgLapHr,
            maxHeartRate: maxLapHr,
            avgCadence: rawCad,
          };
        });

        // Si los laps del reloj no traían HR pero tenemos records segundo a segundo, usar los splits de records
        const hasHrInLaps = laps.some((l) => l.avgHeartRate !== null);
        if (!hasHrInLaps && rawRecords.length >= 20) {
          const splitLaps = buildKmSplitsFromRecords(rawRecords);
          if (splitLaps.length > 0 && splitLaps.some((s) => s.avgHeartRate !== null)) {
            laps = splitLaps;
          }
        }
      } else if (rawRecords.length >= 20 && sport === "carrera") {
        // Si el reloj grabó todo como 1 sola vuelta, calcular los splits de 1km segundo a segundo
        laps = buildKmSplitsFromRecords(rawRecords);
      }

      // Pulso cardíaco global (promedio de records si session no lo trae)
      const allHrs = rawRecords
        .map(extractHeartRate)
        .filter((h): h is number => typeof h === "number" && h > 40 && h < 235);
      const calculatedAvgHr = allHrs.length > 0 ? Math.round(allHrs.reduce((a, b) => a + b, 0) / allHrs.length) : null;
      const calculatedMaxHr = allHrs.length > 0 ? Math.max(...allHrs) : null;

      const sessionAvgHr = extractHeartRate(session) ?? (activity ? extractHeartRate(activity) : null);
      const sessionMaxHr = extractMaxHeartRate(session) ?? (activity ? extractMaxHeartRate(activity) : null);

      const avgHeartRate = sessionAvgHr ?? calculatedAvgHr;
      const maxHeartRate = sessionMaxHr ?? calculatedMaxHr;

      // Si aún no tenemos laps o solo quedó 1, construir un lap general con HR real
      if (laps.length === 0 && durationMin !== null) {
        laps = [
          {
            index: 1,
            distanceKm: totalDistanceKm,
            durationMin,
            avgPaceMinKm,
            avgHeartRate,
            maxHeartRate,
            avgCadence: extractCadence(session) ?? (rawRecords.length > 0 ? extractCadence(rawRecords[0]) : null),
          },
        ];
      }

      // Cadencia global
      const allCads = rawRecords
        .map(extractCadence)
        .filter((c): c is number => typeof c === "number" && c > 100);
      const calculatedAvgCad = allCads.length > 0 ? Math.round(allCads.reduce((a, b) => a + b, 0) / allCads.length) : null;
      const calculatedMaxCad = allCads.length > 0 ? Math.max(...allCads) : null;
      const avgCadence = extractCadence(session) ?? calculatedAvgCad;
      const maxCadence = (session.max_running_cadence as number | undefined) ? normalizeCadence(session.max_running_cadence) : calculatedMaxCad;

      // Altimetría
      const elevationGainM = (session.total_ascent as number | undefined) ?? (session.enhanced_total_ascent as number | undefined) ?? null;
      const elevationLossM = (session.total_descent as number | undefined) ?? (session.enhanced_total_descent as number | undefined) ?? null;

      let zoneDistribution: FitZoneDistribution | null = null;
      if (sport === "carrera") {
        zoneDistribution = computeZoneDistributionFromRecords(rawRecords);
      }

      // Cálculo de desacoplamiento cardiovascular (Aerobic Decoupling / Drift)
      let aerobicDecouplingPct: number | null = null;
      if (laps.length >= 3) {
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

      // Estabilidad de ritmo (pacing stability score 0-100)
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

      const deepAnalysis: FitDeepAnalysis = {
        avgCadence,
        maxCadence,
        elevationGainM,
        elevationLossM,
        aerobicDecouplingPct,
        pacingStabilityScore,
        zoneDistribution,
      };

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
        avgHeartRate,
        maxHeartRate,
        calories: (session.total_calories as number | undefined) ?? null,
        avgCadence,
        elevationGainM,
        laps,
        deepAnalysis,
      });
    });
  });
}

