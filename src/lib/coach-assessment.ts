import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { addDays, weekStartOf, isoDayOfWeek, DAY_NAMES_ES, todayISO } from "@/lib/dates";
import { computeDailyReadiness, DailyReadiness } from "@/lib/readiness";
import { computeWeeklyRecommendation, sessionLoad } from "@/lib/recommendations";

export interface CoachDaySession {
  id: number;
  date: string;
  dayName: string;
  discipline: string;
  plannedCode: string | null;
  status: string;
  durationMin: number | null;
  distanceKm: number | null;
  rpe: number | null;
  load: number;
  notes: string | null;
  isPeak: boolean;
  coachComment: string;
}

export interface PeakSessionInfo {
  id: number;
  date: string;
  dayName: string;
  discipline: string;
  plannedCode: string | null;
  durationMin: number;
  rpe: number;
  load: number;
  notes: string | null;
  highlightText: string;
}

export interface WeeklyCoachAssessment {
  weekStart: string;
  weekEnd: string;
  today: string;
  isCurrentWeek: boolean;
  dayOfWeekToday: number;

  // 1. Tema de Carga
  loadAnalysis: {
    currentWeekLoad: number;
    prevWeekLoad: number;
    loadComparisonPct: number | null; // % respecto a semana anterior
    totalMinutes: number;
    totalKm: number;
    acwr: number | null;
    acwrStatus: "infracarga" | "optimo" | "sobrecarga_moderada" | "sobrecarga_alta";
    acwrBadge: string;
    acwrWhyExplanation: string;
    loadPacingText: string;
  };

  // 2. Cómo estás para entrenar hoy (Readiness)
  readinessToday: {
    score: number;
    levelLabel: string;
    tone: "success" | "brand" | "warning" | "danger";
    headline: string;
    summary: string;
    sleepLastNightText: string;
    coachAdviceToday: string;
  };

  // 3. Cómo han ido los entrenos de la semana
  sessionsProgress: {
    plannedCount: number;
    completedCount: number;
    pendingCount: number;
    compliancePct: number | null;
    days: CoachDaySession[];
    overviewText: string;
  };

  // 4. Pico de más carga
  peakSession: PeakSessionInfo | null;

  // 5. Veredicto y estrategia del entrenador
  coachVerdict: {
    title: string;
    tone: "success" | "brand" | "warning" | "danger";
    narrative: string;
    actionablePoints: string[];
    weekendStrategy: string;
  };
}

const DISCIPLINE_DISPLAY: Record<string, string> = {
  carrera: "Carrera",
  gimnasio: "Fuerza / Gimnasio",
  crossfit: "CrossFit WOD",
  natacion: "Natación",
  otro: "Actividad",
  descanso: "Descanso",
};

export function computeCoachWeeklyAssessment(weekStartParam?: string): WeeklyCoachAssessment {
  const today = todayISO();
  const weekStart = weekStartParam ? weekStartOf(weekStartParam) : weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const isCurrentWeek = weekStart === weekStartOf(today);
  const currentDow = isoDayOfWeek(today);

  // Sesiones de esta semana
  const thisWeekSessions = listSessionsBetween(weekStart, weekEnd);

  // Sesiones de la semana anterior (para comparar carga)
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevWeekSessions = listSessionsBetween(prevWeekStart, prevWeekEnd);

  // Sueño de esta semana
  const thisWeekSleep = listSleepBetween(weekStart, weekEnd);

  // ACWR y recomendación semanal del motor
  const rec = computeWeeklyRecommendation(weekStart);
  const acwr = rec.acwr;

  // Readiness de hoy (si es la semana actual) o del último día de la semana
  const readinessTargetDate = isCurrentWeek ? today : weekEnd;
  const readiness = computeDailyReadiness(readinessTargetDate);

  // Cálculo de cargas
  const completedThisWeek = thisWeekSessions.filter(
    (s) => (s.status === "realizada" || s.status === "parcial") && s.discipline !== "descanso"
  );
  const currentWeekLoad = Math.round(completedThisWeek.reduce((sum, s) => sum + sessionLoad(s), 0));
  const totalMinutes = Math.round(completedThisWeek.reduce((sum, s) => sum + (s.duration_min ?? 0), 0));
  const totalKm = Math.round(completedThisWeek.reduce((sum, s) => sum + (s.distance_km ?? 0), 0) * 10) / 10;

  const completedPrevWeek = prevWeekSessions.filter(
    (s) => (s.status === "realizada" || s.status === "parcial") && s.discipline !== "descanso"
  );
  const prevWeekLoad = Math.round(completedPrevWeek.reduce((sum, s) => sum + sessionLoad(s), 0));

  let loadComparisonPct: number | null = null;
  if (prevWeekLoad > 0) {
    loadComparisonPct = Math.round((currentWeekLoad / prevWeekLoad) * 100);
  }

  // 1. ANÁLISIS DE ACWR Y EXPLICACIÓN DEL "POR QUÉ"
  let acwrStatus: WeeklyCoachAssessment["loadAnalysis"]["acwrStatus"] = "optimo";
  let acwrBadge = "Óptimo";
  let acwrWhyExplanation = "";

  if (acwr === null) {
    acwrStatus = "infracarga";
    acwrBadge = "Sin datos";
    acwrWhyExplanation =
      "No hay todavía suficientes semanas de historial registradas para calcular un ratio ACWR estadísticamente fiable.";
  } else if (acwr < 0.8) {
    acwrStatus = "infracarga";
    acwrBadge = isCurrentWeek && currentDow < 7 ? "En curso" : "Infracarga";
    if (isCurrentWeek && currentDow < 7) {
      acwrWhyExplanation = `¿Por qué sale Precaución con ${acwr.toFixed(2)}? Actualmente estamos a mitad de semana (${DAY_NAMES_ES[currentDow - 1]}) y el ratio compara tu carga acumulada hasta hoy con una semana completa típica de 7 días (carga crónica). Al faltar los entrenamientos de los próximos días, es fisiológicamente normal que esté por debajo de 0.80. No tienes fatiga acumulada excesiva, pero para no perder adaptaciones de volumen es importante completar los entrenamientos que te quedan.`;
    } else {
      acwrWhyExplanation = `¿Por qué sale Precaución con ${acwr.toFixed(2)}? Tu carga de entrenamiento en los últimos 7 días ha caído por debajo del 80% de tu media habitual. Significa que has reducido drásticamente el volumen o intensidad. Es útil para descargar si venías saturado, pero evita volver a meter un pico brusco la próxima semana sin progresión.`;
    }
  } else if (acwr <= 1.3) {
    acwrStatus = "optimo";
    acwrBadge = "Óptimo";
    acwrWhyExplanation = `¿Por qué es Óptimo con ${acwr.toFixed(2)}? Tu ratio está dentro del "sweet spot" científico (0.80 a 1.30). Tu carga aguda progresa en perfecta armonía con tu carga crónica, maximizando las adaptaciones de fuerza y resistencia cardiovascular con el menor riesgo de lesión.`;
  } else if (acwr <= 1.5) {
    acwrStatus = "sobrecarga_moderada";
    acwrBadge = "Atención";
    acwrWhyExplanation = `¿Por qué sale Atención con ${acwr.toFixed(2)}? Tu carga aguda está entre 1.30 y 1.50 veces por encima de tu media. Estás en una fase de sobrecarga funcional intencionada; asegura al menos 8h de sueño y buena nutrición para asimilarla.`;
  } else {
    acwrStatus = "sobrecarga_alta";
    acwrBadge = "Sobrecarga";
    acwrWhyExplanation = `¿Por qué sale Alerta de Sobrecarga con ${acwr.toFixed(2)}? Has aumentado la carga más de un 50% respecto a tu media crónica. Entras en la zona de peligro de lesión y sobreentrenamiento. Como tu entrenador, te recomiendo bajar intensidad en la siguiente sesión y no sumar kilómetros extra.`;
  }

  // 2. DETECCIÓN DEL PICO DE CARGA DE LA SEMANA
  let peakSession: PeakSessionInfo | null = null;
  let maxLoad = -1;

  for (const s of completedThisWeek) {
    const l = sessionLoad(s);
    if (l > maxLoad && s.duration_min && s.rpe) {
      maxLoad = l;
      const dow = isoDayOfWeek(s.date);
      const dayName = DAY_NAMES_ES[dow - 1];
      peakSession = {
        id: s.id,
        date: s.date,
        dayName,
        discipline: s.discipline,
        plannedCode: s.planned_code,
        durationMin: s.duration_min,
        rpe: s.rpe,
        load: Math.round(l),
        notes: s.notes,
        highlightText: `El pico de más carga de la semana fue el ${dayName} (${DISCIPLINE_DISPLAY[s.discipline] ?? s.discipline}${s.planned_code ? ` · ${s.planned_code}` : ""}) con ${s.duration_min.toFixed(0)} min a RPE ${s.rpe}/10 (${Math.round(l)} pts de carga Foster).`,
      };
    }
  }

  // 3. DESGLOSE DÍA A DÍA
  const daysBreakdown: CoachDaySession[] = thisWeekSessions.map((s) => {
    const dow = isoDayOfWeek(s.date);
    const dayName = DAY_NAMES_ES[dow - 1];
    const load = sessionLoad(s);
    const isPeak = peakSession ? s.id === peakSession.id : false;

    let coachComment = "";
    if (s.status === "realizada" || s.status === "parcial") {
      if (s.discipline === "crossfit") {
        coachComment = `Sesión de alta potencia y demanda neuromuscular (RPE ${s.rpe ?? 8}). Gran trabajo de fuerza metabólica.`;
      } else if (s.discipline === "gimnasio") {
        coachComment = `Estímulo de fuerza completado con éxito (${s.duration_min?.toFixed(0)} min, RPE ${s.rpe ?? 7}). Fibras bien activadas.`;
      } else if (s.discipline === "natacion") {
        coachComment = `Nado aeróbico fluido (${s.distance_km ? `${s.distance_km} km` : `${s.duration_min} min`}). Excelente descarga articular.`;
      } else if (s.discipline === "carrera") {
        coachComment = `Rodaje completado (${s.distance_km ? `${s.distance_km} km` : ""} a RPE ${s.rpe ?? 5}). Kilómetros sumados al motor aeróbico.`;
      } else {
        coachComment = `Actividad complementaria realizada (${s.duration_min ?? 0} min). Suma volumen sin impacto lesivo.`;
      }
    } else {
      coachComment = `Pendiente: ${DISCIPLINE_DISPLAY[s.discipline] ?? s.discipline}${s.planned_code ? ` (${s.planned_code})` : ""} según plan.`;
    }

    return {
      id: s.id,
      date: s.date,
      dayName,
      discipline: s.discipline,
      plannedCode: s.planned_code,
      status: s.status,
      durationMin: s.duration_min,
      distanceKm: s.distance_km,
      rpe: s.rpe,
      load: Math.round(load),
      notes: s.notes,
      isPeak,
      coachComment,
    };
  });

  const plannedCount = thisWeekSessions.filter((s) => s.discipline !== "descanso").length;
  const completedCount = completedThisWeek.length;
  const pendingCount = plannedCount - completedCount;
  const compliancePct = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : null;

  // 4. VEREDICTO NARRATIVO DINÁMICO DEL ENTRENADOR PERSONAL
  const lastNightHours = readiness.stats.sleepHours;
  const sleepText = lastNightHours ? `${lastNightHours.toFixed(1)}h de sueño` : "sueño pendiente de registro";

  // Identificar qué pasó ayer y qué toca hoy dinámicamente
  const yesterdayDate = addDays(today, -1);
  const yesterdaySessions = thisWeekSessions.filter((s) => s.date === yesterdayDate);
  const yesterdayCompleted = yesterdaySessions.filter((s) => s.status === "realizada" || s.status === "parcial");
  const todaySessions = thisWeekSessions.filter((s) => s.date === today);
  const todaySession = todaySessions[0];

  let verdictTitle = "Semana con excelente ritmo y constancia";
  let verdictTone: WeeklyCoachAssessment["coachVerdict"]["tone"] = "success";
  let verdictNarrative = "";
  const actionablePoints: string[] = [];

  if (isCurrentWeek) {
    if (completedCount >= 1) {
      verdictTitle = completedCount >= 3 ? "Llevas un arranque de semana impecable" : "Semana en marcha, buen ritmo";
      verdictTone = completedCount >= 3 ? "success" : "brand";

      const disciplinesSummary = Array.from(new Set(completedThisWeek.map((s) => DISCIPLINE_DISPLAY[s.discipline] ?? s.discipline))).join(", ");

      verdictNarrative = `Llevas ${completedCount} de ${plannedCount} entrenamientos completados (${totalMinutes} min acumulados${totalKm > 0 ? `, ${totalKm} km` : ""}). Disciplinas trabajadas: ${disciplinesSummary}. Tu descanso (${sleepText}) y tu estado de readiness (${readiness.score}/100) te dan luz verde para los siguientes estímulos.`;

      // Punto accionable sobre la sesión de hoy
      if (todaySession) {
        const todayName = DISCIPLINE_DISPLAY[todaySession.discipline] ?? todaySession.discipline;
        if (todaySession.status === "pendiente") {
          if (todaySession.discipline === "crossfit") {
            actionablePoints.push(
              `Hoy ${DAY_NAMES_ES[currentDow - 1]} toca ${todayName}${todaySession.planned_code ? ` (${todaySession.planned_code})` : ""}: día de alta demanda de potencia y sóleos/gemelos. Calienta bien tobillos y hombros antes de empezar.`
            );
          } else if (todaySession.discipline === "carrera") {
            actionablePoints.push(
              `Hoy ${DAY_NAMES_ES[currentDow - 1]} toca ${todayName}${todaySession.planned_code ? ` (${todaySession.planned_code})` : ""}: mantén el ritmo en zona objetivo sin forzar más de lo pautado.`
            );
          } else if (todaySession.discipline === "natacion") {
            actionablePoints.push(
              `Hoy ${DAY_NAMES_ES[currentDow - 1]} toca ${todayName}${todaySession.planned_code ? ` (${todaySession.planned_code})` : ""}: aprovecha el agua para descargar el impacto articular de las piernas y soltar caja torácica.`
            );
          } else if (todaySession.discipline === "gimnasio") {
            actionablePoints.push(
              `Hoy ${DAY_NAMES_ES[currentDow - 1]} toca ${todayName}${todaySession.planned_code ? ` (${todaySession.planned_code})` : ""}: foco en la técnica y RPE controlado en los ejercicios principales.`
            );
          } else {
            actionablePoints.push(`Hoy ${DAY_NAMES_ES[currentDow - 1]} toca ${todayName}: completa la sesión según las sensaciones del día.`);
          }
        } else {
          actionablePoints.push(`Sesión de hoy (${todayName}) completada con éxito. Rehidrata bien y cuida la cena para recuperar.`);
        }
      }

      // Punto accionable sobre lo que pasó ayer
      if (yesterdayCompleted.length > 0) {
        const ySession = yesterdayCompleted[0];
        const yName = DISCIPLINE_DISPLAY[ySession.discipline] ?? ySession.discipline;
        actionablePoints.push(
          `Asimilación de ayer: completaste ${yName}${ySession.planned_code ? ` (${ySession.planned_code})` : ""} (${ySession.duration_min ? `${ySession.duration_min} min` : ""} a RPE ${ySession.rpe ?? 6}/10). La respuesta de fatiga está dentro de los márgenes normales.`
        );
      }

      actionablePoints.push(
        "Guarda energía para el bloque clave del fin de semana (rodaje progresivo R2 y tirada larga R5 de maratón)."
      );
    } else {
      verdictTitle = "Inicio de semana pendiente";
      verdictTone = "warning";
      verdictNarrative = "Aún no hay sesiones registradas esta semana. Es el momento de arrancar con el primer entreno y asentar la rutina semanal.";
      if (todaySession) {
        actionablePoints.push(`Inicia hoy con ${DISCIPLINE_DISPLAY[todaySession.discipline] ?? todaySession.discipline}${todaySession.planned_code ? ` (${todaySession.planned_code})` : ""} asegurando un buen calentamiento.`);
      } else {
        actionablePoints.push("Revisa el plan semanal y registra tu primera sesión.");
      }
    }
  } else {
    verdictTitle = `Resumen de la semana del ${weekStart.slice(5)}`;
    verdictTone = compliancePct && compliancePct >= 80 ? "success" : "brand";
    verdictNarrative = `Completaste ${completedCount} de ${plannedCount} sesiones (${compliancePct ?? 0}% de cumplimiento) con ${totalMinutes} min y ${totalKm} km totales.`;
    actionablePoints.push(`Carga total Foster asimilada: ${currentWeekLoad} pts.`);
  }

  const weekendStrategy =
    "Estrategia para el fin de semana: Sábado rodaje moderado progresivo R2 (8–12 km) para ganar resistencia a ritmo alegre, y Domingo tirada larga R5 (10–13 km) a ritmo muy cómodo conversacional. La clave de la semana es no quemarse antes del sábado.";

  return {
    weekStart,
    weekEnd,
    today,
    isCurrentWeek,
    dayOfWeekToday: currentDow,
    loadAnalysis: {
      currentWeekLoad,
      prevWeekLoad,
      loadComparisonPct,
      totalMinutes,
      totalKm,
      acwr,
      acwrStatus,
      acwrBadge,
      acwrWhyExplanation,
      loadPacingText: `Has acumulado ${currentWeekLoad} pts de carga Foster esta semana (${totalMinutes} min / ${totalKm} km)${
        prevWeekLoad > 0 ? ` frente a ${prevWeekLoad} pts la semana pasada` : ""
      }.`,
    },
    readinessToday: {
      score: readiness.score,
      levelLabel: readiness.levelLabel,
      tone: readiness.tone,
      headline: readiness.headline,
      summary: readiness.summary,
      sleepLastNightText: sleepText,
      coachAdviceToday: readiness.coachAdvice,
    },
    sessionsProgress: {
      plannedCount,
      completedCount,
      pendingCount,
      compliancePct,
      days: daysBreakdown,
      overviewText: `${completedCount} de ${plannedCount} sesiones completadas (${compliancePct ?? 0}% de cumplimiento)`,
    },
    peakSession,
    coachVerdict: {
      title: verdictTitle,
      tone: verdictTone,
      narrative: verdictNarrative,
      actionablePoints,
      weekendStrategy,
    },
  };
}
