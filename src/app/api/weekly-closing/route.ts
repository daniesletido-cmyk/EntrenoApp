import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyClosing,
  applyDischargeToMonday,
  triggerWeeklyClosingPushNotification,
} from "@/lib/weekly-closing";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || undefined;
    const summary = generateWeeklyClosing(dateParam);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error al generar cierre semanal:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al calcular cierre semanal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, weekStart, nextMonday } = body;

    if (action === "notify") {
      const res = await triggerWeeklyClosingPushNotification(weekStart);
      return NextResponse.json({
        success: true,
        message: "Notificación push enviada",
        result: res,
      });
    }

    if (action === "apply_discharge") {
      if (!nextMonday) {
        return NextResponse.json(
          { success: false, error: "Fecha de próximo lunes requerida" },
          { status: 400 }
        );
      }
      const ok = applyDischargeToMonday(nextMonday);
      return NextResponse.json({
        success: ok,
        message: ok
          ? "Sesión de descarga aplicada al próximo lunes en ambas bases de datos"
          : "No se encontró sesión para adaptar",
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en endpoint de cierre semanal:", error);
    return NextResponse.json(
      { success: false, error: "Error interno en cierre semanal" },
      { status: 500 }
    );
  }
}
