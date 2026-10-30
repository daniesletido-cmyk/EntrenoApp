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
    const { subscription, deviceType } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Suscripción push inválida (endpoint y keys son obligatorios)" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    if (!keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Faltan las claves criptográficas p256dh o auth" },
        { status: 400 }
      );
    }

    const saved = savePushSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      device_type: deviceType || "browser",
    });

    return NextResponse.json({ success: true, id: saved.id });
  } catch (err: any) {
    console.error("[Push API] Error al guardar suscripción:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint es obligatorio" }, { status: 400 });
    }

    const deleted = deletePushSubscription(endpoint);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
