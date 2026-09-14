import { listSessionsForWeek, updatePlannedSession, appendSessionNote } from "@/lib/repo/sessions";
import { computeWeeklyRecommendation } from "@/lib/recommendations";
import { addDays } from "@/lib/dates";

/**
 * Ajuste automático de la semana siguiente.
 *
 * Límites deliberados (seguridad antes que "autonomía completa"):
 * - Nunca actúa si hay una alerta médica — ahí la única respuesta correcta
 *   es parar y consultar, no reorganizar el calendario.
 * - Nunca toca una sesión ya registrada (realizada/parcial/no_realizada) —
 *   solo sesiones todavía pendientes de la semana que viene.
 * - Nunca inventa un número de RPE/duración objetivo (esta app no tiene
 *   ese dato para las recetas R1-R6 etc.), así que el "ajuste" se hace a
 *   nivel de estructura de la semana, con dos acciones concretas y
 *   explicables:
 *     1) Quitar el carácter de "tirada larga" a sesiones pendientes de
 *        carrera la semana siguiente (avisando a que se baje el ritmo/RPE
 *        objetivo a mano).
 *     2) Si además hay sobrecarga clara (ACWR > 1.5) o muchas sesiones
 *        seguidas, convertir en descanso la sesión pendiente de menor
 *        prioridad (nunca carrera ni natación, nunca la maratón).
 * - Toda sesión tocada recibe una nota explicando qué se cambió y por qué,
 *   para que quede trazabilidad — nada cambia en silencio.
 */

export interface ProposedChange {
  sessionId: number;
  date: string;
  discipline: string;
  plannedCode: string | null;
  action: "quitar_tirada_larga" | "convertir_descanso";
  reason: string;
}

const PRIORITY_TO_REDUCE = ["otro", "gimnasio", "crossfit"]; // nunca carrera/natación aquí

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
    appendSessionNote(c.sessionId, `[Ajuste automático] ${c.reason}`);
  }
  return { applied: changes.length, changes };
}
