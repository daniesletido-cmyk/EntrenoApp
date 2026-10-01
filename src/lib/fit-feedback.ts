import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { addDays } from "@/lib/dates";
import type { FitSummary, FitZoneDistribution } from "@/lib/fit-import";

export interface FitFeedbackItem {
  tone: "positive" | "neutral" | "warning";
  category?: "objetivo" | "ritmo" | "cardio" | "cadencia" | "estrategia";
  text: string;
}

function formatPace(minKm: number): string {
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

interface TargetZoneInfo {
  code: string;
  name: string;
  minPace: number; // min/km más rápido (ej 4.983 = 4:59)
  maxPace: number; // min/km más lento (ej 5.416 = 5:25)
  rangeLabel: string;
}

function detectTargetZone(session?: SessionRow | null): TargetZoneInfo | null {
  if (!session) return null;
  const text = `${session.planned_code ?? ""} ${session.notes ?? ""}`.toUpperCase();

  if (text.includes("R1") || text.includes("RODAJE") || text.includes("BASE AERÓBICA") || text.includes("BASE AEROBICA")) {
    return {
      code: "R1",
      name: "Base Aeróbica (R1)",
      minPace: 4.983, // 4:59
      maxPace: 5.416, // 5:25
      rangeLabel: "5:25 - 4:59 min/km",
    };
  }

  if (text.includes("R2") || text.includes("TEMPO") || text.includes("PROGRESIVO") || text.includes("UMBRAL AERÓBICO")) {
    return {
      code: "R2",
      name: "Tempo Progresivo / Umbral (R2)",
      minPace: 4.583, // 4:35
      maxPace: 4.983, // 4:59
      rangeLabel: "4:59 - 4:35 min/km",
    };
  }

  if (text.includes("R4") || text.includes("RITMO MARATÓN") || text.includes("RITMO MARATON") || text.includes("RMC")) {
    return {
      code: "R4",
      name: "Ritmo Maratón Específico (R4)",
      minPace: 5.0, // 5:00
      maxPace: 5.25, // 5:15
      rangeLabel: "5:15 - 5:00 min/km",
    };
  }

  if (text.includes("R5") || text.includes("TIRADA LARGA") || text.includes("LONG RUN")) {
    return {
      code: "R5",
      name: "Tirada Larga de Volumen (R5)",
      minPace: 5.083, // 5:05
      maxPace: 5.416, // 5:25
      rangeLabel: "5:25 - 5:05 min/km",
    };
  }

  if (text.includes("R0") || text.includes("REGENERATIVO") || text.includes("RECUPERACIÓN") || text.includes("SUAVE")) {
    return {
      code: "R0",
      name: "Regenerativo / Suave (R0)",
      minPace: 5.416, // > 5:25
      maxPace: 6.5,
      rangeLabel: "> 5:25 min/km",
    };
  }

  return null;
}

export function buildFitFeedback(summary: FitSummary, targetSession?: SessionRow | null): FitFeedbackItem[] {
  const feedback: FitFeedbackItem[] = [];

  // =========================================================================
  // 1. ANÁLISIS PROFUNDO DE ZONA OBJETIVO (CARRERA)
  // =========================================================================
  if (summary.sport === "carrera" && summary.avgPaceMinKm !== null) {
    const target = detectTargetZone(targetSession);
    const avgPace = summary.avgPaceMinKm;
    const zd = summary.deepAnalysis?.zoneDistribution;

    if (target) {
      if (zd) {
        // Asignar nombres y veredictos a la distribución de zonas
        let compliancePct = 0;
        if (target.code === "R1") compliancePct = zd.r1Pct;
        else if (target.code === "R2") compliancePct = zd.r2Pct;
        else if (target.code === "R4" || target.code === "R3") compliancePct = zd.r3Pct;
        else if (target.code === "R5") compliancePct = zd.r1Pct + zd.r0Pct;
        else if (target.code === "R0") compliancePct = zd.r0Pct;

        zd.targetZoneName = target.name;
        zd.targetCompliancePct = compliancePct;
      }

      // Evaluación del ritmo medio vs objetivo
      if (avgPace >= target.minPace && avgPace <= target.maxPace) {
        feedback.push({
          tone: "positive",
          category: "objetivo",
          text: `🎯 ¡Objetivo de zona cumplido con precisión! Has promediado ${formatPace(avgPace)}, clavado dentro del rango pautado para ${target.name} (${target.rangeLabel}).`,
        });
      } else if (avgPace < target.minPace) {
        // Corrió más rápido que lo pautado
        const diffSec = Math.round((target.minPace - avgPace) * 60);
        if (target.code === "R1" || target.code === "R0" || target.code === "R5") {
          feedback.push({
            tone: "warning",
            category: "objetivo",
            text: `⚠️ Ritmo más rápido de lo pautado (${formatPace(avgPace)} vs objetivo ${target.rangeLabel}, ~${diffSec}s/km por encima). En sesiones de base/rodaje suave es crucial no forzar para favorecer la biogénesis mitocondrial y no acumular fatiga para el CrossFit o tiradas de calidad.`,
          });
        } else {
          feedback.push({
            tone: "positive",
            category: "objetivo",
            text: `⚡ Ritmo fuerte y con solvencia (${formatPace(avgPace)} vs objetivo ${target.rangeLabel}). Muy buenas sensaciones de ritmo tempo.`,
          });
        }
      } else {
        // Corrió más lento que lo pautado
        feedback.push({
          tone: "neutral",
          category: "objetivo",
          text: `🌱 Ritmo relajado (${formatPace(avgPace)} vs objetivo ${target.rangeLabel}). Si sentías piernas cargadas o fatiga previa, es una decisión muy inteligente de autorregulación.`,
        });
      }
    } else {
      // Si no hay sesión objetivo emparejada, dar lectura según zonas VAM (3:59 VAM)
      if (avgPace >= 4.983 && avgPace <= 5.416) {
        feedback.push({
          tone: "positive",
          category: "ritmo",
          text: `🎯 Ritmo medio ${formatPace(avgPace)} — En plena Zona R1 (Base Aeróbica · 5:25 a 4:59 min/km). Trabajo fisiológico ideal de desarrollo aeróbico.`,
        });
      } else if (avgPace >= 4.583 && avgPace < 4.983) {
        feedback.push({
          tone: "positive",
          category: "ritmo",
          text: `⚡ Ritmo medio ${formatPace(avgPace)} — En Zona R2 (Tempo / Umbral Aeróbico · 4:59 a 4:35 min/km). Excelente estímulo de resistencia a ritmo vivo.`,
        });
      } else if (avgPace < 4.583) {
        feedback.push({
          tone: "positive",
          category: "ritmo",
          text: `🔥 Ritmo medio ${formatPace(avgPace)} — En Zona R3/R4 (Alta intensidad / Umbral · < 4:35 min/km). Gran demanda metabólica.`,
        });
      } else {
        feedback.push({
          tone: "neutral",
          category: "ritmo",
          text: `🌱 Ritmo medio ${formatPace(avgPace)} — En Zona R0 (Regenerativo · > 5:25 min/km). Excelente descarga y recuperación activa.`,
        });
      }
    }

    // Comparación contra el histórico reciente del propio atleta
    const from = addDays(summary.date, -56);
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
          category: "ritmo",
          text: `📈 Ritmo un ${Math.abs(diffPct).toFixed(0)}% más rápido que tu media histórica reciente (${formatPace(avgHistoricalPace)}). Tu economía de carrera está progresando.`,
        });
      }
    }
  }

  // =========================================================================
  // 2. GESTIÓN DEL PACING Y SPLITS (Vueltas)
  // =========================================================================
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
          category: "estrategia",
          text: `📉 Split positivo (+${diffPct.toFixed(0)}%): la 2ª mitad fue más lenta (${formatPace(firstAvg)} → ${formatPace(secondAvg)}). Típico de salida algo impetuosa o fatiga muscular al final.`,
        });
      } else if (diffPct <= -3) {
        feedback.push({
          tone: "positive",
          category: "estrategia",
          text: `📈 Split negativo (${Math.abs(diffPct).toFixed(0)}% más rápido al final): gestión de carrera impecable (${formatPace(firstAvg)} → ${formatPace(secondAvg)}), terminando fuerte y entero.`,
        });
      } else {
        feedback.push({
          tone: "positive",
          category: "estrategia",
          text: `⚖️ Pacing muy uniforme: ritmo casi idéntico entre la 1ª mitad (${formatPace(firstAvg)}) y la 2ª mitad (${formatPace(secondAvg)}). Gran control de esfuerzo.`,
        });
      }
    }
  }

  // =========================================================================
  // 3. DESACOPLAMIENTO CARDIOVASCULAR (Aerobic Drift)
  // =========================================================================
  if (summary.deepAnalysis?.aerobicDecouplingPct !== null && summary.deepAnalysis?.aerobicDecouplingPct !== undefined) {
    const drift = summary.deepAnalysis.aerobicDecouplingPct;
    if (drift <= 4.0) {
      feedback.push({
        tone: "positive",
        category: "cardio",
        text: `💚 Eficiencia cardiovascular óptima (Deriva: ${drift.toFixed(1)}%): el pulso se mantuvo totalmente estable respecto al ritmo a lo largo de todo el entreno.`,
      });
    } else if (drift > 7.0) {
      feedback.push({
        tone: "warning",
        category: "cardio",
        text: `⚠️ Desacoplamiento cardiovascular del ${drift.toFixed(1)}%: El pulso se elevó en el tramo final para sostener la misma velocidad (posible deshidratación, calor o fatiga muscular acumulada).`,
      });
    }
  }

  // =========================================================================
  // 4. BIOMECÁNICA Y CADENCIA
  // =========================================================================
  if (summary.deepAnalysis?.avgCadence) {
    const cad = summary.deepAnalysis.avgCadence;
    if (cad >= 170) {
      feedback.push({
        tone: "positive",
        category: "cadencia",
        text: `⚡ Cadencia media de ${cad} ppm: zancada fluida y reactiva, que minimiza el tiempo de contacto y protege las rodillas.`,
      });
    } else if (cad < 160) {
      feedback.push({
        tone: "neutral",
        category: "cadencia",
        text: `💡 Cadencia media de ${cad} ppm: busca progresivamente dar pasos un poco más cortos y frecuentes (~170 ppm) para reducir el impacto articular.`,
      });
    }
  }

  // =========================================================================
  // 5. CROSSFIT / GIMNASIO / NATACIÓN
  // =========================================================================
  if (summary.sport === "crossfit") {
    feedback.push({
      tone: "positive",
      category: "objetivo",
      text: `🔥 Sesión de CrossFit / WOD registrada (${summary.durationMin?.toFixed(0)} min${summary.avgHeartRate ? `, FC media ${summary.avgHeartRate} lpm` : ""}). Alta demanda metabólica y de potencia neuromuscular.`,
    });
  } else if (summary.sport === "gimnasio") {
    feedback.push({
      tone: "positive",
      category: "objetivo",
      text: `🏋️ Estímulo de fuerza registrado (${summary.durationMin?.toFixed(0)} min). Trabajo de hipertrofia y solidez musculoesquelética para soportar el impacto de carrera.`,
    });
  } else if (summary.sport === "natacion") {
    feedback.push({
      tone: "positive",
      category: "objetivo",
      text: `🏊 Natación completada (${summary.distanceKm ? `${summary.distanceKm} km` : `${summary.durationMin} min`}). Excelente estímulo aeróbico con impacto cero en articulaciones.`,
    });
  }

  return feedback;
}
