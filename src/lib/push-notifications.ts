import webpush from "web-push";
import {
  getAllPushSubscriptions,
  deletePushSubscription,
} from "@/lib/repo/push-subscriptions";
import { createNotification } from "@/lib/repo/notifications";
import { getSessionById, listSessionsBetween } from "@/lib/repo/sessions";
import { computeDailyReadiness } from "@/lib/readiness";
import { buildStructuredFitDiagnostics } from "@/lib/fit-feedback";
import { sessionLoad } from "@/lib/recommendations";

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

// Deduplicación en memoria de notificaciones recientes para evitar ráfagas o llamadas simultáneas
const recentPushes = new Map<string, number>();
const RECENT_PUSH_COOLDOWN_MS = 60 * 1000; // 60 segundos de cooldown por tag idéntico

function isDuplicatePush(tag?: string): boolean {
  if (!tag) return false;
  const now = Date.now();
  const lastTime = recentPushes.get(tag);
  if (lastTime && now - lastTime < RECENT_PUSH_COOLDOWN_MS) {
    return true;
  }
  recentPushes.set(tag, now);

  // Limpieza periódica de mapa de deduplicación
  if (recentPushes.size > 200) {
    for (const [k, time] of recentPushes.entries()) {
      if (now - time > RECENT_PUSH_COOLDOWN_MS * 5) {
        recentPushes.delete(k);
      }
    }
  }
  return false;
}

function truncateLine(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trim() + "…";
}

function formatHoursMinutesShort(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) return "0h";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function cleanDisciplineLabel(raw?: string | null): string {
  const d = (raw || "").toLowerCase().trim();
  if (d.includes("carrer") || d.includes("run")) return "Rodaje suave";
  if (d.includes("series") || d.includes("interval")) return "Series de umbral";
  if (d.includes("natac") || d.includes("swim")) return "Natación técnica";
  if (d.includes("crossfit") || d.includes("box")) return "CrossFit WOD";
  if (d.includes("gimnas") || d.includes("fuerza")) return "Fuerza gimnasio";
  if (d.includes("bici") || d.includes("ciclismo")) return "Ciclismo";
  if (d.includes("caminata")) return "Caminata activa";
  return raw ? raw.slice(0, 24) : "Entrenamiento";
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

  // Comprobar deduplicación si tiene tag
  if (payload.tag && isDuplicatePush(payload.tag)) {
    console.warn(`[WebPush] Envío omitido por deduplicación (tag reciente: ${payload.tag})`);
    return {
      successCount: 0,
      failureCount: 0,
      totalSubscriptions: subscriptions.length,
    };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon-192.png?v=6",
    badge: payload.badge || "/icon-192.png?v=6",
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
 * Envía notificación push instantánea cuando se procesa un entrenamiento desde Suunto/Intervals
 * Estilo minimalista Apple Salud / Strava / WHOOP:
 * Título: "Nuevo entreno completado"
 * Cuerpo (1 línea): "[Tipo o título breve] · [Distancia o Duración]"
 */
export async function sendWorkoutLoadedPush(workout: {
  id: number;
  fecha?: string;
  sessionId?: number;
  tipo: string;
  distancia?: number | null;
  duracion: number;
  carga_tss?: number | null;
}) {
  const typeLabel = cleanDisciplineLabel(workout.tipo);
  const metricPart =
    workout.distancia != null && workout.distancia > 0
      ? `${Number(workout.distancia).toFixed(1)} km`
      : `${Math.round(workout.duracion)} min`;

  const title = "Nuevo entreno completado";
  const body = truncateLine(`${typeLabel} · ${metricPart}`, 55);

  let targetUrl = workout.fecha ? `/hoy?date=${workout.fecha}` : `/hoy`;
  if (workout.sessionId) {
    targetUrl = `/hoy?id=${workout.sessionId}`;
  }

  try {
    createNotification({
      title,
      body,
      url: targetUrl,
      category: "workout",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: { url: targetUrl },
    tag: `workout-${workout.sessionId || workout.id}-${workout.fecha || ""}`,
  });
}

/**
 * Envía notificación push instantánea cuando el informe diario de un entreno está listo
 * Estilo minimalista:
 * Título: "Nuevo entreno completado"
 * Cuerpo (1 línea): "[Tipo o título breve] · [Distancia o Duración]"
 */
export async function sendDailyReportPush(session: {
  id: number;
  date?: string | null;
  discipline: string;
  distance_km?: number | null;
  duration_min?: number | null;
  planned_code?: string | null;
  title?: string | null;
  carga_tss?: number | null;
  pace?: string | null;
}) {
  const fullSession = getSessionById(session.id);
  const dateStr = session.date || fullSession?.date || "";
  const discipline = fullSession?.discipline || session.discipline;
  const distVal = fullSession?.distance_km ?? session.distance_km;
  const durVal = fullSession?.duration_min ?? session.duration_min;
  const codeVal = session.planned_code || fullSession?.planned_code;

  let shortName = codeVal ? codeVal.replace(/\([^)]*\)/g, "").trim() : cleanDisciplineLabel(discipline);
  if (shortName.length > 24) shortName = shortName.slice(0, 24).trim();

  const metricPart =
    distVal != null && distVal > 0
      ? `${Number(distVal).toFixed(1)} km`
      : durVal != null && durVal > 0
      ? `${Math.round(durVal)} min`
      : "Completado";

  const title = "Nuevo entreno completado";
  const body = truncateLine(`${shortName} · ${metricPart}`, 55);
  const targetUrl = `/hoy?id=${session.id}${dateStr ? `&date=${dateStr}` : ""}`;

  try {
    createNotification({
      title,
      body,
      url: targetUrl,
      category: "daily_report",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: { url: targetUrl },
    tag: `daily-report-${session.id}-${dateStr}`,
  });
}

/**
 * Envía notificación push de resumen semanal
 * Estilo minimalista:
 * Título: "Resumen semanal disponible"
 * Cuerpo (1 línea): "[Total km o tiempo semanal] completados esta semana."
 */
export async function sendWeeklyReportPush(
  weekStart: string,
  summary?: { totalKm?: number; totalTss?: number; sessionsCount?: number; totalDurationMin?: number }
) {
  let volumePart = "";
  if (summary?.totalKm != null && summary.totalKm > 0) {
    volumePart = `${summary.totalKm.toFixed(1)} km`;
  } else if (summary?.totalDurationMin != null && summary.totalDurationMin > 0) {
    const h = Math.floor(summary.totalDurationMin / 60);
    const m = Math.round(summary.totalDurationMin % 60);
    volumePart = `${h}h ${String(m).padStart(2, "0")}m`;
  } else if (summary?.sessionsCount != null && summary.sessionsCount > 0) {
    volumePart = `${summary.sessionsCount} sesiones`;
  } else {
    volumePart = "Entrenamientos";
  }

  const title = "Resumen semanal disponible";
  const body = truncateLine(`${volumePart} completados esta semana.`, 55);
  const targetUrl = "/progreso";

  try {
    createNotification({
      title,
      body,
      url: targetUrl,
      category: "weekly_report",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: {
      url: targetUrl,
    },
    tag: `weekly-report-${weekStart}`,
  });
}

/**
 * Envía notificación push instantánea cuando se registra o sincroniza el descanso (Zepp)
 * Estilo minimalista:
 * Título: "Nuevo registro de sueño"
 * Cuerpo (1 línea): "[Horas dormidas] · Readiness al [X]%"
 */
export async function sendSleepRecordedPush(sleep: {
  date: string;
  hours?: number | null;
  score?: number | null;
  quality?: number | null;
  deep_min?: number | null;
  rem_min?: number | null;
  hrv_rmssd?: number | null;
  resting_hr?: number | null;
}) {
  const hoursFormatted = formatHoursMinutesShort(sleep.hours);

  let readinessVal = 80;
  try {
    const r = computeDailyReadiness(sleep.date);
    if (typeof r?.score === "number") readinessVal = Math.round(r.score);
  } catch {}

  const title = "Nuevo registro de sueño";
  const body = truncateLine(`${hoursFormatted} dormidos · Readiness al ${readinessVal}%`, 55);
  const targetUrl = `/sueno?date=${sleep.date}`;

  try {
    createNotification({
      title,
      body,
      url: targetUrl,
      category: "sleep",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: { url: targetUrl },
    tag: `sleep-${sleep.date}`,
  });
}

/**
 * Recordatorio diario de sesión planificada
 * Estilo minimalista:
 * Título: "Entreno de hoy listo"
 * Cuerpo (1 línea): "[Nombre corto de la sesión] · [Duración estimada]"
 */
export async function sendDailyPlanReminderPush(session: {
  id?: number;
  date: string;
  discipline: string;
  planned_code?: string | null;
  duration_min?: number | null;
  distance_km?: number | null;
}) {
  let shortName = session.planned_code
    ? session.planned_code.replace(/\([^)]*\)/g, "").trim()
    : cleanDisciplineLabel(session.discipline);
  if (shortName.length > 24) shortName = shortName.slice(0, 24).trim();

  const durPart =
    session.duration_min != null && session.duration_min > 0
      ? `${Math.round(session.duration_min)} min`
      : session.distance_km != null && session.distance_km > 0
      ? `${Number(session.distance_km).toFixed(1)} km`
      : "Sesión del día";

  const title = "Entreno de hoy listo";
  const body = truncateLine(`${shortName} · ${durPart}`, 55);
  const targetUrl = "/hoy";

  try {
    createNotification({
      title,
      body,
      url: targetUrl,
      category: "workout",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: { url: targetUrl },
    tag: `daily-reminder-${session.date}`,
  });
}
