import webpush from "web-push";
import {
  getAllPushSubscriptions,
  deletePushSubscription,
  PushSubscriptionRow,
} from "@/lib/repo/push-subscriptions";
import { createNotification } from "@/lib/repo/notifications";

// Fallback de desarrollo para que nunca falle la inicialización si aún no se configuran las VAPID en .env
const DEFAULT_VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:entrenoapp@danielespinosa.es";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      "[WebPush] VAPID keys no encontradas en variables de entorno. Las notificaciones push permanecerán inactivas hasta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY."
    );
    return false;
  }

  try {
    webpush.setVapidDetails(
      DEFAULT_VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[WebPush] Error configurando VAPID details:", err);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  actions?: Array<{ action: string; title: string }>;
  tag?: string;
}

/**
 * Envía una notificación Web Push a todas las suscripciones activas
 */
export async function sendPushToAll(payload: PushNotificationPayload): Promise<{
  successCount: number;
  failureCount: number;
  totalSubscriptions: number;
}> {
  const isReady = ensureVapidConfigured();
  const subscriptions = getAllPushSubscriptions();

  if (!isReady || subscriptions.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      totalSubscriptions: subscriptions.length,
    };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: payload.data || { url: "/" },
    tag: payload.tag || "entrenoapp-notification",
  });

  let successCount = 0;
  let failureCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString);
        successCount++;
      } catch (error: any) {
        failureCount++;
        console.warn(`[WebPush] Fallo al enviar a ${sub.endpoint.slice(0, 30)}...`, error.statusCode || error.message);

        // Si la suscripción expiró o ya no es válida (404 / 410 Gone), eliminar de la BD
        if (error.statusCode === 404 || error.statusCode === 410) {
          deletePushSubscription(sub.endpoint);
        }
      }
    })
  );

  return {
    successCount,
    failureCount,
    totalSubscriptions: subscriptions.length,
  };
}

/**
 * Envía notificación push instantánea cuando se procesa un entrenamiento
 */
export async function sendWorkoutLoadedPush(workout: {
  id: number;
  tipo: string;
  distancia?: number | null;
  duracion: number;
  carga_tss?: number | null;
}) {
  const sportName = workout.tipo.charAt(0).toUpperCase() + workout.tipo.slice(1);
  const distText = workout.distancia != null ? `${Number(workout.distancia).toFixed(1)} km` : `${workout.duracion} min`;
  const tssText = workout.carga_tss != null ? ` (${Math.round(workout.carga_tss)} TSS)` : "";

  try {
    createNotification({
      title: "🏅 Tu informe del entreno de hoy está listo",
      body: `${sportName}: ${distText}${tssText}. Conclusión del entrenador y carga analizadas. Pulsa para ver el detalle.`,
      url: `/entrenos/${workout.id}`,
      category: "workout",
    });
  } catch {}

  return sendPushToAll({
    title: "🏅 Tu informe del entreno de hoy está listo",
    body: `${sportName}: ${distText}${tssText}. Conclusión del entrenador y carga analizadas. Pulsa para ver el detalle.`,
    data: {
      url: `/entrenos/${workout.id}`,
    },
    tag: `workout-${workout.id}`,
  });
}

/**
 * Envía notificación push instantánea cuando el informe diario de un entreno está listo
 */
export async function sendDailyReportPush(session: {
  id: number;
  discipline: string;
  distance_km?: number | null;
  duration_min?: number | null;
  planned_code?: string | null;
  title?: string | null;
}) {
  const sportName = session.discipline.charAt(0).toUpperCase() + session.discipline.slice(1);
  const detail = session.distance_km != null && session.distance_km > 0
    ? `${Number(session.distance_km).toFixed(1)} km`
    : session.duration_min != null && session.duration_min > 0
      ? `${session.duration_min} min`
      : session.planned_code || "Sesión completada";

  try {
    createNotification({
      title: "🏅 Tu informe del entreno de hoy está listo",
      body: `${sportName} (${detail}): Métricas, carga y conclusión del entrenador preparadas. Pulsa para ver tu análisis.`,
      url: `/entrenos/${session.id}`,
      category: "daily_report",
    });
  } catch {}

  return sendPushToAll({
    title: "🏅 Tu informe del entreno de hoy está listo",
    body: `${sportName} (${detail}): Métricas, carga y conclusión del entrenador preparadas. Pulsa para ver tu análisis.`,
    data: {
      url: `/entrenos/${session.id}`,
    },
    tag: `daily-report-${session.id}`,
  });
}

/**
 * Envía notificación push cuando el informe semanal está listo
 */
export async function sendWeeklyReportPush(weekStart: string, summary?: { totalKm?: number; sessionsCount?: number }) {
  const kmText = summary?.totalKm ? ` (${summary.totalKm.toFixed(1)} km completados)` : "";
  try {
    createNotification({
      title: "📊 Tu informe semanal está listo",
      body: `¡Semana completada con éxito${kmText}! Balance de carga, métricas de descanso y conclusiones del coach preparadas. Pulsa para revisarlo.`,
      url: `/informe-semanal?week=${weekStart}`,
      category: "weekly_report",
    });
  } catch {}

  return sendPushToAll({
    title: "📊 Tu informe semanal está listo",
    body: `¡Semana completada con éxito${kmText}! Balance de carga, métricas de descanso y conclusiones del coach preparadas. Pulsa para revisarlo.`,
    data: {
      url: `/informe-semanal?week=${weekStart}`,
    },
    tag: `weekly-report-${weekStart}`,
  });
}
