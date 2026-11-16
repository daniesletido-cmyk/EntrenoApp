import { NextRequest, NextResponse } from "next/server";
import { calculateMarathonProjection } from "@/lib/marathon-projection";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date") ?? todayISO();
    const data = calculateMarathonProjection(dateParam);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[API marathon-projection] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Error calculando proyección de maratón" },
      { status: 500 }
    );
  }
}
