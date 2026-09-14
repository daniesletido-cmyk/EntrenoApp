import { NextRequest, NextResponse } from "next/server";
import { createGymDay, listGymDays } from "@/lib/repo/gym";

export async function GET() {
  return NextResponse.json({ days: listGymDays() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name es obligatorio" }, { status: 400 });
  }
  const day = createGymDay(body.name.trim());
  return NextResponse.json({ day }, { status: 201 });
}
