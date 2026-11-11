import { NextRequest, NextResponse } from "next/server";
import { buildSuuntoAuthorizeUrl, getSuuntoConnectionStatus } from "@/lib/suunto-cloud";

export async function GET(req: NextRequest) {
  const isStatus = req.nextUrl.searchParams.get("status") === "1";
  if (isStatus) {
    const status = await getSuuntoConnectionStatus();
    return NextResponse.json(status);
  }

  const origin = req.nextUrl.origin;
  const authUrl = buildSuuntoAuthorizeUrl(origin);
  if (!authUrl) {
    return NextResponse.json(
      {
        error: "SUUNTO_CLIENT_ID no está configurado en el servidor. Puedes usar el puente conectado con Intervals.icu o añadir las credenciales de Suunto API Zone en Configuración.",
      },
      { status: 400 }
    );
  }

  return NextResponse.redirect(authUrl);
}
