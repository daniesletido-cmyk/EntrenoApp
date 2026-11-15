import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface IncomingShortcutEvent {
  id?: string;
  title?: string;
  name?: string;
  summary?: string;
  startDate?: string;
  start_time?: string;
  start?: string;
  endDate?: string;
  end_time?: string;
  end?: string;
  isAllDay?: boolean | number;
  allDay?: boolean | number;
  all_day?: boolean | number;
  location?: string;
  notes?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Cuerpo de petición JSON inválido o vacío" },
        { status: 400 }
      );
    }

    // Aceptar tanto array plano como objeto con propiedad events / calendarEvents
    let incomingList: IncomingShortcutEvent[] = [];
    if (Array.isArray(body)) {
      incomingList = body;
    } else if (Array.isArray(body.events)) {
      incomingList = body.events;
    } else if (Array.isArray(body.calendarEvents)) {
      incomingList = body.calendarEvents;
    } else {
      return NextResponse.json(
        { ok: false, error: "Formato esperado: array de eventos o { events: [...] }" },
        { status: 400 }
      );
    }

    console.log(`[IOS_SHORTCUT] Recibidos ${incomingList.length} eventos desde Atajos de iOS`);

    const db = getDb();
    const nowIso = new Date().toISOString();

    const normalizedEvents: Array<{
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      all_day: number;
      location: string | null;
      description: string | null;
    }> = [];

    for (let i = 0; i < incomingList.length; i++) {
      const item = incomingList[i];
      const title = (item.title || item.name || item.summary || "Compromiso de agenda").trim();
      const rawStart = item.startDate || item.start_time || item.start;
      const rawEnd = item.endDate || item.end_time || item.end;

      if (!rawStart) continue;

      // Normalizar fecha ISO YYYY-MM-DDTHH:mm:ss
      let startIso = rawStart;
      try {
        const d = new Date(rawStart);
        if (!isNaN(d.getTime())) {
          startIso = d.toISOString().slice(0, 19);
        }
      } catch {}

      let endIso = rawEnd || rawStart;
      try {
        const d = new Date(rawEnd || rawStart);
        if (!isNaN(d.getTime())) {
          endIso = d.toISOString().slice(0, 19);
        }
      } catch {}

      const isAllDayVal = item.isAllDay || item.allDay || item.all_day;
      const allDayNum = isAllDayVal ? 1 : 0;
      const eventId = item.id || `shortcut-${startIso.slice(0, 10).replace(/-/g, "")}-${i}-${Date.now()}`;

      normalizedEvents.push({
        id: eventId,
        title,
        start_time: startIso,
        end_time: endIso,
        all_day: allDayNum,
        location: item.location || null,
        description: item.notes || item.description || null,
      });
    }

    const saveTx = db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('calendar_last_sync', ?)").run(nowIso);

      // Limpiar eventos previos procedentes de atajos
      db.prepare("DELETE FROM calendar_events WHERE source = 'ios_shortcut'").run();

      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO calendar_events (id, title, start_time, end_time, all_day, location, description, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ios_shortcut', datetime('now'), datetime('now'))
      `);

      for (const ev of normalizedEvents) {
        insertStmt.run(
          ev.id,
          ev.title,
          ev.start_time,
          ev.end_time,
          ev.all_day,
          ev.location,
          ev.description
        );
      }
    });

    saveTx();

    return NextResponse.json({
      ok: true,
      message: `Sincronizados ${normalizedEvents.length} eventos desde Atajos de iOS`,
      count: normalizedEvents.length,
      lastSync: nowIso,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[IOS_SHORTCUT] Error:", errorMsg);
    return NextResponse.json(
      { ok: false, error: `Error procesando eventos de Atajos: ${errorMsg}` },
      { status: 500 }
    );
  }
}
