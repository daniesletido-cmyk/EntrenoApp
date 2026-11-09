"use client";

import { get, set, del } from "idb-keyval";
import type { SessionRow } from "@/lib/repo/sessions";
import type { SleepRow } from "@/lib/repo/sleep";
import { toLocalISODate } from "@/lib/dates";

const KEY_SESSIONS = "entrenoapp_indexeddb_sessions";
const KEY_SLEEP = "entrenoapp_indexeddb_sleep";
const KEY_PENDING_MUTATIONS = "entrenoapp_indexeddb_pending_sync";

export interface FullBackupPayload {
  version: number;
  exported_at: string;
  app: string;
  author: string;
  sessions: SessionRow[];
  sleep_records: SleepRow[];
}

/**
 * Guarda o actualiza una sesión en IndexedDB
 */
export async function saveLocalSession(session: SessionRow): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const list = (await get<SessionRow[]>(KEY_SESSIONS)) || [];
    const index = list.findIndex((s) => s.id === session.id || (s.date === session.date && s.discipline === session.discipline && s.planned_code === session.planned_code));
    if (index >= 0) {
      list[index] = { ...list[index], ...session };
    } else {
      list.push(session);
    }
    await set(KEY_SESSIONS, list);
  } catch (e) {
    console.warn("[IndexedDB] Error guardando sesión local:", e);
  }
}

/**
 * Guarda múltiples sesiones en IndexedDB
 */
export async function saveLocalSessions(sessions: SessionRow[]): Promise<void> {
  if (typeof window === "undefined" || !sessions || sessions.length === 0) return;
  try {
    const list = (await get<SessionRow[]>(KEY_SESSIONS)) || [];
    const map = new Map<number | string, SessionRow>();
    for (const item of list) {
      map.set(item.id || `${item.date}_${item.discipline}`, item);
    }
    for (const item of sessions) {
      map.set(item.id || `${item.date}_${item.discipline}`, item);
    }
    await set(KEY_SESSIONS, Array.from(map.values()));
  } catch (e) {
    console.warn("[IndexedDB] Error guardando sesiones:", e);
  }
}

/**
 * Obtiene todas las sesiones guardadas en IndexedDB
 */
export async function getLocalSessions(): Promise<SessionRow[]> {
  if (typeof window === "undefined") return [];
  try {
    return (await get<SessionRow[]>(KEY_SESSIONS)) || [];
  } catch {
    return [];
  }
}

/**
 * Guarda o actualiza un registro de sueño en IndexedDB
 */
export async function saveLocalSleep(sleep: SleepRow): Promise<void> {
  if (typeof window === "undefined" || !sleep.date) return;
  try {
    const list = (await get<SleepRow[]>(KEY_SLEEP)) || [];
    const index = list.findIndex((s) => s.date === sleep.date);
    if (index >= 0) {
      list[index] = { ...list[index], ...sleep };
    } else {
      list.push(sleep);
    }
    await set(KEY_SLEEP, list);
  } catch (e) {
    console.warn("[IndexedDB] Error guardando sueño local:", e);
  }
}

/**
 * Guarda una lista de registros de sueño en IndexedDB
 */
export async function saveLocalSleepList(logs: SleepRow[]): Promise<void> {
  if (typeof window === "undefined" || !logs || logs.length === 0) return;
  try {
    const list = (await get<SleepRow[]>(KEY_SLEEP)) || [];
    const map = new Map<string, SleepRow>();
    for (const item of list) {
      map.set(item.date, item);
    }
    for (const item of logs) {
      map.set(item.date, { ...(map.get(item.date) || {}), ...item });
    }
    await set(KEY_SLEEP, Array.from(map.values()));
  } catch (e) {
    console.warn("[IndexedDB] Error guardando lista de sueño:", e);
  }
}

/**
 * Obtiene todos los registros de sueño de IndexedDB
 */
export async function getLocalSleepList(): Promise<SleepRow[]> {
  if (typeof window === "undefined") return [];
  try {
    return (await get<SleepRow[]>(KEY_SLEEP)) || [];
  } catch {
    return [];
  }
}

/**
 * Reconciliador de Sesiones:
 * Fusiona los datos que llegan del servidor con los guardados en IndexedDB.
 * Si el servidor devuelve lista vacía (por reinicio/cold-start de Vercel),
 * devuelve los registros locales protegidos.
 */
export async function reconcileSessions(
  remoteSessions: SessionRow[],
  filterWeekStart?: string
): Promise<SessionRow[]> {
  if (typeof window === "undefined") return remoteSessions;

  try {
    const local = await getLocalSessions();
    if (remoteSessions && remoteSessions.length > 0) {
      // Guardamos la respuesta del servidor en IndexedDB para blindaje offline
      await saveLocalSessions(remoteSessions);
      return remoteSessions;
    }

    // El servidor devolvió vacío: protegemos al usuario con los datos de IndexedDB
    if (filterWeekStart) {
      return local.filter((s) => s.week_start === filterWeekStart);
    }
    return local;
  } catch {
    return remoteSessions;
  }
}

/**
 * Reconciliador de Sueño:
 * Fusiona los datos que llegan del servidor con los guardados en IndexedDB.
 */
export async function reconcileSleep(
  remoteSleep: SleepRow[],
  fromDate?: string,
  toDate?: string
): Promise<SleepRow[]> {
  if (typeof window === "undefined") return remoteSleep;

  try {
    const local = await getLocalSleepList();
    if (remoteSleep && remoteSleep.length > 0) {
      await saveLocalSleepList(remoteSleep);
      return remoteSleep;
    }

    if (fromDate && toDate) {
      return local.filter((s) => s.date >= fromDate && s.date <= toDate);
    }
    return local;
  } catch {
    return remoteSleep;
  }
}

/**
 * Exporta TODOS los entrenamientos y sueños en un objeto JSON listo para descargar
 */
export async function exportAllDataAsJSON(): Promise<string> {
  let sessions: SessionRow[] = [];
  let sleep_records: SleepRow[] = [];

  // 1. Intentar obtener el volcado completo del backend
  try {
    const res = await fetch("/api/backup/json");
    if (res.ok) {
      const data = await res.json();
      sessions = data.sessions || [];
      sleep_records = data.sleep_records || [];
    }
  } catch {
    // Continuar con IndexedDB si el backend no responde
  }

  // 2. Fusionar con IndexedDB local para garantizar que nada se quede fuera
  const localSessions = await getLocalSessions();
  const localSleep = await getLocalSleepList();

  const sessionsMap = new Map<number | string, SessionRow>();
  for (const s of [...localSessions, ...sessions]) {
    sessionsMap.set(s.id || `${s.date}_${s.discipline}`, s);
  }

  const sleepMap = new Map<string, SleepRow>();
  for (const sl of [...localSleep, ...sleep_records]) {
    sleepMap.set(sl.date, sl);
  }

  const payload: FullBackupPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    app: "EntrenoApp",
    author: "Daniel Espinosa",
    sessions: Array.from(sessionsMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    sleep_records: Array.from(sleepMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Dispara la descarga del archivo JSON de respaldo en el navegador
 */
export async function downloadJSONBackupFile(): Promise<string> {
  const jsonStr = await exportAllDataAsJSON();
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = toLocalISODate(new Date());
  a.href = url;
  a.download = `entrenoapp-copia-seguridad-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
}

/**
 * Restaura datos desde un archivo JSON (en IndexedDB y en la API del servidor)
 */
export async function importDataFromJSON(
  jsonString: string
): Promise<{ sessionsCount: number; sleepCount: number }> {
  const parsed = JSON.parse(jsonString) as Partial<FullBackupPayload>;

  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
  const sleepRecords = Array.isArray(parsed.sleep_records) ? parsed.sleep_records : [];

  if (sessions.length === 0 && sleepRecords.length === 0) {
    throw new Error("El archivo JSON no contiene registros válidos de sesiones ni de sueño.");
  }

  // 1. Guardar de inmediato en IndexedDB del cliente
  if (sessions.length > 0) {
    await saveLocalSessions(sessions);
  }
  if (sleepRecords.length > 0) {
    await saveLocalSleepList(sleepRecords);
  }

  // 2. Enviar al endpoint de restauración del servidor para poblar SQLite y Supabase
  try {
    const res = await fetch("/api/backup/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessions,
        sleep_records: sleepRecords,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[Backup Restore] Aviso al sincronizar con backend:", err);
    }
  } catch (e) {
    console.warn("[Backup Restore] Error de red sincronizando con backend:", e);
  }

  return {
    sessionsCount: sessions.length,
    sleepCount: sleepRecords.length,
  };
}
