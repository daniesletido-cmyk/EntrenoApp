import { NextRequest, NextResponse } from "next/server";
import { computeAerobicEfficiency } from "@/lib/aerobic-efficiency";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date") ?? todayISO();
    const data = computeAerobicEfficiency(dateParam);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[API aerobic-efficiency] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Error calculando eficiencia aeróbica" },
      { status: 500 }
    );
  }
}
