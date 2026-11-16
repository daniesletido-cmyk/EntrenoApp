import { weekStartOf, addDays, toLocalISODate } from "@/lib/dates";
import { getRecoveryByDate, getLatestRecovery } from "@/lib/repo/recovery";
import {
  listSessionsForWeek,
  updatePlannedSession,
  getSessionById,
  SessionRow,
} from "@/lib/repo/sessions";
import { updateTrainingPlanAdaptations, getTrainingPlanForWeek, upsertTrainingPlan } from "@/lib/repo/training-plan";

export interface WorkoutContext {
  id?: number;
  fecha: string;
  tipo: string;
  duracion: number; // min
  distancia?: number | null; // km
  fc_media?: number | null;
  fc_max?: number | null;
  carga_tss?: number | null;
  rpe?: number | null;
  feeling?: number | null;
  userNotes?: string | null;
}

export interface PlanModification {
  sessionId: number;
  date: string;
  discipline: string;
  originalNotes: string | null;
  action: "modular_a_regenerativo" | "reducir_volumen" | "convertir_descanso_activo" | "ajustar_ritmo";
  reason: string;
}

export interface AdaptationResult {
  adapted: boolean;
  needsAdjustment: boolean;
  fatigueScore: number; // 0 a 100
  sleepQuality: "optima" | "regular" | "deficiente";
  recommendationSummary: string;
  appliedModifications: PlanModification[];
  weekStart: string;
}

/**
 * Motor de adaptación automática del plan de entrenamiento.
 * Compara el entreno real vs el planificado y el sueño del día.
 * Si detecta fatiga alta o descanso insuficiente, reajusta las sesiones
 * restantes de la semana para optimizar la supercompensación y evitar sobreentrenamiento.
 */
import { processSensoryAndLoadAdaptation } from "@/lib/sensory-adaptation-engine";

export async function adaptTrainingPlan(workout: WorkoutContext): Promise<AdaptationResult> {
  const result = await processSensoryAndLoadAdaptation({
    sessionId: workout.id,
    fecha: workout.fecha,
    tipo: workout.tipo,
    duracion: workout.duracion,
    distancia: workout.distancia,
    fc_media: workout.fc_media,
    fc_max: workout.fc_max,
    carga_tss: workout.carga_tss,
    rpe: workout.rpe,
    feeling: workout.feeling,
    userNotes: workout.userNotes,
  });

  return {
    adapted: result.adapted,
    needsAdjustment: result.needsAdjustment,
    fatigueScore: result.fatigueScore,
    sleepQuality: result.sleepQuality,
    recommendationSummary: `${result.triggerDescription} ${result.multidisciplinary.preparadorFisico}`,
    appliedModifications: result.appliedModifications.map((m) => ({
      sessionId: m.sessionId,
      date: m.date,
      discipline: m.discipline,
      originalNotes: m.originalNotes,
      action: m.action,
      reason: m.reason,
    })),
    weekStart: result.weekStart,
  };
}
