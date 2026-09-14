import { listSessionsBetween } from "@/lib/repo/sessions";
import { addDays } from "@/lib/dates";
import type { FitSummary } from "@/lib/fit-import";

export interface FitFeedbackItem {
  tone: "positive" | "neutral" | "warning";
  text: string;
}

function formatPace(minKm: number): string {
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

// Compara la sesión importada contra tu propio histórico reciente (mismo
// tipo de disciplina) — nunca contra tablas genéricas ni cifras inventadas.
// Si no hay histórico suficiente, simplemente no se dice nada sobre eso.
export function buildFitFeedback(summary: FitSummary): FitFeedbackItem[] {
  const feedback: FitFeedbackItem[] = [];

  if (summary.sport === "carrera" && summary.avgPaceMinKm !== null) {
    const from = addDays(summary.date, -56); // últimas ~8 semanas
    const to = addDays(summary.date, -1);
    const history = listSessionsBetween(from, to).filter(
      (s) =>
        s.discipline === "carrera" &&
        (s.status === "realizada" || s.status === "parcial") &&
        s.distance_km &&
        s.distance_km > 0 &&
        s.duration_min &&
        s.duration_min > 0
    );
    if (history.length >= 3) {
      const paces = history.map((s) => (s.duration_min as number) / (s.distance_km as number));
      const avgHistoricalPace = paces.reduce((a, b) => a + b, 0) / paces.length;
      const diffPct = ((summary.avgPaceMinKm - avgHistoricalPace) / avgHistoricalPace) * 100;
      if (diffPct <= -4) {
        feedback.push({
          tone: "positive",
          text: `Ritmo medio ${formatPace(summary.avgPaceMinKm)} — un ${Math.abs(diffPct).toFixed(0)}% más rápido que tu media de las últimas semanas (${formatPace(avgHistoricalPace)}).`,
        });
      } else if (diffPct >= 6) {
        feedback.push({
          tone: "warning",
          text: `Ritmo medio ${formatPace(summary.avgPaceMinKm)} — bastante más lento (${diffPct.toFixed(0)}%) que tu media reciente (${formatPace(avgHistoricalPace)}). Puede ser normal (rodaje suave, calor, fatiga) pero merece la pena vigilarlo si se repite.`,
        });
      } else {
        feedback.push({
          tone: "neutral",
          text: `Ritmo medio ${formatPace(summary.avgPaceMinKm)}, en línea con tu media reciente (${formatPace(avgHistoricalPace)}).`,
        });
      }
    }
  }

  if (summary.laps.length >= 4) {
    const withPace = summary.laps.filter((l) => l.avgPaceMinKm !== null);
    if (withPace.length >= 4) {
      const mid = Math.floor(withPace.length / 2);
      const firstHalf = withPace.slice(0, mid);
      const secondHalf = withPace.slice(mid);
      const avg = (arr: typeof withPace) => arr.reduce((a, b) => a + (b.avgPaceMinKm as number), 0) / arr.length;
      const firstAvg = avg(firstHalf);
      const secondAvg = avg(secondHalf);
      const diffPct = ((secondAvg - firstAvg) / firstAvg) * 100;
      if (diffPct >= 5) {
        feedback.push({
          tone: "warning",
          text: `Split positivo: la segunda mitad fue un ${diffPct.toFixed(0)}% más lenta que la primera (${formatPace(firstAvg)} → ${formatPace(secondAvg)}) — típico de haber salido fuerte o de fatiga acumulada hacia el final.`,
        });
      } else if (diffPct <= -3) {
        feedback.push({
          tone: "positive",
          text: `Split negativo: la segunda mitad fue más rápida que la primera (${formatPace(firstAvg)} → ${formatPace(secondAvg)}) — buena gestión del ritmo.`,
        });
      }
    }
  }

  if (summary.avgHeartRate !== null) {
    feedback.push({
      tone: "neutral",
      text: `FC media ${summary.avgHeartRate} lpm${summary.maxHeartRate ? ` (máx ${summary.maxHeartRate})` : ""} — solo informativo, sigues entrenando por ritmo/RPE, no por pulso.`,
    });
  }

  return feedback;
}
