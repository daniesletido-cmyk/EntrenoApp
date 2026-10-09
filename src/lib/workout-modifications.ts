"use client";

import { ProposedMicroAdjustment } from "@/lib/readiness";

export interface WorkoutDetailBlock {
  title: string;
  discipline: string;
  distanceKm?: number | null;
  durationMin?: number | null;
  rpe?: number | null;
  paceGuidance?: string | null;
  structure: string;
  isAdapted: boolean;
}

export interface WorkoutModificationInfo {
  isModified: boolean;
  isPendingProposal?: boolean;
  type: "carga" | "entrenador" | "sueno" | "intercambio" | "otro";
  badgeLabel: string;
  badgeTone: "warning" | "brand" | "danger" | "info" | "success";
  headline: string;
  reason: string;
  originalPlan?: string;
  adjustedPlan?: string;
  suggestedPace?: string;
  canRevert?: boolean;
  rawNote?: string;
  originalWorkout?: WorkoutDetailBlock;
  adjustedWorkout?: WorkoutDetailBlock;
}

/**
 * Detecta y analiza si una sesión ha sido modificada debido a la carga,
 * fatiga, sueño, o por recomendación del entrenador.
 */
export function parseWorkoutModification(
  session?: {
    id?: number;
    notes?: string | null;
    planned_code?: string | null;
    discipline?: string;
    distance_km?: number | null;
    duration_min?: number | null;
    rpe?: number | null;
  } | null,
  microAdjustments?: ProposedMicroAdjustment[]
): WorkoutModificationInfo | null {
  if (!session) return null;

  const rawCleanNotes = (session.notes || "")
    .split("\n")
    .filter((l) => !l.startsWith("["))
    .join("\n")
    .trim();

  // 1. Verificar si hay un microajuste directo de Readiness para esta sesión
  if (microAdjustments && session.id) {
    const matchedAdj = microAdjustments.find((a) => a.sessionId === session.id);
    if (matchedAdj) {
      const isSleep = /sueño|dormir|descanso/i.test(matchedAdj.reason);
      const isApplied = matchedAdj.isApplied;
      const isRest = matchedAdj.suggestedDiscipline === "descanso" || matchedAdj.action === "convert_rest";

      const origPlan = matchedAdj.originalPlannedCode ?? session.discipline ?? "Sesión programada";
      const adjPlan = matchedAdj.suggestedPlannedCode ?? "Descanso / Regenerativo";

      const origWorkout: WorkoutDetailBlock = {
        title: origPlan,
        discipline: session.discipline ?? "carrera",
        distanceKm: session.distance_km,
        durationMin: session.duration_min,
        rpe: session.rpe,
        paceGuidance: "Ritmo y series según programación estándar",
        structure: rawCleanNotes || "Estructura original programada en el calendario semanal.",
        isAdapted: false,
      };

      const adjWorkout: WorkoutDetailBlock = {
        title: adjPlan,
        discipline: isRest ? "descanso" : (matchedAdj.suggestedDiscipline ?? session.discipline ?? "carrera"),
        distanceKm: isRest ? 0 : session.distance_km,
        durationMin: isRest ? 0 : session.duration_min,
        rpe: isRest ? 1 : 4,
        paceGuidance: matchedAdj.suggestedPaceGuidance ?? (isRest ? "Sin impacto aeróbico" : "Ritmo regenerativo suave"),
        structure: isRest
          ? "🛑 SESIÓN ADAPTADA A DESCANSO:\n- Prioridad absoluta a la recuperación neuromuscular y hormonal.\n- 0 km de impacto en carrera. Movilidad articular opcional."
          : `⚠️ SESIÓN ADAPTADA POR REGULACIÓN DE CARGA:\n- Pauta activa: ${matchedAdj.suggestedPaceGuidance ?? "Ritmo suave regenerativo (>5:25 min/km)"}\n- Objetivo: Asimilar el estímulo semanal sin sobreentrenamiento.\n\n${rawCleanNotes}`,
        isAdapted: true,
      };

      return {
        isModified: isApplied,
        isPendingProposal: !isApplied,
        type: isSleep ? "sueno" : "carga",
        badgeLabel: isApplied
          ? isSleep
            ? "Adaptado por Sueño / Fatiga"
            : "Adaptado por Carga / Fatiga"
          : "Propuesta de Adaptación",
        badgeTone: isApplied ? "warning" : "brand",
        headline: isApplied
          ? "Entrenamiento adaptado para proteger tu recuperación"
          : "Sugerencia de adaptación por fatiga",
        reason: matchedAdj.reason,
        originalPlan: origPlan,
        adjustedPlan: adjPlan,
        suggestedPace: matchedAdj.suggestedPaceGuidance ?? undefined,
        canRevert: isApplied,
        originalWorkout: origWorkout,
        adjustedWorkout: adjWorkout,
      };
    }
  }

  // 2. Analizar las notas de la sesión en busca de etiquetas de ajuste
  const notes = session.notes || "";
  if (!notes) return null;

  // Caso A: Ajuste inteligente de Carga, Sueño o Luz Verde
  if (notes.includes("[Ajuste inteligente]")) {
    const lines = notes.split("\n");
    const adjustLine = lines.find((l) => l.includes("[Ajuste inteligente]")) || "";
    const cleanReason = adjustLine.replace("[Ajuste inteligente]", "").trim();

    const isSleep = /sueño|dormir|descanso deficiente/i.test(cleanReason);
    const isBoost = /luz verde|óptimo|apretar|ritmo alto/i.test(cleanReason);
    const isRest = /descanso/i.test(cleanReason);

    const originalMatch = cleanReason.match(/\(Original:\s*([^)]+)\)/i);
    const paceMatch = cleanReason.match(/(?:Ritmo aconsejado|Indicación):\s*([^.]+)\.?/i);

    let originalPlan = originalMatch ? originalMatch[1].trim() : undefined;
    let adjustedPlan = session.planned_code || (session.discipline ? session.discipline.toUpperCase() : "Regenerativo");

    if (isBoost) {
      if (!originalPlan) {
        originalPlan = session.planned_code || (session.discipline ? `${session.discipline.toUpperCase()} (Plan base)` : "Sesión programada");
      }
      adjustedPlan = `${originalPlan} (Ritmo ágil autorizado)`;
    } else if (isRest) {
      if (!originalPlan) {
        originalPlan = session.planned_code || (session.discipline ? `${session.discipline.toUpperCase()}` : "Sesión programada");
      }
      adjustedPlan = "Descanso total / Recuperación activa";
    } else {
      if (!originalPlan) {
        originalPlan = session.planned_code || (session.discipline ? `${session.discipline.toUpperCase()}` : "Sesión inicial en calendario");
      }
    }

    const suggestedPace = paceMatch ? paceMatch[1].trim() : undefined;
    const cleanReasonText = cleanReason
      .split("(Original:")[0]
      .replace(/(?:Ritmo aconsejado|Indicación):[^.]+\.?/i, "")
      .trim();

    const origWorkout: WorkoutDetailBlock = {
      title: originalPlan || session.planned_code || "Sesión programada en calendario",
      discipline: session.discipline || "carrera",
      distanceKm: session.distance_km,
      durationMin: session.duration_min,
      rpe: session.rpe,
      paceGuidance: "Pauta y ritmos estándar fijados en el plan inicial",
      structure: rawCleanNotes || "Estructura original programada en el calendario semanal.",
      isAdapted: false,
    };

    let adjStructure = "";
    if (isBoost) {
      if (rawCleanNotes) {
        const extraDetails = rawCleanNotes
          .split("\n")
          .filter((l) => !l.toLowerCase().includes("ritmo de seguridad"))
          .join("\n");
        adjStructure = `⚡ PAUTA ADAPTADA POR LUZ VERDE:\n- Ritmo optimizado: ${suggestedPace || "Buscar el ritmo alto de la zona (ej. R1 a 5:00/km o R2 a 4:35/km)"}\n\n${extraDetails}`;
      } else {
        adjStructure = `⚡ ESTRUCTURA ADAPTADA POR LUZ VERDE (Ritmo ágil autorizado):\n- Pauta activa: ${suggestedPace || "Buscar el ritmo alto de la zona"}\n- Calentamiento: 5 min caminando rápido + movilidad de cadera.\n- Bloque Principal: ${session.distance_km ? `${session.distance_km} km` : `${session.duration_min ?? 40} min`} rodando fluido en la franja más ágil de la zona.\n- Vuelta a la calma: 5 min andando suave + estiramientos.`;
      }
    } else if (isRest) {
      adjStructure = `🛑 ESTRUCTURA ADAPTADA A DESCANSO REGENERATIVO:\n- 0 km de impacto en carrera.\n- Objetivo: Supercompensación y descarga de fatiga aguda.\n- Pauta opcional: 15-20 min de paseo suave o movilidad articular sin carga.`;
    } else {
      adjStructure = `⚠️ ESTRUCTURA ADAPTADA DE DESCARGA (Control de fatiga/carga):\n- Pauta activa: ${suggestedPace || "R0/R1 suave (>5:25 min/km) sin forzar."}\n- Objetivo: Asimilación del entrenamiento y drenaje muscular.\n\n${rawCleanNotes || "- Rodaje suave regenerativo a pulsaciones bajas."}`;
    }

    const adjWorkout: WorkoutDetailBlock = {
      title: adjustedPlan,
      discipline: isRest ? "descanso" : (session.discipline || "carrera"),
      distanceKm: isRest ? 0 : session.distance_km,
      durationMin: isRest ? 0 : session.duration_min,
      rpe: isBoost ? (session.rpe ? Math.min(session.rpe + 0.5, 6) : 5) : isRest ? 1 : Math.max((session.rpe || 5) - 1, 3.5),
      paceGuidance: suggestedPace || (isBoost ? "Ritmo ágil autorizado" : "Ritmo regenerativo de descarga"),
      structure: adjStructure,
      isAdapted: true,
    };

    return {
      isModified: true,
      type: isSleep ? "sueno" : "carga",
      badgeLabel: isSleep
        ? "Adaptado por Sueño / Fatiga"
        : isBoost
        ? "Optimizado por Buena Recuperación"
        : "Adaptado por Carga",
      badgeTone: isBoost ? "success" : "warning",
      headline: isSleep
        ? "Carga modulada por descanso deficiente"
        : isBoost
        ? "Ritmo optimizado por excelente recuperación (Luz Verde)"
        : "Entrenamiento adaptado para regular la carga semanal",
      reason: cleanReasonText,
      originalPlan,
      adjustedPlan,
      suggestedPace,
      canRevert: true,
      rawNote: adjustLine,
      originalWorkout: origWorkout,
      adjustedWorkout: adjWorkout,
    };
  }

  // Caso B: Ajuste por el Entrenador IA
  if (notes.includes("[Ajuste Entrenador]")) {
    const lines = notes.split("\n");
    const coachLine = lines.find((l) => l.includes("[Ajuste Entrenador]")) || "";
    const cleanReason = coachLine.replace(/\[Ajuste Entrenador\]:?/i, "").trim();

    return {
      isModified: true,
      type: "entrenador",
      badgeLabel: "Modificado por Entrenador IA",
      badgeTone: "brand",
      headline: "Sesión reajustada por el Asistente Experto",
      reason: cleanReason,
      adjustedPlan: session.planned_code ?? session.discipline,
      canRevert: false,
      rawNote: coachLine,
    };
  }

  // Caso C: Modificación manual / Intercambio
  if (notes.includes("[Modificado]") || notes.includes("[Swap]") || notes.includes("[Intercambiado]")) {
    return {
      isModified: true,
      type: "intercambio",
      badgeLabel: "Sesión Intercambiada / Modificada",
      badgeTone: "info",
      headline: "Entrenamiento reubicado o modificado manualmente",
      reason: "Esta sesión fue adaptada o intercambiada respecto a la programación inicial.",
      adjustedPlan: session.planned_code ?? session.discipline,
      canRevert: false,
    };
  }

  return null;
}
