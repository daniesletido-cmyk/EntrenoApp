import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM exercise_records WHERE id = ?").run(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando registro:", error);
    return NextResponse.json({ error: "Error al eliminar registro" }, { status: 500 });
  }
}
