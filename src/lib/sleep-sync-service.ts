/**
 * Servicio unificado de persistencia, sincronización y diagnóstico de sueño (Zepp / Amazfit)
 */

import { getDb } from "@/lib/db";
import { upsertSleepLog, SleepRow } from "@/lib/repo/sleep";
import { upsertRecovery } from "@/lib/repo/recovery";
import { isSupabaseConfigured, upsertSleepToSupabase } from "@/lib/supabase";
import { NormalizedSleepRecord } from "@/lib/sleep-parser";

export interface SleepSyncStatus {
  lastSyncAt: string | null;
  lastSyncFormatted: string;
  lastSleepDate: string | null;
  lastSleepScore: number | null;
  lastSleepHours: number | null;
  source: string | null;
  totalLogs: number;
}

/**
 * Guarda y persiste de forma blindada uno o más registros de sueño
 */
export async function ingestSleepRecords(records: NormalizedSleepRecord[]): Promise<{
  saved: SleepRow[];
  count: number;
}> {
  if (!records || records.length === 0) {
    return { saved: [], count: 0 };
  }

  const savedList: SleepRow[] = [];
  const db = getDb();
  const now = new Date().toISOString();

  for (const rec of records) {
    if (!rec.date) continue;

    // 1. Guardar en tabla principal `sleep_logs`
    const saved = upsertSleepLog({
      date: rec.date,
      hours: rec.hours,
      score: rec.score,
      quality: rec.quality,
      deep_min: rec.deep_min,
      rem_min: rec.rem_min,
      light_min: rec.light_min,
      awake_min: rec.awake_min,
      resting_hr: rec.resting_hr,
      hrv_rmssd: rec.hrv_rmssd,
      sleep_start: rec.sleep_start,
      sleep_end: rec.sleep_end,
      efficiency: rec.efficiency,
      respiratory_rate: rec.respiratory_rate,
      nap_min: rec.nap_min,
      nap_count: rec.nap_count,
      nap_notes: rec.nap_notes,
      notes: rec.notes,
      source: rec.source || "zepp",
    });

    // 2. Guardar en tabla complementaria `recovery` para sincronización dual
    try {
      upsertRecovery({
        fecha: rec.date,
        sleep_duration: rec.hours ?? null,
        deep_sleep_min: rec.deep_min ?? null,
        rem_min: rec.rem_min ?? null,
        resting_hr: rec.resting_hr ?? null,
        recovery_score: rec.score ?? null,
        raw_data: rec.raw_source ?? null,
      });
    } catch (e) {
      console.warn("[SleepSyncService] Aviso guardando en recovery:", e);
    }

    // 3. Sincronizar en Supabase si está disponible
    if (isSupabaseConfigured()) {
      try {
        await upsertSleepToSupabase(saved);
      } catch (cloudErr) {
        console.warn("[SleepSyncService] Aviso persistiendo en Supabase:", cloudErr);
      }
    }

    savedList.push(saved);
  }

  // 4. Actualizar metadata de última sincronización en tabla `settings`
  if (savedList.length > 0) {
    const latest = savedList.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    const info = {
      timestamp: now,
      date: latest.date,
      hours: latest.hours,
      score: latest.score,
      resting_hr: latest.resting_hr,
      source: latest.source || "zepp",
    };

    try {
      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES ('last_sleep_sync_at', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(now);

      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES ('last_sleep_sync_info', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(JSON.stringify(info));
    } catch (err) {
      console.warn("[SleepSyncService] Error guardando settings de sync:", err);
    }
  }

  return { saved: savedList, count: savedList.length };
}

/**
 * Devuelve el estado actual de la sincronización de sueño para diagnóstico y panel UI
 */
export function getSleepSyncStatus(): SleepSyncStatus {
  const db = getDb();
  let lastSyncAt: string | null = null;
  let info: {
    timestamp?: string;
    date?: string;
    hours?: number;
    score?: number;
    source?: string;
  } | null = null;

  try {
    const rowSync = db.prepare<{ key: string; value: string }>("SELECT value FROM settings WHERE key = 'last_sleep_sync_at'").get();
    if (rowSync?.value) lastSyncAt = rowSync.value;

    const rowInfo = db.prepare<{ key: string; value: string }>("SELECT value FROM settings WHERE key = 'last_sleep_sync_info'").get();
    if (rowInfo?.value) {
      info = JSON.parse(rowInfo.value);
    }
  } catch {}

  const latestRow = db.prepare<SleepRow>(`
    SELECT * FROM sleep_logs
    ORDER BY date DESC
    LIMIT 1
  `).get();

  const totalLogs = db.prepare<{ c: number }>("SELECT count(*) as c FROM sleep_logs").get()?.c ?? 0;

  let lastSyncFormatted = "Sin registros automáticos aún";
  const effectiveTimestamp = lastSyncAt || (latestRow ? latestRow.updated_at : null);

  if (effectiveTimestamp) {
    try {
      const dt = new Date(effectiveTimestamp);
      if (!isNaN(dt.getTime())) {
        const now = new Date();
        const isToday =
          dt.getDate() === now.getDate() &&
          dt.getMonth() === now.getMonth() &&
          dt.getFullYear() === now.getFullYear();

        const timeStr = new Intl.DateTimeFormat("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        }).format(dt);

        if (isToday) {
          lastSyncFormatted = `Hoy a las ${timeStr}`;
        } else {
          const dateStr = new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "short",
            timeZone: "Europe/Madrid",
          }).format(dt);
          lastSyncFormatted = `${dateStr} a las ${timeStr}`;
        }
      }
    } catch {}
  }

  return {
    lastSyncAt: effectiveTimestamp,
    lastSyncFormatted,
    lastSleepDate: info?.date || latestRow?.date || null,
    lastSleepScore: info?.score ?? latestRow?.score ?? null,
    lastSleepHours: info?.hours ?? latestRow?.hours ?? null,
    source: info?.source || latestRow?.source || null,
    totalLogs,
  };
}
