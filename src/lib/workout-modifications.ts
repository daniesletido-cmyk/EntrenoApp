"use client";

import { ProposedMicroAdjustment } from "@/lib/readiness";
import { detectVamZoneForSession } from "@/lib/vam-zones";

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
  isOptimal?: boolean;
  type: "carga" | "entrenador" | "sueno" | "intercambio" | "otro" | "optimo";
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
 * Limpia y normaliza el texto de fases de calentamiento y vuelta a la calma
 * para que se expresen exclusivamente en minutos (~6 min, ~8 min, etc.)
 * eliminando cualquier distancia residual (ej. 1.0 km, 1.5 km).
 */
export function cleanPhasesText(text?: string | null): string {
  if (!text) return "";
  let res = text.replace(/(Calentamiento|Vuelta a la calma|Enfriamiento)(\s*\([^)]*\))/gi, (full, name, paren) => {
    // Si tiene km y min juntos (ej: 1.0 km · ~6 min): eliminar la parte de km
    if (/\d+(?:\.\d+)?\s*km\s*·/i.test(paren)) {
      return name + paren.replace(/\s*\d+(?:\.\d+)?\s*km\s*·\s*/i, "");
    }
    // Si solo tiene km (ej: 1.0 km): reemplazar por minutos estimados
    if (/\d+(?:\.\d+)?\s*km/i.test(paren)) {
      return name + paren.replace(/\d+(?:\.\d+)?\s*km/i, "~6-10 min");
    }
    return full;
  });
  // También limpiar casos como 'Calentamiento: 1.0 km' o 'Vuelta a la calma: 1.0 km'
  res = res.replace(/(Calentamiento|Vuelta a la calma|Enfriamiento):\s*\d+(?:\.\d+)?\s*km\b/gi, (full, name) => {
    return name + ": ~6-10 min";
  });
  return res;
}

/**
 * Detecta y analiza si una sesión ha sido modificada o si requiere adaptación
 * debido a fatiga, sueño o recomendación del entrenador.
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
  microAdjustments?: ProposedMicroAdjustment[],
  readinessScore?: number | null
): WorkoutModificationInfo | null {
  if (!session) return null;

  const notes = session.notes || "";
  const rawCleanNotes = notes
    .split("\n")
    .filter((l) => !l.startsWith("["))
    .join("\n")
    .trim();

  const isAlreadyApplied = notes.includes("[Ajuste inteligente]");

  // 1. Si la sesión ya tiene un ajuste aplicado, mostrarlo como adaptación activa (con opción de revertir)
  if (isAlreadyApplied) {
    const lines = notes.split("\n");
    const adjustLine = lines.find((l) => l.includes("[Ajuste inteligente]")) || "";
    const cleanReason = adjustLine.replace("[Ajuste inteligente]", "").trim();

    const isSleep = /sueño|dormir|descanso deficiente/i.test(cleanReason);
    const isRest = /descanso/i.test(cleanReason);

    const originalMatch = cleanReason.match(/\(Original:\s*([^)]+)\)/i);
    const paceMatch = cleanReason.match(/(?:Ritmo aconsejado|Indicación):\s*([^.]+)\.?/i);

    let originalPlan = originalMatch ? originalMatch[1].trim() : undefined;
    let adjustedPlan = session.planned_code || (session.discipline ? session.discipline.toUpperCase() : "Regenerativo");

    if (isRest) {
      if (!originalPlan) originalPlan = session.planned_code || (session.discipline ? `${session.discipline.toUpperCase()}` : "Sesión programada");
      adjustedPlan = "Descanso total / Recuperación activa";
    } else {
      if (!originalPlan) originalPlan = session.planned_code || (session.discipline ? `${session.discipline.toUpperCase()}` : "Sesión inicial en calendario");
    }

    const suggestedPace = paceMatch ? paceMatch[1].trim() : undefined;
    const cleanReasonText = cleanReason
      .split("(Original:")[0]
      .replace(/(?:Ritmo aconsejado|Indicación):[^.]+\.?/i, "")
      .trim();

    const origVam = detectVamZoneForSession({
      discipline: session.discipline || "carrera",
      planned_code: originalPlan || session.planned_code,
      notes: rawCleanNotes,
    });

    const origWorkout: WorkoutDetailBlock = {
      title: originalPlan || session.planned_code || "Sesión programada en calendario",
      discipline: session.discipline || "carrera",
      distanceKm: session.distance_km,
      durationMin: session.duration_min,
      rpe: session.rpe,
      paceGuidance: origVam ? `${origVam.rangeLabel} (${origVam.code} · VAM 3:59)` : "Pauta y ritmos estándar fijados en el plan inicial",
      structure: cleanPhasesText(rawCleanNotes) || "Estructura original programada en el calendario semanal.",
      isAdapted: false,
    };

    let adjStructure = "";
    if (isRest) {
      adjStructure = `🛑 ESTRUCTURA ADAPTADA A DESCANSO REGENERATIVO:\n- 0 km de impacto en carrera.\n- Objetivo: Supercompensación y descarga de fatiga aguda.\n- Pauta opcional: 15-20 min de paseo suave o movilidad articular sin carga.`;
    } else {
      adjStructure = `⚠️ ESTRUCTURA ADAPTADA DE DESCARGA (Control de fatiga/carga):\n- 🟢 Calentamiento (~6-8 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote muy suave + movilidad dinámica.\n- ⚡ Parte principal: ${suggestedPace || "R0/R1 suave (>5:25 min/km) sin forzar."}\n- 🔵 Vuelta a la calma (~5-6 min · Ritmo: > 6:00 min/km): Caminata y estiramientos suaves.\n- Objetivo: Asimilación del entrenamiento y drenaje muscular.`;
    }

    const adjWorkout: WorkoutDetailBlock = {
      title: adjustedPlan,
      discipline: isRest ? "descanso" : (session.discipline || "carrera"),
      distanceKm: isRest ? 0 : session.distance_km ? Number((session.distance_km * 0.8).toFixed(1)) : null,
      durationMin: isRest ? 0 : session.duration_min ? Math.round(session.duration_min * 0.8) : 40,
      rpe: isRest ? 1 : 4,
      paceGuidance: suggestedPace || "Ritmo regenerativo de descarga",
      structure: cleanPhasesText(adjStructure),
      isAdapted: true,
    };

    return {
      isModified: true,
      isPendingProposal: false,
      isOptimal: false,
      type: isSleep ? "sueno" : "carga",
      badgeLabel: "Adaptación de Carga Aplicada",
      badgeTone: "warning",
      headline: isSleep
        ? "Carga modulada por descanso deficiente"
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

  // 2. Si no está aplicada y Readiness es Óptimo / Luz Verde (≥ 75%)
  // Prohibido mostrar alertas de fatiga o duplicar entrenos sin cambios.
  if (readinessScore !== undefined && readinessScore !== null && readinessScore >= 75) {
    return {
      isModified: false,
      isPendingProposal: false,
      isOptimal: true,
      type: "optimo",
      badgeLabel: "Luz Verde · Óptimo",
      badgeTone: "success",
      headline: "Estado óptimo (Luz Verde): Mantén el plan original programado",
      reason: "Recuperación y descanso óptimos (Readiness ≥ 75%). Mantén el plan original programado.",
      originalPlan: session.planned_code ?? session.discipline,
      canRevert: false,
    };
  }

  // 3. Si Readiness es Moderado (50%-74%) o Bajo (< 50%): verificar propuesta en microAdjustments
  if (microAdjustments && session.id) {
    const matchedAdj = microAdjustments.find((a) => a.sessionId === session.id);
    if (matchedAdj && matchedAdj.action !== "boost_session") {
      const isSleep = /sueño|dormir|descanso/i.test(matchedAdj.reason);
      const isRest = matchedAdj.suggestedDiscipline === "descanso" || matchedAdj.action === "convert_rest";

      const origPlan = matchedAdj.originalPlannedCode ?? session.planned_code ?? session.discipline ?? "Sesión programada";
      const adjPlan = matchedAdj.suggestedPlannedCode ?? (isRest ? "Descanso Activo / Movilidad" : "R1 Regenerativo Suave");

      const origWorkout: WorkoutDetailBlock = {
        title: origPlan,
        discipline: session.discipline ?? "carrera",
        distanceKm: session.distance_km,
        durationMin: session.duration_min,
        rpe: session.rpe,
        paceGuidance: "Ritmo y series según programación estándar",
        structure: cleanPhasesText(rawCleanNotes) || "Estructura original programada en el calendario semanal.",
        isAdapted: false,
      };

      const adjWorkout: WorkoutDetailBlock = {
        title: adjPlan,
        discipline: isRest ? "descanso" : (matchedAdj.suggestedDiscipline ?? session.discipline ?? "carrera"),
        distanceKm: isRest ? 0 : session.distance_km ? Number((session.distance_km * 0.8).toFixed(1)) : null,
        durationMin: isRest ? 0 : session.duration_min ? Math.round(session.duration_min * 0.8) : 35,
        rpe: isRest ? 1 : 4,
        paceGuidance: matchedAdj.suggestedPaceGuidance ?? (isRest ? "Sin impacto aeróbico" : "Ritmo regenerativo suave"),
        structure: cleanPhasesText(
          isRest
            ? "🛑 SESIÓN ADAPTADA A DESCANSO:\n- Prioridad absoluta a la recuperación neuromuscular y hormonal.\n- 0 km de impacto en carrera. Movilidad articular opcional."
            : `⚠️ SESIÓN ADAPTADA POR REGULACIÓN DE CARGA:\n- 🟢 Calentamiento (~6-8 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote muy suave + movilidad dinámica.\n- ⚡ Parte principal (Rodaje continuo suave R1): ${matchedAdj.suggestedPaceGuidance ?? "Ritmo suave regenerativo (>5:25 min/km)"}.\n- 🔵 Vuelta a la calma (~5-6 min · Ritmo: > 6:00 min/km): Caminata y estiramientos suaves.\n- Objetivo: Asimilar el estímulo semanal sin sobreentrenamiento.`
        ),
        isAdapted: true,
      };

      return {
        isModified: false,
        isPendingProposal: true,
        isOptimal: false,
        type: isSleep ? "sueno" : "carga",
        badgeLabel: "Propuesta de Adaptación",
        badgeTone: "danger",
        headline: "Sugerencia de adaptación por fatiga",
        reason: matchedAdj.reason,
        originalPlan: origPlan,
        adjustedPlan: adjPlan,
        suggestedPace: matchedAdj.suggestedPaceGuidance ?? undefined,
        canRevert: false,
        originalWorkout: origWorkout,
        adjustedWorkout: adjWorkout,
      };
    }
  }

  // 4. Ajuste por Entrenador IA
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

  // 5. Modificación manual / Intercambio
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
