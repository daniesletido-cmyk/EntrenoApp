import { NextRequest, NextResponse } from "next/server";
import { listSessionsBetween } from "@/lib/repo/sessions";
import { pushSessionToSuunto } from "@/lib/suunto-cloud";
import { todayISO, addDays } from "@/lib/dates";
import { flushDbPersistence, refreshDbFromBlobIfNewer } from "@/lib/db";

export async function POST(req: NextRequest) {
  await refreshDbFromBlobIfNewer();
  let fromDate = todayISO();
  let toDate = addDays(fromDate, 6);

  try {
    const body = await req.json();
    if (body?.from) fromDate = String(body.from);
    if (body?.to) toDate = String(body.to);
  } catch {}

  const sessions = listSessionsBetween(fromDate, toDate).filter(
    (s) => s.discipline !== "descanso" && s.status === "pendiente"
  );

  const results = [];
  let pushedCount = 0;
  let errorCount = 0;

  for (const s of sessions) {
    const res = await pushSessionToSuunto(s.id);
    results.push({ date: s.date, name: s.planned_code, ...res });
    if (res.success) pushedCount++;
    else errorCount++;
  }

  await flushDbPersistence();

  return NextResponse.json({
    success: errorCount === 0,
    pushedCount,
    errorCount,
    results,
    message:
      pushedCount > 0
        ? `Sincronizados ${pushedCount} entrenamiento(s) planificados con tu reloj Suunto.`
        : errorCount > 0
        ? results[0]?.message || "No se pudieron sincronizar los entrenamientos con Suunto."
        : "No hay entrenamientos pendientes próximos para enviar.",
  });
}
