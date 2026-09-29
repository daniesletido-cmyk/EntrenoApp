import { NextRequest, NextResponse } from "next/server";
import { applyDailyMicroAdjustments, revertDailyMicroAdjustment } from "@/lib/auto-adjust";
import { computeDailyReadiness } from "@/lib/readiness";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date ?? todayISO();
    const sessionId = body.sessionId ? Number(body.sessionId) : undefined;
    const action = body.action ?? "apply";

    if (action === "revert" && sessionId) {
      const reverted = revertDailyMicroAdjustment(sessionId);
      const readiness = computeDailyReadiness(date);
      return NextResponse.json({
        success: reverted,
        message: reverted ? "Ajuste revertido correctamente" : "No se pudo revertir el ajuste",
        readiness,
      });
    }

    const res = applyDailyMicroAdjustments(date, sessionId);
    const readiness = computeDailyReadiness(date);

    return NextResponse.json({
      success: true,
      appliedCount: res.appliedCount,
      results: res.results,
      readiness,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error aplicando micro-ajuste de entrenamientos" },
      { status: 500 }
    );
  }
}
