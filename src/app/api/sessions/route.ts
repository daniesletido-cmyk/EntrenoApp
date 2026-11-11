import { NextRequest, NextResponse } from "next/server";
import {
  createPlannedSession,
  bulkCreateSessions,
  listSessionsForWeek,
  listSessionsBetween,
  Discipline,
} from "@/lib/repo/sessions";
import { weekStartOf, todayISO } from "@/lib/dates";
import { isSupabaseConfigured, upsertSessionToSupabase, fetchSessionsFromSupabase } from "@/lib/supabase";
import { listSuuntoSyncForSessionIds } from "@/lib/repo/suunto-sync";
import { getSetting } from "@/lib/repo/settings";
import { flushDbPersistence, refreshDbFromBlobIfNewer } from "@/lib/db";

const VALID_DISCIPLINES = new Set([
  "carrera",
  "gimnasio",
  "natacion",
  "crossfit",
  "ciclismo",
  "caminata",
  "remo",
  "otro",
  "descanso",
]);

function validateSessionPayload(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data.date || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, error: "La fecha debe tener formato YYYY-MM-DD" };
  }

  if (!data.discipline || typeof data.discipline !== "string" || !VALID_DISCIPLINES.has(data.discipline)) {
    return { valid: false, error: "La disciplina seleccionada no es válida" };
  }

  if (data.duration_min != null && data.duration_min !== "") {
    const d = Number(data.duration_min);
    if (isNaN(d) || d < 0) {
      return { valid: false, error: "La duración en minutos no puede ser negativa" };
    }
  }

  if (data.distance_km != null && data.distance_km !== "") {
    const k = Number(data.distance_km);
    if (isNaN(k) || k < 0) {
      return { valid: false, error: "La distancia en kilómetros no puede ser negativa" };
    }
  }

  if (data.rpe != null && data.rpe !== "") {
    const r = Number(data.rpe);
    if (isNaN(r) || r < 1 || r > 10) {
      return { valid: false, error: "El RPE debe estar comprendido entre 1 y 10" };
    }
  }

  return { valid: true };
}

export async function GET(req: NextRequest) {
  await refreshDbFromBlobIfNewer();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const week = req.nextUrl.searchParams.get("week") ?? weekStartOf(todayISO());

  // Auto-sincronización silenciosa con Suunto / Intervals.icu si está vinculado (cada 10 min máx.)
  try {
    const { maybeAutoSyncIntervals } = await import("@/lib/intervals-sync");
    await maybeAutoSyncIntervals();
  } catch {}

  // Si Supabase está configurado, recuperar de Supabase (persistencia definitiva en la nube)
  if (isSupabaseConfigured()) {
    try {
      const fromDate = from || (week ? weekStartOf(week) : undefined);
      const toDate = to || undefined;
      const cloudSessions = await fetchSessionsFromSupabase(fromDate, toDate);
      if (cloudSessions && cloudSessions.length > 0) {
        const syncMap = listSuuntoSyncForSessionIds(
          cloudSessions.map((cs: { id: number }) => cs.id)
        );
        if (from && to) {
          return NextResponse.json({ sessions: cloudSessions, suuntoSyncMap: syncMap });
        }
        return NextResponse.json({ weekStart: weekStartOf(week), sessions: cloudSessions, suuntoSyncMap: syncMap });
      }
    } catch (e) {
      console.warn("[Sessions GET] Error consultando Supabase, usando SQLite fallback:", e);
    }
  }

  if (from && to) {
    const sessions = listSessionsBetween(from, to);
    const suuntoSyncMap = listSuuntoSyncForSessionIds(sessions.map((s) => s.id));
    return NextResponse.json({ sessions, suuntoSyncMap });
  }

  const sessions = listSessionsForWeek(weekStartOf(week));
  const suuntoSyncMap = listSuuntoSyncForSessionIds(sessions.map((s) => s.id));
  return NextResponse.json({ weekStart: weekStartOf(week), sessions, suuntoSyncMap });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Soporte para inserción en lote atómica
  if (Array.isArray(body) || Array.isArray(body.sessions)) {
    const items = Array.isArray(body) ? body : body.sessions;
    const valid = items.filter((b: Record<string, unknown>) => validateSessionPayload(b).valid);
    if (valid.length === 0) {
      return NextResponse.json({ error: "Ninguna sesión válida para crear" }, { status: 400 });
    }
    const created = bulkCreateSessions(valid);

    // Persistencia simultánea en Supabase si está activo
    if (isSupabaseConfigured()) {
      for (const s of created) {
        await upsertSessionToSupabase(s).catch(() => {});
      }
    }

    return NextResponse.json({ sessions: created, count: created.length }, { status: 201 });
  }

  // Validación individual
  const check = validateSessionPayload(body);
  if (!check.valid) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  let session = createPlannedSession({
    date: body.date,
    discipline: body.discipline as Discipline,
    planned_code: body.planned_code ?? null,
    is_long_run: !!body.is_long_run,
    is_extra: !!body.is_extra,
    notes: body.notes ?? null,
    user_notes: body.user_notes ?? null,
  });

  // Si se creaba ya como realizada o con métricas reales, actualizar y notificar
  if (body.status === "realizada" || body.duration_min != null || body.fit_data) {
    const { updateSession } = await import("@/lib/repo/sessions");
    const updated = updateSession(session.id, {
      status: body.status || "realizada",
      duration_min: body.duration_min != null ? Number(body.duration_min) : undefined,
      distance_km: body.distance_km != null ? Number(body.distance_km) : undefined,
      rpe: body.rpe != null ? Number(body.rpe) : undefined,
      fit_data: body.fit_data,
    });
    if (updated) session = updated;

    if (session.status === "realizada") {
      try {
        const { sendDailyReportPush } = await import("@/lib/push-notifications");
        await sendDailyReportPush({
          id: session.id,
          date: session.date,
          discipline: session.discipline,
          distance_km: session.distance_km,
          duration_min: session.duration_min,
          planned_code: session.planned_code,
        });
      } catch (pushErr) {
        console.warn("[Session Push] Error al notificar nueva sesión realizada:", pushErr);
      }
    }
  }

  // Persistencia garantizada en Supabase
  if (isSupabaseConfigured()) {
    await upsertSessionToSupabase(session).catch(() => {});
  }

  // Auto-push a Suunto si la sesión es planificada y el auto-envío está activado (o solicitado)
  let suuntoSync = null;
  if (
    session.status === "pendiente" &&
    session.discipline !== "descanso" &&
    (body.pushToSuunto === true || getSetting("suunto_auto_push") === "true")
  ) {
    try {
      const { pushSessionToSuunto } = await import("@/lib/suunto-cloud");
      suuntoSync = await pushSessionToSuunto(session.id);
    } catch (suuntoErr) {
      console.warn("[Suunto Auto-Push POST] Error:", suuntoErr);
    }
  }

  await flushDbPersistence();

  return NextResponse.json({ session, suuntoSync }, { status: 201 });
}
