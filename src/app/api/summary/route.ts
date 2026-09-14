import { NextRequest, NextResponse } from "next/server";
import { listSessionsForWeek } from "@/lib/repo/sessions";
import { listSleepBetween } from "@/lib/repo/sleep";
import { weekStartOf, todayISO, addDays } from "@/lib/dates";

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week") ?? todayISO();
  const weekStart = weekStartOf(weekParam);
  const weekEnd = addDays(weekStart, 6);
  const sessions = listSessionsForWeek(weekStart);
  const relevant = sessions.filter((s) => s.discipline !== "descanso");
  const realizadas = relevant.filter((s) => s.status === "realizada").length;
  const parciales = relevant.filter((s) => s.status === "parcial").length;
  const noRealizadas = relevant.filter((s) => s.status === "no_realizada").length;
  const pendientes = relevant.filter((s) => s.status === "pendiente").length;
  const planificadas = relevant.length;
  const compliancePct = planificadas > 0 ? ((realizadas + parciales) / planificadas) * 100 : null;
  const rpeAvg = avg(
    relevant.filter((s) => s.status === "realizada" || s.status === "parcial").map((s) => s.rpe ?? NaN)
  );
  const sleepLogs = listSleepBetween(weekStart, weekEnd);
  const sleepHoursAvg = avg(sleepLogs.map((s) => s.hours ?? NaN));
  const sleepQualityAvg = avg(sleepLogs.map((s) => s.quality ?? NaN));

  // Volumen real de la semana: solo sesiones ya realizadas/parciales, nunca
  // inventado a partir de lo planificado.
  const done = relevant.filter((s) => s.status === "realizada" || s.status === "parcial");
  const distanceKm = done.reduce((sum, s) => sum + (s.distance_km ?? 0), 0);
  const durationMin = done.reduce((sum, s) => sum + (s.duration_min ?? 0), 0);
  const runs = done.filter((s) => s.discipline === "carrera" && s.distance_km && s.duration_min);
  const avgPaceMinKm =
    runs.length > 0
      ? runs.reduce((sum, s) => sum + s.duration_min! / s.distance_km!, 0) / runs.length
      : null;

  return NextResponse.json({
    weekStart,
    weekEnd,
    planificadas,
    realizadas,
    parciales,
    noRealizadas,
    pendientes,
    compliancePct,
    rpeAvg,
    sleepHoursAvg,
    sleepQualityAvg,
    distanceKm,
    durationMin,
    avgPaceMinKm,
  });
}
