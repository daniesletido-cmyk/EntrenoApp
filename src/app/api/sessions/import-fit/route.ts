import { NextRequest, NextResponse } from "next/server";
import { parseFitBuffer } from "@/lib/fit-import";
import { buildFitFeedback } from "@/lib/fit-feedback";
import { listSessionsForWeek } from "@/lib/repo/sessions";
import { weekStartOf } from "@/lib/dates";

// Sugerencia de intercambio: cuando el deporte leído del .fit no coincide con
// nada pendiente ese mismo día, pero sí estaba planificado (pendiente) en OTRO
// día de la misma semana — señal típica de haber hecho los entrenos en un
// orden distinto al planificado (p. ej. la carrera del jueves se ha hecho hoy,
// lunes, y el gimnasio de hoy se hará el jueves).
export interface SwapSuggestion {
  matchId: number;
  matchDate: string;
  matchDiscipline: string;
  matchPlannedCode: string | null;
  // Sesión pendiente de hoy con la que se intercambiaría la fecha. Si no hay
  // nada pendiente hoy, no hay con qué intercambiar y solo cabe mover matchId
  // a la fecha de hoy.
  todayId: number | null;
  todayDiscipline: string | null;
  todayPlannedCode: string | null;
}

// Solo LEE el archivo y devuelve un resumen + la sesión planificada ese día
// que mejor encaja (si la hay). No escribe nada en la base de datos — el
// propio formulario de Registro se rellena con estos valores para que el
// usuario los revise (y pueda corregir RPE, que un reloj no puede medir)
// antes de guardar con los endpoints normales de sesiones.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".fit")) {
    return NextResponse.json({ error: "El archivo debe tener extensión .fit" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await parseFitBuffer(buffer);

    const weekStart = weekStartOf(summary.date);
    const sessionsThatWeek = listSessionsForWeek(weekStart);
    const candidates = sessionsThatWeek.filter((s) => s.date === summary.date);
    const exactMatch = candidates.find((s) => s.discipline === summary.sport && s.status === "pendiente");
    const sameDayMatch = candidates.find((s) => s.status === "pendiente");

    const swapSuggestions: SwapSuggestion[] = [];
    if (!exactMatch) {
      const elsewhere = sessionsThatWeek.filter(
        (s) => s.date !== summary.date && s.discipline === summary.sport && s.status === "pendiente"
      );
      // Si hay varias sesiones pendientes hoy, solo se ofrece intercambiar con
      // la primera que no sea ya de esta disciplina — con más de una pendiente
      // el mismo día el caso es raro y mejor no adivinar cuál.
      const todayPending = candidates.find((s) => s.status === "pendiente" && s.discipline !== summary.sport);
      for (const match of elsewhere) {
        swapSuggestions.push({
          matchId: match.id,
          matchDate: match.date,
          matchDiscipline: match.discipline,
          matchPlannedCode: match.planned_code,
          todayId: todayPending?.id ?? null,
          todayDiscipline: todayPending?.discipline ?? null,
          todayPlannedCode: todayPending?.planned_code ?? null,
        });
      }
    }

    const feedback = buildFitFeedback(summary);

    return NextResponse.json({
      summary,
      feedback,
      matchedSessionId: exactMatch?.id ?? sameDayMatch?.id ?? null,
      otherSessionsThatDay: candidates.map((s) => ({ id: s.id, discipline: s.discipline, planned_code: s.planned_code, status: s.status })),
      swapSuggestions,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo .fit" }, { status: 400 });
  }
}
