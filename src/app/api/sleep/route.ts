import { NextRequest, NextResponse } from "next/server";
import { upsertSleepLog, batchUpsertSleepLogs, listSleepBetween, SleepLogInput } from "@/lib/repo/sleep";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from y to son obligatorios" }, { status: 400 });
  return NextResponse.json({ logs: listSleepBetween(from, to) });
}

const OPTIONAL_FIELDS = ["hours", "quality", "notes", "score", "deep_min", "light_min", "rem_min", "awake_min", "source"] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Soporte para importación por lotes (batch) en una sola transacción
  if (Array.isArray(body.logs)) {
    const inputs: SleepLogInput[] = [];
    for (const item of body.logs) {
      if (!item.date) continue;
      const input: SleepLogInput = { date: item.date };
      for (const field of OPTIONAL_FIELDS) {
        if (field in item) (input as Record<string, unknown>)[field] = item[field];
      }
      inputs.push(input);
    }
    const logs = batchUpsertSleepLogs(inputs);
    return NextResponse.json({ logs, count: logs.length });
  }

  if (!body.date) return NextResponse.json({ error: "date es obligatorio" }, { status: 400 });

  const input: SleepLogInput = { date: body.date };
  for (const field of OPTIONAL_FIELDS) {
    if (field in body) (input as Record<string, unknown>)[field] = body[field];
  }

  const log = upsertSleepLog(input);
  return NextResponse.json({ log });
}
