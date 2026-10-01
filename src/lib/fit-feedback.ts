import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { addDays } from "@/lib/dates";
import type { FitSummary, FitZoneDistribution } from "@/lib/fit-import";

export interface FitFeedbackItem {
  tone: "positive" | "neutral" | "warning";
  category?: "objetivo" | "ritmo" | "cardio" | "cadencia" | "estrategia";
  text: string;
}

export interface FitStructuredFeedback {
  summary: string;
  positives: string[];
  deviations: string[];
  targetCompliance?: {
    plannedZone: string;
    plannedRange: string;
    actualPace: string;
    compliancePct: number;
    timeInTargetSec: number;
    timeInTargetFormatted: string;
    verdict: string;
    isCompliant: boolean;
  } | null;
}

export function formatSecondsDetailed(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0m 00s";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
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

  if (text.includes("R2") || text.includes("TEMPO") || text.includes("PROGRESIVO") || text.includes("UMBRAL AERÓBICO") || text.includes("UMBRAL AEROBICO")) {
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
      minPace: 4.166, // 4:10
      maxPace: 4.583, // 4:35
      rangeLabel: "4:35 - 4:10 min/km",
    };
  }

  if (text.includes("R5") || text.includes("SERIES") || text.includes("VAM") || text.includes("INTERVAL")) {
    return {
      code: "R5",
      name: "Series / Intervalos VAM (R5)",
      minPace: 3.5, // < 4:10
      maxPace: 4.166,
      rangeLabel: "< 4:10 min/km",
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

export function buildStructuredFitDiagnostics(summary: FitSummary, targetSession?: SessionRow | null): FitStructuredFeedback {
  const positives: string[] = [];
  const deviations: string[] = [];
  let summaryText = "";

  const zd = summary.deepAnalysis?.zoneDistribution;
  const avgPace = summary.avgPaceMinKm;
  const drift = summary.deepAnalysis?.aerobicDecouplingPct;
  const cad = summary.deepAnalysis?.avgCadence ?? summary.avgCadence;
  const stability = summary.deepAnalysis?.pacingStabilityScore;
  const laps = summary.laps ?? [];

  let targetCompliance: FitStructuredFeedback["targetCompliance"] = null;

  if (summary.sport === "carrera") {
    const target = detectTargetZone(targetSession);

    if (target && avgPace !== null) {
      let compliancePct = 0;
      let timeInTargetSec = 0;

      if (zd) {
        if (target.code === "R1") {
          compliancePct = zd.r1Pct;
          timeInTargetSec = zd.r1TimeSec;
        } else if (target.code === "R2") {
          compliancePct = zd.r2Pct;
          timeInTargetSec = zd.r2TimeSec;
        } else if (target.code === "R4") {
          compliancePct = zd.r3Pct;
          timeInTargetSec = zd.r3TimeSec;
        } else if (target.code === "R5") {
          compliancePct = zd.r5Pct;
          timeInTargetSec = zd.r5TimeSec;
        } else if (target.code === "R0") {
          compliancePct = zd.r0Pct;
          timeInTargetSec = zd.r0TimeSec;
        }
      }

      const isPaceInTarget = avgPace >= target.minPace && avgPace <= target.maxPace;
      const isComplianceGood = compliancePct >= 50 || isPaceInTarget;

      let verdict = "";
      if (isPaceInTarget) {
        verdict = `Ritmo medio clavado en la zona (${formatPace(avgPace)} vs ${target.rangeLabel}).`;
        positives.push(`🎯 **Precisión de Zona**: Ritmo medio ${formatPace(avgPace)} dentro del rango pautado para ${target.name} (${target.rangeLabel}).`);
      } else if (avgPace < target.minPace) {
        const diffSec = Math.round((target.minPace - avgPace) * 60);
        verdict = `Ritmo ${diffSec}s/km más rápido que la zona pautada (${formatPace(avgPace)} vs ${target.rangeLabel}).`;
        if (target.code === "R1" || target.code === "R0") {
          deviations.push(`⚠️ **Desvío a ritmos superiores**: Has rodado a ${formatPace(avgPace)} (~${diffSec}s/km más rápido del rango ${target.rangeLabel}). En sesiones de base/rodaje es vital no apretar para no saturar fibras rápidas ni acumular fatiga innecesaria para el CrossFit o tiradas.`);
        } else {
          positives.push(`⚡ **Ritmo vivo y con solvencia**: ${formatPace(avgPace)} superando el objetivo de ${target.rangeLabel}.`);
        }
      } else {
        verdict = `Ritmo más suave que la pauta (${formatPace(avgPace)} vs ${target.rangeLabel}).`;
        positives.push(`🌱 **Autorregulación inteligente**: Ritmo suave (${formatPace(avgPace)}) protegiendo la musculatura ante fatiga.`);
      }

      targetCompliance = {
        plannedZone: target.name,
        plannedRange: target.rangeLabel,
        actualPace: formatPace(avgPace),
        compliancePct,
        timeInTargetSec,
        timeInTargetFormatted: formatSecondsDetailed(timeInTargetSec),
        verdict,
        isCompliant: isComplianceGood,
      };

      // Si fue rodaje R1 y pasó mucho tiempo en R2 (Zona Gris)
      if (zd && (target.code === "R1" || target.code === "R0") && zd.r2Pct >= 20) {
        deviations.push(`⚠️ **Incursión en Zona Gris (R2: 4:59-4:35 min/km)**: Pasaste ${formatSecondsDetailed(zd.r2TimeSec)} (${zd.r2Pct}% del entreno) en R2. Rodar demasiado rápido en días suaves acumula fatiga sin maximizar la potencia aeróbica.`);
      }
      if (zd && zd.r3Pct + zd.r5Pct >= 15 && target.code === "R1") {
        deviations.push(`⚠️ **Picos de alta intensidad**: Has acumulado ${formatSecondsDetailed(zd.r3TimeSec + zd.r5TimeSec)} en R4/R5 (<4:35 min/km) en un rodaje pautado como aeróbico.`);
      }
    } else if (avgPace !== null) {
      // Sin sesión objetivo explícita
      if (avgPace >= 4.983 && avgPace <= 5.416) {
        positives.push(`🎯 **Desarrollo Aeróbico Puro (R1)**: Ritmo ${formatPace(avgPace)} óptimo para capilarización y quema de lípidos.`);
      } else if (avgPace >= 4.583 && avgPace < 4.983) {
        positives.push(`⚡ **Ritmo Tempo Sólido (R2)**: Ritmo ${formatPace(avgPace)} en rango de tempo y umbral aeróbico.`);
      } else if (avgPace < 4.583) {
        positives.push(`🔥 **Alta Intensidad (R4/R5)**: Ritmo ${formatPace(avgPace)} con gran demanda glucolítica.`);
      }
    }

    // Análisis de Pacing y Splits
    if (laps.length >= 4) {
      const withPace = laps.filter((l) => l.avgPaceMinKm !== null);
      if (withPace.length >= 4) {
        const mid = Math.floor(withPace.length / 2);
        const firstHalf = withPace.slice(0, mid);
        const secondHalf = withPace.slice(mid);
        const avg = (arr: typeof withPace) => arr.reduce((a, b) => a + (b.avgPaceMinKm as number), 0) / arr.length;
        const firstAvg = avg(firstHalf);
        const secondAvg = avg(secondHalf);
        const diffPct = ((secondAvg - firstAvg) / firstAvg) * 100;

        if (diffPct >= 5) {
          deviations.push(`📉 **Split Positivo (+${diffPct.toFixed(0)}%)**: Caída de ritmo en la 2ª mitad (${formatPace(firstAvg)} → ${formatPace(secondAvg)}). Vigila no salir con exceso de ímpetu en los primeros km.`);
        } else if (diffPct <= -2.5) {
          positives.push(`📈 **Split Negativo (${Math.abs(diffPct).toFixed(0)}% más rápido al final)**: Estrategia de carrera impecable (${formatPace(firstAvg)} → ${formatPace(secondAvg)}), acabando con fuerza.`);
        } else {
          positives.push(`⚖️ **Pacing Uniforme**: Ritmo muy homogéneo entre 1ª mitad (${formatPace(firstAvg)}) y 2ª mitad (${formatPace(secondAvg)}).`);
        }
      }
    }

    // Estabilidad de ritmo
    if (stability !== null && stability !== undefined) {
      if (stability >= 85) {
        positives.push(`🎯 **Regularidad de Paso (${stability}/100)**: Ritmo extraordinariamente estable vuelta a vuelta.`);
      } else if (stability < 65) {
        deviations.push(`〰️ **Variabilidad de Ritmo (${stability}/100)**: Tirones y cambios de velocidad marcados entre kilómetros.`);
      }
    }

    // Desacoplamiento Cardiovascular
    if (drift !== null && drift !== undefined) {
      if (drift <= 4.0) {
        positives.push(`💚 **Eficiencia Cardiovascular Óptima (Deriva: ${drift.toFixed(1)}%)**: El pulso se mantuvo totalmente plano respecto al ritmo.`);
      } else if (drift > 6.5) {
        deviations.push(`⚠️ **Deriva Cardíaca Elevada (+${drift.toFixed(1)}%)**: El pulso subió significativamente al final para sostener la misma velocidad (deshidratación, calor o fatiga neuromuscular).`);
      }
    }

    // Cadencia
    if (cad) {
      if (cad >= 170) {
        positives.push(`⚡ **Cadencia Eficiente (${cad} ppm)**: Zancada fluida y reactiva, óptima para proteger tendones y rodillas.`);
      } else if (cad < 160) {
        deviations.push(`💡 **Cadencia Baja (${cad} ppm)**: Intenta acortar el paso y aumentar la frecuencia (~170 ppm) para reducir la carga de impacto en el asfalto.`);
      }
    }

    summaryText = positives.length > 0
      ? `Sesión analizada con ${positives.length} punto(s) fuerte(s) y ${deviations.length} área(s) a optimizar.`
      : "Análisis biomecánico y fisiológico completado.";
  } else if (summary.sport === "crossfit") {
    positives.push(`🔥 Sesión de CrossFit / WOD completada (${summary.durationMin?.toFixed(0)} min). Alta demanda glucolítica y potencia neuromuscular.`);
    if (summary.avgHeartRate && summary.avgHeartRate > 155) {
      positives.push(`❤️ Estímulo cardiovascular alto (FC media ${summary.avgHeartRate} lpm).`);
    }
    summaryText = "Sesión funcional y de alta potencia neuromuscular registrada.";
  } else if (summary.sport === "gimnasio") {
    positives.push(`🏋️ Estímulo de fuerza completado (${summary.durationMin?.toFixed(0)} min). Refuerzo estructural y prevención de lesiones para carrera.`);
    summaryText = "Trabajo de fuerza y solidez musculoesquelética completado.";
  } else if (summary.sport === "natacion") {
    positives.push(`🏊 Natación completada (${summary.distanceKm ? `${summary.distanceKm} km` : `${summary.durationMin} min`}). Gran estímulo cardiovascular con cero impacto articular.`);
    summaryText = "Sesión aeróbica sin impacto articular completada.";
  }

  return {
    summary: summaryText,
    positives,
    deviations,
    targetCompliance,
  };
}

export function buildFitFeedback(summary: FitSummary, targetSession?: SessionRow | null): FitFeedbackItem[] {
  const structured = buildStructuredFitDiagnostics(summary, targetSession);
  const items: FitFeedbackItem[] = [];

  for (const pos of structured.positives) {
    items.push({ tone: "positive", text: pos.replace(/\*\*/g, "") });
  }
  for (const dev of structured.deviations) {
    items.push({ tone: "warning", text: dev.replace(/\*\*/g, "") });
  }

  return items;
}

