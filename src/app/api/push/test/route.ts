import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll, sendDailyReportPush, sendWeeklyReportPush, sendSleepRecordedPush } from "@/lib/push-notifications";
import { savePushSubscription } from "@/lib/repo/push-subscriptions";
import { createNotification } from "@/lib/repo/notifications";

export async function POST(req: NextRequest) {
  try {
    let customTitle: string | undefined;
    let customBody: string | undefined;
    let customUrl = "/hoy";
    let type: string | undefined;
    let delaySeconds = 0;

    try {
      const body = await req.json();
      if (body.type) type = body.type;
      if (body.title) customTitle = body.title;
      if (body.body) customBody = body.body;
      if (body.url) customUrl = body.url;
      if (typeof body.delaySeconds === "number") delaySeconds = body.delaySeconds;

      // Si el cliente envía su suscripción en la misma llamada de prueba, guardarla directamente
      const endpoint = body.subscription?.endpoint || body.endpoint;
      const keys = body.subscription?.keys || body.keys;
      if (endpoint && keys?.p256dh && keys?.auth) {
        savePushSubscription({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_type: "mobile",
        });
      }
    } catch {}

    // Si se solicitó retraso (para dar tiempo al usuario a cerrar la app o bloquear la pantalla)
    if (delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(delaySeconds, 15) * 1000));
    }

    let result;
    if (customTitle || customBody) {
      const title = customTitle || "Notificación de prueba";
      const bodyText = customBody || "Notificación personalizada de EntrenoApp";
      try {
        createNotification({
          title,
          body: bodyText,
          url: customUrl,
          category: type === "sleep" ? "sleep" : "system",
        });
      } catch {}

      result = await sendPushToAll({
        title,
        body: bodyText,
        data: { url: customUrl },
        tag: `push-custom-${Date.now()}`,
      });
    } else if (type === "sleep") {
      result = await sendSleepRecordedPush({
        date: new Date().toISOString().slice(0, 10),
        hours: 8.0,
        score: 85,
      });
    } else if (type === "weekly") {
      result = await sendWeeklyReportPush("2026-10-26", { totalKm: 34.5, totalTss: 420, sessionsCount: 5 });
    } else {
      result = await sendDailyReportPush({
        id: 480,
        discipline: "carrera",
        distance_km: 12.0,
        duration_min: 60,
        planned_code: "R1-Base",
        pace: "5:02 min/km",
        carga_tss: 98,
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
