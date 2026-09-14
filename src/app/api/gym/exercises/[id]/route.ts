import { NextRequest, NextResponse } from "next/server";
import { deleteGymExercise, updateGymExercise } from "@/lib/repo/gym";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const exerciseId = Number(id);
  if (!Number.isFinite(exerciseId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json();
  const exercise = updateGymExercise(exerciseId, body);
  if (!exercise) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json({ exercise });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const exerciseId = Number(id);
  if (!Number.isFinite(exerciseId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteGymExercise(exerciseId);
  return NextResponse.json({ ok: true });
}
