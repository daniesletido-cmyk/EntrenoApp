import { getSetting } from "@/lib/repo/settings";
import { listSessionsBetween, createPlannedSession, updateSession, Discipline, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, upsertSleepLog } from "@/lib/repo/sleep";
import { parseWorkoutFile } from "@/lib/fit-import";
import { toLocalISODate } from "@/lib/dates";
import { upsertWorkout } from "@/lib/repo/workouts";
import { calculateSessionLoad } from "@/lib/engine/load-calculator";
import { isSupabaseConfigured, upsertSleepToSupabase } from "@/lib/supabase";

export interface IntervalsSyncResult {
  configured: boolean;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  activities: Array<{ id: string; date: string; name: string; status: "imported" | "skipped" | "error"; detail?: string }>;
  message?: string;
}

interface IntervalsActivity {
  id: string;
  start_date_local: string;
  name?: string;
  type?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  icu_training_load?: number;
  icu_rpe?: number;
  source?: string;
}

function mapIntervalsTypeToDiscipline(type?: string, name?: string): Discipline {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (t.includes("run") || t.includes("trail") || n.includes("carrera")) return "carrera";
  if (t.includes("swim") || n.includes("natac")) return "natacion";
  if (t.includes("weight") || t.includes("strength") || t.includes("crossfit") || n.includes("crossfit")) return "crossfit";
  if (t.includes("ride") || t.includes("cycling") || t.includes("bike")) return "ciclismo";
  if (t.includes("walk") || t.includes("hike")) return "caminata";
  if (t.includes("row")) return "remo";
  return "otro";
}

function estimateRpe(avgHr?: number | null, rpe?: number | null): number {
  if (rpe && rpe >= 1 && rpe <= 10) return Math.round(rpe);
  if (!avgHr) return 7;
  if (avgHr >= 175) return 9;
  if (avgHr >= 158) return 8;
  if (avgHr >= 140) return 7;
  if (avgHr >= 120) return 6;
  return 5;
}

function findMatchingCompletedWithoutFit(sessions: SessionRow[], date: string, sport: Discipline, durationMin: number): SessionRow | null {
  const completed = sessions.filter(
    (s) => s.date === date && (s.status === "realizada" || s.status === "parcial")
  );
  for (const s of completed) {
    const sameSport =
      s.discipline === sport ||
      ((s.discipline === "crossfit" || s.discipline === "gimnasio") && (sport === "crossfit" || sport === "gimnasio"));
    const closeDuration = s.duration_min != null && Math.abs(s.duration_min - durationMin) <= 8;
    if (sameSport || closeDuration) {
      return s;
    }
  }
  return null;
}

function findMatchingPendingSession(sessions: SessionRow[], date: string, sport: Discipline): SessionRow | null {
  const daySessions = sessions.filter((s) => s.date === date && s.status === "pendiente");
  const exact = daySessions.find((s) => s.discipline === sport);
  if (exact) return exact;
  if (sport === "crossfit" || sport === "gimnasio") {
    const box = daySessions.find((s) => s.discipline === "crossfit" || s.discipline === "gimnasio");
    if (box) return box;
  }
  if (sport === "otro") {
    const gymOrCf = daySessions.find((s) => s.discipline === "crossfit" || s.discipline === "gimnasio");
    if (gymOrCf) return gymOrCf;
  }
  const restOrOther = daySessions.find((s) => s.discipline === "descanso" || s.discipline === "otro");
  return restOrOther || null;
}

let lastAutoSyncMs = 0;
const AUTO_SYNC_COOLDOWN_MS = 10 * 60 * 1000;
let inFlightSync: Promise<IntervalsSyncResult> | null = null;

export async function maybeAutoSyncIntervals(): Promise<void> {
  const athleteId = (getSetting("intervals_athlete_id") || process.env.INTERVALS_ATHLETE_ID || "").trim();
  const apiKey = (getSetting("intervals_api_key") || process.env.INTERVALS_API_KEY || "").trim();
  if (!athleteId || !apiKey) return;

  if (inFlightSync) {
    await inFlightSync;
    return;
  }

  const now = Date.now();
  if (now - lastAutoSyncMs < AUTO_SYNC_COOLDOWN_MS) return;
  lastAutoSyncMs = now;

  try {
    await syncIntervalsWorkouts(7);
  } catch (err) {
    console.warn("[IntervalsAutoSync] Aviso:", err);
  }
}

export async function syncIntervalsWorkouts(daysLookback = 14): Promise<IntervalsSyncResult> {
  if (inFlightSync) {
    return inFlightSync;
  }
  inFlightSync = runIntervalsSyncInternal(daysLookback);
  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

async function runIntervalsSyncInternal(daysLookback = 14): Promise<IntervalsSyncResult> {
  const athleteId = (getSetting("intervals_athlete_id") || process.env.INTERVALS_ATHLETE_ID || "").trim();
  const apiKey = (getSetting("intervals_api_key") || process.env.INTERVALS_API_KEY || "").trim();

  if (!athleteId || !apiKey) {
    return {
      configured: false,
      success: false,
      importedCount: 0,
      skippedCount: 0,
      activities: [],
      message: "Intervals.icu no configurado todavía (faltan Athlete ID y API Key en Configuración).",
    };
  }

  const newest = toLocalISODate(new Date());
  const oldestDate = new Date(Date.now() - daysLookback * 86400 * 1000);
  const oldest = toLocalISODate(oldestDate);

  const authHeader = "Basic " + Buffer.from(`API_KEY:${apiKey}`).toString("base64");

  try {
    const res = await fetch(
      `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/activities?oldest=${oldest}&newest=${newest}`,
      {
        headers: { Authorization: authHeader, Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return {
        configured: true,
        success: false,
        importedCount: 0,
        skippedCount: 0,
        activities: [],
        message: `Error de Intervals.icu (${res.status}): verifica tu Athlete ID y API Key.`,
      };
    }

    const list = (await res.json()) as IntervalsActivity[];
    const existingSessions = listSessionsBetween(oldest, newest);

    let importedCount = 0;
    let skippedCount = 0;
    const activitiesLog: IntervalsSyncResult["activities"] = [];

    for (const act of list) {
      if (!act.id || !act.start_date_local) continue;
      const date = act.start_date_local.slice(0, 10);
      const marker = `[intervals:${act.id}]`;

      // Evitar duplicados si ya se importó esta actividad
      const alreadyImported = existingSessions.some(
        (s) =>
          (s.user_notes && s.user_notes.includes(marker)) ||
          (s.fit_data && s.fit_data.includes(act.id))
      );

      if (alreadyImported) {
        skippedCount++;
        activitiesLog.push({ id: act.id, date, name: act.name || act.type || "Actividad", status: "skipped" });
        continue;
      }

      let sport = mapIntervalsTypeToDiscipline(act.type, act.name);
      let durationMin = Math.round(((act.moving_time ?? act.elapsed_time ?? 0) / 60) * 10) / 10;
      let distanceKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : null;
      let avgHr = act.average_heartrate ? Math.round(act.average_heartrate) : null;
      let maxHr = act.max_heartrate ? Math.round(act.max_heartrate) : null;
      let fitDataJson: string | null = null;

      // Intentar descargar el archivo .fit original de Suunto desde Intervals.icu
      try {
        const fitRes = await fetch(`https://intervals.icu/api/v1/activity/${encodeURIComponent(act.id)}/fit-file`, {
          headers: { Authorization: authHeader },
          cache: "no-store",
        });
        if (fitRes.ok) {
          const buf = Buffer.from(await fitRes.arrayBuffer());
          if (buf.length > 50) {
            const parsed = await parseWorkoutFile(buf, `${act.id}.fit`);
            sport = parsed.sport as Discipline;
            durationMin = parsed.durationMin ?? durationMin;
            distanceKm = parsed.distanceKm ?? distanceKm;
            avgHr = parsed.avgHeartRate ?? avgHr;
            maxHr = parsed.maxHeartRate ?? maxHr;
            fitDataJson = JSON.stringify({ ...parsed, intervalsId: act.id });
          }
        }
      } catch (fitErr) {
        console.warn(`[IntervalsSync] Fallback JSON para ${act.id}:`, fitErr);
      }

      if (!fitDataJson) {
        fitDataJson = JSON.stringify({
          intervalsId: act.id,
          date,
          sport,
          activityName: act.name || act.type || "Suunto / Intervals",
          durationMin,
          distanceKm,
          avgHeartRate: avgHr,
          maxHeartRate: maxHr,
        });
      }

      const rpe = estimateRpe(avgHr, act.icu_rpe);
      const summaryNote = `${act.name || sport}: ${durationMin} min${distanceKm ? `, ${distanceKm} km` : ""}${avgHr ? `, FC media ${avgHr} ppm` : ""}${maxHr ? `, máx ${maxHr} ppm` : ""}. ${marker}`;

      let targetSessionId: number | null = null;
      const alreadyDoneMatch = findMatchingCompletedWithoutFit(existingSessions, date, sport, durationMin);
      if (alreadyDoneMatch) {
        if (alreadyDoneMatch.fit_data) {
          // Ya completada y con telemetría .fit — solo evitar duplicados
          skippedCount++;
          activitiesLog.push({ id: act.id, date, name: act.name || sport, status: "skipped", detail: "Ya registrada previamente" });
          continue;
        }
        // Enriquecer sesión ya completada con su archivo .fit y marcador de Intervals
        const updated = updateSession(alreadyDoneMatch.id, {
          fit_data: fitDataJson,
          user_notes: alreadyDoneMatch.user_notes
            ? `${alreadyDoneMatch.user_notes} ${marker}`
            : summaryNote,
        });
        if (updated) {
          targetSessionId = updated.id;
          const idx = existingSessions.findIndex((s) => s.id === updated.id);
          if (idx >= 0) existingSessions[idx] = updated;
        }
      } else {
        const match = findMatchingPendingSession(existingSessions, date, sport);
        if (match) {
          const updated = updateSession(match.id, {
            discipline: match.discipline === "descanso" ? sport : match.discipline,
            status: "realizada",
            duration_min: Math.round(durationMin),
            distance_km: distanceKm,
            rpe,
            fitImport: true,
            fit_data: fitDataJson,
            user_notes: match.user_notes ? `${match.user_notes}\n${summaryNote}` : summaryNote,
          });
          if (updated) {
            targetSessionId = updated.id;
            existingSessions.push(updated);
          }
        } else {
          const created = createPlannedSession({
            date,
            discipline: sport,
            planned_code: act.name || `Suunto (${sport})`,
            is_extra: true,
          });
          const updated = updateSession(created.id, {
            status: "realizada",
            duration_min: Math.round(durationMin),
            distance_km: distanceKm,
            rpe,
            fitImport: true,
            fit_data: fitDataJson,
            user_notes: summaryNote,
          });
          if (updated) {
            targetSessionId = updated.id;
            existingSessions.push(updated);
          }
        }
      }

      // Registrar también en tabla `workouts` con carga TSS/TRIMP y enviar Push al móvil/PC
      try {
        const load = calculateSessionLoad({
          durationMin: Math.round(durationMin),
          avgHr: avgHr ?? undefined,
          maxHr: maxHr ?? undefined,
          sportType: sport,
          rpe,
        });
        upsertWorkout({
          suunto_id: `intervals-${act.id}`,
          fecha: date,
          tipo: sport,
          duracion: Math.round(durationMin),
          distancia: distanceKm ?? undefined,
          fc_media: avgHr ?? undefined,
          fc_max: maxHr ?? undefined,
          carga_tss: load.tss,
          rpe,
          raw_data: JSON.stringify(act),
        });

        if (targetSessionId) {
          const { sendDailyReportPush } = await import("@/lib/push-notifications");
          await sendDailyReportPush({
            id: targetSessionId,
            date,
            discipline: sport,
            distance_km: distanceKm,
            duration_min: Math.round(durationMin),
            carga_tss: load.tss,
          });
        }
      } catch {}

      importedCount++;
      activitiesLog.push({ id: act.id, date, name: act.name || sport, status: "imported" });
    }

    // Sincronizar también datos de sueño/bienestar (si Amazfit/Suunto están conectados en Intervals.icu)
    let sleepImportedCount = 0;
    try {
      const wellRes = await fetch(
        `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/wellness?oldest=${oldest}&newest=${newest}`,
        { headers: { Authorization: authHeader, Accept: "application/json" }, cache: "no-store" }
      );
      if (wellRes.ok) {
        const wellList = (await wellRes.json()) as Array<{
          id: string;
          sleepSecs?: number | null;
          sleepScore?: number | null;
          sleepQuality?: number | null;
          restingHR?: number | null;
          hrv?: number | null;
          respiration?: number | null;
        }>;
        const existingSleep = listSleepBetween(oldest, newest);
        const existingMap = new Map(existingSleep.map((s) => [s.date, s]));
        let latestSavedSleep: ReturnType<typeof upsertSleepLog> | null = null;

        for (const w of wellList) {
          if (!w.id || (w.sleepSecs == null && w.sleepScore == null && w.hrv == null)) continue;
          const prev = existingMap.get(w.id);
          const hours = w.sleepSecs != null ? Number((w.sleepSecs / 3600).toFixed(2)) : null;
          if (prev && prev.hours != null && (hours == null || Math.abs(prev.hours - hours) < 0.05)) {
            continue;
          }
          const saved = upsertSleepLog({
            date: w.id,
            hours: hours ?? prev?.hours ?? undefined,
            score: w.sleepScore ?? prev?.score ?? undefined,
            quality: w.sleepQuality ?? prev?.quality ?? undefined,
            resting_hr: w.restingHR ?? prev?.resting_hr ?? undefined,
            hrv_rmssd: w.hrv ?? prev?.hrv_rmssd ?? undefined,
            respiratory_rate: w.respiration ?? prev?.respiratory_rate ?? undefined,
            source: prev?.source || "intervals-cloud",
          });
          if (isSupabaseConfigured()) {
            await upsertSleepToSupabase(saved).catch(() => {});
          }
          latestSavedSleep = saved;
          sleepImportedCount++;
        }

        if (latestSavedSleep) {
          const { sendSleepRecordedPush } = await import("@/lib/push-notifications");
          await sendSleepRecordedPush({
            date: latestSavedSleep.date,
            hours: latestSavedSleep.hours,
            score: latestSavedSleep.score,
            deep_min: latestSavedSleep.deep_min,
            rem_min: latestSavedSleep.rem_min,
            hrv_rmssd: latestSavedSleep.hrv_rmssd,
            resting_hr: latestSavedSleep.resting_hr,
          });
        }
      }
    } catch {}

    return {
      configured: true,
      success: true,
      importedCount,
      skippedCount,
      activities: activitiesLog,
      message:
        importedCount > 0 || sleepImportedCount > 0
          ? `Sincronizados ${importedCount} entreno(s) y ${sleepImportedCount} noche(s) de sueño.`
          : "Todo al día: no hay entrenamientos nuevos pendientes de importar.",
    };
  } catch (err) {
    return {
      configured: true,
      success: false,
      importedCount: 0,
      skippedCount: 0,
      activities: [],
      message: err instanceof Error ? err.message : "Error conectando con Intervals.icu",
    };
  }
}
