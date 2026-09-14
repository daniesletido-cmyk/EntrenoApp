import { NextRequest, NextResponse } from "next/server";
import { createPlannedSession, bulkCreateSessions, listSessionsForWeek, listSessionsBetween, Discipline } from "@/lib/repo/sessions";
import { weekStartOf, todayISO } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from && to) {
    return NextResponse.json({ sessions: listSessionsBetween(from, to) });
  }
  const week = req.nextUrl.searchParams.get("week") ?? weekStartOf(todayISO());
  const sessions = listSessionsForWeek(weekStartOf(week));
  return NextResponse.json({ weekStart: weekStartOf(week), sessions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Soporte para inserción en lote atómica
  if (Array.isArray(body) || Array.isArray(body.sessions)) {
    const items = Array.isArray(body) ? body : body.sessions;
    const valid = items.filter((b: { date?: string; discipline?: string }) => b.date && b.discipline);
    if (valid.length === 0) {
      return NextResponse.json({ error: "Ninguna sesión válida para crear" }, { status: 400 });
    }
    const created = bulkCreateSessions(valid);
    return NextResponse.json({ sessions: created, count: created.length }, { status: 201 });
  }

  if (!body.date || !body.discipline) {
    return NextResponse.json({ error: "date y discipline son obligatorios" }, { status: 400 });
  }
  const session = createPlannedSession({
    date: body.date,
    discipline: body.discipline as Discipline,
    planned_code: body.planned_code ?? null,
    is_long_run: !!body.is_long_run,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ session }, { status: 201 });
}
