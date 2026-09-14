import { NextRequest, NextResponse } from "next/server";
import { swapSessionDates } from "@/lib/repo/sessions";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const idA = Number(body.idA);
  const idB = Number(body.idB);

  if (!idA || !idB || idA === idB) {
    return NextResponse.json({ error: "Selecciona dos sesiones distintas para intercambiar" }, { status: 400 });
  }

  const result = swapSessionDates(idA, idB);
  if (!result) {
    return NextResponse.json({ error: "No se encontró alguna de las dos sesiones" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
