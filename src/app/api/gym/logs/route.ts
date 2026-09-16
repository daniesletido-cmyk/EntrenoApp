import { NextRequest, NextResponse } from "next/server";
import { listGymLogsForDate, listGymLogsForExercise, upsertGymLog, listGymPRs } from "@/lib/repo/gym";

export async function GET(req: NextRequest) {
  const prsParam = req.nextUrl.searchParams.get("prs");
  if (prsParam === "true") {
    return NextResponse.json({ prs: listGymPRs() });
  }
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
  return NextResponse.json({ error: "exerciseId, date o prs es obligatorio" }, { status: 400 });
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
    weight_kg: body.weight_kg !== undefined ? (body.weight_kg !== "" && body.weight_kg !== null ? Number(body.weight_kg) : null) : undefined,
    sets: body.sets !== undefined ? (body.sets !== "" && body.sets !== null ? Number(body.sets) : null) : undefined,
    reps: body.reps !== undefined ? (body.reps !== "" && body.reps !== null ? Number(body.reps) : null) : undefined,
    notes: body.notes !== undefined ? body.notes : undefined,
    completed: body.completed !== undefined ? (body.completed ? 1 : 0) : undefined,
  });
  return NextResponse.json({ log }, { status: 201 });
}
