import { NextRequest, NextResponse } from "next/server";
import { computeCoachWeeklyAssessment } from "@/lib/coach-assessment";
import { todayISO, weekStartOf } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week") ?? weekStartOf(todayISO());
  try {
    const assessment = computeCoachWeeklyAssessment(weekParam);
    return NextResponse.json({ assessment });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error calculando informe de entrenador" }, { status: 500 });
  }
}
