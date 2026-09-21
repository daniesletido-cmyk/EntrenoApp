import { NextRequest, NextResponse } from "next/server";
import { computeDailyReadiness } from "@/lib/readiness";
import { todayISO } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayISO();
  try {
    const readiness = computeDailyReadiness(date);
    return NextResponse.json({ readiness });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error calculando readiness" }, { status: 500 });
  }
}
