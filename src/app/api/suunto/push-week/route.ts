import { NextRequest, NextResponse } from "next/server";
import { listSessionsBetween } from "@/lib/repo/sessions";
import { pushSessionToSuunto, purgePreviousSuuntoWorkouts } from "@/lib/suunto-cloud";
import { todayISO, addDays } from "@/lib/dates";
import { flushDbPersistence, refreshDbFromBlobIfNewer } from "@/lib/db";

export async function POST(req: NextRequest) {
  await refreshDbFromBlobIfNewer();
  let fromDate = todayISO();
  let toDate = addDays(fromDate, 6);
  let skipPurge = false;

  try {
    const body = await req.json();
    if (body?.from) fromDate = String(body.from);
    if (body?.to) toDate = String(body.to);
    if (body?.skipPurge === true) skipPurge = true;
  } catch {}

  // PASO 1: PURGA PREVIA OBLIGATORIA
  // Antes de subir la nueva semana, purgar todos los entrenamientos anteriores en Suunto
  let purgedCount = 0;
  if (!skipPurge) {
    try {
      const purgeRes = await purgePreviousSuuntoWorkouts({ fromDate, toDate });
      purgedCount = purgeRes.deletedCount;
    } catch (err) {
      console.warn("[Suunto Push-Week] Error en purga previa:", err);
    }
  }

  // PASO 2: SUBIDA LIMPIA DE LA NUEVA SEMANA
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
    purgedCount,
    pushedCount,
    errorCount,
    results,
    message:
      pushedCount > 0
        ? `Semana nueva enviada sin solapamientos (${pushedCount} sesiones).`
        : errorCount > 0
        ? results[0]?.message || "No se pudieron sincronizar los entrenamientos con Suunto."
        : "No hay entrenamientos pendientes próximos para enviar.",
  });
}
