import { NextRequest, NextResponse } from "next/server";
import { listMeasurements, upsertMeasurement } from "@/lib/repo/measurements";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "60");
  return NextResponse.json({ measurements: listMeasurements(limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date) return NextResponse.json({ error: "date es obligatorio" }, { status: 400 });
  const measurement = upsertMeasurement({
    date: body.date,
    weight_kg: body.weight_kg ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ measurement });
}
