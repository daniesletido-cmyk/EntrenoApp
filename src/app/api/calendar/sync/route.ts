import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseICalFeed, type ParsedCalendarEvent } from "@/lib/ical-parser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDb();
    const urlRow = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'calendar_ics_url'").get();
    const lastSyncRow = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'calendar_last_sync'").get();

    const countRow = db.prepare<{ c: number }>("SELECT COUNT(*) as c FROM calendar_events").get();
    const recentEvents = db
      .prepare<ParsedCalendarEvent>(
        "SELECT id, title, start_time, end_time, all_day, location, description, source FROM calendar_events WHERE start_time >= date('now') ORDER BY start_time ASC LIMIT 20"
      )
      .all();

    return NextResponse.json({
      ok: true,
      icsUrl: urlRow?.value || null,
      hasIcsUrl: Boolean(urlRow?.value),
      lastSync: lastSyncRow?.value || null,
      totalEvents: countRow?.c || 0,
      events: recentEvents,
    });
  } catch (err) {
    console.error("[CALENDAR_SYNC_GET] Error:", err);
    return NextResponse.json({ ok: false, error: "Error consultando estado de calendario" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = getDb();

    let icsUrl = typeof body.icsUrl === "string" ? body.icsUrl.trim() : null;

    if (!icsUrl) {
      // Buscar la URL previamente guardada en settings
      const row = db.prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'calendar_ics_url'").get();
      icsUrl = row?.value || null;
    }

    if (!icsUrl) {
      return NextResponse.json(
        { ok: false, error: "Falta la URL de suscripción iCal (.ics / webcal://) de iCloud" },
        { status: 400 }
      );
    }

    // Normalizar protocolo webcal:// a https://
    let fetchUrl = icsUrl;
    if (fetchUrl.startsWith("webcal://")) {
      fetchUrl = "https://" + fetchUrl.slice(9);
    } else if (fetchUrl.startsWith("http://")) {
      fetchUrl = "https://" + fetchUrl.slice(7);
    }

    console.log(`[CALENDAR_SYNC] Descargando feed iCal desde: ${fetchUrl.slice(0, 40)}...`);

    // Descargar el feed con User-Agent compatible y timeout de 10s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "EntrenoApp-iCalSync/1.0 (+https://entrenoapp-blond.vercel.app)",
          Accept: "text/calendar, text/plain, */*",
        },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `El servidor de calendario respondió con código ${res.status}. Verifica que la URL pública/privada de iCloud sea válida.`,
        },
        { status: 502 }
      );
    }

    const icsText = await res.text();
    if (!icsText || !icsText.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json(
        { ok: false, error: "El archivo descargado no parece un feed de calendario válido (.ics / RFC 5545)" },
        { status: 400 }
      );
    }

    // Parsear eventos y expandir los próximos 14 días
    const events = parseICalFeed(icsText, 14, new Date());
    console.log(`[CALENDAR_SYNC] ${events.length} eventos extraídos para los próximos 14 días`);

    const nowIso = new Date().toISOString();

    // Guardar en BD en transacción
    const saveTx = db.transaction(() => {
      // 1. Guardar o actualizar la URL y fecha de sincro en settings
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_ics_url', ?)").run(icsUrl);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_last_sync', ?)").run(nowIso);

      // 2. Limpiar eventos antiguos de tipo 'ical'
      db.prepare("DELETE FROM calendar_events WHERE source = 'ical'").run();

      // 3. Insertar los nuevos eventos
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO calendar_events (id, title, start_time, end_time, all_day, location, description, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ical', datetime('now'), datetime('now'))
      `);

      for (const ev of events) {
        insertStmt.run(
          ev.id,
          ev.title,
          ev.start_time,
          ev.end_time,
          ev.all_day,
          ev.location || null,
          ev.description || null
        );
      }
    });

    saveTx();

    return NextResponse.json({
      ok: true,
      message: `Sincronizados ${events.length} eventos de los próximos 14 días con éxito`,
      count: events.length,
      lastSync: nowIso,
      events: events.slice(0, 20),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[CALENDAR_SYNC_POST] Error:", errorMsg);
    return NextResponse.json(
      { ok: false, error: `Error durante la sincronización: ${errorMsg}` },
      { status: 500 }
    );
  }
}
