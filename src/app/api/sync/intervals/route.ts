import { NextRequest, NextResponse } from "next/server";
import { syncIntervalsWorkouts } from "@/lib/intervals-sync";

export async function GET(req: NextRequest) {
  const daysParam = Number(req.nextUrl.searchParams.get("days") || 14);
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 60 ? daysParam : 14;
  const result = await syncIntervalsWorkouts(days);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  let days = 14;
  try {
    const body = await req.json();
    if (body?.days && Number.isFinite(Number(body.days))) {
      days = Math.min(60, Math.max(1, Number(body.days)));
    }
  } catch {}
  const result = await syncIntervalsWorkouts(days);
  return NextResponse.json(result);
}
