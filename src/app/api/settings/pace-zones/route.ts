import { NextRequest, NextResponse } from "next/server";
import { getActivePaceZones, saveActivePaceZones, calculatePaceZonesFromVam, paceToSecKm } from "@/lib/pace-zones";
import { flushDbPersistence } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getActivePaceZones();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error al obtener zonas de ritmo:", error);
    return NextResponse.json({ success: false, error: "Error consultando zonas de ritmo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "recalculate_from_vam") {
      const vamPaceStr = body.vamPace || "3:59";
      const sec = paceToSecKm(vamPaceStr) || 239;
      const tol = Number(body.toleranceSecKm || 5);
      const newConfig = calculatePaceZonesFromVam(sec, tol);
      saveActivePaceZones(newConfig);
      await flushDbPersistence();
      return NextResponse.json({ success: true, config: newConfig });
    }

    if (body.config && body.config.zones) {
      saveActivePaceZones(body.config);
      await flushDbPersistence();
      return NextResponse.json({ success: true, config: body.config });
    }

    return NextResponse.json({ success: false, error: "Cuerpo de solicitud inválido" }, { status: 400 });
  } catch (error) {
    console.error("Error al guardar zonas de ritmo:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar zonas de ritmo" }, { status: 500 });
  }
}
