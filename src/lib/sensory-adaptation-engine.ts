import { weekStartOf, addDays, toLocalISODate } from "@/lib/dates";
import { getRecoveryByDate, getLatestRecovery } from "@/lib/repo/recovery";
import {
  listSessionsForWeek,
  updatePlannedSession,
  getSessionById,
  SessionRow,
  appendSessionNote,
} from "@/lib/repo/sessions";
import {
  updateTrainingPlanAdaptations,
  getTrainingPlanForWeek,
} from "@/lib/repo/training-plan";
import { sendSensoryAdaptationPush } from "@/lib/push-notifications";

export interface MultidisciplinaryDiagnosis {
  preparadorFisico: string;
  fisioterapeuta: string;
  nutricionista: string;
  psicologo: string;
}

export interface SensoryPlanModification {
  sessionId: number;
  date: string;
  discipline: string;
  originalPlannedCode: string | null;
  newPlannedCode: string;
  originalNotes: string | null;
  action: "modular_a_regenerativo" | "reducir_volumen" | "convertir_descanso_activo";
  reason: string;
}

export interface SensoryAdaptationResult {
  adapted: boolean;
  needsAdjustment: boolean;
  triggerType: "sensaciones_malas" | "rpe_desproporcionado" | "molestias_detectadas" | "fatiga_carga" | "asimilacion_optima" | "sin_cambios";
  triggerDescription: string;
  feelingScore: number | null; // 1-5
  rpeScore: number | null;     // 1-10
  fatigueScore: number;       // 0-100
  sleepQuality: "optima" | "regular" | "deficiente";
  multidisciplinary: MultidisciplinaryDiagnosis;
  appliedModifications: SensoryPlanModification[];
  weekStart: string;
  notificationSent: boolean;
}

// Palabras clave de alerta clínica y fatiga subjetiva del atleta
const ALERT_KEYWORDS_REGEX = /\b(molestia|molestias|dolor|dolores|cargad[oas]|sobrecarga|sobrecargad[oas]|cansad[oas]|mala noche|mal dormido|enferm[oas]|pesadez|tir[oó]n|pinchazo[s]?|agujetas|inflama\w*|contractura|tensa|rigidez|molesto|sobrecargas|aquiles|s[oó]leo|gemelo|isquio|rodilla|tend[oó]n)\b/i;

export async function processSensoryAndLoadAdaptation(input: {
  sessionId?: number;
  fecha: string;
  tipo: string;
  duracion?: number | null;
  distancia?: number | null;
  fc_media?: number | null;
  fc_max?: number | null;
  carga_tss?: number | null;
  rpe?: number | null;
  feeling?: number | null; // 1-5
  userNotes?: string | null;
}): Promise<SensoryAdaptationResult> {
  const workoutDate = input.fecha.includes("T") ? input.fecha.split("T")[0] : input.fecha;
  const weekStart = weekStartOf(workoutDate);

  // 1. Obtener métricas de sueño y recuperación del día (Zepp / Recovery)
  const recovery = getRecoveryByDate(workoutDate) || getLatestRecovery();
  const sleepHours = recovery?.sleep_duration ?? 7.5;
  const recoveryScore = recovery?.recovery_score ?? 75;
  const deepSleepMin = recovery?.deep_sleep_min ?? 60;

  let sleepQuality: "optima" | "regular" | "deficiente" = "optima";
  if (sleepHours < 6.0 || recoveryScore < 55 || deepSleepMin < 35) {
    sleepQuality = "deficiente";
  } else if (sleepHours < 7.0 || recoveryScore < 70) {
    sleepQuality = "regular";
  }

  // 2. Extraer notas y telemetría subjetiva
  const rawNotes = input.userNotes ?? "";
  const feeling = typeof input.feeling === "number" && input.feeling >= 1 && input.feeling <= 5 ? input.feeling : null;
  const rpe = typeof input.rpe === "number" ? input.rpe : null;
  const tss = input.carga_tss ?? 0;

  // 3. Evaluar disparadores de adaptación automática
  const hasAlertWords = ALERT_KEYWORDS_REGEX.test(rawNotes);
  const matchedWords = rawNotes.match(ALERT_KEYWORDS_REGEX)?.[0]?.toLowerCase() || null;

  // RPE desproporcionado: RPE >= 7 en rodaje suave (R0/R1) o RPE >= 8.5 en general
  const isGentleSession = /suave|r0|r1|regenerativo|base|caminata|paseo/i.test(`${input.tipo} ${rawNotes}`);
  const isDisproportionateRpe = (isGentleSession && (rpe ?? 0) >= 7) || (rpe !== null && rpe >= 8.5);

  // Sensación mala (feeling 1 o 2 sobre 5)
  const isBadFeeling = feeling !== null && feeling <= 2;

  // Carga acumulada muy alta o sueño deficiente
  const isExtremeFatigue = tss >= 135 || (tss >= 100 && sleepQuality === "deficiente");

  // Puntuación de fatiga (0 a 100)
  let fatigueScore = Math.min(
    100,
    Math.round(
      (tss / 150) * 40 +
      ((rpe ?? 6) / 10) * 30 +
      (isBadFeeling ? 25 : feeling === 3 ? 10 : 0) +
      (sleepQuality === "deficiente" ? 20 : sleepQuality === "regular" ? 10 : 0) +
      (hasAlertWords ? 20 : 0)
    )
  );

  let triggerType: SensoryAdaptationResult["triggerType"] = "sin_cambios";
  let triggerDescription = "";

  if (hasAlertWords) {
    triggerType = "molestias_detectadas";
    triggerDescription = `Alerta en notas del reloj: "${matchedWords}". Prioridad a la descarga y prevención de lesiones.`;
  } else if (isBadFeeling) {
    triggerType = "sensaciones_malas";
    triggerDescription = `Sensación subjetiva baja en Suunto (${feeling}/5). Fatiga percibida alta.`;
  } else if (isDisproportionateRpe) {
    triggerType = "rpe_desproporcionado";
    triggerDescription = `Esfuerzo percibido desproporcionado (RPE ${rpe}/10). Coste fisiológico excesivo para el tipo de sesión.`;
  } else if (isExtremeFatigue || fatigueScore >= 70) {
    triggerType = "fatiga_carga";
    triggerDescription = `Fatiga acumulada alta (${fatigueScore}/100) con descanso ${sleepQuality} (${sleepHours}h).`;
  } else if (feeling !== null && feeling >= 4 && (rpe ?? 6) <= 6 && sleepQuality !== "deficiente") {
    triggerType = "asimilacion_optima";
    triggerDescription = `Sensaciones excelentes (${feeling}/5) y carga plenamente asimilada. Progresión consolidada.`;
  }

  const needsAdjustment =
    triggerType === "molestias_detectadas" ||
    triggerType === "sensaciones_malas" ||
    triggerType === "rpe_desproporcionado" ||
    triggerType === "fatiga_carga";

  // 4. Buscar siguientes sesiones pendientes para modular
  const weekSessions = listSessionsForWeek(weekStart);
  const remainingPending = weekSessions.filter(
    (s) => s.status === "pendiente" && s.date > workoutDate && s.discipline !== "descanso"
  );
  remainingPending.sort((a, b) => a.date.localeCompare(b.date));

  const appliedModifications: SensoryPlanModification[] = [];

  // Pautas multidisciplinares personalizadas
  let multiDiag: MultidisciplinaryDiagnosis;

  if (needsAdjustment && remainingPending.length > 0) {
    // Localizar la siguiente sesión exigente o inmediata
    const nextSession = remainingPending[0];
    const isRun = nextSession.discipline === "carrera";
    const isBox = nextSession.discipline === "crossfit" || nextSession.discipline === "gimnasio";

    if (isRun) {
      const originalCode = nextSession.planned_code || "Carrera";
      const isDemanding = /series|vam|tempo|umbral|r2|r3|r4|r5|fartlek|cuestas/i.test(`${nextSession.planned_code} ${nextSession.notes}`);
      
      const newCode = isDemanding ? "R0-R1 Regenerativo Suave" : "Rodaje Suave Regenerativo";
      const reasonDetail = hasAlertWords
        ? `Molestias reportadas (${matchedWords}). El fisioterapeuta y preparador físico prescriben rodar a ritmo R0 (>5:25 - 5:45 min/km) con FC < 140 ppm para eliminar impacto articular.`
        : `Sensación ${feeling ? `${feeling}/5` : `RPE ${rpe}/10`}. Ajuste a rodaje regenerativo para facilitar la supercompensación.`;

      const noteToAppend = `[Adaptación por sensaciones] Motivo: ${reasonDetail} | Pauta: Calentamiento 1.5 km suave, Parte Principal a ritmo regenerativo R0/R1 (>5:25 min/km), Vuelta a la calma 1.0 km trote muy suave + estiramientos completos.`;

      updatePlannedSession(nextSession.id, {
        planned_code: newCode,
        notes: nextSession.notes ? `${nextSession.notes}\n---\n${noteToAppend}` : noteToAppend,
      });

      appliedModifications.push({
        sessionId: nextSession.id,
        date: nextSession.date,
        discipline: nextSession.discipline,
        originalPlannedCode: originalCode,
        newPlannedCode: newCode,
        originalNotes: nextSession.notes,
        action: "modular_a_regenerativo",
        reason: reasonDetail,
      });
    } else if (isBox) {
      const originalCode = nextSession.planned_code || nextSession.discipline;
      const newCode = "Fuerza Técnica & Movilidad (RPE ≤ 6)";
      const reasonDetail = `Fatiga/molestias en sesión previa. El preparador físico pauta reducir un 35% el volumen y evitar fallo neuromuscular.`;

      const noteToAppend = `[Adaptación por sensaciones] ${reasonDetail} Priorizar movilidad articular, core y descarga de tren inferior.`;

      updatePlannedSession(nextSession.id, {
        planned_code: newCode,
        notes: nextSession.notes ? `${nextSession.notes}\n---\n${noteToAppend}` : noteToAppend,
      });

      appliedModifications.push({
        sessionId: nextSession.id,
        date: nextSession.date,
        discipline: nextSession.discipline,
        originalPlannedCode: originalCode,
        newPlannedCode: newCode,
        originalNotes: nextSession.notes,
        action: "reducir_volumen",
        reason: reasonDetail,
      });
    }

    // Diagnóstico del Equipo Técnico Multidisciplinar
    multiDiag = {
      preparadorFisico: `Próxima sesión del ${nextSession.date} modulada a intensidad regenerativa. Se protege la curva de supercompensación evitando vaciar depósitos de glucógeno.`,
      fisioterapeuta: hasAlertWords
        ? `Protocolo preventivo por "${matchedWords}": 15 min de movilidad articular sin carga, automasaje miofascial con foam roller (sóleos, gemelos e isquios) y contrastes de agua fría 3-4 min en piernas.`
        : `Protocolo de descarga: movilidad dinámica de cadera y tobillos, estiramientos suaves sin rebote y descompresión articular.`,
      nutricionista: `Hidratación reforzada con electrolitos (sodio + magnesio). Cena reparadora con carbohidratos limpios (arroz, boniato o avena), grasas saludables (AOVE, aguacate, semillas de calabaza, chía o girasol) y proteína de fácil digestión. RESTRICCIÓN: Cero frutos secos de cáscara.`,
      psicologo: `Adaptar una sesión ante fatiga es una decisión de atleta inteligente. La forma física se asimila en el descanso; llegar sano al Maratón es la verdadera victoria.`,
    };
  } else if (triggerType === "asimilacion_optima") {
    multiDiag = {
      preparadorFisico: `Ritmos y carga asimilados con solvencia. Mantén la progresión prevista en el plan semanal sin recortar kilometraje clave.`,
      fisioterapeuta: `Buen tono neuromuscular y ausencia de sobrecargas. Continúa con la rutina habitual de movilidad post-entreno.`,
      nutricionista: `Mantén la reposición energética estándar (semillas de calabaza/chía, avena, fruta fresca e hidratación continua).`,
      psicologo: `Confianza alta y regularidad consolidada. El trabajo específico para el Maratón va por el camino idóneo.`,
    };
  } else {
    multiDiag = {
      preparadorFisico: `Carga dentro de los rangos tolerables. Se mantiene el plan semanal según lo programado.`,
      fisioterapeuta: `Vigilar evolución de sensaciones al iniciar la siguiente sesión. Si notas rigidez, prolonga el calentamiento 5 min.`,
      nutricionista: `Hidratación adecuada y reposición de sales minerales según el volumen ejecutado.`,
      psicologo: `Constancia y foco en las sensaciones internas para ajustar el ritmo en carrera.`,
    };
  }

  // 5. Persistir registro en training_plan
  try {
    const existingPlan = getTrainingPlanForWeek(weekStart);
    const adaptationRecord = {
      timestamp: new Date().toISOString(),
      sourceSessionId: input.sessionId,
      triggerType,
      triggerDescription,
      feeling,
      rpe,
      fatigueScore,
      sleepQuality,
      appliedModifications,
      multidisciplinary: multiDiag,
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
    adaptationsList = adaptationsList.slice(0, 15);

    updateTrainingPlanAdaptations(weekStart, JSON.stringify(adaptationsList));
  } catch (err) {
    console.warn("[SensoryEngine] Error guardando registro en training_plan:", err);
  }

  // 6. Enviar notificación push breve si se aplicaron modificaciones
  let notificationSent = false;
  if (appliedModifications.length > 0) {
    try {
      const reasonBrief = hasAlertWords
        ? `Modulamos tu siguiente entreno a regenerativo por ${matchedWords}.`
        : `Ajustamos tu próxima sesión por fatiga para acelerar tu recuperación.`;

      await sendSensoryAdaptationPush({
        reason: reasonBrief,
        adaptedSessionDate: appliedModifications[0]?.date,
        discipline: appliedModifications[0]?.discipline,
      });
      notificationSent = true;
    } catch (pushErr) {
      console.warn("[SensoryEngine] Error enviando push de adaptación:", pushErr);
    }
  }

  return {
    adapted: appliedModifications.length > 0,
    needsAdjustment,
    triggerType,
    triggerDescription,
    feelingScore: feeling,
    rpeScore: rpe,
    fatigueScore,
    sleepQuality,
    multidisciplinary: multiDiag,
    appliedModifications,
    weekStart,
    notificationSent,
  };
}

/**
 * Consulta la adaptación multidisciplinar más reciente para mostrar en la interfaz (/hoy)
 */
export function getLatestMultidisciplinaryAdaptation(weekStart: string): {
  active: boolean;
  adaptation: any | null;
} {
  try {
    const plan = getTrainingPlanForWeek(weekStart);
    if (!plan?.adaptaciones_ia) return { active: false, adaptation: null };
    const list = JSON.parse(plan.adaptaciones_ia);
    if (!Array.isArray(list) || list.length === 0) return { active: false, adaptation: null };
    const latest = list[0];
    const isRecent = latest?.appliedModifications && latest.appliedModifications.length > 0;
    return {
      active: isRecent,
      adaptation: latest,
    };
  } catch {
    return { active: false, adaptation: null };
  }
}
