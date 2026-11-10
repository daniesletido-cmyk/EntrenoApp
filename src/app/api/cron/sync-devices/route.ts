import { NextResponse } from "next/server";
import { syncIntervalsWorkouts } from "@/lib/intervals-sync";

export async function GET() {
  const intervals = await syncIntervalsWorkouts(7);
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    intervals,
  });
}
