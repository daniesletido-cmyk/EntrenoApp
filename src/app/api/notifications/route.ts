import { NextRequest, NextResponse } from "next/server";
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
} from "@/lib/repo/notifications";

export async function GET() {
  try {
    const notifications = listNotifications(30);
    const unreadCount = getUnreadNotificationCount();
    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener notificaciones" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.markAll) {
      markAllNotificationsAsRead();
    } else if (body.id) {
      markNotificationAsRead(Number(body.id));
    }
    const unreadCount = getUnreadNotificationCount();
    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al actualizar notificaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.body || !body.url) {
      return NextResponse.json({ error: "Faltan campos obligatorios (title, body, url)" }, { status: 400 });
    }
    const created = createNotification({
      title: body.title,
      body: body.body,
      url: body.url,
      icon: body.icon,
      category: body.category || "daily_report",
    });
    return NextResponse.json({ success: true, notification: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al crear notificación" }, { status: 500 });
  }
}
