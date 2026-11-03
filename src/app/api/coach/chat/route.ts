import { NextResponse } from "next/server";
import { askCoachAI, ChatMessage } from "@/lib/coach-ai/engine";
import { todayISO } from "@/lib/dates";
import { enforceSubscriptionAccess } from "@/lib/security/subscription-guard";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verificación de suscripción para Entrenador IA
    const denied = enforceSubscriptionAccess("ai_coach", body.userId || "default_user");
    if (denied) return denied;

    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron mensajes" }, { status: 400 });
    }

    const { reply, contextSummary, appliedAction, proposedAction, isAiPowered } = await askCoachAI(messages, todayISO());

    return NextResponse.json({
      reply,
      contextSummary,
      appliedAction,
      proposedAction,
      isAiPowered,
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
