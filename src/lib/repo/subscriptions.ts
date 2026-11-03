import { getDb } from "@/lib/db";
import { PLANS, PlanConfig } from "@/lib/stripe";

export type SubscriptionPlan = "free" | "premium_monthly" | "premium_annual" | "pro_coach";
export type SubscriptionStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";

export interface SubscriptionRecord {
  id?: number;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  billing_period: "monthly" | "annual" | "lifetime" | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureAccess {
  hasAccess: boolean;
  plan: SubscriptionPlan;
  planConfig: PlanConfig;
  status: SubscriptionStatus;
  isActive: boolean;
  isPremium: boolean;
  isCoach: boolean;
  allowedFeatures: string[];
}

export const PREMIUM_FEATURES = [
  "ai_coach",
  "adaptive_plan",
  "weekly_ai_report",
  "acwr_fatigue_curve",
  "wearable_cloud_sync",
  "advanced_readiness",
  "dynamic_vam_zones",
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number] | "multi_athlete";

export function getUserSubscription(userId: string = "default_user"): SubscriptionRecord {
  const db = getDb();
  const row = db
    .prepare<any>(
      "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1"
    )
    .get(userId);

  if (row) {
    return {
      id: row.id,
      user_id: row.user_id,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      plan: (row.plan as SubscriptionPlan) || "free",
      billing_period: row.billing_period,
      status: (row.status as SubscriptionStatus) || "free",
      current_period_end: row.current_period_end,
      cancel_at_period_end: Boolean(row.cancel_at_period_end),
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Si no existe registro aún en la base de datos, inicializamos registro 'active' para Dani / cuenta principal o 'free'
  const now = new Date().toISOString();
  // Comprobar si es el usuario dueño (Dani) por defecto en instalación privada
  const isOwner = userId === "default_user" || userId === "danielespinosa";
  const initialPlan: SubscriptionPlan = isOwner ? "premium_annual" : "free";
  const initialStatus: SubscriptionStatus = isOwner ? "active" : "free";

  try {
    db.prepare(
      `INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, plan, billing_period,
        status, current_period_end, cancel_at_period_end, created_at, updated_at
      ) VALUES (?, NULL, NULL, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      userId,
      initialPlan,
      isOwner ? "annual" : "monthly",
      initialStatus,
      isOwner ? "2099-12-31T23:59:59.000Z" : null,
      now,
      now
    );
  } catch (e) {
    console.error("[Subscriptions] Error insertando suscripción inicial:", e);
  }

  return {
    user_id: userId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: initialPlan,
    billing_period: isOwner ? "annual" : null,
    status: initialStatus,
    current_period_end: isOwner ? "2099-12-31T23:59:59.000Z" : null,
    cancel_at_period_end: false,
    created_at: now,
    updated_at: now,
  };
}

export function upsertSubscription(data: {
  userId?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: SubscriptionPlan;
  billingPeriod?: "monthly" | "annual" | "lifetime" | null;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}): SubscriptionRecord {
  const db = getDb();
  const userId = data.userId || "default_user";
  const now = new Date().toISOString();
  const metaStr = data.metadata ? JSON.stringify(data.metadata) : null;

  // Buscar si ya existe por customer_id o user_id
  const existing = data.stripeCustomerId
    ? db.prepare<any>("SELECT * FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1").get(data.stripeCustomerId)
    : db.prepare<any>("SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1").get(userId);

  if (existing) {
    db.prepare(
      `UPDATE subscriptions SET
        stripe_customer_id = COALESCE(?, stripe_customer_id),
        stripe_subscription_id = COALESCE(?, stripe_subscription_id),
        plan = ?,
        billing_period = COALESCE(?, billing_period),
        status = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        metadata = COALESCE(?, metadata),
        updated_at = ?
      WHERE id = ?`
    ).run(
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.plan,
      data.billingPeriod || "monthly",
      data.status,
      data.currentPeriodEnd || null,
      data.cancelAtPeriodEnd ? 1 : 0,
      metaStr,
      now,
      existing.id
    );
  } else {
    db.prepare(
      `INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, plan, billing_period,
        status, current_period_end, cancel_at_period_end, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      data.stripeCustomerId || null,
      data.stripeSubscriptionId || null,
      data.plan,
      data.billingPeriod || "monthly",
      data.status,
      data.currentPeriodEnd || null,
      data.cancelAtPeriodEnd ? 1 : 0,
      metaStr,
      now,
      now
    );
  }

  return getUserSubscription(userId);
}

export function checkFeatureAccess(feature: PremiumFeature, userId: string = "default_user"): FeatureAccess {
  const sub = getUserSubscription(userId);
  const isActive = sub.status === "active" || sub.status === "trialing";
  const isPremium = isActive && (sub.plan === "premium_monthly" || sub.plan === "premium_annual" || sub.plan === "pro_coach");
  const isCoach = isActive && sub.plan === "pro_coach";

  const allowedFeatures: string[] = ["basic_tracking", "manual_sessions", "gym_catalog"];
  if (isPremium) {
    allowedFeatures.push(...PREMIUM_FEATURES);
  }
  if (isCoach) {
    allowedFeatures.push("multi_athlete");
  }

  let hasAccess = false;
  if (feature === "multi_athlete") {
    hasAccess = isCoach;
  } else if ((PREMIUM_FEATURES as readonly string[]).includes(feature)) {
    hasAccess = isPremium;
  } else {
    hasAccess = true;
  }

  const planConfig = PLANS[sub.plan] || PLANS.free;

  return {
    hasAccess,
    plan: sub.plan,
    planConfig,
    status: sub.status,
    isActive,
    isPremium,
    isCoach,
    allowedFeatures,
  };
}
