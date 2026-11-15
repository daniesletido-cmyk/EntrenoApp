import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ParsedCalendarEvent } from "@/lib/ical-parser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const db = getDb();
    const urlRow = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'calendar_ics_url'").get();
    const lastSyncRow = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'calendar_last_sync'").get();

    let events: ParsedCalendarEvent[] = [];

    if (date) {
      events = db
        .prepare<ParsedCalendarEvent>(
          `SELECT id, title, start_time, end_time, all_day, location, description, source
           FROM calendar_events
           WHERE substr(start_time, 1, 10) <= ? AND substr(end_time, 1, 10) >= ?
           ORDER BY start_time ASC`
        )
        .all(date, date);
    } else if (from && to) {
      events = db
        .prepare<ParsedCalendarEvent>(
          `SELECT id, title, start_time, end_time, all_day, location, description, source
           FROM calendar_events
           WHERE substr(start_time, 1, 10) <= ? AND substr(end_time, 1, 10) >= ?
           ORDER BY start_time ASC`
        )
        .all(to, from);
    } else {
      events = db
        .prepare<ParsedCalendarEvent>(
          `SELECT id, title, start_time, end_time, all_day, location, description, source
           FROM calendar_events
           WHERE start_time >= date('now', '-1 day')
           ORDER BY start_time ASC
           LIMIT 50`
        )
        .all();
    }

    return NextResponse.json({
      ok: true,
      hasIcsUrl: Boolean(urlRow?.value),
      icsUrl: urlRow?.value || null,
      lastSync: lastSyncRow?.value || null,
      totalEvents: events.length,
      events,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[CALENDAR_EVENTS_GET] Error:", errorMsg);
    return NextResponse.json(
      { ok: false, error: `Error obteniendo eventos: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    db.transaction(() => {
      db.prepare("DELETE FROM calendar_events").run();
      db.prepare("DELETE FROM settings WHERE key IN ('calendar_ics_url', 'calendar_last_sync')").run();
    })();

    return NextResponse.json({
      ok: true,
      message: "Calendario desconectado y eventos eliminados correctamente",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Error desconectando calendario: ${errorMsg}` },
      { status: 500 }
    );
  }
}
