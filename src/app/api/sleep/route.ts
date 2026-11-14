import { NextRequest, NextResponse } from "next/server";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { isSupabaseConfigured, fetchSleepFromSupabase } from "@/lib/supabase";
import { parseUniversalSleepPayload } from "@/lib/sleep-parser";
import { ingestSleepRecords } from "@/lib/sleep-sync-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
};

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from y to son obligatorios" }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  // 1. Blindaje automático: auto-sincronizar con ZeppBridge si está disponible en segundo plano (local)
  if (!process.env.VERCEL) {
    try {
      const { autoSyncZepp } = await import("@/lib/zepp-auto-sync");
      autoSyncZepp(false);
    } catch {}
  }

  // 2. Si Supabase está configurado, intentar recuperar desde Supabase
  if (isSupabaseConfigured()) {
    try {
      const cloudLogs = await fetchSleepFromSupabase(from, to);
      if (cloudLogs && cloudLogs.length > 0) {
        return NextResponse.json({ logs: cloudLogs }, { headers: NO_CACHE_HEADERS });
      }
    } catch (e) {
      console.warn("[Sleep GET] Error consultando Supabase, usando SQLite fallback:", e);
    }
  }

  return NextResponse.json({ logs: listSleepBetween(from, to) }, { headers: NO_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload vacío" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Usar el parser universal resiliente
    const parsed = parseUniversalSleepPayload(body);
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron registros de sueño válidos en el payload" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { saved, count } = await ingestSleepRecords(parsed);

    // Disparar push notification
    try {
      const { sendSleepRecordedPush } = await import("@/lib/push-notifications");
      const latest = saved.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) {
        await sendSleepRecordedPush(latest);
      }
    } catch (pushErr) {
      console.warn("[Sleep Push] Error notificando sueño:", pushErr);
    }

    return NextResponse.json(
      { logs: saved, log: saved[0], count },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[Sleep POST] Error guardando sueño:", err);
    return NextResponse.json(
      { error: err?.message || "Error procesando sueño" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
