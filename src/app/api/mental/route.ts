import { NextRequest, NextResponse } from "next/server";
import { upsertMentalLog, listMentalLogsBetween, getMentalLogByDate } from "@/lib/repo/mental";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (date) {
    const log = getMentalLogByDate(date);
    return NextResponse.json({ log: log ?? null });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from && to) {
    return NextResponse.json({ logs: listMentalLogsBetween(from, to) });
  }

  return NextResponse.json({ error: "Faltan parámetros (date o from/to)" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.date) {
      return NextResponse.json({ error: "date es obligatorio" }, { status: 400 });
    }

    const log = upsertMentalLog({
      date: body.date,
      motivation: body.motivation != null ? Number(body.motivation) : undefined,
      mental_stress: body.mental_stress != null ? Number(body.mental_stress) : undefined,
      mental_energy: body.mental_energy != null ? Number(body.mental_energy) : undefined,
      focus_technique: body.focus_technique,
      notes: body.notes,
    });

    return NextResponse.json({ log });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error guardando registro mental";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
