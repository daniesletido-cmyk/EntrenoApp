import { getDb } from "@/lib/db";
import {
  listSessionsForWeek,
  updateSession,
  createPlannedSession,
  SessionRow,
  Discipline,
} from "@/lib/repo/sessions";
import { computeWeeklyRecommendation, sessionLoad } from "@/lib/recommendations";
import { listSleepBetween } from "@/lib/repo/sleep";
import { addDays, weekStartOf, isoDayOfWeek, weekDates } from "@/lib/dates";
import { VAM_TEST_PROFILE, VAM_ZONES } from "@/lib/vam-zones";

export type AdaptationStrategyType = "progresion" | "asimilacion" | "reenganche";

export interface WeeklyEvaluation {
  currentWeekStart: string;
  nextWeekStart: string;
  completedSessionsCount: number;
  totalPlannedCount: number;
  compliancePct: number;
  realLoadFoster: number;
  plannedLoadFoster: number;
  loadDeltaPct: number;
  avgRpe: number | null;
  avgSleepHours: number | null;
  avgSleepScore: number | null;
  acwr: number | null;
  sundaySessionCompleted: boolean;
  fatigueLevel: "baja" | "moderada" | "alta" | "critica";
  strategy: AdaptationStrategyType;
  strategyTitle: string;
  strategyBadgeTone: "success" | "warning" | "brand";
  strategyExplanation: string;
}

export interface DayAdaptivePlan {
  dayIndex: number; // 0=Lunes, 6=Domingo
  date: string;
  dayName: string;
  discipline: Discipline;
  plannedCode: string;
  durationMin: number;
  distanceKm: number | null;
  estimatedRpe: number;
  estimatedLoad: number;
  targetPaceGuidance?: string | null;
  structureNotes: string;
  changeReason: string;
}

export interface AdaptivePlanResult {
  evaluation: WeeklyEvaluation;
  nextWeekStart: string;
  plannedDays: DayAdaptivePlan[];
  totalNextWeekLoad: number;
  totalNextWeekDistanceKm: number;
  applied?: boolean;
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Distancias de tirada larga programadas en el macrociclo anual (Fase 1B: Sem 5-16, Fase 2: Sem 17-24)
const LONG_RUN_SCHEDULE_BY_WEEK: Record<string, number> = {
  "2026-10-05": 12, // Sem 5
  "2026-10-12": 14, // Sem 6
  "2026-10-19": 16, // Sem 7
  "2026-10-26": 11, // Sem 8 (descarga planificada)
  "2026-11-02": 14, // Sem 9
  "2026-11-09": 16, // Sem 10
  "2026-11-16": 18, // Sem 11
  "2026-11-23": 12, // Sem 12 (descarga planificada)
  "2026-11-30": 16, // Sem 13
  "2026-12-07": 18, // Sem 14
  "2026-12-14": 20, // Sem 15
  "2026-12-21": 14, // Sem 16 (descarga)
};

/**
 * Evalúa con precisión biométrica y de cargas la semana que acaba de concluir.
 */
export function evaluateCompletedWeek(weekStart: string): WeeklyEvaluation {
  const currentWeekSessions = listSessionsForWeek(weekStart);
  const nextWeekStart = addDays(weekStart, 7);

  const completed = currentWeekSessions.filter(
    (s) => s.status === "realizada" || s.status === "parcial"
  );
  const activePlanned = currentWeekSessions.filter((s) => s.discipline !== "descanso");

  let realLoad = 0;
  let totalRpeSum = 0;
  let rpeCount = 0;

  completed.forEach((s) => {
    const l = sessionLoad(s);
    realLoad += l;
    if (s.rpe) {
      totalRpeSum += s.rpe;
      rpeCount++;
    }
  });

  let plannedLoad = 0;
  currentWeekSessions.forEach((s) => {
    if (s.duration_min) {
      const defaultRpe = s.rpe ?? (s.discipline === "crossfit" ? 7.5 : s.discipline === "carrera" ? 5.5 : 5);
      plannedLoad += s.duration_min * defaultRpe;
    }
  });

  const compliancePct = activePlanned.length > 0 ? Math.round((completed.length / activePlanned.length) * 100) : 100;
  const avgRpe = rpeCount > 0 ? Number((totalRpeSum / rpeCount).toFixed(1)) : null;
  const loadDeltaPct = plannedLoad > 0 ? Math.round(((realLoad - plannedLoad) / plannedLoad) * 100) : 0;

  // Sueño de los últimos 7 días
  const sundayDate = addDays(weekStart, 6);
  const sleepLogs = listSleepBetween(weekStart, sundayDate);
  let sleepHoursSum = 0;
  let sleepScoreSum = 0;
  let sleepCount = 0;
  let scoreCount = 0;

  sleepLogs.forEach((sl) => {
    if (sl.hours) {
      sleepHoursSum += sl.hours;
      sleepCount++;
    }
    if (sl.score) {
      sleepScoreSum += sl.score;
      scoreCount++;
    }
  });

  const avgSleepHours = sleepCount > 0 ? Number((sleepHoursSum / sleepCount).toFixed(1)) : null;
  const avgSleepScore = scoreCount > 0 ? Math.round(sleepScoreSum / scoreCount) : null;

  // Recomendación y ratio ACWR
  const rec = computeWeeklyRecommendation(weekStart);
  const acwr = rec.acwr ? Number(rec.acwr.toFixed(2)) : null;

  // Sesión del domingo (Tirada Larga)
  const sundaySession = currentWeekSessions.find((s) => s.date === sundayDate);
  const sundayCompleted = !!sundaySession && (sundaySession.status === "realizada" || sundaySession.status === "parcial");

  // Nivel de fatiga
  let fatigueLevel: WeeklyEvaluation["fatigueLevel"] = "moderada";
  if ((acwr && acwr > 1.35) || (avgRpe && avgRpe >= 7.8) || (avgSleepScore && avgSleepScore < 60)) {
    fatigueLevel = "alta";
  } else if ((acwr && acwr > 1.5) || (avgRpe && avgRpe >= 8.5)) {
    fatigueLevel = "critica";
  } else if ((acwr && acwr < 0.8) && compliancePct >= 80) {
    fatigueLevel = "baja";
  }

  // Determinación de la estrategia de adaptación para la siguiente semana
  let strategy: AdaptationStrategyType = "progresion";
  let strategyTitle = "Sobrecarga Progresiva Controlada";
  let strategyBadgeTone: WeeklyEvaluation["strategyBadgeTone"] = "success";
  let strategyExplanation = "Excelente consistencia y asimilación. El cuerpo está listo para avanzar con el siguiente escalón de volumen y ritmo del plan anual.";

  if (fatigueLevel === "alta" || fatigueLevel === "critica" || (loadDeltaPct > 25 && (avgRpe ?? 0) >= 7.0)) {
    strategy = "asimilacion";
    strategyTitle = "Microciclo de Asimilación & Descarga";
    strategyBadgeTone = "warning";
    strategyExplanation = `La carga real acumulada (${realLoad} UA) o el ratio agudo/crónico (${acwr ?? "N/A"}) indican fatiga aguda elevada. Se modula la próxima semana reduciendo la tirada larga un 15-20% y priorizando rodajes regenerativos y descompresión.`;
  } else if (compliancePct < 65 || completed.length <= 2) {
    strategy = "reenganche";
    strategyTitle = "Estabilización y Reenganche Seguro";
    strategyBadgeTone = "brand";
    strategyExplanation = `Se completaron menos sesiones de las previstas (${completed.length}/${activePlanned.length}). Se estabiliza el volumen para evitar picos de carga bruscos que eleven el riesgo de lesión antes de retomar la progresión.`;
  }

  return {
    currentWeekStart: weekStart,
    nextWeekStart,
    completedSessionsCount: completed.length,
    totalPlannedCount: activePlanned.length,
    compliancePct,
    realLoadFoster: Math.round(realLoad),
    plannedLoadFoster: Math.round(plannedLoad),
    loadDeltaPct,
    avgRpe,
    avgSleepHours,
    avgSleepScore,
    acwr,
    sundaySessionCompleted: sundayCompleted,
    fatigueLevel,
    strategy,
    strategyTitle,
    strategyBadgeTone,
    strategyExplanation,
  };
}

/**
 * Calcula la adaptación completa de la semana siguiente a partir de la evaluación previa y el macrociclo.
 */
export function generateNextWeekAdaptivePlan(currentWeekStart: string): AdaptivePlanResult {
  const evaluation = evaluateCompletedWeek(currentWeekStart);
  const nextWeekStart = evaluation.nextWeekStart;
  const dates = weekDates(nextWeekStart);

  // Distancia base de la tirada larga según el plan a largo plazo
  const scheduledLongRun = LONG_RUN_SCHEDULE_BY_WEEK[nextWeekStart] ?? 16;
  let adaptedLongRun = scheduledLongRun;

  if (evaluation.strategy === "asimilacion") {
    adaptedLongRun = Math.max(12, Math.round(scheduledLongRun * 0.82)); // Reducción de ~18%
  } else if (evaluation.strategy === "reenganche") {
    adaptedLongRun = Math.max(12, scheduledLongRun - 2);
  }

  const plannedDays: DayAdaptivePlan[] = [];

  // 1. LUNES: Descanso / Recuperación activa
  plannedDays.push({
    dayIndex: 0,
    date: dates[0],
    dayName: "Lunes",
    discipline: "descanso",
    plannedCode: "Descanso / Recuperación Activa",
    durationMin: 0,
    distanceKm: null,
    estimatedRpe: 0,
    estimatedLoad: 0,
    changeReason: "Día de asimilación muscular y descanso total para absorber la tirada larga del domingo.",
    structureNotes: `DESCANSO (Recuperación y descompresión):\n- Día libre de entrenamiento tras la tirada dominical.\n- Hidratación abundante y estiramientos suaves opcionales. Carga: 0 UA.`,
  });

  // 2. MARTES: Natación aeróbica modulada
  const swimDist = evaluation.strategy === "asimilacion" ? 1.6 : evaluation.strategy === "reenganche" ? 1.8 : 2.0;
  const swimDur = Math.round(swimDist * 22);
  const swimRpe = evaluation.strategy === "asimilacion" ? 4 : 5;
  plannedDays.push({
    dayIndex: 1,
    date: dates[1],
    dayName: "Martes",
    discipline: "natacion",
    plannedCode: evaluation.strategy === "asimilacion"
      ? "NAT (Descarga Escapular & Aletas)"
      : "NAT (Base Aeróbica & Volumen Controlado)",
    durationMin: swimDur,
    distanceKm: swimDist,
    estimatedRpe: swimRpe,
    estimatedLoad: swimDur * swimRpe,
    changeReason: `Natación aeróbica sin impacto (${swimDist} km · RPE ${swimRpe}) para preparar hombros y piernas antes del CrossFit del miércoles.`,
    structureNotes: `NATACIÓN · ${evaluation.strategy === "asimilacion" ? "Descarga Activa" : "Base Aeróbica y Técnica"} (~${Math.round(swimDist * 1000)}m · ${swimDur} min · RPE ${swimRpe}):\n- Calentamiento: 300m crol largo y fluido + 100m espalda suave.\n- Técnica: 4x50m con pull-buoy para flotabilidad pélvica y proteger gemelos (desc. 15s).\n- Bloque Principal: ${evaluation.strategy === "asimilacion" ? "4x200m nado constante con aletas suaves" : "4x250m crol crucero sostenido (desc. 25s)"}.\n- Vuelta a la calma: 150m espalda doble y nado muerto.`,
  });

  // 3. MIÉRCOLES: CrossFit Box (Día 1 semanal · Traducido al castellano)
  const cf1Rpe = evaluation.strategy === "asimilacion" ? 7 : 7.5;
  plannedDays.push({
    dayIndex: 2,
    date: dates[2],
    dayName: "Miércoles",
    discipline: "crossfit",
    plannedCode: "CrossFit WOD (Fuerza & Condicionamiento · Box)",
    durationMin: 50,
    distanceKm: null,
    estimatedRpe: cf1Rpe,
    estimatedLoad: 50 * cf1Rpe,
    changeReason: "Sesión 1/2 de CrossFit semanal. Planificada el miércoles para asegurar recuperación completa tras el descanso del lunes.",
    structureNotes: `CROSSFIT · DÍA 1 SEMANAL (Clase dirigida en Box · ~50 min · RPE ${cf1Rpe}):\n\n1. BLOQUE DE FUERZA Y TÉCNICA (10-15 min):\n- Trabajo de fuerza básica (Press, Halterofilia o Gimnásticos según pizarra del Box).\n- Priorizar rango de movimiento completo y técnica sólida.\n\n2. WOD METCON (Por Tiempo o AMRAP dirigido):\n- Condicionamiento metabólico con impacto controlado.\n- Dosificar pulsaciones y gemelos de cara al rodaje suave del jueves.\n\n3. VUELTA A LA CALMA: Estiramientos de cintura escapular, pectorales y tobillos.`,
  });

  // 4. JUEVES: Carrera R1 Suave (Rodaje regenerativo VAM)
  const runDist = evaluation.strategy === "asimilacion" ? 6.0 : 7.0;
  const runDur = Math.round(runDist * 5.3);
  const runRpe = 4.5;
  plannedDays.push({
    dayIndex: 3,
    date: dates[3],
    dayName: "Jueves",
    discipline: "carrera",
    plannedCode: "R1 (Rodaje Regenerativo Suave VAM)",
    durationMin: runDur,
    distanceKm: runDist,
    estimatedRpe: runRpe,
    estimatedLoad: Math.round(runDur * runRpe),
    targetPaceGuidance: "5:25 - 4:59 min/km (Zona R1)",
    changeReason: `Rodaje suave R1 (${runDist} km) para limpiar piernas tras el CrossFit del miércoles y mantenerlas frescas para las sentadillas del viernes.`,
    structureNotes: `RUNNING · Rodaje Regenerativo en Zona R1 (~${runDist} km · ~${runDur} min · RPE 4-5):\n- Ritmo objetivo VAM: 5:25 - 4:59 min/km (Zona R1, conversacional, VAM: 3:59 min/km).\n- Calentamiento: 5 min caminando y trote progresivo suave (>5:30/km).\n- Rodaje continuo: Mantener zancada relajada, cadencia alta (175 ppm) y pulsaciones en zona verde.\n- Vuelta a la calma: 3-5 min andando + estiramientos suaves de sóleos e isquiotibiales.`,
  });

  // 5. VIERNES: CrossFit Box (Día 2 semanal · Traducido al castellano)
  const cf2Rpe = evaluation.strategy === "asimilacion" ? 7.5 : 8.0;
  plannedDays.push({
    dayIndex: 4,
    date: dates[4],
    dayName: "Viernes",
    discipline: "crossfit",
    plannedCode: "CrossFit WOD (Potencia & Intervalos · Box)",
    durationMin: 50,
    distanceKm: null,
    estimatedRpe: cf2Rpe,
    estimatedLoad: 50 * cf2Rpe,
    changeReason: "Sesión 2/2 de CrossFit semanal. Enfoque en potencia y WOD de final de semana.",
    structureNotes: `CROSSFIT · DÍA 2 SEMANAL (Clase dirigida en Box · ~50 min · RPE ${cf2Rpe}):\n\n1. BLOQUE DE FUERZA (Sentadillas o Jalones pesados según programación):\n- Enfoque en progresión de cargas con buena técnica.\n\n2. WOD METCON / INTERVALOS:\n- Alta intensidad láctica controlada.\n\n3. VUELTA A LA CALMA: Movilidad de cadera y flexores de cara al descanso del sábado.`,
  });

  // 6. SÁBADO: Descanso Activo & Movilidad Lumbo-Pélvica
  plannedDays.push({
    dayIndex: 5,
    date: dates[5],
    dayName: "Sábado",
    discipline: "descanso",
    plannedCode: "Descanso Activo & Movilidad Lumbo-Pélvica",
    durationMin: 20,
    distanceKm: null,
    estimatedRpe: 2,
    estimatedLoad: 0,
    changeReason: "Descanso activo obligatorio tras las sentadillas del viernes para proteger cuádriceps y rodillas antes de la tirada larga del domingo.",
    structureNotes: `DESCANSO ACTIVO · Recuperación Lumbo-Pélvica (~20 min · RPE 2):\n- 10 min de liberación miofascial con foam roller (cuádriceps, glúteos, gemelos y fascia lata).\n- 10 min de estiramientos dinámicos de cadera (couch stretch, paloma).\n- Cero impacto articular.`,
  });

  // 7. DOMINGO: Carrera Tirada Larga de Volumen (R5) calibrada por VAM
  const longRunDur = Math.round(adaptedLongRun * 5.25);
  const longRunRpe = evaluation.strategy === "asimilacion" ? 5.0 : 5.5;
  plannedDays.push({
    dayIndex: 6,
    date: dates[6],
    dayName: "Domingo",
    discipline: "carrera",
    plannedCode: `R5 (Tirada Larga de Volumen ${adaptedLongRun} km)`,
    durationMin: longRunDur,
    distanceKm: adaptedLongRun,
    estimatedRpe: longRunRpe,
    estimatedLoad: Math.round(longRunDur * longRunRpe),
    targetPaceGuidance: "5:25 - 5:05 min/km (Zona R0/R1)",
    changeReason: evaluation.strategy === "asimilacion"
      ? `Tirada larga adaptada a ${adaptedLongRun} km (-${scheduledLongRun - adaptedLongRun} km) por fatiga acumulada, protegiendo articulaciones y asegurando asimilación.`
      : `Tirada larga consolidada a ${adaptedLongRun} km según el plan a largo plazo (sobrecarga progresiva controlada).`,
    structureNotes: `RUNNING · Tirada Larga de Volumen Semanal (${adaptedLongRun} km · ~${longRunDur} min · RPE ${longRunRpe}):\n- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Zona R0/R1 aeróbico cómodo, VAM: 3:59 min/km).\n- Estrategia: Llegarás con frescura muscular gracias al descanso del sábado.\n- Hidratación: Agua o sales cada 20-25 min; 1 gel isotónico en el km ${Math.round(adaptedLongRun * 0.6)} si es necesario.\n- Vuelta a la calma: 5 min andando suave + estiramientos completos.`,
  });

  const totalNextWeekLoad = plannedDays.reduce((acc, d) => acc + d.estimatedLoad, 0);
  const totalNextWeekDistanceKm = plannedDays.reduce((acc, d) => acc + (d.distanceKm ?? 0), 0);

  return {
    evaluation,
    nextWeekStart,
    plannedDays,
    totalNextWeekLoad,
    totalNextWeekDistanceKm: Number(totalNextWeekDistanceKm.toFixed(1)),
  };
}

/**
 * Aplica de forma efectiva la adaptación sobre la base de datos para la semana siguiente.
 */
export function applyNextWeekAdaptivePlan(currentWeekStart: string): AdaptivePlanResult {
  const result = generateNextWeekAdaptivePlan(currentWeekStart);
  const existingNextWeekSessions = listSessionsForWeek(result.nextWeekStart);
  const now = new Date().toISOString();

  // Mapeamos por fecha para actualizar las existentes o crear si faltan
  const existingByDate = new Map<string, SessionRow>();
  existingNextWeekSessions.forEach((s) => existingByDate.set(s.date, s));

  result.plannedDays.forEach((plan) => {
    const existing = existingByDate.get(plan.date);
    const tag = `[Adaptación plan a largo plazo · ${result.evaluation.strategyTitle}]\nMotivo: ${plan.changeReason}\n`;

    if (existing) {
      // Solo actualizamos sesiones no realizadas (respetando si ya se hubiera marcado algo)
      if (existing.status === "pendiente") {
        updateSession(existing.id, {
          discipline: plan.discipline,
          planned_code: plan.plannedCode,
          duration_min: plan.durationMin,
          distance_km: plan.distanceKm,
          rpe: plan.estimatedRpe > 0 ? plan.estimatedRpe : null,
          is_long_run: plan.dayIndex === 6 ? 1 : 0,
          notes: `${tag}\n${plan.structureNotes}`,
        });
      }
    } else {
      createPlannedSession({
        date: plan.date,
        discipline: plan.discipline,
        planned_code: plan.plannedCode,
        is_long_run: plan.dayIndex === 6,
        notes: `${tag}\n${plan.structureNotes}`,
      });
    }
  });

  // Guardar metadata en settings para trazabilidad y feedback
  try {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
      "last_adaptive_plan",
      JSON.stringify({
        evaluatedWeek: currentWeekStart,
        nextWeekStart: result.nextWeekStart,
        strategy: result.evaluation.strategy,
        strategyTitle: result.evaluation.strategyTitle,
        appliedAt: now,
      })
    );
  } catch (e) {
    console.error("Error guardando settings de plan adaptativo:", e);
  }

  result.applied = true;
  return result;
}

/**
 * Comprueba si la sesión registrada corresponde al domingo (cierre de semana)
 * y dispara automáticamente la adaptación de la siguiente semana.
 */
export function checkAndTriggerSundayAutoAdapt(sessionDate: string): {
  autoAdapted: boolean;
  result?: AdaptivePlanResult;
} {
  const dayOfWeek = isoDayOfWeek(sessionDate); // 7 = Domingo
  if (dayOfWeek === 7) {
    const currentWeekStart = weekStartOf(sessionDate);
    const res = applyNextWeekAdaptivePlan(currentWeekStart);
    return { autoAdapted: true, result: res };
  }
  return { autoAdapted: false };
}
