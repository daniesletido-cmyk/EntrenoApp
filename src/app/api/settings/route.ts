import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSettings } from "@/lib/repo/settings";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isBlobSyncEnabled } from "@/lib/blob-sync";

function publicSettings() {
  const all = getAllSettings();
  const { anthropic_api_key, gemini_api_key, ...rest } = all;
  return {
    ...rest,
    has_anthropic_api_key: !!(anthropic_api_key || process.env.ANTHROPIC_API_KEY),
    has_gemini_api_key: !!(gemini_api_key || process.env.GEMINI_API_KEY),
    has_any_ai_key: !!(anthropic_api_key || gemini_api_key || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
    has_supabase: isSupabaseConfigured(),
    has_blob_sync: isBlobSyncEnabled(),
  };
}

export async function GET() {
  return NextResponse.json({
    settings: publicSettings(),
    app_info: {
      version: "0.1.0",
      bundle_source: process.env.ENTRENO_BUNDLE_SOURCE || (process.env.VERCEL ? "Vercel Serverless" : "Desarrollo Local"),
      node_env: process.env.NODE_ENV || "development",
      port: process.env.PORT || "3210",
      supabase_connected: isSupabaseConfigured(),
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
