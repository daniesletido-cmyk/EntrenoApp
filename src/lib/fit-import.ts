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
    const speedKmH = (r.enhanced_speed as number | undefined) ?? (r.speed as number | undefined);
    if (typeof speedKmH !== "number" || speedKmH <= 1.0) continue; // filtrar paradas

    const paceMinKm = 60 / speedKmH;
    if (paceMinKm > 20 || paceMinKm < 2.5) continue; // filtrar valores atípicos

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

  if (validRecords < 30) return null; // menos de 30s de datos válidos

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

      const totalTimerTimeSec = (session.total_timer_time as number | undefined) ?? null;
      const totalDistanceKm = (session.total_distance as number | undefined) ?? null; // en km por lengthUnit
      const durationMin = totalTimerTimeSec !== null ? Math.round((totalTimerTimeSec / 60) * 10) / 10 : null;
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
      const laps: FitLap[] = rawLaps.map((lap, i) => {
        const lapTimeSec = (lap.total_timer_time as number | undefined) ?? null;
        const lapDistKm = (lap.total_distance as number | undefined) ?? null;
        const lapDurationMin = lapTimeSec !== null ? Math.round((lapTimeSec / 60) * 100) / 100 : null;
        const lapPace =
          lapDurationMin !== null && lapDistKm && lapDistKm > 0
            ? Number((lapDurationMin / lapDistKm).toFixed(2))
            : null;
        return {
          index: i + 1,
          distanceKm: lapDistKm !== null ? Number(lapDistKm.toFixed(2)) : null,
          durationMin: lapDurationMin,
          avgPaceMinKm: lapPace,
          avgHeartRate: (lap.avg_heart_rate as number | undefined) ?? null,
          maxHeartRate: (lap.max_heart_rate as number | undefined) ?? null,
          avgCadence: (lap.avg_running_cadence as number | undefined) ?? (lap.avg_cadence as number | undefined) ?? null,
        };
      });

      // Análisis profundo de registros segundo a segundo (records)
      const rawRecords = (data.records as Record<string, unknown>[] | undefined) ?? [];
      let zoneDistribution: FitZoneDistribution | null = null;
      let avgCadence: number | null = (session.avg_running_cadence as number | undefined) ?? (session.avg_cadence as number | undefined) ?? null;
      let maxCadence: number | null = (session.max_running_cadence as number | undefined) ?? (session.max_cadence as number | undefined) ?? null;
      const elevationGainM = (session.total_ascent as number | undefined) ?? null;
      const elevationLossM = (session.total_descent as number | undefined) ?? null;

      if (sport === "carrera") {
        zoneDistribution = computeZoneDistributionFromRecords(rawRecords);

        // Si no vino la cadencia en la sesión, calcularla de los records
        if (avgCadence === null && rawRecords.length > 0) {
          const cadences = rawRecords
            .map((r) => (r.cadence as number | undefined) ?? (r.running_cadence as number | undefined))
            .filter((c): c is number => typeof c === "number" && c > 120);
          if (cadences.length > 0) {
            avgCadence = Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length);
            maxCadence = Math.max(...cadences);
          }
        }
      }

      // Cálculo de desacoplamiento cardiovascular (Aerobic Decoupling / Drift)
      let aerobicDecouplingPct: number | null = null;
      if (laps.length >= 4) {
        const validLaps = laps.filter((l) => l.avgPaceMinKm !== null && l.avgHeartRate !== null && (l.avgHeartRate ?? 0) > 90);
        if (validLaps.length >= 4) {
          const mid = Math.floor(validLaps.length / 2);
          const firstHalf = validLaps.slice(0, mid);
          const secondHalf = validLaps.slice(mid);
          const calcEfficiency = (arr: typeof validLaps) => {
            const avgP = arr.reduce((acc, cur) => acc + (cur.avgPaceMinKm as number), 0) / arr.length;
            const avgHr = arr.reduce((acc, cur) => acc + (cur.avgHeartRate as number), 0) / arr.length;
            // Velocidad (m/min) / FC (ppm)
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
          // 0 s desviación -> 100 pts; 30s desviación -> 50 pts
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
        avgHeartRate: (session.avg_heart_rate as number | undefined) ?? null,
        maxHeartRate: (session.max_heart_rate as number | undefined) ?? null,
        calories: (session.total_calories as number | undefined) ?? null,
        avgCadence,
        elevationGainM,
        laps,
        deepAnalysis,
      });
    });
  });
}
