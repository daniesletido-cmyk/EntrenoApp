import { NextResponse } from "next/server";
import { executeCoachAction, undoCoachAction, CoachActionProposal } from "@/lib/coach-ai/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.undo && body.sessionId && body.previousState) {
      const ok = undoCoachAction(Number(body.sessionId), body.previousState);
      return NextResponse.json({ ok, message: ok ? "Cambio deshecho con éxito" : "No se pudo deshacer" });
    }

    const action: CoachActionProposal = body.action;
    if (!action || !action.type || !action.toDiscipline) {
      return NextResponse.json({ error: "Acción de entrenador no válida" }, { status: 400 });
    }

    const result = executeCoachAction(action);
    return NextResponse.json({ ok: result.success, result });
  } catch (err: unknown) {
    console.error("Error en /api/coach/action:", err);
    return NextResponse.json({ error: "Error ejecutando acción del entrenador", details: String(err) }, { status: 500 });
  }
}
