import { getSessionById, updateSession, createPlannedSession, swapSessionDates, listSessionsBetween, SessionRow, Discipline } from "@/lib/repo/sessions";
import { todayISO } from "@/lib/dates";

export interface CoachActionProposal {
  type: "modify_session" | "swap_sessions" | "set_rest_day";
  date: string; // YYYY-MM-DD
  targetSessionId?: number;
  fromDiscipline?: string;
  toDiscipline: Discipline;
  plannedCode?: string | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  notes?: string | null;
  summary: string;
}

export interface CoachActionResult {
  success: boolean;
  message: string;
  action: CoachActionProposal;
  sessionId?: number;
  previousState?: {
    discipline: Discipline;
    planned_code: string | null;
    notes: string | null;
    duration_min: number | null;
    distance_km: number | null;
  };
}

export function executeCoachAction(action: CoachActionProposal): CoachActionResult {
  const targetDate = action.date || todayISO();

  if (action.type === "modify_session" || action.type === "set_rest_day") {
    // Buscar la sesión en esa fecha
    let sessionToUpdate: SessionRow | undefined;

    if (action.targetSessionId) {
      sessionToUpdate = getSessionById(action.targetSessionId);
    }

    if (!sessionToUpdate) {
      const daySessions = listSessionsBetween(targetDate, targetDate);
      // Preferir una sesión pendiente o que no sea descanso
      sessionToUpdate =
        daySessions.find((s) => s.status === "pendiente" && s.discipline !== "descanso") ||
        daySessions.find((s) => s.discipline !== "descanso") ||
        daySessions[0];
    }

    const newDiscipline = action.type === "set_rest_day" ? "descanso" : action.toDiscipline;

    if (sessionToUpdate) {
      const previousState = {
        discipline: sessionToUpdate.discipline,
        planned_code: sessionToUpdate.planned_code,
        notes: sessionToUpdate.notes,
        duration_min: sessionToUpdate.duration_min,
        distance_km: sessionToUpdate.distance_km,
      };

      const updated = updateSession(sessionToUpdate.id, {
        discipline: newDiscipline,
        planned_code: action.plannedCode !== undefined ? action.plannedCode : sessionToUpdate.planned_code,
        duration_min: action.durationMin !== undefined ? action.durationMin : sessionToUpdate.duration_min,
        distance_km: action.distanceKm !== undefined ? action.distanceKm : sessionToUpdate.distance_km,
        notes: action.notes ? `${sessionToUpdate.notes ? `${sessionToUpdate.notes}\n---\n` : ""}[Ajuste Entrenador]: ${action.notes}` : sessionToUpdate.notes,
      });

      if (!updated) {
        return { success: false, message: "No se pudo actualizar la sesión en la base de datos.", action };
      }

      return {
        success: true,
        message: `Sesión del ${targetDate} cambiada a ${newDiscipline.toUpperCase()}${action.plannedCode ? ` (${action.plannedCode})` : ""}.`,
        action,
        sessionId: updated.id,
        previousState,
      };
    } else {
      // Crear nueva sesión planificada si no existía ninguna en ese día
      const created = createPlannedSession({
        date: targetDate,
        discipline: newDiscipline,
        planned_code: action.plannedCode ?? null,
        notes: action.notes ? `[Ajuste Entrenador]: ${action.notes}` : null,
      });

      return {
        success: true,
        message: `Nueva sesión de ${newDiscipline.toUpperCase()} creada para el ${targetDate}.`,
        action,
        sessionId: created.id,
      };
    }
  }

  return {
    success: false,
    message: "Tipo de acción no soportado.",
    action,
  };
}

export function undoCoachAction(sessionId: number, previousState: CoachActionResult["previousState"]): boolean {
  if (!previousState) return false;
  const updated = updateSession(sessionId, {
    discipline: previousState.discipline,
    planned_code: previousState.planned_code,
    notes: previousState.notes,
    duration_min: previousState.duration_min,
    distance_km: previousState.distance_km,
  });
  return !!updated;
}
