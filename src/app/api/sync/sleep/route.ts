import { NextRequest, NextResponse } from "next/server";
import { parseUniversalSleepPayload } from "@/lib/sleep-parser";
import { ingestSleepRecords, getSleepSyncStatus } from "@/lib/sleep-sync-service";
import { listSleepBetween, getSleepByDate } from "@/lib/repo/sleep";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Endpoint de diagnóstico y consulta de estado de sincronización de sueño
 */
export async function GET(req: NextRequest) {
  // 1. Si estamos en entorno local, intentar sincronizar con ZeppBridge si está disponible
  let localSyncResult = null;
  if (!process.env.VERCEL) {
    try {
      const { autoSyncZepp } = await import("@/lib/zepp-auto-sync");
      localSyncResult = autoSyncZepp(true);
    } catch {}
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && to) {
    const list = listSleepBetween(from, to);
    return NextResponse.json(
      { logs: list, count: list.length, syncStatus: getSleepSyncStatus() },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  const syncStatus = getSleepSyncStatus();
  const today = todayISO();
  const todayLog = getSleepByDate(today);

  const host = req.headers.get("host") || "entrenoapp-blond.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const webhookUrl = `${protocol}://${host}/api/sync/sleep`;

  return NextResponse.json(
    {
      status: "ready",
      todaySleep: todayLog ?? null,
      syncStatus,
      webhookUrl,
      localSyncResult,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

/**
 * Webhook unificado de recepción de sueño desde Zepp / Amazfit, iOS Shortcuts, Health Connect, etc.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => null);
    } else if (contentType.includes("text/plain")) {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw_text: text };
      }
    } else {
      // Fallback genérico para cualquier payload
      body = await req.json().catch(async () => {
        const text = await req.text().catch(() => "");
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      });
    }

    if (!body) {
      return NextResponse.json(
        { error: "Payload vacío o formato no reconocido" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 1. Parseo universal y normalización en zona horaria Europe/Madrid
    const parsedRecords = parseUniversalSleepPayload(body);

    if (parsedRecords.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudieron extraer registros de sueño válidos del payload recibido",
          receivedKeys: typeof body === "object" && body !== null ? Object.keys(body) : [],
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Persistencia blindada en SQLite (ambas DBs), Vercel Blob y Supabase
    const { saved, count } = await ingestSleepRecords(parsedRecords);

    // 3. Notificación Push para el registro más reciente
    try {
      const latest = saved.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) {
        const { sendSleepRecordedPush } = await import("@/lib/push-notifications");
        await sendSleepRecordedPush(latest);
      }
    } catch (pushErr) {
      console.warn("[Sleep Sync API] Aviso notificando push:", pushErr);
    }

    const syncStatus = getSleepSyncStatus();

    return NextResponse.json(
      {
        success: true,
        count,
        latest: saved[0] ?? null,
        syncStatus,
        message: `Sincronizados ${count} registro(s) de sueño con éxito.`,
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[Sleep Sync API] Error procesando sueño:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno procesando sincronización de sueño" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
