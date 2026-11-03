import { NextResponse } from "next/server";
import { checkFeatureAccess, PremiumFeature, getUserSubscription } from "@/lib/repo/subscriptions";

/**
 * Valida el acceso a funcionalidades premium en endpoints API.
 * Devuelve un NextResponse 403 estructurado si el usuario no tiene acceso, o null si está autorizado.
 */
export function enforceSubscriptionAccess(
  feature: PremiumFeature,
  userId: string = "default_user"
): NextResponse | null {
  const access = checkFeatureAccess(feature, userId);

  if (!access.hasAccess) {
    return NextResponse.json(
      {
        error: "subscription_required",
        code: "PREMIUM_FEATURE_LOCKED",
        feature,
        message: "Esta funcionalidad requiere una suscripción activa a EntrenoApp Premium.",
        upgradeUrl: "/precios",
        currentPlan: access.plan,
        currentStatus: access.status,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Helper para verificar en el servidor si la sesión actual tiene acceso premium activo.
 */
export function isSubscriptionActive(userId: string = "default_user"): boolean {
  const sub = getUserSubscription(userId);
  return sub.status === "active" || sub.status === "trialing";
}
