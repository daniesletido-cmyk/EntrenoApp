import { NextRequest, NextResponse } from "next/server";
import { listMeasurements, getLatestMeasurement } from "@/lib/repo/measurements";

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "60");
    const measurements = listMeasurements(limit);
    const latest = getLatestMeasurement();

    return NextResponse.json({
      success: true,
      latest,
      measurements,
    });
  } catch (error) {
    console.error("Error en GET /api/peso:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar historial de peso" },
      { status: 500 }
    );
  }
}
