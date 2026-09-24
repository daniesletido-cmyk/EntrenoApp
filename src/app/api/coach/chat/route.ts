import { NextResponse } from "next/server";
import { askCoachAI, ChatMessage } from "@/lib/coach-ai/engine";
import { todayISO } from "@/lib/dates";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron mensajes" }, { status: 400 });
    }

    const { reply, contextSummary } = await askCoachAI(messages, todayISO());

    return NextResponse.json({
      reply,
      contextSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Error en /api/coach/chat:", err);
    return NextResponse.json(
      { error: "Error procesando la consulta con el entrenador", details: String(err) },
      { status: 500 }
    );
  }
}
