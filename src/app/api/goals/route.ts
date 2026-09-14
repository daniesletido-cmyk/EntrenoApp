import { NextRequest, NextResponse } from "next/server";
import { createGoal, listGoals, MetricType } from "@/lib/repo/goals";

export async function GET() {
  return NextResponse.json({ goals: listGoals() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.metric_type) {
    return NextResponse.json({ error: "title y metric_type son obligatorios" }, { status: 400 });
  }
  const goal = createGoal({
    title: body.title,
    metric_type: body.metric_type as MetricType,
    target_value: body.target_value ?? null,
    current_value: body.current_value ?? null,
    target_date: body.target_date ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json({ goal }, { status: 201 });
}
