import { SessionRow } from "@/lib/repo/sessions";
import type { FitSummary, FitZoneDistribution, FitHrZoneDistribution } from "@/lib/fit-import";

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
  const hrZ = summary.deepAnalysis?.hrZoneDistribution;
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

      if (zd && (target.code === "R1" || target.code === "R0") && zd.r2Pct >= 20) {
        deviations.push(`⚠️ **Incursión en Zona Gris (R2: 4:59-4:35 min/km)**: Pasaste ${formatSecondsDetailed(zd.r2TimeSec)} (${zd.r2Pct}% del entreno) en R2. Rodar demasiado rápido en días suaves acumula fatiga sin maximizar la potencia aeróbica.`);
      }
      if (zd && zd.r3Pct + zd.r5Pct >= 15 && target.code === "R1") {
        deviations.push(`⚠️ **Picos de alta intensidad**: Has acumulado ${formatSecondsDetailed(zd.r3TimeSec + zd.r5TimeSec)} en R4/R5 (<4:35 min/km) en un rodaje pautado como aeróbico.`);
      }
    } else if (avgPace !== null) {
      if (avgPace >= 4.983 && avgPace <= 5.416) {
        positives.push(`🎯 **Desarrollo Aeróbico Puro (R1)**: Ritmo ${formatPace(avgPace)} óptimo para capilarización y quema de lípidos.`);
      } else if (avgPace >= 4.583 && avgPace < 4.983) {
        positives.push(`⚡ **Ritmo Tempo Sólido (R2)**: Ritmo ${formatPace(avgPace)} en rango de tempo y umbral aeróbico.`);
      } else if (avgPace < 4.583) {
        positives.push(`🔥 **Alta Intensidad (R4/R5)**: Ritmo ${formatPace(avgPace)} con gran demanda glucolítica.`);
      }
    }

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

    if (stability !== null && stability !== undefined) {
      if (stability >= 85) {
        positives.push(`🎯 **Regularidad de Paso (${stability}/100)**: Ritmo extraordinariamente estable vuelta a vuelta.`);
      } else if (stability < 65) {
        deviations.push(`〰️ **Variabilidad de Ritmo (${stability}/100)**: Tirones y cambios de velocidad marcados entre kilómetros.`);
      }
    }

    if (drift !== null && drift !== undefined) {
      if (drift <= 4.0) {
        positives.push(`💚 **Eficiencia Cardiovascular Óptima (Deriva: ${drift.toFixed(1)}%)**: El pulso se mantuvo totalmente plano respecto al ritmo.`);
      } else if (drift > 6.5) {
        deviations.push(`⚠️ **Deriva Cardíaca Elevada (+${drift.toFixed(1)}%)**: El pulso subió significativamente al final para sostener la misma velocidad (deshidratación, calor o fatiga neuromuscular).`);
      }
    }

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
  } else if (summary.sport === "caminata") {
    positives.push(`🚶 **Caminata / Senderismo**: ${summary.distanceKm ? `${summary.distanceKm} km` : `${summary.durationMin} min`} de activación aeróbica continua.`);
    positives.push(`🌱 **Regeneración Activa sin Impacto**: Estímulo ideal para favorecer el drenaje linfático, aclarado de metabolitos y recuperación osteoarticular.`);
    if (summary.elevationGainM && summary.elevationGainM > 50) {
      positives.push(`⛰️ **Desnivel Positivo (+${summary.elevationGainM} m)**: Activación de glúteos, gemelos e isquiosurales en pendientes.`);
    }
    if (summary.avgHeartRate) {
      positives.push(`❤️ **Control Cardiovascular**: FC media contenida en ${summary.avgHeartRate} lpm.`);
    }
    summaryText = "Sesión de marcha/senderismo completada con estímulo regenerativo.";
  } else if (summary.sport === "natacion") {
    const swim = summary.deepAnalysis?.swimmingMetrics;
    const paceStr = swim?.pacePer100mFormatted ? ` a ${swim.pacePer100mFormatted}` : "";
    positives.push(`🏊 **Natación**: ${summary.distanceKm ? `${Math.round(summary.distanceKm * 1000)} m` : `${summary.durationMin} min`}${paceStr}.`);
    positives.push(`💧 **Cero Impacto Articular**: Descarga total de la columna vertebral, cadera y rodillas, facilitando la descompresión tras entrenamientos de carrera.`);
    if (swim?.avgSwolf) {
      positives.push(`🎯 **Eficiencia SWOLF (${swim.avgSwolf})**: ${swim.avgSwolf < 40 ? "Excelente economía de nado y deslizamiento hidrodinámico." : "Buen control técnico de brazada."}`);
    }
    if (swim?.avgStrokeRate) {
      positives.push(`⚡ **Cadencia de Brazada (${swim.avgStrokeRate} brazadas/min)**: Frecuencia de tracción fluida.`);
    }
    summaryText = "Sesión acuática completada con óptimo estímulo cardiopulmonar y descompresión articular.";
  } else if (summary.sport === "ciclismo") {
    const cyc = summary.deepAnalysis?.cyclingMetrics;
    const speedStr = cyc?.avgSpeedKmh ?? summary.avgSpeedKmh;
    positives.push(`🚴 **Ciclismo**: ${summary.distanceKm ? `${summary.distanceKm} km` : `${summary.durationMin} min`}${speedStr ? ` a ${speedStr} km/h de media` : ""}.`);
    positives.push(`⚡ **Trabajo Aeróbico Concéntrico**: Gran desarrollo de potencia mitocondrial en cuádriceps sin daño muscular excéntrico.`);
    if (summary.avgCadence) {
      positives.push(`🔄 **Cadencia de Pedaleo (${summary.avgCadence} rpm)**: ${summary.avgCadence >= 80 ? "Frecuencia ágil que protege la articulación patelofemoral." : "Ritmo de pedaleo con mayor demanda de fuerza muscular."}`);
    }
    if (cyc?.avgPowerWatts) {
      positives.push(`⚡ **Potencia Media (${cyc.avgPowerWatts} W)**: Vataje medio sostenido con potencia normalizada ${cyc.normalizedPowerWatts ? `${cyc.normalizedPowerWatts} W` : ""}.`);
    }
    if (summary.elevationGainM && summary.elevationGainM > 50) {
      positives.push(`⛰️ **Desnivel Acumulado (+${summary.elevationGainM} m)**: Trabajo de fuerza-resistencia en subidas.`);
    }
    summaryText = "Sesión ciclista completada con solidez cardiovascular.";
  } else if (summary.sport === "crossfit") {
    positives.push(`🔥 **CrossFit / WOD**: ${summary.durationMin?.toFixed(0)} min de alta potencia y densidad neuromuscular.`);
    if (summary.avgHeartRate && summary.avgHeartRate > 155) {
      positives.push(`❤️ **Gran Demanda Cardiorrespiratoria**: FC media ${summary.avgHeartRate} lpm ${summary.maxHeartRate ? `con pico máximo en ${summary.maxHeartRate} lpm` : ""}.`);
    }
    if (hrZ && hrZ.z4Pct + hrZ.z5Pct >= 25) {
      positives.push(`⚡ **Zona Glucolítica Alta**: ${formatSecondsDetailed(hrZ.z4Sec + hrZ.z5Sec)} (${hrZ.z4Pct + hrZ.z5Pct}% del tiempo) en Z4/Z5.`);
    }
    summaryText = "WOD completado con alta respuesta metabólica y neuromuscular.";
  } else if (summary.sport === "gimnasio") {
    positives.push(`🏋️ **Fuerza y Rendimiento Estructural**: ${summary.durationMin?.toFixed(0)} min de trabajo muscular.`);
    positives.push(`🛡️ **Prevención de Lesiones y Densidad Tendinosa**: Refuerzo de cadenas cinéticas para soportar la carga biomecánica.`);
    if (summary.avgHeartRate) {
      positives.push(`❤️ **Perfil Cardíaco Intermitente**: FC media ${summary.avgHeartRate} lpm con picos controlados en series.`);
    }
    summaryText = "Entrenamiento de fuerza y solidez musculoesquelética registrado.";
  } else if (summary.sport === "remo") {
    positives.push(`🚣 **Remo / Ergómetro**: ${summary.distanceKm ? `${summary.distanceKm} km` : `${summary.durationMin} min`} de tracción global.`);
    positives.push(`💪 **Cadena Posterior y Capacidad Pulmonar**: Reclutamiento coordinado de glúteos, isquios, dorsales y core.`);
    summaryText = "Sesión de remo completada con transferencia metabólica integral.";
  } else {
    positives.push(`⏱️ **Actividad Registrada**: ${summary.activityName} (${summary.durationMin?.toFixed(0)} min).`);
    if (summary.avgHeartRate) {
      positives.push(`❤️ **FC Media**: ${summary.avgHeartRate} lpm.`);
    }
    if (summary.calories) {
      positives.push(`🔥 **Gasto Calórico**: ${summary.calories} kcal.`);
    }
    summaryText = "Actividad completada y registrada en el sistema.";
  }

  return {
    summary: summaryText,
    positives,
    deviations,
    targetCompliance,
  };
}

export function buildPlannedZoneDistribution(session: SessionRow): FitZoneDistribution | null {
  if (session.discipline !== "carrera") return null;
  const target = detectTargetZone(session);
  const totalMin = session.duration_min ?? 45;
  const totalSec = totalMin * 60;

  let r0Sec = 0;
  let r1Sec = 0;
  let r2Sec = 0;
  let r3Sec = 0;
  let r5Sec = 0;

  if (target?.code === "R1") {
    r0Sec = Math.min(600, totalSec * 0.2);
    r1Sec = totalSec - r0Sec;
  } else if (target?.code === "R2") {
    r0Sec = totalSec * 0.15;
    r1Sec = totalSec * 0.25;
    r2Sec = totalSec * 0.60;
  } else if (target?.code === "R4") {
    r0Sec = totalSec * 0.15;
    r1Sec = totalSec * 0.20;
    r3Sec = totalSec * 0.65;
  } else if (target?.code === "R5") {
    r0Sec = totalSec * 0.25;
    r1Sec = totalSec * 0.25;
    r5Sec = totalSec * 0.50;
  } else {
    r0Sec = totalSec * 0.85;
    r1Sec = totalSec * 0.15;
  }

  const r0Pct = Math.round((r0Sec / totalSec) * 100);
  const r1Pct = Math.round((r1Sec / totalSec) * 100);
  const r2Pct = Math.round((r2Sec / totalSec) * 100);
  const r3Pct = Math.round((r3Sec / totalSec) * 100);
  const r5Pct = Math.round((r5Sec / totalSec) * 100);

  return {
    r0Pct,
    r1Pct,
    r2Pct,
    r3Pct,
    r5Pct,
    r0TimeSec: Math.round(r0Sec),
    r1TimeSec: Math.round(r1Sec),
    r2TimeSec: Math.round(r2Sec),
    r3TimeSec: Math.round(r3Sec),
    r5TimeSec: Math.round(r5Sec),
    targetZoneName: target?.name ?? "Base Aeróbica (R1)",
    targetCompliancePct: 100,
    complianceVerdict: "Pauta planificada según VAM de 3:59 min/km",
    complianceTone: "positive",
  };
}

export function buildPlannedLaps(session: SessionRow): any[] {
  if (session.discipline !== "carrera") return [];
  const distanceKm = session.distance_km ?? 8;
  const durationMin = session.duration_min ?? 45;
  const totalLaps = Math.max(1, Math.round(distanceKm));
  const avgPace = durationMin / distanceKm;
  const target = detectTargetZone(session);

  let baseHr = 146;
  const notesMatch = (session.notes ?? "").match(/FC media\s*(\d+)\s*lpm/i) ?? (session.notes ?? "").match(/(\d+)\s*lpm/i);
  if (notesMatch && Number(notesMatch[1]) > 50 && Number(notesMatch[1]) < 220) {
    baseHr = Number(notesMatch[1]);
  } else if (target?.code === "R1") {
    baseHr = 146;
  } else if (target?.code === "R2") {
    baseHr = 162;
  } else if (target?.code === "R4") {
    baseHr = 172;
  } else if (target?.code === "R5") {
    baseHr = 182;
  } else {
    baseHr = 135;
  }

  const laps = [];
  for (let i = 1; i <= totalLaps; i++) {
    let lapPace = avgPace;
    if (i === 1) lapPace = avgPace * 1.05;
    else if (i === totalLaps) lapPace = avgPace * 1.02;
    else if (target?.code === "R2" && i >= Math.floor(totalLaps / 2)) lapPace = avgPace * 0.96;
    else lapPace = avgPace * 0.99;

    const progress = totalLaps > 1 ? (i - 1) / (totalLaps - 1) : 0.5;
    const driftFactor = 0.88 + progress * 0.15;
    const lapHr = Math.round(baseHr * driftFactor);

    laps.push({
      index: i,
      distanceKm: 1.0,
      durationMin: Number(lapPace.toFixed(2)),
      avgPaceMinKm: Number(lapPace.toFixed(2)),
      avgHeartRate: lapHr,
      maxHeartRate: Math.round(lapHr + 6),
      avgCadence: 172 + (i % 2 === 0 ? 1 : -1),
    });
  }
  return laps;
}

export function buildUnifiedSessionDiagnostics(
  session: SessionRow,
  fitSummary?: FitSummary | null
): {
  structuredFeedback: FitStructuredFeedback;
  zoneDistribution: FitZoneDistribution | null;
  hrZoneDistribution: FitHrZoneDistribution | null;
  laps: any[];
  isRealFit: boolean;
} {
  if (fitSummary && fitSummary.sport) {
    const structured = buildStructuredFitDiagnostics(fitSummary, session);
    return {
      structuredFeedback: structured,
      zoneDistribution: fitSummary.deepAnalysis?.zoneDistribution ?? null,
      hrZoneDistribution: fitSummary.deepAnalysis?.hrZoneDistribution ?? null,
      laps: fitSummary.laps ?? [],
      isRealFit: true,
    };
  }

  const target = detectTargetZone(session);
  const plannedZones = buildPlannedZoneDistribution(session);
  const plannedLaps = buildPlannedLaps(session);
  const positives: string[] = [];
  const deviations: string[] = [];

  const avgPace = session.distance_km && session.duration_min ? session.duration_min / session.distance_km : null;

  if (session.discipline === "carrera") {
    if (target) {
      positives.push(`🎯 **Pauta de Zona Objetivo**: ${target.name} con rango de ritmo pautado entre **${target.rangeLabel}** (según tu VAM de 3:59 min/km).`);
      positives.push(`⚡ **Estrategia de Cadencia**: Busca mantener 170-175 ppm fluidas para minimizar el tiempo de contacto y proteger las rodillas.`);
      positives.push(`💚 **Enfoque Fisiológico**: Desarrollo aeróbico y densidad mitocondrial sin generar acidez láctica para llegar fresco al CrossFit.`);
      
      if (avgPace) {
        if (avgPace >= target.minPace && avgPace <= target.maxPace) {
          positives.push(`✅ **Ritmo Registrado en Rango**: Has promediado ${formatPace(avgPace)}, dentro del objetivo ${target.rangeLabel}.`);
        } else if (avgPace < target.minPace) {
          const diffSec = Math.round((target.minPace - avgPace) * 60);
          deviations.push(`⚠️ **Ritmo más rápido de la pauta**: Has rodado a ${formatPace(avgPace)} (~${diffSec}s/km más vivo que ${target.rangeLabel}). Vigila no entrar en Zona Gris para asimilar bien la carga semanal.`);
        }
      }
    } else {
      positives.push(`🏃 **Sesión de Carrera**: Trabajo aeróbico continuo y desarrollo de resistencia.`);
    }
  } else if (session.discipline === "crossfit") {
    positives.push(`🔥 **CrossFit / Box WOD**: Alta demanda glucolítica y potencia neuromuscular.`);
    positives.push(`💡 **Estrategia**: Pacing en transiciones y control de fatiga en gemelos si tocan saltos dobles.`);
  } else if (session.discipline === "gimnasio") {
    positives.push(`🏋️ **Fuerza Estructural**: Refuerzo de tren superior, estabilidad lumbo-pélvica y prevención de lesiones.`);
  } else if (session.discipline === "natacion") {
    positives.push(`🏊 **Natación**: Estímulo aeróbico regenerativo con impacto articular cero.`);
  }

  const targetCompliance = target
    ? {
        plannedZone: target.name,
        plannedRange: target.rangeLabel,
        actualPace: avgPace ? formatPace(avgPace) : target.rangeLabel,
        compliancePct: 100,
        timeInTargetSec: plannedZones?.r1TimeSec ?? 2100,
        timeInTargetFormatted: formatSecondsDetailed(plannedZones?.r1TimeSec ?? 2100),
        verdict: `Sesión planificada en ${target.name} (${target.rangeLabel}). Sube el archivo .FIT para analizar tus métricas segundo a segundo.`,
        isCompliant: true,
      }
    : null;

  return {
    structuredFeedback: {
      summary: `Pauta de entrenamiento basada en VAM 3:59 min/km.`,
      positives,
      deviations,
      targetCompliance,
    },
    zoneDistribution: plannedZones,
    hrZoneDistribution: null,
    laps: plannedLaps,
    isRealFit: false,
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
