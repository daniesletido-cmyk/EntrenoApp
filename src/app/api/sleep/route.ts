import { NextRequest, NextResponse } from "next/server";
import { upsertSleepLog, batchUpsertSleepLogs, listSleepBetween, SleepLogInput } from "@/lib/repo/sleep";
import { isSupabaseConfigured, upsertSleepToSupabase, fetchSleepFromSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from y to son obligatorios" }, { status: 400 });

  // 1. Blindaje automático: auto-sincronizar con ZeppBridge si está disponible en segundo plano (local)
  if (!process.env.VERCEL) {
    try {
      const { autoSyncZepp } = await import("@/lib/zepp-auto-sync");
      autoSyncZepp(false);
    } catch {}
  }

  // 2. Si Supabase está configurado, recuperar desde Supabase (persistencia definitiva en la nube)
  if (isSupabaseConfigured()) {
    try {
      const cloudLogs = await fetchSleepFromSupabase(from, to);
      if (cloudLogs && cloudLogs.length > 0) {
        return NextResponse.json({ logs: cloudLogs });
      }
    } catch (e) {
      console.warn("[Sleep GET] Error consultando Supabase, usando SQLite fallback:", e);
    }
  }

  return NextResponse.json({ logs: listSleepBetween(from, to) });
}

const OPTIONAL_FIELDS = [
  "hours",
  "quality",
  "notes",
  "score",
  "deep_min",
  "light_min",
  "rem_min",
  "awake_min",
  "source",
  "nap_min",
  "nap_count",
  "nap_notes",
  "hrv_rmssd",
  "resting_hr",
  "respiratory_rate",
  "efficiency",
  "sleep_start",
  "sleep_end",
  "latency_min",
] as const;

function validateSleepPayload(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data.date || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, error: "La fecha debe tener formato YYYY-MM-DD" };
  }

  if (data.hours != null && data.hours !== "") {
    const h = Number(data.hours);
    if (isNaN(h) || h < 0 || h > 24) {
      return { valid: false, error: "Las horas de sueño deben ser un número entre 0 y 24" };
    }
  }

  if (data.score != null && data.score !== "") {
    const sc = Number(data.score);
    if (isNaN(sc) || sc < 0 || sc > 100) {
      return { valid: false, error: "La puntuación de sueño debe estar entre 0 y 100" };
    }
  }

  if (data.resting_hr != null && data.resting_hr !== "") {
    const rhr = Number(data.resting_hr);
    if (isNaN(rhr) || rhr < 30 || rhr > 220) {
      return { valid: false, error: "La frecuencia cardíaca en reposo debe estar entre 30 y 220 lpm" };
    }
  }

  for (const field of ["deep_min", "light_min", "rem_min", "awake_min", "nap_min", "latency_min"]) {
    if (data[field] != null && data[field] !== "") {
      const val = Number(data[field]);
      if (isNaN(val) || val < 0) {
        return { valid: false, error: `El campo ${field} no puede ser negativo` };
      }
    }
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Soporte para importación por lotes (batch) en una sola transacción
  if (Array.isArray(body.logs)) {
    const inputs: SleepLogInput[] = [];
    for (const item of body.logs) {
      const check = validateSleepPayload(item);
      if (!check.valid) continue;

      const input: SleepLogInput = { date: item.date };
      for (const field of OPTIONAL_FIELDS) {
        if (field in item) {
          const val = item[field];
          (input as Record<string, unknown>)[field] = val === "" ? null : val;
        }
      }
      inputs.push(input);
    }

    if (inputs.length === 0) {
      return NextResponse.json({ error: "Ningún registro de sueño válido para guardar" }, { status: 400 });
    }

    const logs = batchUpsertSleepLogs(inputs);

    // Persistencia simultánea en Supabase si está activo
    if (isSupabaseConfigured()) {
      for (const l of logs) {
        await upsertSleepToSupabase(l).catch(() => {});
      }
    }

    // Disparar notificación push para el registro de sueño más reciente
    try {
      const { sendSleepRecordedPush } = await import("@/lib/push-notifications");
      const latest = logs.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) {
        await sendSleepRecordedPush(latest);
      }
    } catch (pushErr) {
      console.warn("[Sleep Push] Error notificando sueño por lote:", pushErr);
    }

    return NextResponse.json({ logs, count: logs.length });
  }

  // Registro individual
  const check = validateSleepPayload(body);
  if (!check.valid) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const input: SleepLogInput = { date: body.date };
  for (const field of OPTIONAL_FIELDS) {
    if (field in body) {
      const val = body[field];
      (input as Record<string, unknown>)[field] = val === "" ? null : val;
    }
  }

  const log = upsertSleepLog(input);

  // Persistencia garantizada en Supabase
  if (isSupabaseConfigured()) {
    await upsertSleepToSupabase(log).catch(() => {});
  }

  // Disparar notificación push para el registro de sueño
  try {
    const { sendSleepRecordedPush } = await import("@/lib/push-notifications");
    await sendSleepRecordedPush(log);
  } catch (pushErr) {
    console.warn("[Sleep Push] Error notificando sueño individual:", pushErr);
  }

  return NextResponse.json({ log });
}
