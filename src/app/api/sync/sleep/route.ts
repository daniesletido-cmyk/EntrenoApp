import { NextRequest, NextResponse } from "next/server";
import { upsertRecovery, getLatestRecovery, listRecoveryBetween, RecoveryInput } from "@/lib/repo/recovery";
import { toLocalISODate } from "@/lib/dates";

/**
 * Endpoint de sincronización automatizada de sueño de Zepp / Amazfit
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && to) {
    const list = listRecoveryBetween(from, to);
    return NextResponse.json({ recovery: list, count: list.length });
  }

  const latest = getLatestRecovery();
  return NextResponse.json({
    latest,
    status: "ready",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Ingesta por lote (batch) de varios días
    if (Array.isArray(body.logs) || Array.isArray(body)) {
      const logs = Array.isArray(body.logs) ? body.logs : body;
      const results = [];

      for (const item of logs) {
        if (!item.date && !item.fecha) continue;
        const normalized = normalizeZeppPayload(item);
        const saved = upsertRecovery(normalized);
        results.push(saved);
      }

      return NextResponse.json({
        success: true,
        count: results.length,
        recovery: results,
      });
    }

    // 2. Ingesta individual de un día
    const normalized = normalizeZeppPayload(body);
    if (!normalized.fecha) {
      return NextResponse.json({ error: "Campo fecha/date es obligatorio" }, { status: 400 });
    }

    const saved = upsertRecovery(normalized);

    return NextResponse.json({
      success: true,
      recovery: saved,
      message: "Registro de sueño sincronizado y métricas de recuperación actualizadas.",
    });
  } catch (err: any) {
    console.error("[Zepp Sync API] Error al procesar:", err);
    return NextResponse.json({ error: err.message || "Error interno procesando sueño" }, { status: 500 });
  }
}

function normalizeZeppPayload(item: any): RecoveryInput {
  const fecha = item.fecha || item.date || toLocalISODate();

  // Duración en horas: si viene en minutos (>24) o en horas
  let sleepDuration: number | null = null;
  const rawDuration = item.sleep_duration ?? item.hours ?? item.duration ?? item.total_sleep_time;
  if (typeof rawDuration === "number") {
    sleepDuration = rawDuration > 24 ? Math.round((rawDuration / 60) * 10) / 10 : Math.round(rawDuration * 10) / 10;
  }

  // Fases en minutos
  const deepMin = item.deep_sleep_min ?? item.deep_min ?? item.deepSleepTime ?? item.deep_sleep_time ?? null;
  const remMin = item.rem_min ?? item.rem_sleep_min ?? item.remSleepTime ?? item.rem_time ?? null;
  const restingHr = item.resting_hr ?? item.rest_hr ?? item.resting_heart_rate ?? item.min_hr ?? null;
  const score = item.recovery_score ?? item.score ?? item.sleep_score ?? null;

  return {
    fecha,
    sleep_duration: sleepDuration,
    deep_sleep_min: deepMin != null ? Number(deepMin) : null,
    rem_min: remMin != null ? Number(remMin) : null,
    resting_hr: restingHr != null ? Number(restingHr) : null,
    recovery_score: score != null ? Math.round(Number(score)) : null,
    raw_data: JSON.stringify(item),
  };
}
