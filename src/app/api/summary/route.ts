import { NextRequest, NextResponse } from "next/server";
import { listSessionsForWeek, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { weekStartOf, todayISO, addDays } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { computeDailyReadiness } from "@/lib/readiness";

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function isWalkingSession(s: {
  discipline: string;
  planned_code: string | null;
  notes: string | null;
  distance_km: number | null;
  duration_min: number | null;
}): boolean {
  if (s.discipline === "carrera") {
    const pace = s.duration_min && s.distance_km && s.distance_km > 0 ? s.duration_min / s.distance_km : 0;
    const title = (s.planned_code ?? "").toLowerCase();
    if (pace >= 9.5 && /\b(caminata|paseo|senderismo|walk)\b/i.test(title)) return true;
    return false;
  }
  if (s.discipline === "caminata") return true;
  const text = `${s.planned_code ?? ""} ${s.notes ?? ""}`.toLowerCase();
  if (/\b(caminata|senderismo|paseo)\b/i.test(text)) return true;
  return false;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week") ?? todayISO();
  const weekStart = weekStartOf(weekParam);
  const weekEnd = addDays(weekStart, 6);
  const sessions = listSessionsForWeek(weekStart);
  const relevant = sessions.filter((s) => s.discipline !== "descanso");

  // Sesiones estrictamente PROGRAMADAS (is_extra = 0) vs EXTRAS (is_extra = 1)
  const programadas = relevant.filter((s) => !s.is_extra);
  const extras = relevant.filter((s) => !!s.is_extra);

  const programadasRealizadas = programadas.filter((s) => s.status === "realizada").length;
  const programadasParciales = programadas.filter((s) => s.status === "parcial").length;
  const programadasNoRealizadas = programadas.filter((s) => s.status === "no_realizada").length;
  const programadasPendientes = programadas.filter((s) => s.status === "pendiente").length;
  const planificadas = programadas.length;

  // El cumplimiento semanal mide ÚNICAMENTE lo que estaba planificado
  const compliancePct =
    planificadas > 0 ? ((programadasRealizadas + programadasParciales) / planificadas) * 100 : null;

  // Contabilización de extras aparte
  const extrasTotal = extras.length;
  const extrasRealizadas = extras.filter((s) => s.status === "realizada" || s.status === "parcial").length;

  // RPE medio de todas las sesiones realizadas
  const done = relevant.filter((s) => s.status === "realizada" || s.status === "parcial");
  const rpeAvg = avg(done.map((s) => s.rpe ?? NaN));

  const sleepLogs = listSleepBetween(weekStart, weekEnd);
  const sleepHoursAvg = avg(sleepLogs.map((s) => s.hours ?? NaN));
  const sleepQualityAvg = avg(sleepLogs.map((s) => s.quality ?? NaN));

  // Volumen total
  const distanceKm = done.reduce((sum, s) => sum + (s.distance_km ?? 0), 0);
  const durationMin = done.reduce((sum, s) => sum + (s.duration_min ?? 0), 0);

  // Separación independiente: CARRERA vs CAMINATA
  const runs = done.filter((s) => s.discipline === "carrera" && s.distance_km && s.duration_min && !isWalkingSession(s));
  const walks = done.filter((s) => s.distance_km && s.duration_min && isWalkingSession(s));

  const runDistanceKm = Number(runs.reduce((sum, s) => sum + (s.distance_km ?? 0), 0).toFixed(2));
  const runDurationMin = Number(runs.reduce((sum, s) => sum + (s.duration_min ?? 0), 0).toFixed(1));
  const runAvgPaceMinKm = runDistanceKm > 0 ? runDurationMin / runDistanceKm : null;
  const runCount = runs.length;

  const walkDistanceKm = Number(walks.reduce((sum, s) => sum + (s.distance_km ?? 0), 0).toFixed(2));
  const walkDurationMin = Number(walks.reduce((sum, s) => sum + (s.duration_min ?? 0), 0).toFixed(1));
  const walkAvgPaceMinKm = walkDistanceKm > 0 ? walkDurationMin / walkDistanceKm : null;
  const walkCount = walks.length;

  // Sesiones recientes con telemetría Suunto para el Dashboard
  let recentSessions: any[] = [];
  try {
    const rawSessions = getDb()
      .prepare<SessionRow>(
        "SELECT id, date, discipline, planned_code, status, duration_min, distance_km, rpe, fit_data FROM sessions WHERE status IN ('realizada', 'parcial') OR date <= date('now') ORDER BY date DESC, id DESC LIMIT 6"
      )
      .all();

    recentSessions = rawSessions.map((s) => {
      let suuntoMetrics: any = null;
      if (s.fit_data) {
        try {
          const parsed = JSON.parse(s.fit_data);
          suuntoMetrics = parsed.deepAnalysis?.suuntoMetrics || {
            pte: parsed.pte ?? parsed.deepAnalysis?.pte,
            epoc: parsed.epoc ?? parsed.deepAnalysis?.epoc,
            recoveryTimeHours: parsed.recoveryTimeHours,
          };
        } catch {}
      }
      return {
        id: s.id,
        date: s.date,
        discipline: s.discipline,
        planned_code: s.planned_code,
        status: s.status,
        duration_min: s.duration_min,
        distance_km: s.distance_km,
        rpe: s.rpe,
        hasFit: !!s.fit_data,
        suuntoMetrics,
      };
    });
  } catch {}

  // Historial reciente de sueño (últimos 7 registros)
  let recentSleep: any[] = [];
  try {
    recentSleep = getDb()
      .prepare<SleepRow>(
        "SELECT date, hours, quality, score, deep_min, rem_min, light_min, awake_min FROM sleep_logs ORDER BY date DESC LIMIT 7"
      )
      .all();
  } catch {}

  let readiness: any = null;
  try {
    readiness = computeDailyReadiness(todayISO());
  } catch {}

  return NextResponse.json({
    weekStart,
    weekEnd,
    planificadas,
    realizadas: programadasRealizadas,
    parciales: programadasParciales,
    noRealizadas: programadasNoRealizadas,
    pendientes: programadasPendientes,
    compliancePct,
    extrasTotal,
    extrasRealizadas,
    rpeAvg,
    sleepHoursAvg,
    sleepQualityAvg,
    distanceKm,
    durationMin,
    runDistanceKm,
    runDurationMin,
    runAvgPaceMinKm,
    runCount,
    walkDistanceKm,
    walkDurationMin,
    walkAvgPaceMinKm,
    walkCount,
    avgPaceMinKm: runAvgPaceMinKm, // compatibilidad hacia atrás
    recentSessions,
    recentSleep,
    readiness,
  });
}
