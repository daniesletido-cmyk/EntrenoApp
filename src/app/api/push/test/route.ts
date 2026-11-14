import { NextRequest, NextResponse } from "next/server";
import {
  sendPushToAll,
  sendDailyReportPush,
  sendWeeklyReportPush,
  sendSleepRecordedPush,
  sendDailyPlanReminderPush,
} from "@/lib/push-notifications";
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
      const title = (customTitle || "Entreno completado").slice(0, 25);
      const bodyText = (customBody || "Series umbral · 58 min").slice(0, 35);
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
        hours: 8.5833, // 8h 35m
        score: 94,
      });
    } else if (type === "weekly") {
      result = await sendWeeklyReportPush("2026-11-09", { totalKm: 42.5, totalTss: 420, sessionsCount: 5 });
    } else if (type === "reminder") {
      result = await sendDailyPlanReminderPush({
        date: new Date().toISOString().slice(0, 10),
        discipline: "carrera",
        planned_code: "Intervalos R3",
        duration_min: 55,
      });
    } else {
      result = await sendDailyReportPush({
        id: 480,
        date: new Date().toISOString().slice(0, 10),
        discipline: "carrera",
        distance_km: 10.2,
        duration_min: 58,
        planned_code: "Series umbral",
        pace: "4:19 min/km",
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
