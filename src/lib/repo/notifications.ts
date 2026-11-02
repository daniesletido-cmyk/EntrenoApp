import { getDb } from "@/lib/db";

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  url: string;
  icon?: string | null;
  category: "daily_report" | "weekly_report" | "workout" | "sleep" | "system";
  read: number; // 0 o 1
  created_at: string;
}

export interface NewAppNotification {
  title: string;
  body: string;
  url: string;
  icon?: string | null;
  category?: "daily_report" | "weekly_report" | "workout" | "sleep" | "system";
}

export function createNotification(n: NewAppNotification): AppNotification {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO app_notifications (title, body, url, icon, category, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);
  const res = stmt.run(n.title, n.body, n.url, n.icon || null, n.category || "daily_report", now);
  const id = Number(res.lastInsertRowid);
  return {
    id,
    title: n.title,
    body: n.body,
    url: n.url,
    icon: n.icon || null,
    category: n.category || "daily_report",
    read: 0,
    created_at: now,
  };
}

export function listNotifications(limit = 40): AppNotification[] {
  const db = getDb();
  try {
    return (db
      .prepare("SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT ?")
      .all(limit) as unknown) as AppNotification[];
  } catch {
    return [];
  }
}

export function getUnreadNotificationCount(): number {
  const db = getDb();
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM app_notifications WHERE read = 0").get() as { count: number } | undefined;
    return row?.count || 0;
  } catch {
    return 0;
  }
}

export function markNotificationAsRead(id: number): void {
  const db = getDb();
  try {
    db.prepare("UPDATE app_notifications SET read = 1 WHERE id = ?").run(id);
  } catch {}
}

export function markAllNotificationsAsRead(): void {
  const db = getDb();
  try {
    db.prepare("UPDATE app_notifications SET read = 1 WHERE read = 0").run();
  } catch {}
}

export function clearNotifications(): void {
  const db = getDb();
  try {
    db.prepare("DELETE FROM app_notifications").run();
  } catch {}
}
