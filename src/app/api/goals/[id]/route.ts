import { NextRequest, NextResponse } from "next/server";
import { deleteGoal, updateGoal } from "@/lib/repo/goals";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json();
  const goal = updateGoal(goalId, body);
  return NextResponse.json({ goal });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteGoal(goalId);
  return NextResponse.json({ ok: true });
}
