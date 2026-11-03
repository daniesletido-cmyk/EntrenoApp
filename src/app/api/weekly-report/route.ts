import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport } from "@/lib/weekly-report-generator";
import { enforceSubscriptionAccess } from "@/lib/security/subscription-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const denied = enforceSubscriptionAccess("weekly_ai_report", req.nextUrl.searchParams.get("userId") || "default_user");
  if (denied) return denied;

  const weekParam = req.nextUrl.searchParams.get("week") || undefined;
  try {
    const report = generateWeeklyReport(weekParam);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error("Error generating weekly report:", err);
    return NextResponse.json({ error: err?.message || "Error al generar informe semanal" }, { status: 500 });
  }
}
