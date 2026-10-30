import { getDb } from "@/lib/db";
import { upsertSleepLog } from "@/lib/repo/sleep";

export interface RecoveryRow {
  id: number;
  fecha: string; // YYYY-MM-DD
  sleep_duration: number | null; // horas
  deep_sleep_min: number | null; // minutos
  rem_min: number | null; // minutos
  resting_hr: number | null; // ppm
  recovery_score: number | null; // 0-100
  raw_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryInput {
  fecha: string;
  sleep_duration?: number | null;
  deep_sleep_min?: number | null;
  rem_min?: number | null;
  resting_hr?: number | null;
  recovery_score?: number | null;
  raw_data?: string | null;
}

export function upsertRecovery(input: RecoveryInput): RecoveryRow {
  const db = getDb();
  const now = new Date().toISOString();
  const dateFormatted = input.fecha.includes("T") ? input.fecha.split("T")[0] : input.fecha;

  const existing = db.prepare<RecoveryRow>("SELECT * FROM recovery WHERE fecha = ?").get(dateFormatted);

  let recId: number;
  if (existing) {
    db.prepare(`
      UPDATE recovery
      SET sleep_duration = COALESCE(?, sleep_duration),
          deep_sleep_min = COALESCE(?, deep_sleep_min),
          rem_min = COALESCE(?, rem_min),
          resting_hr = COALESCE(?, resting_hr),
          recovery_score = COALESCE(?, recovery_score),
          raw_data = COALESCE(?, raw_data),
          updated_at = ?
      WHERE id = ?
    `).run(
      input.sleep_duration ?? null,
      input.deep_sleep_min ?? null,
      input.rem_min ?? null,
      input.resting_hr ?? null,
      input.recovery_score ?? null,
      input.raw_data ?? null,
      now,
      existing.id
    );
    recId = existing.id;
  } else {
    const res = db.prepare(`
      INSERT INTO recovery (fecha, sleep_duration, deep_sleep_min, rem_min, resting_hr, recovery_score, raw_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dateFormatted,
      input.sleep_duration ?? null,
      input.deep_sleep_min ?? null,
      input.rem_min ?? null,
      input.resting_hr ?? null,
      input.recovery_score ?? null,
      input.raw_data ?? null,
      now,
      now
    );
    recId = Number(res.lastInsertRowid);
  }

  // Sincronizar bidireccionalmente con sleep_logs para alimentar métricas de readiness
  try {
    upsertSleepLog({
      date: dateFormatted,
      hours: input.sleep_duration ?? undefined,
      score: input.recovery_score ? Math.round(input.recovery_score) : undefined,
      deep_min: input.deep_sleep_min ?? undefined,
      rem_min: input.rem_min ?? undefined,
      source: "zepp",
    });
  } catch (err) {
    console.warn("[Recovery] Error sincronizando con sleep_logs:", err);
  }

  return db.prepare<RecoveryRow>("SELECT * FROM recovery WHERE id = ?").get(recId)!;
}

export function getRecoveryByDate(date: string): RecoveryRow | undefined {
  const db = getDb();
  const dateFormatted = date.includes("T") ? date.split("T")[0] : date;
  return db.prepare<RecoveryRow>("SELECT * FROM recovery WHERE fecha = ?").get(dateFormatted);
}

export function listRecoveryBetween(from: string, to: string): RecoveryRow[] {
  const db = getDb();
  return db.prepare<RecoveryRow>(
    "SELECT * FROM recovery WHERE fecha >= ? AND fecha <= ? ORDER BY fecha ASC"
  ).all(from, to);
}

export function getLatestRecovery(): RecoveryRow | undefined {
  const db = getDb();
  return db.prepare<RecoveryRow>("SELECT * FROM recovery ORDER BY fecha DESC LIMIT 1").get();
}
