import { NextRequest, NextResponse } from "next/server";
import { createGymExercise, listGymExercises } from "@/lib/repo/gym";

export async function GET(req: NextRequest) {
  const dayParam = req.nextUrl.searchParams.get("dayId");
  const dayId = dayParam !== null ? Number(dayParam) : undefined;
  return NextResponse.json({ exercises: listGymExercises(dayId) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const gymDayId = Number(body.gym_day_id);
  if (!Number.isFinite(gymDayId) || !body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "gym_day_id y name son obligatorios" }, { status: 400 });
  }
  const exercise = createGymExercise(gymDayId, body.name.trim());
  return NextResponse.json({ exercise }, { status: 201 });
}
