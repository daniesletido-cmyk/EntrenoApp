"use client";

import { get, set } from "idb-keyval";
import { saveLocalSession, getLocalSessions } from "@/lib/client-persistence";
import type { SessionRow } from "@/lib/repo/sessions";

const KEY_OFFLINE_QUEUE = "entrenoapp_offline_queue";

export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  description: string;
  retryCount: number;
}

/**
 * Obtiene la lista de mutaciones pendientes en la cola offline
 */
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (typeof window === "undefined") return [];
  try {
    return (await get<OfflineQueueItem[]>(KEY_OFFLINE_QUEUE)) || [];
  } catch {
    return [];
  }
}

/**
 * Guarda la cola completa en IndexedDB
 */
async function saveOfflineQueue(queue: OfflineQueueItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(KEY_OFFLINE_QUEUE, queue);
    window.dispatchEvent(
      new CustomEvent("entrenoapp:offline-queue-changed", {
        detail: { count: queue.length },
      })
    );
  } catch (e) {
    console.warn("[OfflineSync] Error guardando cola offline:", e);
  }
}

/**
 * Añade una acción a la cola de sincronización pendiente
 */
export async function addToOfflineQueue(item: {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  description: string;
}): Promise<OfflineQueueItem> {
  const queue = await getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    url: item.url,
    method: item.method,
    body: item.body,
    headers: item.headers || { "Content-Type": "application/json" },
    description: item.description,
    retryCount: 0,
  };

  queue.push(newItem);
  await saveOfflineQueue(queue);
  return newItem;
}

/**
 * Elimina un elemento de la cola por su ID
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveOfflineQueue(filtered);
}

/**
 * Procesa la cola de sincronización pendiente con el servidor.
 * Se ejecuta automáticamente al recuperar la conexión o al abrir la app.
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (typeof window === "undefined") return { processed: 0, failed: 0, remaining: 0 };
  if (!navigator.onLine) {
    const queue = await getOfflineQueue();
    return { processed: 0, failed: 0, remaining: queue.length };
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

  let processed = 0;
  let failed = 0;
  const remainingQueue: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers || { "Content-Type": "application/json" },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok) {
        processed++;
      } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        // Error de cliente irrecuperable (ej. 400 bad request, 404 not found)
        console.warn(`[OfflineSync] Descartando elemento inválido #${item.id}:`, res.status);
        failed++;
      } else {
        // Error del servidor (5xx) o rate-limit: conservar para reintento
        item.retryCount++;
        remainingQueue.push(item);
        failed++;
      }
    } catch {
      // Error de red (aún sin conexión real): conservar y detener el lote
      item.retryCount++;
      remainingQueue.push(item);
      failed++;
      break;
    }
  }

  await saveOfflineQueue(remainingQueue);

  if (processed > 0) {
    window.dispatchEvent(new CustomEvent("entrenoapp:refresh"));
    window.dispatchEvent(
      new CustomEvent("entrenoapp:sync-completed", {
        detail: { count: processed },
      })
    );
  }

  return { processed, failed, remaining: remainingQueue.length };
}

/**
 * Ejecuta una mutación con fallback offline automático y actualización optimista local.
 * Si no hay conexión o falla la red:
 * 1. Aplica la mutación optimista sobre la base local.
 * 2. Encola la petición en IndexedDB.
 * 3. Notifica que se ha guardado en modo offline.
 */
export async function mutateWithOfflineSync<T = any>(params: {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: any;
  description: string;
  onOptimisticLocal?: () => void | Promise<void>;
}): Promise<{ ok: boolean; offline: boolean; data?: T; error?: string }> {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  // 1. Si estamos claramente offline, encolar de inmediato
  if (!isOnline) {
    if (params.onOptimisticLocal) {
      try {
        await params.onOptimisticLocal();
      } catch (e) {
        console.warn("[OfflineSync] Error en actualización optimista local:", e);
      }
    }
    await addToOfflineQueue({
      url: params.url,
      method: params.method,
      body: params.body,
      description: params.description,
    });
    return { ok: true, offline: true };
  }

  // 2. Si estamos online, intentar enviar al servidor
  try {
    const res = await fetch(params.url, {
      method: params.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.body),
    });

    if (res.ok) {
      if (params.onOptimisticLocal) {
        try {
          await params.onOptimisticLocal();
        } catch {}
      }
      const data = await res.json().catch(() => ({}));
      return { ok: true, offline: false, data };
    }

    // Si el servidor falla temporalmente (502, 503, 504), encolar
    if (res.status >= 500) {
      if (params.onOptimisticLocal) {
        try {
          await params.onOptimisticLocal();
        } catch {}
      }
      await addToOfflineQueue({
        url: params.url,
        method: params.method,
        body: params.body,
        description: params.description,
      });
      return { ok: true, offline: true };
    }

    const errJson = await res.json().catch(() => ({ error: "Error en la petición" }));
    return { ok: false, offline: false, error: errJson.error || "Error al procesar" };
  } catch {
    // 3. Fallo de red (offline repentino o pérdida de cobertura)
    if (params.onOptimisticLocal) {
      try {
        await params.onOptimisticLocal();
      } catch (e) {
        console.warn("[OfflineSync] Error en actualización optimista local tras fallo de red:", e);
      }
    }

    await addToOfflineQueue({
      url: params.url,
      method: params.method,
      body: params.body,
      description: params.description,
    });

    return { ok: true, offline: true };
  }
}

/**
 * Actualiza una sesión tanto en IndexedDB local como en el servidor
 * Si está offline, se encola para sincronizar luego.
 */
export async function updateSessionWithOffline(
  sessionId: number,
  updates: Partial<SessionRow>,
  description = "Actualizar entrenamiento"
): Promise<{ ok: boolean; offline: boolean; session?: SessionRow; data?: any; error?: string }> {
  return mutateWithOfflineSync<any>({
    url: `/api/sessions/${sessionId}`,
    method: "PATCH",
    body: updates,
    description,
    onOptimisticLocal: async () => {
      const local = await getLocalSessions();
      const existing = local.find((s) => s.id === sessionId);
      if (existing) {
        const merged: SessionRow = { ...existing, ...updates };
        await saveLocalSession(merged);
      }
    },
  });
}
