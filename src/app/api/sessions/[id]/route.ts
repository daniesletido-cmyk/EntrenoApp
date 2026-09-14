import { NextRequest, NextResponse } from "next/server";
import { applyFitImport, deleteSession, logSessionResult, undoFitImport, updatePlannedSession } from "@/lib/repo/sessions";

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

  if (body.status) {
    // fitImport: true indica que estos valores vienen de aplicar un archivo
    // .fit (ver Registro) — se guarda el estado anterior para poder deshacer.
    const session = body.fitImport
      ? applyFitImport(sessionId, {
          status: body.status,
          rpe: body.rpe ?? null,
          duration_min: body.duration_min ?? null,
          distance_km: body.distance_km ?? null,
          notes: body.notes ?? null,
        })
      : logSessionResult(sessionId, {
          status: body.status,
          rpe: body.rpe ?? null,
          duration_min: body.duration_min ?? null,
          distance_km: body.distance_km ?? null,
          notes: body.notes ?? null,
        });
    return NextResponse.json({ session });
  }

  const session = updatePlannedSession(sessionId, {
    discipline: body.discipline,
    planned_code: body.planned_code,
    is_long_run: body.is_long_run,
    date: body.date,
    notes: body.notes,
  });
  return NextResponse.json({ session });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteSession(sessionId);
  return NextResponse.json({ ok: true });
}
