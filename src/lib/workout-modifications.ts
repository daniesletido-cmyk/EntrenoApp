"use client";

import { ProposedMicroAdjustment } from "@/lib/readiness";

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
  } | null,
  microAdjustments?: ProposedMicroAdjustment[]
): WorkoutModificationInfo | null {
  if (!session) return null;

  // 1. Verificar si hay un microajuste directo de Readiness para esta sesión
  if (microAdjustments && session.id) {
    const matchedAdj = microAdjustments.find((a) => a.sessionId === session.id);
    if (matchedAdj) {
      const isSleep = /sueño|dormir|descanso/i.test(matchedAdj.reason);
      const isApplied = matchedAdj.isApplied;

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
        originalPlan: matchedAdj.originalPlannedCode ?? session.discipline,
        adjustedPlan: matchedAdj.suggestedPlannedCode ?? "Descanso / Regenerativo",
        suggestedPace: matchedAdj.suggestedPaceGuidance ?? undefined,
        canRevert: isApplied,
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
