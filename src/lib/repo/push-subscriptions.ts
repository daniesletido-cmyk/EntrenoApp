import { getDb } from "@/lib/db";

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

export function savePushSubscription(input: PushSubscriptionInput): PushSubscriptionRow {
  const db = getDb();
  const now = new Date().toISOString();

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
    return db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions WHERE id = ?").get(existing.id)!;
  }

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

  return db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions WHERE id = ?").get(Number(res.lastInsertRowid))!;
}

export function getAllPushSubscriptions(): PushSubscriptionRow[] {
  const db = getDb();
  return db.prepare<PushSubscriptionRow>("SELECT * FROM push_subscriptions ORDER BY id DESC").all();
}

export function deletePushSubscription(endpoint: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  return res.changes > 0;
}

export function countPushSubscriptions(): number {
  const db = getDb();
  const row = db.prepare<{ count: number }>("SELECT COUNT(*) as count FROM push_subscriptions").get();
  return row?.count ?? 0;
}
