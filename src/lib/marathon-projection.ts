import { getDb } from "@/lib/db";
import { todayISO, weekStartOf, addDays } from "@/lib/dates";

export type MacrocyclePhaseKey = "base_aerobica" | "construccion" | "especifico" | "tapering";

export interface MacrocyclePhase {
  key: MacrocyclePhaseKey;
  name: string;
  shortName: string;
  order: number;
  weeksRemainingRange: [number, number]; // [min, max]
  dateRangeLabel: string;
  description: string;
  targetVolumeKm: string;
  targetLongRunKm: string;
  keyWorkouts: string;
  specialistFocus: {
    preparador: string;
    fisioterapeuta: string;
    nutricionista: string;
    psicologo: string;
  };
  isActive: boolean;
  isCompleted: boolean;
}

export interface PreparationBreakdownItem {
  id: string;
  label: string;
  score: number; // 0 - 100
  weightPct: number;
  currentValue: string;
  targetValue: string;
  status: "optimo" | "en_progreso" | "atencion";
}

export interface MarathonProjectionData {
  targetRace: {
    name: string;
    targetDate: string; // YYYY-MM-DD
    targetDistanceKm: number;
    daysRemaining: number;
    weeksRemaining: number;
  };
  macrocycle: {
    totalWeeks: number;
    currentWeekNumber: number;
    weeksElapsed: number;
    progressPct: number;
    currentPhase: MacrocyclePhase;
    allPhases: MacrocyclePhase[];
  };
  projection: {
    vamPace: string;
    vamSpeedKmh: number;
    recentThresholdPace: string;
    recentAvgWeeklyKm: number;
    maxRecentLongRunKm: number;
    projectedTimeFormatted: string;
    projectedPaceFormatted: string;
    projectedRangeFormatted: string;
    targetGoalTime: string;
    targetGoalPace: string;
    confidenceLevel: "Alta" | "Media-Alta" | "Progresiva";
    preparationScorePct: number;
    breakdown: PreparationBreakdownItem[];
  };
}

export const MARATHON_TARGET_DATE_DEFAULT = "2027-04-26";
export const TOTAL_MACROCYCLE_WEEKS = 28;

/**
 * Calcula la proyección de maratón y fase del macrociclo para una fecha de referencia.
 */
export function calculateMarathonProjection(refDateIso: string = todayISO()): MarathonProjectionData {
  const db = getDb();

  // 1. Obtener ajustes y metas
  let targetDate = MARATHON_TARGET_DATE_DEFAULT;
  try {
    const settingRow = db
      .prepare<{ value: string }>("SELECT value FROM settings WHERE key = 'goal_race_date'")
      .get();
    if (settingRow?.value) {
      targetDate = settingRow.value;
    }
  } catch {}

  const dRef = new Date(refDateIso + "T00:00:00Z");
  const dTarget = new Date(targetDate + "T00:00:00Z");
  const diffDays = Math.max(0, Math.ceil((dTarget.getTime() - dRef.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.max(0, Math.ceil(diffDays / 7));

  const weeksElapsed = Math.min(
    TOTAL_MACROCYCLE_WEEKS,
    Math.max(1, TOTAL_MACROCYCLE_WEEKS - weeksRemaining + 1)
  );
  const macrocycleProgressPct = Math.round((weeksElapsed / TOTAL_MACROCYCLE_WEEKS) * 100);

  // 2. Definición de Fases del Macrociclo
  const phasesRaw: Omit<MacrocyclePhase, "isActive" | "isCompleted">[] = [
    {
      key: "base_aerobica",
      name: "Fase 1: Base Aeróbica y Acumulación",
      shortName: "Base Aeróbica",
      order: 1,
      weeksRemainingRange: [17, 28],
      dateRangeLabel: "Octubre 2026 – Enero 2027",
      description: "Construcción de la red mitocondrial, capilarización profunda y eficiencia en el uso de grasas como combustible principal (Zona R1).",
      targetVolumeKm: "30 – 45 km / sem",
      targetLongRunKm: "12 – 16 km",
      keyWorkouts: "Rodajes continuos R1 (5:25 - 4:59/km) + Cuestas dinámicas + Tiradas largas cómodas",
      specialistFocus: {
        preparador: "Priorizar rodajes cómodos en R1 sin saltos bruscos de volumen. Mantener la consistencia semanal.",
        fisioterapeuta: "Control estricto de molestias en sóleos, tendón rotuliano y fascia plantar. Movilidad de tobillo y cadera.",
        nutricionista: "Grasas saludables limpias y semillas (calabaza, girasol, chía, lino). CERO frutos secos de cáscara por alergia severa.",
        psicologo: "Paciencia y disfrute del hábito. No competir en entrenamientos lentos: la base se forja sin prisa.",
      },
    },
    {
      key: "construccion",
      name: "Fase 2: Construcción y Umbral Anaeróbico",
      shortName: "Construcción",
      order: 2,
      weeksRemainingRange: [9, 16],
      dateRangeLabel: "Enero 2027 – Febrero 2027",
      description: "Elevación del umbral anaeróbico (R3/R4: 4:18-4:20/km), mejora del VO2max y capacidad de sostener ritmos vivos con baja fatiga.",
      targetVolumeKm: "45 – 55 km / sem",
      targetLongRunKm: "16 – 22 km",
      keyWorkouts: "Series fraccionadas de umbral (4x1.200m a 4:18/km) + Tempo R2 (4:59-4:35/km) + Tirada larga sostenida",
      specialistFocus: {
        preparador: "Introducir bloques de calidad fraccionada. Cuidar la recuperación entre repeticiones (trote suave a 6:00/km).",
        fisioterapeuta: "Trabajo excéntrico de isquiotibiales y descarga miofascial tras series duras. Monitoreo diario del RPE.",
        nutricionista: "Carga de glucógeno previa a días de umbral. Batidos de recuperación con avena, plátano y tahini seguro.",
        psicologo: "Fortaleza mental en las últimas repeticiones de las series. Aceptar el malestar como señal de adaptación.",
      },
    },
    {
      key: "especifico",
      name: "Fase 3: Específico Maratón y Tiradas Zuera",
      shortName: "Específico Maratón",
      order: 3,
      weeksRemainingRange: [4, 8],
      dateRangeLabel: "Marzo 2027 – Principios de Abril 2027",
      description: "Asimilación del Ritmo Maratón objetivo (5:05 - 5:10/km) con economía de zancada en fatiga y tiradas clave de 24 a 30 km.",
      targetVolumeKm: "55 – 65 km / sem (Pico)",
      targetLongRunKm: "24 – 30 km",
      keyWorkouts: "Tiradas largas con 10-14 km integrados a Ritmo Maratón (5:05/km) + Simulación de perfil y avituallamientos",
      specialistFocus: {
        preparador: "Tiradas largas clave en Zuera con tramos a ritmo de carrera. Vigilancia milimétrica de no sobrepasar el umbral.",
        fisioterapeuta: "Descargas periódicas antes y después de las tiradas de 25k+. Crioterapia y descanso activo.",
        nutricionista: "Ensayo exacto de geles y carbohidratos intra-carrera (60-75g HC/h). Solo marcas certificadas libres de trazas.",
        psicologo: "Visualización positiva del km 32 al 42 en Madrid. Anclaje mental en el objetivo Sub-3h35.",
      },
    },
    {
      key: "tapering",
      name: "Fase 4: Tapering y Puesta a Punto",
      shortName: "Tapering",
      order: 4,
      weeksRemainingRange: [0, 3],
      dateRangeLabel: "Abril 2027 (Últimas 3 semanas)",
      description: "Reducción estratégica de volumen (40-60%) manteniendo chispas de intensidad para maximizar la supercompensación fisiológica.",
      targetVolumeKm: "20 – 35 km / sem",
      targetLongRunKm: "12 – 14 km",
      keyWorkouts: "Rodajes cortos con rectas vivas + Activación neuromuscular suave + Descanso reparador",
      specialistFocus: {
        preparador: "Recortar drásticamente el kilometraje. Tocar ritmo objetivo en rectas de 100m sin fatigar el sistema nervioso.",
        fisioterapeuta: "Movilidad articular sin manipulaciones agresivas los días previos. Asegurar soltura muscular completa.",
        nutricionista: "Sobrecarga de hidratos en los 3 días previos (arroz, patata, fruta, pasta limpia) y máxima hidratación con sodio.",
        psicologo: "Canalizar los nervios pre-carrera. Confianza plena en los meses de trabajo acumulados.",
      },
    },
  ];

  // Determinar la fase activa
  let activePhaseKey: MacrocyclePhaseKey = "base_aerobica";
  if (weeksRemaining <= 3) {
    activePhaseKey = "tapering";
  } else if (weeksRemaining <= 8) {
    activePhaseKey = "especifico";
  } else if (weeksRemaining <= 16) {
    activePhaseKey = "construccion";
  } else {
    activePhaseKey = "base_aerobica";
  }

  const allPhases: MacrocyclePhase[] = phasesRaw.map((p) => ({
    ...p,
    isActive: p.key === activePhaseKey,
    isCompleted:
      (activePhaseKey === "construccion" && p.key === "base_aerobica") ||
      (activePhaseKey === "especifico" && (p.key === "base_aerobica" || p.key === "construccion")) ||
      (activePhaseKey === "tapering" && p.key !== "tapering"),
  }));

  const currentPhase = allPhases.find((p) => p.isActive) || allPhases[0];

  // 3. Obtener métricas reales de carrera de la base de datos
  let recentWeeklyAvgKm = 27.5;
  let maxRecentLongRunKm = 19.5;
  try {
    // Últimas 4 semanas de carrera completadas hasta la fecha de referencia
    const currentWeekStart = weekStartOf(refDateIso);
    const past4WeekStart = addDays(currentWeekStart, -28);

    const runStats = db
      .prepare<{ total_km: number; runs_count: number; max_km: number }>(
        `SELECT 
           COALESCE(SUM(distance_km), 0) as total_km,
           COUNT(*) as runs_count,
           COALESCE(MAX(distance_km), 0) as max_km
         FROM sessions 
         WHERE discipline = 'carrera' 
           AND (status = 'realizada' OR fit_data IS NOT NULL)
           AND date >= ? AND date <= ?`
      )
      .get(past4WeekStart, refDateIso);

    if (runStats && runStats.runs_count > 0) {
      recentWeeklyAvgKm = Math.round((runStats.total_km / 4) * 10) / 10;
      if (runStats.max_km > 0) {
        maxRecentLongRunKm = Math.round(runStats.max_km * 10) / 10;
      }
    }
  } catch {}

  // 4. Algoritmo de Estimación Fisiológica (VAM 3:59/km · 15.06 km/h)
  const vamSpeedKmh = 15.06;
  const vamPace = "3:59 min/km";
  const recentThresholdPace = "4:18 - 4:20 min/km";

  // Factor de utilización aeróbica maratón según volumen acumulado y tirada máxima
  // Un corredor con buena base y VAM de 15.06 km/h proyecta maratón entre el 77% y 80% de su VAM.
  const volumeNorm = Math.min(1.0, Math.max(0.4, recentWeeklyAvgKm / 45));
  const longRunNorm = Math.min(1.0, Math.max(0.4, maxRecentLongRunKm / 30));
  const aerobicEfficiencyFactor = 0.745 + volumeNorm * 0.035 + longRunNorm * 0.025; // ~0.785

  const estimatedSpeedKmh = vamSpeedKmh * aerobicEfficiencyFactor; // ~11.82 km/h
  const marathonDistance = 42.195;
  const estimatedHours = marathonDistance / estimatedSpeedKmh;
  const totalSeconds = Math.round(estimatedHours * 3600);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const projectedTimeFormatted = `${hours}h${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const paceSecPerKm = Math.round(totalSeconds / marathonDistance);
  const paceMin = Math.floor(paceSecPerKm / 60);
  const paceSec = paceSecPerKm % 60;
  const projectedPaceFormatted = `${paceMin}:${String(paceSec).padStart(2, "0")} min/km`;

  const projectedRangeFormatted = "3h32:00 – 3h37:00 (5:01 – 5:08/km)";
  const targetGoalTime = "Sub-3h35:00";
  const targetGoalPace = "5:05 min/km";

  // 5. Cálculo del Índice de Preparación (%)
  // Desglose en 4 pilares:
  // - Volumen Semanal: peso 25% (puntuación según progreso hacia 45-50 km/sem)
  // - Eficiencia VAM/Umbral: peso 25% (VAM 3:59 y series umbral a 4:18/km consolidada)
  // - Resistencia en Tirada Larga: peso 25% (progreso de 19.5k hacia 30-32k)
  // - Adherencia al Macrociclo: peso 25% (semanas avanzadas en el plan)
  const scoreVolume = Math.round(Math.min(100, (recentWeeklyAvgKm / 45) * 100));
  const scoreVam = 90; // VAM 3:59/km y series 4:18-4:20 son excelentes y consolidadas
  const scoreLongRun = Math.round(Math.min(100, (maxRecentLongRunKm / 30) * 100));
  const scoreMacrocycle = Math.round(Math.min(100, (weeksElapsed / TOTAL_MACROCYCLE_WEEKS) * 100));

  const preparationScorePct = Math.round(
    scoreVolume * 0.25 + scoreVam * 0.25 + scoreLongRun * 0.25 + scoreMacrocycle * 0.25
  );

  const breakdown: PreparationBreakdownItem[] = [
    {
      id: "volume",
      label: "Volumen Semanal",
      score: scoreVolume,
      weightPct: 25,
      currentValue: `${recentWeeklyAvgKm} km/sem`,
      targetValue: "45-50 km/sem pico",
      status: scoreVolume >= 80 ? "optimo" : scoreVolume >= 50 ? "en_progreso" : "atencion",
    },
    {
      id: "vam_threshold",
      label: "Ritmo Umbral & VAM",
      score: scoreVam,
      weightPct: 25,
      currentValue: "VAM 3:59 · Umbral 4:19",
      targetValue: "4:18 - 4:20 min/km",
      status: "optimo",
    },
    {
      id: "long_run",
      label: "Tirada Larga Máxima",
      score: scoreLongRun,
      weightPct: 25,
      currentValue: `${maxRecentLongRunKm} km Zuera`,
      targetValue: "30-32 km clave",
      status: scoreLongRun >= 75 ? "optimo" : scoreLongRun >= 50 ? "en_progreso" : "atencion",
    },
    {
      id: "macrocycle_timing",
      label: "Avance del Macrociclo",
      score: scoreMacrocycle,
      weightPct: 25,
      currentValue: `Semana ${weeksElapsed} de ${TOTAL_MACROCYCLE_WEEKS}`,
      targetValue: "28 semanas totales",
      status: "en_progreso",
    },
  ];

  return {
    targetRace: {
      name: "Maratón de Madrid (Zurich R&R)",
      targetDate,
      targetDistanceKm: 42.195,
      daysRemaining: diffDays,
      weeksRemaining,
    },
    macrocycle: {
      totalWeeks: TOTAL_MACROCYCLE_WEEKS,
      currentWeekNumber: weeksElapsed,
      weeksElapsed,
      progressPct: macrocycleProgressPct,
      currentPhase,
      allPhases,
    },
    projection: {
      vamPace,
      vamSpeedKmh,
      recentThresholdPace,
      recentAvgWeeklyKm: recentWeeklyAvgKm,
      maxRecentLongRunKm,
      projectedTimeFormatted,
      projectedPaceFormatted,
      projectedRangeFormatted,
      targetGoalTime,
      targetGoalPace,
      confidenceLevel: recentWeeklyAvgKm >= 30 ? "Alta" : "Media-Alta",
      preparationScorePct,
      breakdown,
    },
  };
}
