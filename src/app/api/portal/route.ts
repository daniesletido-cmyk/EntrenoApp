import { NextResponse } from "next/server";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { getUserSubscription } from "@/lib/repo/subscriptions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "default_user";
    const baseUrl = getBaseUrl();
    const returnUrl = body.returnUrl || `${baseUrl}/configuracion`;

    const sub = getUserSubscription(userId);

    if (!stripe) {
      return NextResponse.json({
        simulated: true,
        portalUrl: `${baseUrl}/precios?status=demo_portal`,
        message: "Stripe en modo configuración. Configura STRIPE_SECRET_KEY en Vercel/.env.local.",
      });
    }

    if (!sub.stripe_customer_id) {
      return NextResponse.json(
        { error: "No existe cliente de facturación registrado para este usuario. Suscríbete primero." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({
      portalUrl: portalSession.url,
      simulated: false,
    });
  } catch (err: unknown) {
    console.error("Error en /api/portal:", err);
    return NextResponse.json(
      { error: "Error abriendo el portal de facturación", details: String(err) },
      { status: 500 }
    );
  }
}
