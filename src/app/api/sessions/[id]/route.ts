import { NextRequest, NextResponse } from "next/server";
import { deleteSession, undoFitImport, updateSession } from "@/lib/repo/sessions";

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
