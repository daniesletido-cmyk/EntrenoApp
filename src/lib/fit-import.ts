import FitParser from "fit-file-parser";
import { toLocalISODate } from "@/lib/dates";

// Lee archivos .FIT (el formato que exportan relojes Garmin/Coros/Suunto y
// apps como Strava/Wahoo) y extrae un resumen normalizado de la sesión.
// Deliberadamente NO se usa la frecuencia cardíaca del archivo como dato
// principal (JavaTec entrena por ritmo/RPE, no por pulso) — se guarda solo
// como referencia informativa si el archivo la trae.

export type FitSport = "carrera" | "natacion" | "gimnasio" | "otro";

export interface FitLap {
  index: number;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
}

export interface FitSummary {
  date: string; // YYYY-MM-DD
  startTime: string; // ISO completo, por si se necesita la hora exacta
  sport: FitSport;
  sportRaw: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  avgPaceMinKm: number | null; // solo informativo para carrera
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  laps: FitLap[];
}

function mapSport(raw: string | undefined | null): FitSport {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("run")) return "carrera";
  if (s.includes("swim")) return "natacion";
  if (s.includes("train") || s.includes("strength") || s.includes("fitness") || s.includes("cardio")) return "gimnasio";
  return "otro";
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
      const session = sessions[0] ?? {};

      const startRaw = (session.start_time ?? activity.timestamp) as string | Date | undefined;
      const startDate = startRaw ? new Date(startRaw) : null;
      if (!startDate || Number.isNaN(startDate.getTime())) {
        reject(new Error("El archivo .fit no trae una fecha de inicio reconocible."));
        return;
      }

      const totalTimerTimeSec = (session.total_timer_time as number | undefined) ?? null;
      const totalDistanceKm = (session.total_distance as number | undefined) ?? null; // ya viene en km por lengthUnit
      const durationMin = totalTimerTimeSec !== null ? Math.round((totalTimerTimeSec / 60) * 10) / 10 : null;
      const avgPaceMinKm =
        durationMin !== null && totalDistanceKm && totalDistanceKm > 0 ? Number((durationMin / totalDistanceKm).toFixed(2)) : null;

      const rawLaps = (data.laps as Record<string, unknown>[] | undefined) ?? [];
      const laps: FitLap[] = rawLaps.map((lap, i) => {
        const lapTimeSec = (lap.total_timer_time as number | undefined) ?? null;
        const lapDistKm = (lap.total_distance as number | undefined) ?? null;
        const lapDurationMin = lapTimeSec !== null ? Math.round((lapTimeSec / 60) * 100) / 100 : null;
        const lapPace =
          lapDurationMin !== null && lapDistKm && lapDistKm > 0 ? Number((lapDurationMin / lapDistKm).toFixed(2)) : null;
        return {
          index: i + 1,
          distanceKm: lapDistKm !== null ? Number(lapDistKm.toFixed(2)) : null,
          durationMin: lapDurationMin,
          avgPaceMinKm: lapPace,
          avgHeartRate: (lap.avg_heart_rate as number | undefined) ?? null,
        };
      });

      resolve({
        date: toLocalISODate(startDate),
        startTime: startDate.toISOString(),
        sport: mapSport(session.sport as string | undefined),
        sportRaw: (session.sport as string | undefined) ?? null,
        durationMin,
        distanceKm: totalDistanceKm !== null ? Number(totalDistanceKm.toFixed(2)) : null,
        avgPaceMinKm,
        avgHeartRate: (session.avg_heart_rate as number | undefined) ?? null,
        maxHeartRate: (session.max_heart_rate as number | undefined) ?? null,
        calories: (session.total_calories as number | undefined) ?? null,
        laps,
      });
    });
  });
}
