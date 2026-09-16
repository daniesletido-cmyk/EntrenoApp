import { NextRequest, NextResponse } from "next/server";
import { listSessionsForWeek } from "@/lib/repo/sessions";
import { listSleepBetween } from "@/lib/repo/sleep";
import { computeWeeklyRecommendation } from "@/lib/recommendations";
import { weekStartOf, todayISO, addDays } from "@/lib/dates";

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export async function GET(req: NextRequest) {
  const weeksBack = Number(req.nextUrl.searchParams.get("weeks") ?? "10");
  const currentWeekStart = weekStartOf(todayISO());

  const weeks = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    const sessions = listSessionsForWeek(weekStart);
    const relevant = sessions.filter((s) => s.discipline !== "descanso");
    const completed = relevant.filter((s) => s.status === "realizada" || s.status === "parcial");
    const compliancePct =
      relevant.length > 0
        ? (completed.length / relevant.length) * 100
        : null;
    const rpeAvg = avg(
      completed.map((s) => s.rpe ?? NaN)
    );
    const durationTotalMin = completed.reduce((sum, s) => sum + (s.duration_min ?? 0), 0);
    const distanceTotalKm = Math.round(completed.reduce((sum, s) => sum + (s.distance_km ?? 0), 0) * 10) / 10;
    const loadTotal = Math.round(completed.reduce((sum, s) => sum + (s.duration_min ?? 0) * (s.rpe ?? 5), 0));
    const sleepLogs = listSleepBetween(weekStart, weekEnd);
    const sleepHoursAvg = avg(sleepLogs.map((s) => s.hours ?? NaN));
    const sleepQualityAvg = avg(sleepLogs.map((s) => s.quality ?? NaN));
    // Puntuación de sueño 0-100 (viene de ZeppBridge) — escala distinta de la
    // "calidad" manual 1-5, así que se calcula y se sirve aparte.
    const sleepScoreAvg = avg(sleepLogs.map((s) => s.score ?? NaN));
    const rec = computeWeeklyRecommendation(weekStart);

    weeks.push({
      weekStart,
      compliancePct,
      rpeAvg,
      durationTotalMin,
      distanceTotalKm,
      loadTotal,
      completedCount: completed.length,
      plannedCount: relevant.length,
      sleepHoursAvg,
      sleepQualityAvg,
      sleepScoreAvg,
      acwr: rec.acwr,
      action: rec.action,
    });
  }

  return NextResponse.json({ weeks });
}
