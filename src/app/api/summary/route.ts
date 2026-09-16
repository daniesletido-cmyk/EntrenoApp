import { NextRequest, NextResponse } from "next/server";
import { listSessionsForWeek } from "@/lib/repo/sessions";
import { listSleepBetween } from "@/lib/repo/sleep";
import { weekStartOf, todayISO, addDays } from "@/lib/dates";

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
  if (!s.distance_km || !s.duration_min || s.distance_km <= 0) return false;
  const text = `${s.planned_code ?? ""} ${s.notes ?? ""}`.toLowerCase();
  const hasWalkKeyword = /camin|and|walk|senderis|paseo/i.test(text);
  const pace = s.duration_min / s.distance_km;
  if (hasWalkKeyword) return true;
  if (s.discipline !== "carrera" && pace >= 8.5) return true;
  if (s.discipline === "carrera" && pace >= 10.0) return true;
  return false;
}

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
  });
}
