import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSettings } from "@/lib/repo/settings";

// La clave de API de Anthropic nunca se devuelve al cliente (igual que los
// hashes de contraseña en FinanzasApp) — solo se usa en el servidor.
function publicSettings() {
  const all = getAllSettings();
  const { anthropic_api_key, ...rest } = all;
  return { ...rest, has_anthropic_api_key: !!anthropic_api_key };
}

export async function GET() {
  return NextResponse.json({
    settings: publicSettings(),
    app_info: {
      version: "0.1.0",
      bundle_source: process.env.ENTRENO_BUNDLE_SOURCE || "Desarrollo Local",
      node_env: process.env.NODE_ENV || "development",
      port: process.env.PORT || "3210",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }
  setSettings(body as Record<string, string>);
  return NextResponse.json({ settings: publicSettings() });
}
