import { NextRequest, NextResponse } from "next/server";
import { computeWeeklyRecommendation } from "@/lib/recommendations";
import { weekStartOf, todayISO } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const weekParam = req.nextUrl.searchParams.get("week") ?? todayISO();
  const rec = computeWeeklyRecommendation(weekStartOf(weekParam));
  return NextResponse.json(rec);
}
