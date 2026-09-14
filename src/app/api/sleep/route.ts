import { NextRequest, NextResponse } from "next/server";
import { upsertSleepLog, listSleepBetween, SleepLogInput } from "@/lib/repo/sleep";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from y to son obligatorios" }, { status: 400 });
  return NextResponse.json({ logs: listSleepBetween(from, to) });
}

const OPTIONAL_FIELDS = ["hours", "quality", "notes", "score", "deep_min", "light_min", "rem_min", "awake_min", "source"] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.date) return NextResponse.json({ error: "date es obligatorio" }, { status: 400 });

  // Solo se pasan al repo los campos que de verdad vienen en el body — así
  // upsertSleepLog sabe distinguir "no lo toques" (campo ausente) de "bórralo"
  // (campo presente con valor null). Guardar sueño a mano desde Registro nunca
  // debe borrar la puntuación/fases que vinieran de una importación de ZeppBridge,
  // y al revés.
  const input: SleepLogInput = { date: body.date };
  for (const field of OPTIONAL_FIELDS) {
    if (field in body) (input as Record<string, unknown>)[field] = body[field];
  }

  const log = upsertSleepLog(input);
  return NextResponse.json({ log });
}
