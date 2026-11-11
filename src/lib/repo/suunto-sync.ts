import { getDb } from "@/lib/db";

export interface SessionSuuntoSyncRow {
  session_id: number;
  provider: "intervals_suunto" | "suunto_cloud_direct";
  external_id: string | null;
  status: "synced" | "error" | "pending";
  steps_count: number;
  last_error: string | null;
  synced_at: string;
  updated_at: string;
}

export function getSessionSuuntoSync(sessionId: number): SessionSuuntoSyncRow | undefined {
  try {
    return getDb()
      .prepare<SessionSuuntoSyncRow>("SELECT * FROM session_suunto_sync WHERE session_id = ?")
      .get(sessionId);
  } catch {
    return undefined;
  }
}

export function listSuuntoSyncForSessionIds(sessionIds: number[]): Record<number, SessionSuuntoSyncRow> {
  if (sessionIds.length === 0) return {};
  try {
    const placeholders = sessionIds.map(() => "?").join(",");
    const rows = getDb()
      .prepare<SessionSuuntoSyncRow>(`SELECT * FROM session_suunto_sync WHERE session_id IN (${placeholders})`)
      .all(...sessionIds);
    const map: Record<number, SessionSuuntoSyncRow> = {};
    for (const r of rows) {
      map[r.session_id] = r;
    }
    return map;
  } catch {
    return {};
  }
}

export function upsertSessionSuuntoSync(input: {
  session_id: number;
  provider: "intervals_suunto" | "suunto_cloud_direct";
  external_id?: string | null;
  status: "synced" | "error" | "pending";
  steps_count?: number;
  last_error?: string | null;
}): SessionSuuntoSyncRow {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO session_suunto_sync (session_id, provider, external_id, status, steps_count, last_error, synced_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       provider = excluded.provider,
       external_id = COALESCE(excluded.external_id, session_suunto_sync.external_id),
       status = excluded.status,
       steps_count = COALESCE(excluded.steps_count, session_suunto_sync.steps_count),
       last_error = excluded.last_error,
       synced_at = CASE WHEN excluded.status = 'synced' THEN excluded.synced_at ELSE session_suunto_sync.synced_at END,
       updated_at = excluded.updated_at`
  ).run(
    input.session_id,
    input.provider,
    input.external_id ?? null,
    input.status,
    input.steps_count ?? 0,
    input.last_error ?? null,
    now,
    now
  );
  return getSessionSuuntoSync(input.session_id)!;
}

export function deleteSessionSuuntoSync(sessionId: number): void {
  try {
    getDb().prepare("DELETE FROM session_suunto_sync WHERE session_id = ?").run(sessionId);
  } catch {}
}
