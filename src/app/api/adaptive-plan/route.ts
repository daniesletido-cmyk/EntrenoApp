import { NextRequest, NextResponse } from "next/server";
import {
  evaluateCompletedWeek,
  generateNextWeekAdaptivePlan,
  applyNextWeekAdaptivePlan,
} from "@/lib/adaptive-weekly-plan";
import { weekStartOf, todayISO } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const week = req.nextUrl.searchParams.get("week") ?? todayISO();
    const currentWeekStart = weekStartOf(week);
    const plan = generateNextWeekAdaptivePlan(currentWeekStart);
    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("Error generating adaptive plan preview:", error);
    return NextResponse.json({ error: error.message || "Error evaluando plan adaptativo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const week = body.weekStart ?? todayISO();
    const currentWeekStart = weekStartOf(week);
    const result = applyNextWeekAdaptivePlan(currentWeekStart);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error applying adaptive plan:", error);
    return NextResponse.json({ error: error.message || "Error aplicando plan adaptativo" }, { status: 500 });
  }
}
