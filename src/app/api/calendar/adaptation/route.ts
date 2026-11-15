import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeDayAgenda, generateAdaptiveProposal } from "@/lib/adaptive_scheduler";
import type { ParsedCalendarEvent } from "@/lib/ical-parser";
import { weekStartOf, weekDates } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const db = getDb();

    // 1. Obtener la sesión del día
    interface DbSession {
      id: number;
      date: string;
      discipline: string;
      planned_code: string | null;
      duration_min: number | null;
      distance_km: number | null;
      notes: string | null;
    }

    const session = db
      .prepare<DbSession>(
        `SELECT id, date, discipline, planned_code, duration_min, distance_km, notes
         FROM sessions
         WHERE date = ?
         ORDER BY id ASC
         LIMIT 1`
      )
      .get(date);

    // 2. Obtener las sesiones de la semana para posibles swaps
    const wStart = weekStartOf(date);
    const wDays = weekDates(wStart);
    const weekSessions = db
      .prepare<DbSession>(
        `SELECT id, date, discipline, planned_code, duration_min, distance_km, notes
         FROM sessions
         WHERE date BETWEEN ? AND ?
         ORDER BY date ASC`
      )
      .all(wDays[0], wDays[6]);

    // 3. Obtener eventos de calendario para este día
    const events = db
      .prepare<ParsedCalendarEvent>(
        `SELECT id, title, start_time, end_time, all_day, location, description, source
         FROM calendar_events
         WHERE substr(start_time, 1, 10) <= ? AND substr(end_time, 1, 10) >= ?
         ORDER BY start_time ASC`
      )
      .all(date, date);

    const analysis = analyzeDayAgenda(date, events);

    if (!session || session.discipline === "descanso") {
      return NextResponse.json({
        ok: true,
        date,
        hasSession: Boolean(session),
        hasEvents: events.length > 0,
        events,
        analysis,
        proposal: null,
      });
    }

    const proposal = generateAdaptiveProposal(session, analysis, weekSessions);

    return NextResponse.json({
      ok: true,
      date,
      hasSession: true,
      hasEvents: events.length > 0,
      events,
      analysis,
      proposal,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[CALENDAR_ADAPTATION_GET] Error:", errorMsg);
    return NextResponse.json(
      { ok: false, error: `Error evaluando adaptación de agenda: ${errorMsg}` },
      { status: 500 }
    );
  }
}
