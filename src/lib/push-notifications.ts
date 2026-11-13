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
  const sportName = workout.tipo.charAt(0).toUpperCase() + workout.tipo.slice(1);
  const distText = workout.distancia != null ? `${Number(workout.distancia).toFixed(2)} km` : `${workout.duracion} min`;
  const tssText = workout.carga_tss != null ? `${Math.round(workout.carga_tss)} TSS` : "";
  const metricsLine = [distText, `${workout.duracion} min`, tssText].filter(Boolean).join(" · ");

  let targetUrl = workout.fecha ? `/detalle?date=${workout.fecha}` : `/detalle`;
  if (workout.sessionId) {
    targetUrl = `/detalle?id=${workout.sessionId}${workout.fecha ? `&date=${workout.fecha}` : ""}`;
  } else if (workout.fecha) {
    try {
      const sameDay = listSessionsBetween(workout.fecha, workout.fecha);
      const match = sameDay.find((s) => s.discipline === workout.tipo) || sameDay[0];
      if (match) {
        targetUrl = `/detalle?id=${match.id}&date=${match.date}`;
      }
    } catch {}
  }

  const title = `🏅 ${sportName} sincronizado y analizado`;
  const body = `${metricsLine}.\nPulsa para ver el feedback técnico, zonas de pulso y carga.`;

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
 * Lleva directamente al feedback completo del entreno (/detalle?id=...&date=...)
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

  const sportLabelMap: Record<string, string> = {
    carrera: "🏃 Carrera",
    natacion: "🏊 Natación",
    crossfit: "🏋️ CrossFit",
    gimnasio: "💪 Gimnasio",
    ciclismo: "🚴 Ciclismo",
    caminata: "🥾 Caminata",
    remo: "🚣 Remo",
  };
  const sportName = sportLabelMap[discipline] || (discipline.charAt(0).toUpperCase() + discipline.slice(1));

  const distText = distVal != null && distVal > 0 ? `${Number(distVal).toFixed(2)} km` : "";
  const durationText = durVal != null && durVal > 0 ? `${Math.round(durVal)} min` : "";
  let paceText = session.pace ? session.pace : "";
  let verdict = "Completado";
  let feedbackSummary = "Pulsa para abrir el feedback completo: zonas, métricas Suunto y carga.";
  let extraMetrics = "";

  if (fullSession) {
    const fLoad = sessionLoad(fullSession);
    if (fullSession.fit_data) {
      try {
        const fitObj = JSON.parse(fullSession.fit_data);
        const diag = buildStructuredFitDiagnostics(fitObj, fullSession);
        if (diag.complianceVerdict) verdict = diag.complianceVerdict;
        if (diag.summary) feedbackSummary = diag.summary;

        if (!paceText && discipline === "natacion" && fitObj.deepAnalysis?.swimmingMetrics?.pacePer100mFormatted) {
          paceText = fitObj.deepAnalysis.swimmingMetrics.pacePer100mFormatted;
        }
        const avgHr = fitObj.avgHeartRate ? `${Math.round(fitObj.avgHeartRate)} lpm` : "";
        const pte = diag.suuntoReport?.pte ?? fitObj.pte;
        const pteTxt = pte != null ? `PTE ${Number(pte).toFixed(1)}` : "";
        const loadTxt = fLoad > 0 ? `${Math.round(fLoad)} UA` : "";
        extraMetrics = [avgHr, pteTxt, loadTxt].filter(Boolean).join(" · ");
      } catch {}
    } else if (fLoad > 0) {
      extraMetrics = `${Math.round(fLoad)} UA`;
    }
  }

  if (!paceText && distVal && distVal > 0 && durVal && durVal > 0 && discipline.toLowerCase().includes("carrer")) {
    const minPerKm = durVal / distVal;
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    paceText = `${mins}:${secs.toString().padStart(2, "0")}/km`;
  }
  const tssText = session.carga_tss != null ? `${Math.round(session.carga_tss)} TSS` : "";

  const metrics = [distText, durationText, paceText, extraMetrics || tssText].filter(Boolean).join(" · ") || session.planned_code || "Completado";

  const title = `${sportName} analizada · ${verdict}`;
  const body = `${metrics}\n${feedbackSummary} Pulsa para ver el feedback completo.`;
  const targetUrl = `/detalle?id=${session.id}${dateStr ? `&date=${dateStr}` : ""}`;

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
 * Envía notificación push instantánea cuando el informe semanal está listo
 */
export async function sendWeeklyReportPush(weekStart: string, summary?: { totalKm?: number; totalTss?: number; sessionsCount?: number }) {
  const kmText = summary?.totalKm ? `${summary.totalKm.toFixed(1)} km` : "";
  const tssText = summary?.totalTss ? `${Math.round(summary.totalTss)} TSS` : "";
  const sessionsText = summary?.sessionsCount ? `${summary.sessionsCount} sesiones` : "";
  const statsLine = [kmText, sessionsText, tssText].filter(Boolean).join(" · ") || "Semana cerrada";

  const title = `📊 Informe semanal listo`;
  const body = `${statsLine}.\nBalance de carga y adaptaciones disponibles.`;

  try {
    createNotification({
      title,
      body,
      url: `/informe-semanal?week=${weekStart}`,
      category: "weekly_report",
    });
  } catch {}

  return sendPushToAll({
    title,
    body,
    data: {
      url: `/informe-semanal?week=${weekStart}`,
    },
    tag: `weekly-report-${weekStart}`,
  });
}

/**
 * Envía notificación push instantánea cuando se registra o sincroniza el sueño con análisis de Readiness
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
  const hoursText = sleep.hours != null ? `${Number(sleep.hours).toFixed(1)}h` : "Sueño";
  const stages = [
    sleep.deep_min != null ? `${Math.round(sleep.deep_min)}m prof` : "",
    sleep.rem_min != null ? `${Math.round(sleep.rem_min)}m REM` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const scoreText = sleep.score != null ? `Score ${sleep.score}/100` : "";
  const bioText = [
    sleep.hrv_rmssd != null ? `HRV ${Math.round(sleep.hrv_rmssd)} ms` : "",
    sleep.resting_hr != null ? `FC ${Math.round(sleep.resting_hr)} lpm` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  let readinessBadge = "";
  let readinessAdvice = "Pulsa para ver fases del sueño, HRV y recomendación de carga.";
  try {
    const r = computeDailyReadiness(sleep.date);
    if (r?.score) {
      readinessBadge = ` · Readiness ${r.score}/100`;
      readinessAdvice = `${r.headline}. Pulsa para ver el feedback completo.`;
    }
  } catch {}

  const metrics = [
    stages ? `${hoursText} (${stages})` : hoursText,
    scoreText,
    bioText,
  ]
    .filter(Boolean)
    .join(" · ");

  const title = `😴 Sueño sincronizado${readinessBadge}`;
  const body = `${metrics}\n${readinessAdvice}`;
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
