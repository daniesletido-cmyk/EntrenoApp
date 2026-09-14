import { NextRequest, NextResponse } from "next/server";
import { listGymLogsForDate, listGymLogsForExercise, upsertGymLog } from "@/lib/repo/gym";

export async function GET(req: NextRequest) {
  const exerciseParam = req.nextUrl.searchParams.get("exerciseId");
  const dateParam = req.nextUrl.searchParams.get("date");
  if (exerciseParam !== null) {
    const exerciseId = Number(exerciseParam);
    if (!Number.isFinite(exerciseId)) {
      return NextResponse.json({ error: "exerciseId inválido" }, { status: 400 });
    }
    return NextResponse.json({ logs: listGymLogsForExercise(exerciseId) });
  }
  if (dateParam) {
    return NextResponse.json({ logs: listGymLogsForDate(dateParam) });
  }
  return NextResponse.json({ error: "exerciseId o date es obligatorio" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const exerciseId = Number(body.exercise_id);
  if (!Number.isFinite(exerciseId) || !body.date) {
    return NextResponse.json({ error: "exercise_id y date son obligatorios" }, { status: 400 });
  }
  const log = upsertGymLog({
    exercise_id: exerciseId,
    date: body.date,
    weight_kg: body.weight_kg ?? null,
    sets: body.sets ?? null,
    reps: body.reps ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ log }, { status: 201 });
}
