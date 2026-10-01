import { NextRequest, NextResponse } from "next/server";
import { parseFitBuffer } from "@/lib/fit-import";
import { buildFitFeedback } from "@/lib/fit-feedback";
import { listSessionsForWeek } from "@/lib/repo/sessions";
import { weekStartOf } from "@/lib/dates";

export interface SwapSuggestion {
  matchId: number;
  matchDate: string;
  matchDiscipline: string;
  matchPlannedCode: string | null;
  todayId: number | null;
  todayDiscipline: string | null;
  todayPlannedCode: string | null;
}

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

    // Puntuación para elegir la sesión adecuada cuando hay varias en el mismo día:
    // 1. Coincidencia exacta de disciplina: +100
    // 2. Crossfit vs Gimnasio (ambas son fuerza/box): +80
    // 3. Sesión pendiente (frente a ya realizada/cancelada): +50
    // 4. Coincidencia de código o nombre con la actividad del .fit: +35
    // 5. Tirada larga con distancia acorde: +15
    const scoredCandidates = candidates.map((s) => {
      let score = 0;
      if (s.discipline === summary.sport) {
        score += 100;
      } else if (
        (summary.sport === "crossfit" && s.discipline === "gimnasio") ||
        (summary.sport === "gimnasio" && s.discipline === "crossfit")
      ) {
        score += 80;
      } else if (summary.sport === "otro" && s.discipline === "otro") {
        score += 50;
      }

      if (s.status === "pendiente") score += 50;
      else if (s.status === "parcial") score += 20;

      if (s.planned_code) {
        const code = s.planned_code.toLowerCase();
        const act = summary.activityName.toLowerCase();
        if (act.includes(code) || code.includes(act)) score += 35;
      }

      if (summary.sport === "carrera" && s.is_long_run && (summary.distanceKm ?? 0) >= 10) {
        score += 15;
      }

      return { session: s, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestMatch =
      scoredCandidates[0]?.score && scoredCandidates[0].score >= 50 ? scoredCandidates[0].session : null;

    const swapSuggestions: SwapSuggestion[] = [];
    if (!bestMatch || (bestMatch.discipline !== summary.sport && !(summary.sport === "crossfit" && bestMatch.discipline === "gimnasio"))) {
      const elsewhere = sessionsThatWeek.filter(
        (s) =>
          s.date !== summary.date &&
          (s.discipline === summary.sport || (summary.sport === "crossfit" && s.discipline === "gimnasio")) &&
          s.status === "pendiente"
      );
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

    const feedback = buildFitFeedback(summary, bestMatch);

    return NextResponse.json({
      summary,
      feedback,
      matchedSessionId: bestMatch?.id ?? null,
      suggestedActivityName: bestMatch?.planned_code || summary.activityName,
      otherSessionsThatDay: candidates.map((s) => ({
        id: s.id,
        discipline: s.discipline,
        planned_code: s.planned_code,
        status: s.status,
        is_long_run: s.is_long_run,
        isDisciplineMatch:
          s.discipline === summary.sport ||
          (summary.sport === "crossfit" && s.discipline === "gimnasio") ||
          (summary.sport === "gimnasio" && s.discipline === "crossfit"),
      })),
      swapSuggestions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo procesar el archivo .fit" },
      { status: 400 }
    );
  }
}
