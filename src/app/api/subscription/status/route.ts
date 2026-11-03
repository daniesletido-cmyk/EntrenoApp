import { NextResponse } from "next/server";
import { getUserSubscription, checkFeatureAccess } from "@/lib/repo/subscriptions";
import { PLANS } from "@/lib/stripe";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "default_user";

    const subscription = getUserSubscription(userId);
    const access = checkFeatureAccess("ai_coach", userId);

    return NextResponse.json({
      subscription,
      access,
      plans: Object.values(PLANS),
    });
  } catch (err: unknown) {
    console.error("Error en /api/subscription/status:", err);
    return NextResponse.json(
      { error: "Error obteniendo el estado de suscripción", details: String(err) },
      { status: 500 }
    );
  }
}
