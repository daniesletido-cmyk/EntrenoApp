import { NextRequest, NextResponse } from "next/server";
import { deleteGymDay, updateGymDay } from "@/lib/repo/gym";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const dayId = Number(id);
  if (!Number.isFinite(dayId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json();
  const day = updateGymDay(dayId, body);
  if (!day) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json({ day });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const dayId = Number(id);
  if (!Number.isFinite(dayId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteGymDay(dayId);
  return NextResponse.json({ ok: true });
}
