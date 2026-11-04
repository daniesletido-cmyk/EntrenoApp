import { getDb } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_type?: string | null;
}

function getCacheFilePath(): string {
  if (process.env.VERCEL) {
    return "/tmp/push_subscriptions_backup.json";
  }
  return path.join(process.cwd(), "data", "push_subscriptions_backup.json");
}

function persistCacheToFile(subs: PushSubscriptionRow[]): void {
  try {
    const filePath = getCacheFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(subs, null, 2), "utf8");
  } catch (e) {
    console.warn("[PushSubs] Error al persistir cache de suscripciones en archivo:", e);
  }
}

function readCacheFromFile(): PushSubscriptionRow[] {
  try {
    const filePath = getCacheFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function savePushSubscription(input: PushSubscriptionInput): PushSubscriptionRow {
  const db = getDb();
  const now = new Date().toISOString();

  let savedRow: PushSubscriptionRow;
  const existing = db.prepare<PushSubscriptionRow>(
    "SELECT * FROM push_subscriptions WHERE endpoint = ?"
  ).get(input.endpoint);

  if (existing) {
    db.prepare(`
      UPDATE push_subscriptions
      SET p256dh = ?,
          auth = ?,
          device_type = COALESCE(?, device_type),
          updated_at = ?
      WHERE id = ?
    `).run(input.p256dh, input.auth, input.device_type ?? null, now, existing.id);
    savedRow = db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions WHERE id = ?").get(existing.id)!;
  } else {
    const res = db.prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, device_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.endpoint,
      input.p256dh,
      input.auth,
      input.device_type ?? null,
      now,
      now
    );
    savedRow = db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions WHERE id = ?").get(Number(res.lastInsertRowid))!;
  }

  // Persistir en archivo de respaldo persistente
  const allSubs = getAllPushSubscriptions();
  persistCacheToFile(allSubs);

  return savedRow;
}

export function getAllPushSubscriptions(): PushSubscriptionRow[] {
  const db = getDb();
  let subs = db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions ORDER BY id DESC").all();

  // Si la BD en /tmp se reinició y está vacía, recuperar del respaldo en disco
  if (subs.length === 0) {
    const cached = readCacheFromFile();
    if (cached.length > 0) {
      for (const item of cached) {
        try {
          db.prepare(`
            INSERT OR REPLACE INTO push_subscriptions (id, endpoint, p256dh, auth, device_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(item.id, item.endpoint, item.p256dh, item.auth, item.device_type, item.created_at, item.updated_at);
        } catch {}
      }
      subs = db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions ORDER BY id DESC").all();
    }
  }

  return subs;
}

export function deletePushSubscription(endpoint: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  const allSubs = getAllPushSubscriptions();
  persistCacheToFile(allSubs);
  return res.changes > 0;
}

export function countPushSubscriptions(): number {
  return getAllPushSubscriptions().length;
}
