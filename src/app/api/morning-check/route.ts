import { NextRequest, NextResponse } from "next/server";
import { getMorningCheck, saveMorningCheck } from "@/lib/morning-check";
import { todayISO } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || todayISO();
    const check = getMorningCheck(date);

    return NextResponse.json({
      success: true,
      check,
    });
  } catch (error) {
    console.error("Error al obtener check matinal:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener check matinal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, weightKg, hydration, energy, notes } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: "La fecha es obligatoria" },
        { status: 400 }
      );
    }

    const check = saveMorningCheck({
      date,
      weightKg: weightKg !== undefined && weightKg !== "" && weightKg !== null ? parseFloat(weightKg) : null,
      hydration: hydration || "normal",
      energy: energy || "media",
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      check,
      message: "Check matinal registrado",
    });
  } catch (error) {
    console.error("Error al guardar check matinal:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al guardar check matinal" },
      { status: 500 }
    );
  }
}
