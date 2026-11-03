import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { upsertSubscription, SubscriptionPlan, SubscriptionStatus } from "@/lib/repo/subscriptions";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (stripe && webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Error verificando firma:", err.message);
        return NextResponse.json({ error: `Firma inválida: ${err.message}` }, { status: 400 });
      }
    } else {
      // Si estamos en entorno de pruebas local o simulado (sin webhook secret configurado)
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch (e) {
        return NextResponse.json({ error: "Payload JSON no válido" }, { status: 400 });
      }
    }

    console.log(`[Stripe Webhook] Recibido evento: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || "default_user";
        const plan = (session.metadata?.plan as SubscriptionPlan) || "premium_annual";
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;

        upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan,
          billingPeriod: plan === "premium_annual" ? "annual" : "monthly",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + (plan === "premium_annual" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        const statusMap: Record<string, SubscriptionStatus> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "unpaid",
          incomplete: "free",
          incomplete_expired: "free",
          paused: "free",
        };
        const status: SubscriptionStatus = statusMap[subscription.status] || "free";
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const planKey = (subscription.metadata?.plan as SubscriptionPlan) || "premium_annual";

        upsertSubscription({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          plan: planKey,
          status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        upsertSubscription({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          plan: "free",
          status: "canceled",
          cancelAtPeriodEnd: false,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
        if (customerId && invoice.subscription) {
          upsertSubscription({
            stripeCustomerId: customerId,
            plan: "premium_annual",
            status: "active",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
        if (customerId) {
          upsertSubscription({
            stripeCustomerId: customerId,
            plan: "premium_annual",
            status: "past_due",
          });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento sin manejador específico: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[Stripe Webhook] Error procesando evento:", err);
    return NextResponse.json(
      { error: "Error en el webhook de Stripe", details: String(err) },
      { status: 500 }
    );
  }
}
