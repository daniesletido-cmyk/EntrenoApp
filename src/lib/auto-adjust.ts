import {
  listSessionsForWeek,
  updatePlannedSession,
  appendSessionNote,
  getSessionById,
  updateSession,
  listSessionsBetween,
  SessionRow,
  Discipline,
} from "@/lib/repo/sessions";
import { computeWeeklyRecommendation } from "@/lib/recommendations";
import { computeDailyReadiness, ProposedMicroAdjustment } from "@/lib/readiness";
import { addDays, weekStartOf } from "@/lib/dates";

/**
 * Motor de ajuste inteligente de cargas y entrenos.
 *
 * Principios:
 * 1) Ajustes en tiempo real según Readiness (Sueño + Fatiga 24-48h + ACWR).
 * 2) Si se registra un entreno muy intenso (RPE >= 8 / CrossFit / Piernas) o descanso deficiente,
 *    se modulan las sesiones inmediatas (48-72h) de carrera a R0/R1 regenerativo (>5:23 min/km)
 *    o descanso activo para evitar sobreentrenamiento.
 * 3) Si el readiness es óptimo (Luz Verde), se recomienda apretar en la parte alta de las zonas VAM.
 * 4) Cada ajuste queda explícitamente anotado con [Ajuste inteligente] para total trazabilidad.
 * 5) Se preservan siempre las sesiones históricas ya realizadas.
 */

export interface ProposedChange {
  sessionId: number;
  date: string;
  discipline: string;
  plannedCode: string | null;
  action: "quitar_tirada_larga" | "convertir_descanso" | "modular_carrera";
  reason: string;
}

const PRIORITY_TO_REDUCE = ["otro", "gimnasio", "crossfit"];

export function computeAutoAdjustment(weekStart: string): {
  applicable: boolean;
  reason: string;
  changes: ProposedChange[];
} {
  const rec = computeWeeklyRecommendation(weekStart);

  if (rec.action === "alerta_medica") {
    return {
      applicable: false,
      reason: "Hay una alerta médica activa esta semana. La app nunca ajusta el entrenamiento automáticamente en ese caso — para y consulta primero.",
      changes: [],
    };
  }
  if (rec.action !== "reducir") {
    return { applicable: false, reason: "Esta semana no hay señales que aconsejen ajustar nada.", changes: [] };
  }

  const nextWeekStart = addDays(weekStart, 7);
  const nextSessions = listSessionsForWeek(nextWeekStart).filter(
    (s) => s.status === "pendiente" && s.discipline !== "descanso"
  );

  const changes: ProposedChange[] = [];

  for (const s of nextSessions) {
    if (s.is_long_run) {
      changes.push({
        sessionId: s.id,
        date: s.date,
        discipline: s.discipline,
        plannedCode: s.planned_code,
        action: "quitar_tirada_larga",
        reason: "Quitado el carácter de tirada larga por señales de fatiga/carga esta semana — baja también el ritmo o RPE objetivo respecto a lo habitual.",
      });
    }
  }

  const touchedIds = new Set(changes.map((c) => c.sessionId));
  const remaining = nextSessions.filter((s) => !touchedIds.has(s.id));
  const overloaded = (rec.acwr ?? 0) > 1.5 || nextSessions.length > 5;
  if (overloaded) {
    const candidate = remaining
      .filter((s) => PRIORITY_TO_REDUCE.includes(s.discipline))
      .sort((a, b) => PRIORITY_TO_REDUCE.indexOf(a.discipline) - PRIORITY_TO_REDUCE.indexOf(b.discipline))[0];
    if (candidate) {
      changes.push({
        sessionId: candidate.id,
        date: candidate.date,
        discipline: candidate.discipline,
        plannedCode: candidate.planned_code,
        action: "convertir_descanso",
        reason: "Convertida en descanso para priorizar la recuperación esta semana (carga elevada varias semanas seguidas).",
      });
    }
  }

  return { applicable: changes.length > 0, reason: rec.summary, changes };
}

export function applyAutoAdjustment(weekStart: string): { applied: number; changes: ProposedChange[] } {
  const { changes } = computeAutoAdjustment(weekStart);
  for (const c of changes) {
    if (c.action === "quitar_tirada_larga") {
      updatePlannedSession(c.sessionId, { is_long_run: 0 });
    } else if (c.action === "convertir_descanso") {
      updatePlannedSession(c.sessionId, { discipline: "descanso", planned_code: null });
    }
    appendSessionNote(c.sessionId, `[Ajuste inteligente] ${c.reason}`);
  }
  return { applied: changes.length, changes };
}

/**
 * Aplica ajustes de micro-ciclo (48h-72h) calculados por el Readiness del día.
 */
export function applyDailyMicroAdjustments(targetDate: string, specificSessionId?: number): {
  appliedCount: number;
  results: { sessionId: number; message: string }[];
} {
  const readiness = computeDailyReadiness(targetDate);
  const adjustments = readiness.proposedMicroAdjustments;

  let toApply = specificSessionId
    ? adjustments.filter((a) => a.sessionId === specificSessionId)
    : adjustments;

  // Si se solicita adaptar una sesión específica directamente por fatiga
  if (specificSessionId && toApply.length === 0) {
    const session = getSessionById(specificSessionId);
    if (session && session.status === "pendiente") {
      if (session.discipline === "carrera") {
        toApply = [
          {
            sessionId: session.id,
            date: session.date,
            discipline: "carrera",
            originalPlannedCode: session.planned_code,
            suggestedDiscipline: "carrera",
            suggestedPlannedCode: "R1 Regenerativo (suave 5:25-5:45 min/km)",
            suggestedPaceGuidance: "5:25 - 5:50 min/km (R0/R1) a RPE ≤ 5",
            action: "modulate_run",
            reason: "Adaptación de carga aplicada para modular la intensidad, proteger tendones y asimilar la fatiga previa.",
            isApplied: false,
          },
        ];
      } else if (session.discipline === "crossfit" || session.discipline === "gimnasio") {
        toApply = [
          {
            sessionId: session.id,
            date: session.date,
            discipline: session.discipline,
            originalPlannedCode: session.planned_code,
            suggestedDiscipline: "descanso",
            suggestedPlannedCode: "Descanso Activo & Movilidad",
            suggestedPaceGuidance: null,
            action: "convert_rest",
            reason: "Adaptación de carga para priorizar recuperación neuromuscular.",
            isApplied: false,
          },
        ];
      }
    }
  }

  const results: { sessionId: number; message: string }[] = [];

  for (const adj of toApply) {
    const session = getSessionById(adj.sessionId);
    if (!session || session.status !== "pendiente") continue;

    if (adj.action === "modulate_run") {
      updateSession(adj.sessionId, {
        planned_code: adj.suggestedPlannedCode,
        is_long_run: 0,
      });
      appendSessionNote(
        adj.sessionId,
        `[Ajuste inteligente] ${adj.reason} Ritmo aconsejado: ${adj.suggestedPaceGuidance ?? "R0/R1 suave (>5:25 min/km)"}. (Original: ${adj.originalPlannedCode ?? "carrera"}).`
      );
      results.push({
        sessionId: adj.sessionId,
        message: `Modulado entreno del ${adj.date} a ${adj.suggestedPlannedCode}`,
      });
    } else if (adj.action === "convert_rest") {
      updateSession(adj.sessionId, {
        discipline: "descanso",
        planned_code: null,
      });
      appendSessionNote(
        adj.sessionId,
        `[Ajuste inteligente] Convertido a descanso: ${adj.reason} (Original: ${adj.discipline} ${adj.originalPlannedCode ?? ""}).`
      );
      results.push({
        sessionId: adj.sessionId,
        message: `Convertido a descanso entreno del ${adj.date}`,
      });
    } else if (adj.action === "boost_session") {
      appendSessionNote(
        adj.sessionId,
        `[Ajuste inteligente] ${adj.reason} Indicación: ${adj.suggestedPaceGuidance}.`
      );
      results.push({
        sessionId: adj.sessionId,
        message: `Añadida indicación de apretar en entreno del ${adj.date}`,
      });
    }
  }

  return { appliedCount: results.length, results };
}

/**
 * Revertir un ajuste inteligente sobre una sesión pendiente
 */
export function revertDailyMicroAdjustment(sessionId: number): boolean {
  const session = getSessionById(sessionId);
  if (!session || !session.notes || !session.notes.includes("[Ajuste inteligente]")) {
    return false;
  }

  // Extraer el código original guardado en la nota
  const lines = session.notes.split("\n");
  const adjustLine = lines.find((l) => l.includes("[Ajuste inteligente]")) || "";
  const originalMatch = adjustLine.match(/\(Original:\s*([^)]+)\)/i);
  let originalCode = originalMatch ? originalMatch[1].trim() : null;

  let restoredDiscipline: Discipline = session.discipline;
  if (originalCode && (originalCode.startsWith("crossfit") || originalCode.startsWith("gimnasio") || originalCode.startsWith("carrera"))) {
    const parts = originalCode.split(" ");
    restoredDiscipline = parts[0] as Discipline;
    originalCode = parts.slice(1).join(" ").trim() || null;
  }

  // Quitar la línea de ajuste inteligente de las notas
  const cleanedNotes = lines
    .filter((line) => !line.includes("[Ajuste inteligente]"))
    .join("\n")
    .trim();

  updateSession(sessionId, {
    planned_code: originalCode || session.planned_code,
    discipline: restoredDiscipline,
    notes: cleanedNotes.length > 0 ? cleanedNotes : null,
  });

  return true;
}
