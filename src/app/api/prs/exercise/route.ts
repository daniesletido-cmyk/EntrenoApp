import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, category, unit } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre del ejercicio es obligatorio" }, { status: 400 });
    }

    const db = getDb();
    const cleanName = name.trim();
    const finalCategory = category || "Fuerza & Powerlifting";
    const finalUnit = unit || "kg";
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exercise_catalog (name, category, unit, is_custom, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(cleanName, finalCategory, finalUnit, now);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message && error.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un ejercicio con ese nombre" }, { status: 400 });
    }
    console.error("Error creating custom exercise:", error);
    return NextResponse.json({ error: "Error al crear ejercicio" }, { status: 500 });
  }
}
