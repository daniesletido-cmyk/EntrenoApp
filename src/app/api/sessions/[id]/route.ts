import { NextRequest, NextResponse } from "next/server";
import { deleteSession, undoFitImport, updateSession, getSessionById } from "@/lib/repo/sessions";
import { listGymExercises, listGymLogsForDate } from "@/lib/repo/gym";
import { getSleepByDate } from "@/lib/repo/sleep";
import { computeDailyReadiness } from "@/lib/readiness";
import { sessionLoad } from "@/lib/recommendations";
import { buildUnifiedSessionDiagnostics } from "@/lib/fit-feedback";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  let fitSummary: any = null;
  if (session.fit_data) {
    try {
      fitSummary = JSON.parse(session.fit_data);
    } catch {
      fitSummary = null;
    }
  }

  const unified = buildUnifiedSessionDiagnostics(session, fitSummary);

  // Si es sesión de gimnasio o crossfit, buscar los logs de ejercicios de ese día
  const allExercises = listGymExercises();
  const rawGymLogs = listGymLogsForDate(session.date);
  const gymDetails = rawGymLogs.map((log) => {
    const ex = allExercises.find((e) => e.id === log.exercise_id);
    let seriesParsed = null;
    if (log.series_data) {
      try {
        seriesParsed = JSON.parse(log.series_data);
      } catch {}
    }
    return {
      exerciseName: ex?.name ?? "Ejercicio",
      weightKg: log.weight_kg,
      sets: log.sets,
      reps: log.reps,
      completed: !!log.completed,
      notes: log.notes,
      series: seriesParsed,
    };
  });

  // Datos de descanso y recuperación ese día
  const sleep = getSleepByDate(session.date) ?? null;
  const readiness = computeDailyReadiness(session.date);
  const load = sessionLoad(session);

  // Estimaciones / métricas derivadas
  const duration = session.duration_min ?? 0;
  const distance = session.distance_km ?? 0;
  const avgPaceMinKm = distance > 0 && duration > 0 ? duration / distance : null;
  const avgSpeedKmh = duration > 0 && distance > 0 ? distance / (duration / 60) : null;

  return NextResponse.json({
    session,
    fitSummary,
    structuredFeedback: unified.structuredFeedback,
    zoneDistribution: unified.zoneDistribution,
    hrZoneDistribution: unified.hrZoneDistribution,
    laps: unified.laps,
    isRealFit: unified.isRealFit,
    timeSeries: unified.timeSeries,
    pacingAnalysis: unified.pacingAnalysis,
    gymDetails,
    sleep,
    readiness,
    load: {
      fosterLoad: load,
      rpe: session.rpe,
      durationMin: session.duration_min,
      distanceKm: session.distance_km,
      avgPaceMinKm,
      avgSpeedKmh,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json();

  // Deshace la última importación de un .fit sobre esta sesión, restaurando
  // el estado que tenía justo antes (ver src/lib/repo/sessions.ts).
  if (body.undoFit) {
    const session = undoFitImport(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Esta sesión no tiene ninguna importación de .fit que deshacer" }, { status: 400 });
    }
    return NextResponse.json({ session });
  }

  const session = updateSession(sessionId, {
    discipline: body.discipline,
    planned_code: body.planned_code,
    is_long_run: body.is_long_run,
    is_extra: body.is_extra !== undefined ? (body.is_extra ? 1 : 0) : undefined,
    date: body.date,
    status: body.status,
    rpe: body.rpe !== undefined ? (body.rpe === "" || body.rpe === null ? null : Number(body.rpe)) : undefined,
    duration_min: body.duration_min !== undefined ? (body.duration_min === "" || body.duration_min === null ? null : Number(body.duration_min)) : undefined,
    distance_km: body.distance_km !== undefined ? (body.distance_km === "" || body.distance_km === null ? null : Number(body.distance_km)) : undefined,
    notes: body.notes,
    fitImport: !!body.fitImport,
    fit_data: body.fit_data !== undefined ? body.fit_data : undefined,
  });

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteSession(sessionId);
  return NextResponse.json({ ok: true });
}
