import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll, sendDailyReportPush, sendWeeklyReportPush } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  try {
    let customTitle = "🏅 Tu informe del entreno de hoy está listo";
    let customBody = "Carrera 12.0 km (98 TSS): Carga, métricas y conclusión del entrenador listas. Pulsa para ver tu análisis.";
    let customUrl = "/hoy";
    let type = "daily";

    try {
      const body = await req.json();
      if (body.type) type = body.type;
      if (body.title) customTitle = body.title;
      if (body.body) customBody = body.body;
      if (body.url) customUrl = body.url;
    } catch {}

    let result;
    if (type === "daily") {
      result = await sendDailyReportPush({
        id: 480,
        discipline: "carrera",
        distance_km: 12.0,
        duration_min: 65,
        planned_code: "R2-Tempo",
      });
    } else if (type === "weekly") {
      result = await sendWeeklyReportPush("2026-10-26", { totalKm: 34.5, sessionsCount: 5 });
    } else {
      result = await sendPushToAll({
        title: customTitle,
        body: customBody,
        data: { url: customUrl },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: result.totalSubscriptions === 0
        ? "No hay dispositivos suscritos todavía. Pulsa 'Activar en mi móvil' primero."
        : `¡Notificación enviada con éxito a ${result.successCount} de ${result.totalSubscriptions} dispositivo(s)!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error enviando notificación push" }, { status: 500 });
  }
}
