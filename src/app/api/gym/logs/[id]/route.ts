import { NextRequest, NextResponse } from "next/server";
import { deleteGymLog } from "@/lib/repo/gym";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const logId = Number(id);
  if (!Number.isFinite(logId)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  deleteGymLog(logId);
  return NextResponse.json({ ok: true });
}
