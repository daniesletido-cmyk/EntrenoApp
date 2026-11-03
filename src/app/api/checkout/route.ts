import { NextResponse } from "next/server";
import { stripe, PLANS, getBaseUrl } from "@/lib/stripe";
import { getUserSubscription, upsertSubscription, SubscriptionPlan } from "@/lib/repo/subscriptions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const planKey = (body.plan || "premium_annual") as SubscriptionPlan;
    const userId = body.userId || "default_user";
    const customerEmail = body.email || undefined;

    const planConfig = PLANS[planKey];
    if (!planConfig || planKey === "free") {
      return NextResponse.json(
        { error: "Plan inválido para checkout" },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();
    const successUrl = body.successUrl || `${baseUrl}/precios?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/precios?status=cancelled`;

    // Si Stripe no está configurado (falta STRIPE_SECRET_KEY en local o entorno de prueba inicial),
    // ofrecemos un fallback simulado de activación segura para testing integral y QA sin bloquear la experiencia.
    if (!stripe) {
      console.warn("[Stripe] STRIPE_SECRET_KEY no configurada. Generando sesión de checkout en modo demostración/simulado.");

      // Si se pasa flag de simulación o prueba
      if (body.simulateSuccess) {
        upsertSubscription({
          userId,
          stripeCustomerId: "cus_simulated_test",
          stripeSubscriptionId: "sub_simulated_test",
          plan: planKey,
          billingPeriod: planConfig.interval === "year" ? "annual" : "monthly",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { note: "Activación simulada en modo demostración" },
        });
      }

      return NextResponse.json({
        simulated: true,
        checkoutUrl: `${baseUrl}/precios?status=demo_checkout&plan=${planKey}`,
        message: "Stripe en modo configuración. Configura STRIPE_SECRET_KEY en Vercel/.env.local para procesar pagos con tarjeta real.",
      });
    }

    // Modo real con Stripe Checkout
    const currentSub = getUserSubscription(userId);

    // Preparar opciones de sesión de Stripe
    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: currentSub.stripe_customer_id ? undefined : customerEmail,
      customer: currentSub.stripe_customer_id || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `EntrenoApp — ${planConfig.name}`,
              description: planConfig.features.slice(0, 3).join(" · "),
              images: [`${baseUrl}/brand/logo-mark-512.png`],
            },
            unit_amount: Math.round(planConfig.priceEur * 100),
            recurring: {
              interval: planConfig.interval || "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: planKey,
      },
      subscription_data: {
        metadata: {
          userId,
          plan: planKey,
        },
        // 7 días de prueba gratuita en plan anual si se solicita
        trial_period_days: planKey === "premium_annual" ? 7 : undefined,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      simulated: false,
    });
  } catch (err: unknown) {
    console.error("Error en /api/checkout:", err);
    return NextResponse.json(
      { error: "Error al crear la sesión de pago", details: String(err) },
      { status: 500 }
    );
  }
}
