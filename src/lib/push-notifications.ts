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

function truncateLine(str: string, maxLen: number = 35): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trim() + "…";
}

function formatHoursMinutesShort(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) return "0h 00m";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function cleanDisciplineLabel(raw?: string | null): string {
  const d = (raw || "").toLowerCase().trim();
  if (d.includes("series") || d.includes("interval") || d.includes("r3") || d.includes("r4")) return "Series umbral";
  if (d.includes("carrer") || d.includes("run") || d.includes("rodaje")) return "Rodaje suave";
  if (d.includes("natac") || d.includes("swim")) return "Natación";
  if (d.includes("crossfit") || d.includes("box") || d.includes("wod")) return "CrossFit";
  if (d.includes("gimnas") || d.includes("fuerza")) return "Fuerza";
  if (d.includes("bici") || d.includes("ciclismo")) return "Ciclismo";
  if (d.includes("caminata") || d.includes("paseo")) return "Caminata";
  return raw ? raw.slice(0, 16).trim() : "Entreno";
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
 * Estilo ultra minimalista (Apple Salud / Strava / WHOOP):
 * Título: "Entreno completado"
 * Cuerpo (1 línea): "[Nombre corto] · [Duración o km]" (Ej: "Series umbral · 58 min" o "Rodaje suave · 10.2 km")
 * Destino: /hoy
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
  const shortName = cleanDisciplineLabel(workout.tipo);
  const metricPart =
    workout.distancia != null && workout.distancia > 0
      ? `${Number(workout.distancia).toFixed(1)} km`
      : `${Math.round(workout.duracion)} min`;

  const title = "Entreno completado";
  const body = truncateLine(`${shortName} · ${metricPart}`, 35);
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
    tag: `workout-${workout.sessionId || workout.id}-${workout.fecha || ""}`,
  });
}

/**
 * Envía notificación push instantánea cuando el informe diario de un entreno está listo
 * Estilo ultra minimalista:
 * Título: "Entreno completado"
 * Cuerpo (1 línea): "[Nombre corto] · [Duración o km]" (Ej: "Series umbral · 58 min" o "Rodaje suave · 10.2 km")
 * Destino: /hoy
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
  if (shortName.length > 18) shortName = shortName.slice(0, 18).trim();

  const metricPart =
    distVal != null && distVal > 0
      ? `${Number(distVal).toFixed(1)} km`
      : durVal != null && durVal > 0
      ? `${Math.round(durVal)} min`
      : "Completado";

  const title = "Entreno completado";
  const body = truncateLine(`${shortName} · ${metricPart}`, 35);
  const targetUrl = "/hoy";

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
 * Estilo ultra minimalista:
 * Título: "Resumen semanal"
 * Cuerpo (1 línea): "[Total km o horas] esta semana" (Ej: "42.5 km esta semana")
 * Destino: /progreso
 */
export async function sendWeeklyReportPush(
  weekStart: string,
  summary?: { totalKm?: number; totalTss?: number; sessionsCount?: number; totalDurationMin?: number }
) {
  let volumePart = "";
  if (summary?.totalKm != null && summary.totalKm > 0) {
    volumePart = `${Number(summary.totalKm).toFixed(1)} km`;
  } else if (summary?.totalDurationMin != null && summary.totalDurationMin > 0) {
    const hours = (summary.totalDurationMin / 60).toFixed(1);
    volumePart = `${hours}h`;
  } else if (summary?.sessionsCount != null && summary.sessionsCount > 0) {
    volumePart = `${summary.sessionsCount} sesiones`;
  } else {
    volumePart = "Buen volumen";
  }

  const title = "Resumen semanal";
  const body = truncateLine(`${volumePart} esta semana`, 35);
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
 * Estilo ultra minimalista:
 * Título: "Recuperación al [X]%" (Ej: "Recuperación al 94%")
 * Cuerpo (1 línea): "Sueño registrado: [Xh XXm]" (Ej: "Sueño registrado: 8h 35m")
 * Destino: /sueno
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
    if (typeof r?.score === "number") {
      readinessVal = Math.round(r.score);
    } else if (typeof sleep.score === "number" && sleep.score > 0) {
      readinessVal = Math.round(sleep.score);
    }
  } catch {
    if (typeof sleep.score === "number" && sleep.score > 0) {
      readinessVal = Math.round(sleep.score);
    }
  }

  const title = `Recuperación al ${readinessVal}%`;
  const body = truncateLine(`Sueño registrado: ${hoursFormatted}`, 35);
  const targetUrl = "/sueno";

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
 * Estilo ultra minimalista:
 * Título: "Sesión de hoy"
 * Cuerpo (1 línea): "[Nombre corto] · [Duración]" (Ej: "Intervalos R3 · 55 min")
 * Destino: /hoy
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
  if (shortName.length > 18) shortName = shortName.slice(0, 18).trim();

  const durPart =
    session.duration_min != null && session.duration_min > 0
      ? `${Math.round(session.duration_min)} min`
      : session.distance_km != null && session.distance_km > 0
      ? `${Number(session.distance_km).toFixed(1)} km`
      : "Listo";

  const title = "Sesión de hoy";
  const body = truncateLine(`${shortName} · ${durPart}`, 35);
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
