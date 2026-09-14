import { NextRequest, NextResponse } from "next/server";
import { computeAutoAdjustment, applyAutoAdjustment } from "@/lib/auto-adjust";
import { weekStartOf, todayISO } from "@/lib/dates";

// GET: previsualiza los cambios que se propondrían (no toca nada).
export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? todayISO();
  const result = computeAutoAdjustment(weekStartOf(week));
  return NextResponse.json(result);
}

// POST: aplica de verdad los cambios sobre la semana siguiente.
export async function POST(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? todayISO();
  const result = applyAutoAdjustment(weekStartOf(week));
  return NextResponse.json(result);
}
