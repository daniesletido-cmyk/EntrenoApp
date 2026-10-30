import { NextRequest, NextResponse } from "next/server";
import {
  savePushSubscription,
  deletePushSubscription,
  countPushSubscriptions,
} from "@/lib/repo/push-subscriptions";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  const count = countPushSubscriptions();
  return NextResponse.json({
    publicKey,
    configured: Boolean(publicKey),
    totalSubscriptions: count,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extraer datos soportando cualquier estructura de serialización del navegador
    const endpoint = body.subscription?.endpoint || body.endpoint;
    const p256dh =
      body.subscription?.keys?.p256dh ||
      body.keys?.p256dh ||
      body.p256dh;
    const auth =
      body.subscription?.keys?.auth ||
      body.keys?.auth ||
      body.auth;
    const deviceType = body.deviceType || body.device_type || "browser";

    if (!endpoint) {
      return NextResponse.json(
        { error: "Suscripción push inválida: falta el endpoint" },
        { status: 400 }
      );
    }

    if (!p256dh || !auth) {
      return NextResponse.json(
        { error: "Faltan las claves criptográficas p256dh o auth de la suscripción" },
        { status: 400 }
      );
    }

    const saved = savePushSubscription({
      endpoint,
      p256dh: String(p256dh),
      auth: String(auth),
      device_type: String(deviceType),
    });

    return NextResponse.json({ success: true, id: saved.id });
  } catch (err: any) {
    console.error("[Push API] Error al guardar suscripción:", err);
    return NextResponse.json({ error: err.message || "Error interno al guardar suscripción" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = body.subscription?.endpoint || body.endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint es obligatorio" }, { status: 400 });
    }

    const deleted = deletePushSubscription(endpoint);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
