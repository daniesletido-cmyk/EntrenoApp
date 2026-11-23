import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/repo/sessions";
import { buildNutritionGpxForSession } from "@/lib/suunto-gpx-builder";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId)) {
    return NextResponse.json({ error: "ID de sesión inválido" }, { status: 400 });
  }

  const session = getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const gpxXml = buildNutritionGpxForSession(session);
  const cleanCode = (session.planned_code || `sesion-${session.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 30);
  const filename = `${session.date}_${cleanCode}_nutricion.gpx`;

  return new NextResponse(gpxXml, {
    status: 200,
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
