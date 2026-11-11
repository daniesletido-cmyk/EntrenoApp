import { NextRequest, NextResponse } from "next/server";
import { exchangeSuuntoAuthCode } from "@/lib/suunto-cloud";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const origin = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/configuracion?suunto_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/configuracion?suunto_error=${encodeURIComponent("Código OAuth no recibido")}`);
  }

  try {
    await exchangeSuuntoAuthCode(code, origin);
    return NextResponse.redirect(`${origin}/configuracion?suunto=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error intercambiando token de Suunto";
    return NextResponse.redirect(`${origin}/configuracion?suunto_error=${encodeURIComponent(msg)}`);
  }
}
