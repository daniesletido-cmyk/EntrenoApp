import { getSetting, setSettings } from "@/lib/repo/settings";
import { getSessionById, SessionRow } from "@/lib/repo/sessions";
import { upsertSessionSuuntoSync, SessionSuuntoSyncRow } from "@/lib/repo/suunto-sync";
import { buildStructuredWorkoutForSession, buildStructuredWorkoutFitBuffer } from "@/lib/suunto-workout-builder";

const SUUNTO_OAUTH_AUTHORIZE = "https://cloudapi-oauth.suunto.com/oauth/authorize";
const SUUNTO_OAUTH_TOKEN = "https://cloudapi-oauth.suunto.com/oauth/token";
const SUUNTO_CLOUD_BASE = "https://cloudapi.suunto.com";

export interface SuuntoConnectionStatus {
  directOAuthConfigured: boolean;
  directOAuthConnected: boolean;
  intervalsSuuntoBridgeConnected: boolean;
  suuntoUserId: string | null;
  uploadPlannedWorkoutsEnabled: boolean;
  scopes: string | null;
  tokenExpiresAt: string | null;
  autoPushEnabled: boolean;
}

export interface SuuntoPushResult {
  success: boolean;
  provider: "suunto_cloud_direct" | "intervals_suunto";
  sessionId: number;
  externalId?: string | null;
  stepsCount: number;
  workoutName: string;
  needsReauth?: boolean;
  message: string;
  syncRecord?: SessionSuuntoSyncRow;
}

export function getSuuntoOAuthConfig(fallbackOrigin?: string) {
  const clientId = (getSetting("suunto_client_id") || process.env.SUUNTO_CLIENT_ID || "").trim();
  const clientSecret = (getSetting("suunto_client_secret") || process.env.SUUNTO_CLIENT_SECRET || "").trim();
  const subscriptionKey = (getSetting("suunto_subscription_key") || process.env.SUUNTO_SUBSCRIPTION_KEY || "").trim();
  const redirectUri =
    (getSetting("suunto_redirect_uri") || process.env.SUUNTO_REDIRECT_URI || "").trim() ||
    (fallbackOrigin ? `${fallbackOrigin.replace(/\/$/, "")}/api/suunto/callback` : "");
  const scopes = (getSetting("suunto_scopes") || process.env.SUUNTO_SCOPES || "workout").trim();

  return { clientId, clientSecret, subscriptionKey, redirectUri, scopes };
}

export function buildSuuntoAuthorizeUrl(origin: string, state = "entrenoapp"): string | null {
  const cfg = getSuuntoOAuthConfig(origin);
  if (!cfg.clientId || !cfg.redirectUri) return null;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    state,
  });
  // Suunto Partner API permite omitir scope (usa el grant por defecto) o especificar workout
  if (cfg.scopes) {
    params.set("scope", cfg.scopes);
  }
  return `${SUUNTO_OAUTH_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeSuuntoAuthCode(code: string, origin: string) {
  const cfg = getSuuntoOAuthConfig(origin);
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("Faltan SUUNTO_CLIENT_ID y SUUNTO_CLIENT_SECRET en la configuración.");
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
  });

  const res = await fetch(SUUNTO_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Error OAuth Suunto (${res.status})`);
  }

  const expiresInSec = Number(data.expires_in || 86400);
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  setSettings({
    suunto_access_token: data.access_token,
    ...(data.refresh_token ? { suunto_refresh_token: data.refresh_token } : {}),
    suunto_token_expires_at: expiresAt,
    suunto_scope: String(data.scope || cfg.scopes || "workout"),
    ...(data.user ? { suunto_user_id: String(data.user) } : {}),
  });

  return { expiresAt, scope: data.scope || cfg.scopes };
}

/**
 * Renueva automáticamente el access_token usando refresh_token antes de expirar
 */
export async function ensureValidSuuntoToken(): Promise<string> {
  const accessToken = (getSetting("suunto_access_token") || "").trim();
  const refreshToken = (getSetting("suunto_refresh_token") || "").trim();
  const expiresAtStr = (getSetting("suunto_token_expires_at") || "").trim();

  const expiresMs = expiresAtStr ? Date.parse(expiresAtStr) : 0;
  // Margen de seguridad de 120s
  if (accessToken && expiresMs > Date.now() + 120_000) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error("TOKEN_EXPIRED: Tu sesión de Suunto Cloud ha caducado. Reautoriza tu cuenta Suunto.");
  }

  const cfg = getSuuntoOAuthConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("Faltan credenciales de cliente OAuth de Suunto para renovar el token.");
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(SUUNTO_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`TOKEN_EXPIRED: No se pudo renovar el token de Suunto (${res.status}). Reautoriza en Configuración.`);
  }

  const expiresInSec = Number(data.expires_in || 86400);
  const newExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  setSettings({
    suunto_access_token: data.access_token,
    ...(data.refresh_token ? { suunto_refresh_token: data.refresh_token } : {}),
    suunto_token_expires_at: newExpiresAt,
    ...(data.scope ? { suunto_scope: String(data.scope) } : {}),
  });

  return data.access_token;
}

export async function getSuuntoConnectionStatus(): Promise<SuuntoConnectionStatus> {
  const cfg = getSuuntoOAuthConfig();
  const directOAuthConfigured = !!(cfg.clientId && cfg.clientSecret && cfg.subscriptionKey);
  const directOAuthConnected = !!(getSetting("suunto_access_token") || getSetting("suunto_refresh_token"));
  const scopes = getSetting("suunto_scope") || null;
  const tokenExpiresAt = getSetting("suunto_token_expires_at") || null;
  const autoPushEnabled = getSetting("suunto_auto_push") === "true";

  let intervalsSuuntoBridgeConnected = false;
  let suuntoUserId: string | null = getSetting("suunto_user_id") || null;
  let uploadPlannedWorkoutsEnabled = false;

  const athleteId = (getSetting("intervals_athlete_id") || process.env.INTERVALS_ATHLETE_ID || "").trim();
  const apiKey = (getSetting("intervals_api_key") || process.env.INTERVALS_API_KEY || "").trim();

  if (athleteId && apiKey) {
    try {
      const auth = "Basic " + Buffer.from(`API_KEY:${apiKey}`).toString("base64");
      const res = await fetch(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}`, {
        headers: { Authorization: auth, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const me = await res.json();
        if (me.suunto_user_id) {
          intervalsSuuntoBridgeConnected = true;
          suuntoUserId = me.suunto_user_id;
          uploadPlannedWorkoutsEnabled = !!me.suunto_upload_workouts;
        }
      }
    } catch {}
  }

  return {
    directOAuthConfigured,
    directOAuthConnected,
    intervalsSuuntoBridgeConnected,
    suuntoUserId,
    uploadPlannedWorkoutsEnabled,
    scopes,
    tokenExpiresAt,
    autoPushEnabled,
  };
}

/**
 * Sube un entrenamiento estructurado vía Suunto Cloud API directa (Guías / FIT)
 */
async function pushViaSuuntoDirectApi(s: SessionRow): Promise<SuuntoPushResult> {
  const cfg = getSuuntoOAuthConfig();
  if (!cfg.subscriptionKey) {
    throw new Error("Falta SUUNTO_SUBSCRIPTION_KEY de Suunto API Zone.");
  }

  const token = await ensureValidSuuntoToken();
  const built = buildStructuredWorkoutForSession(s);

  // 1. Intentar subida a Suunto Structured Workout / Guides API
  const guideRes = await fetch(`${SUUNTO_CLOUD_BASE}/v2/workout/guide`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(built.suuntoGuidePayload),
  });

  if (guideRes.ok) {
    const data = await guideRes.json().catch(() => ({}));
    const extId = String(data.id || data.guideId || built.externalId);
    const syncRecord = upsertSessionSuuntoSync({
      session_id: s.id,
      provider: "suunto_cloud_direct",
      external_id: extId,
      status: "synced",
      steps_count: built.steps.length,
      last_error: null,
    });
    return {
      success: true,
      provider: "suunto_cloud_direct",
      sessionId: s.id,
      externalId: extId,
      stepsCount: built.steps.length,
      workoutName: built.name,
      message: `Entrenamiento estructurado enviado directamente a tu reloj Suunto (${built.steps.length} bloques).`,
      syncRecord,
    };
  }

  // 2. Fallback oficial mediante subida directa de archivo .FIT estructurado
  if (guideRes.status === 404 || guideRes.status === 405) {
    const fitBuf = buildStructuredWorkoutFitBuffer(s);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(fitBuf)], { type: "application/octet-stream" }), `${built.externalId}.fit`);

    const fitRes = await fetch(`${SUUNTO_CLOUD_BASE}/v3/workouts/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      },
      body: form,
    });

    if (fitRes.ok) {
      const fitData = await fitRes.json().catch(() => ({}));
      const extId = String(fitData.id || built.externalId);
      const syncRecord = upsertSessionSuuntoSync({
        session_id: s.id,
        provider: "suunto_cloud_direct",
        external_id: extId,
        status: "synced",
        steps_count: built.steps.length,
        last_error: null,
      });
      return {
        success: true,
        provider: "suunto_cloud_direct",
        sessionId: s.id,
        externalId: extId,
        stepsCount: built.steps.length,
        workoutName: built.name,
        message: `Archivo .FIT estructurado enviado a tu reloj Suunto (${built.steps.length} bloques).`,
        syncRecord,
      };
    }

    const errText = await fitRes.text();
    throw new Error(`Suunto Cloud rechazó la subida .FIT (${fitRes.status}): ${errText.slice(0, 160)}`);
  }

  if (guideRes.status === 401 || guideRes.status === 403) {
    throw new Error(`TOKEN_EXPIRED: Permisos insuficientes o token caducado en Suunto (${guideRes.status}). Reautoriza en Configuración.`);
  }

  const errBody = await guideRes.text();
  throw new Error(`Error Suunto Guides API (${guideRes.status}): ${errBody.slice(0, 180)}`);
}

/**
 * Sube el entrenamiento estructurado al calendario Suunto mediante el puente conectado en Intervals.icu
 * (Intervals.icu sincroniza automáticamente hacia SuuntoPlus Guides si `suunto_upload_workouts` está activo)
 */
async function pushViaIntervalsSuuntoBridge(s: SessionRow): Promise<SuuntoPushResult> {
  const athleteId = (getSetting("intervals_athlete_id") || process.env.INTERVALS_ATHLETE_ID || "").trim();
  const apiKey = (getSetting("intervals_api_key") || process.env.INTERVALS_API_KEY || "").trim();

  if (!athleteId || !apiKey) {
    throw new Error("AUTH_REQUIRED: No hay conexión Suunto ni Intervals.icu configurada. Ve a Configuración para vincular tu reloj.");
  }

  const auth = "Basic " + Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  const built = buildStructuredWorkoutForSession(s);

  // Comprobar antes que `suunto_upload_workouts` esté habilitado en el perfil conectado
  const athleteRes = await fetch(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}`, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });
  if (athleteRes.status === 401 || athleteRes.status === 403) {
    throw new Error("AUTH_REQUIRED: Clave de Intervals.icu caducada o inválida. Reautentica en Configuración.");
  }
  if (athleteRes.ok) {
    const me = await athleteRes.json();
    if (!me.suunto_user_id) {
      throw new Error("AUTH_REQUIRED: Tu cuenta Suunto no está vinculada en Intervals.icu.");
    }
    if (!me.suunto_upload_workouts) {
      throw new Error("SCOPE_MISSING: Activa 'Cargar entrenamientos planificados' dentro del recuadro Suunto en Intervals.icu.");
    }
  }

  const payload = [
    {
      category: "WORKOUT",
      external_id: built.externalId,
      type: built.sportTypeIntervals,
      start_date_local: built.startDateLocal,
      name: built.name,
      description: built.intervalsDescription,
    },
  ];

  const upsertRes = await fetch(
    `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/events/bulk?upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!upsertRes.ok) {
    const errText = await upsertRes.text();
    throw new Error(`Error al enviar entrenamiento (${upsertRes.status}): ${errText.slice(0, 180)}`);
  }

  const resultList = await upsertRes.json();
  const createdEvent = Array.isArray(resultList) ? resultList[0] : resultList;
  const compiledSteps = createdEvent?.workout_doc?.steps?.length || built.steps.length;

  const extId = String(createdEvent?.id || built.externalId);
  const syncRecord = upsertSessionSuuntoSync({
    session_id: s.id,
    provider: "intervals_suunto",
    external_id: extId,
    status: "synced",
    steps_count: compiledSteps,
    last_error: null,
  });

  return {
    success: true,
    provider: "intervals_suunto",
    sessionId: s.id,
    externalId: extId,
    stepsCount: compiledSteps,
    workoutName: built.name,
    message: `Enviado a tu Suunto (${compiledSteps} pasos estructurados · Guía SuuntoPlus lista en tu reloj).`,
    syncRecord,
  };
}

/**
 * Orquestador principal de subida bidireccional a Suunto:
 * Usa Suunto Cloud OAuth directo (con auto-refresh) si está conectado,
 * o el puente Suunto ↔ Intervals.icu ya activo.
 */
export async function pushSessionToSuunto(sessionId: number): Promise<SuuntoPushResult> {
  const s = getSessionById(sessionId);
  if (!s) {
    throw new Error("Sesión no encontrada.");
  }
  if (s.discipline === "descanso") {
    throw new Error("Los días de descanso no se envían como entrenamiento al reloj.");
  }

  const cfg = getSuuntoOAuthConfig();
  const hasDirectTokens = !!(getSetting("suunto_access_token") || getSetting("suunto_refresh_token"));

  try {
    if (cfg.subscriptionKey && hasDirectTokens) {
      return await pushViaSuuntoDirectApi(s);
    }
    return await pushViaIntervalsSuuntoBridge(s);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido sincronizando con Suunto";
    const needsReauth = /TOKEN_EXPIRED|AUTH_REQUIRED|SCOPE_MISSING/i.test(msg);
    const cleanMsg = msg.replace(/^(TOKEN_EXPIRED|AUTH_REQUIRED|SCOPE_MISSING):\s*/i, "");

    upsertSessionSuuntoSync({
      session_id: s.id,
      provider: cfg.subscriptionKey && hasDirectTokens ? "suunto_cloud_direct" : "intervals_suunto",
      status: "error",
      last_error: cleanMsg,
    });

    return {
      success: false,
      provider: cfg.subscriptionKey && hasDirectTokens ? "suunto_cloud_direct" : "intervals_suunto",
      sessionId: s.id,
      stepsCount: 0,
      workoutName: s.planned_code || s.discipline,
      needsReauth,
      message: cleanMsg,
    };
  }
}
