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
export async function adaptTrainingPlan(workout: WorkoutContext): Promise<AdaptationResult> {
  const workoutDate = workout.fecha.includes("T") ? workout.fecha.split("T")[0] : workout.fecha;
  const weekStart = weekStartOf(workoutDate);

  // 1. Obtener métricas de sueño y recuperación del día (Zepp / Recovery)
  const recovery = getRecoveryByDate(workoutDate) || getLatestRecovery();
  const sleepHours = recovery?.sleep_duration ?? 7.5;
  const recoveryScore = recovery?.recovery_score ?? 75;
  const deepSleepMin = recovery?.deep_sleep_min ?? 60;
  const restingHr = recovery?.resting_hr ?? 50;

  // 2. Evaluar calidad del descanso
  let sleepQuality: "optima" | "regular" | "deficiente" = "optima";
  if (sleepHours < 6.0 || recoveryScore < 55 || deepSleepMin < 35) {
    sleepQuality = "deficiente";
  } else if (sleepHours < 7.0 || recoveryScore < 70) {
    sleepQuality = "regular";
  }

  // 3. Evaluar carga y fatiga acumulada
  const tss = workout.carga_tss ?? 0;
  const rpe = workout.rpe ?? 6;

  // Puntuación de fatiga (0 a 100) combinando TSS, RPE y deficiencia de sueño
  let fatigueScore = Math.min(100, Math.round(
    (tss / 160) * 50 +
    (rpe / 10) * 30 +
    (sleepQuality === "deficiente" ? 25 : sleepQuality === "regular" ? 12 : 0)
  ));

  // 4. Obtener sesiones de la semana
  const weekSessions = listSessionsForWeek(weekStart);
  const remainingPendingSessions = weekSessions.filter(
    (s) => s.status === "pendiente" && s.date > workoutDate && s.discipline !== "descanso"
  );

  const appliedModifications: PlanModification[] = [];
  const needsAdjustment = fatigueScore >= 65 || sleepQuality === "deficiente" || tss >= 125 || rpe >= 8;

  if (needsAdjustment && remainingPendingSessions.length > 0) {
    // Ordenar cronológicamente para actuar sobre las más inmediatas
    remainingPendingSessions.sort((a, b) => a.date.localeCompare(b.date));

    // Ajustar la sesión inmediatamente posterior al esfuerzo duro
    const nextSession = remainingPendingSessions[0];

    if (nextSession.discipline === "carrera") {
      // Modular series o ritmos vivos a R0/R1 Regenerativo (>5:25 min/km)
      const isHighIntensity = (nextSession.planned_code && /series|vam|tempo|r3|r5/i.test(nextSession.planned_code)) ||
        (nextSession.notes && /series|ritmo|umbral|fuerte/i.test(nextSession.notes));

      const newNotes = `[Adaptación Automática IA] Fatiga post-entreno (${tss} TSS) y descanso ${sleepQuality} (${sleepHours}h). Cambiado a rodaje suave R0/R1 regenerativo (>5:25 min/km, FC < 140 ppm) para acelerar recuperación.`;

      updatePlannedSession(nextSession.id, {
        notes: nextSession.notes ? `${nextSession.notes}\n---\n${newNotes}` : newNotes,
        planned_code: isHighIntensity ? "R0-R1 Regenerativo" : nextSession.planned_code,
      });

      appliedModifications.push({
        sessionId: nextSession.id,
        date: nextSession.date,
        discipline: nextSession.discipline,
        originalNotes: nextSession.notes,
        action: "modular_a_regenerativo",
        reason: `Carga de ${tss} TSS y sueño de ${sleepHours}h requieren limitar el impacto cardiovascular en 24-48h.`,
      });
    } else if (nextSession.discipline === "crossfit" || nextSession.discipline === "gimnasio") {
      // Ajustar intensidad o volumen en fuerza/wod
      const newNotes = `[Adaptación Automática IA] Reducción de volumen recomendada (RPE máx 6-7). Enfocar en técnica y movilidad articular debido a la fatiga neuromuscular acumulada.`;

      updatePlannedSession(nextSession.id, {
        notes: nextSession.notes ? `${nextSession.notes}\n---\n${newNotes}` : newNotes,
      });

      appliedModifications.push({
        sessionId: nextSession.id,
        date: nextSession.date,
        discipline: nextSession.discipline,
        originalNotes: nextSession.notes,
        action: "reducir_volumen",
        reason: `Fatiga global de ${fatigueScore}/100 aconseja no alcanzar el fallo muscular ni cargas máximas.`,
      });
    }

    // Si la fatiga es extrema (>85) y hay una segunda sesión pendiente en los próximos 2 días, modular también
    if (fatigueScore >= 85 && remainingPendingSessions.length > 1) {
      const secondSession = remainingPendingSessions[1];
      const newNotes = `[Adaptación Automática IA] Fatiga acumulada extrema detectada (${fatigueScore}/100). Reducir duración un 25% o convertir en descanso activo.`;
      updatePlannedSession(secondSession.id, {
        notes: secondSession.notes ? `${secondSession.notes}\n---\n${newNotes}` : newNotes,
      });
      appliedModifications.push({
        sessionId: secondSession.id,
        date: secondSession.date,
        discipline: secondSession.discipline,
        originalNotes: secondSession.notes,
        action: "reducir_volumen",
        reason: "Sobrecarga acumulada crítica que compromete la curva de rendimiento.",
      });
    }
  }

  // 5. Generar resumen textual enriquecido de recomendación
  let recommendationSummary = "";
  if (!needsAdjustment) {
    recommendationSummary = `🟢 Asimilación excelente. Carga asimilada (${tss} TSS) dentro del margen óptimo con recuperación ${sleepQuality} (${sleepHours}h de sueño, score ${recoveryScore}/100). El plan semanal se mantiene según lo previsto. Puedes mantener las intensidades objetivo.`;
  } else {
    const modsSummary = appliedModifications.length > 0
      ? `Se han aplicado ${appliedModifications.length} adaptaciones automáticas en las sesiones restantes: ${appliedModifications.map((m) => `${m.date} (${m.discipline} -> ${m.action})`).join(", ")}.`
      : "No se requirieron modificaciones adicionales en las sesiones pendientes.";

    recommendationSummary = `🟡 Adaptación del Plan Activada. Entreno con exigencia alta (${tss} TSS, RPE ${rpe}/10) complementado con descanso ${sleepQuality} (${sleepHours}h sueño, ${deepSleepMin}min sueño profundo). ${modsSummary} Prioriza hidratación, reposición de glucógeno y respeta las zonas regenerativas en las próximas 48h para maximizar la supercompensación.`;
  }

  // 6. Persistir en la tabla training_plan
  try {
    const existingPlan = getTrainingPlanForWeek(weekStart);
    const adaptationRecord = {
      timestamp: new Date().toISOString(),
      workoutId: workout.id,
      workoutType: workout.tipo,
      tss,
      fatigueScore,
      sleepQuality,
      sleepHours,
      recommendationSummary,
      modifications: appliedModifications,
    };

    let adaptationsList: any[] = [];
    if (existingPlan?.adaptaciones_ia) {
      try {
        const parsed = JSON.parse(existingPlan.adaptaciones_ia);
        adaptationsList = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        adaptationsList = [{ text: existingPlan.adaptaciones_ia }];
      }
    }
    adaptationsList.unshift(adaptationRecord);
    // Limitar historial a las últimas 15 adaptaciones
    adaptationsList = adaptationsList.slice(0, 15);

    updateTrainingPlanAdaptations(weekStart, JSON.stringify(adaptationsList));
  } catch (err) {
    console.warn("[AdaptPlan] Error guardando adaptaciones en training_plan:", err);
  }

  return {
    adapted: appliedModifications.length > 0,
    needsAdjustment,
    fatigueScore,
    sleepQuality,
    recommendationSummary,
    appliedModifications,
    weekStart,
  };
}
