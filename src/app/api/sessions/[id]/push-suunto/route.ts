import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/repo/sessions";
import { getSessionSuuntoSync } from "@/lib/repo/suunto-sync";
import { pushSessionToSuunto } from "@/lib/suunto-cloud";
import { buildStructuredWorkoutForSession, buildStructuredWorkoutFitBuffer } from "@/lib/suunto-workout-builder";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "ID de sesión inválido" }, { status: 400 });
  }

  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format");
  if (format === "fit") {
    const fitBuf = buildStructuredWorkoutFitBuffer(session);
    return new NextResponse(new Uint8Array(fitBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="suunto-entreno-${session.date}-${session.id}.fit"`,
      },
    });
  }

  const syncRecord = getSessionSuuntoSync(sessionId) ?? null;
  const structuredPreview = buildStructuredWorkoutForSession(session);
  return NextResponse.json({ syncRecord, structuredPreview });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "ID de sesión inválido" }, { status: 400 });
  }

  try {
    const result = await pushSessionToSuunto(sessionId);
    if (!result.success) {
      return NextResponse.json(result, { status: result.needsReauth ? 401 : 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al enviar entrenamiento a Suunto";
    return NextResponse.json({ success: false, error: msg, message: msg }, { status: 400 });
  }
}
