import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { addDays, weekStartOf } from "@/lib/dates";
import { sessionLoad } from "@/lib/recommendations";

export interface ReadinessFactor {
  id: "sleep" | "acute_fatigue" | "weekly_load";
  title: string;
  score: number; // 0 a 100
  status: "optimo" | "bueno" | "moderado" | "bajo";
  badge: string;
  headline: string;
  detail: string;
  metrics: { label: string; value: string }[];
}

export interface DailyReadiness {
  date: string;
  score: number; // 0 a 100
  level: "optimo" | "bueno" | "moderado" | "bajo";
  levelLabel: string;
  tone: "success" | "brand" | "warning" | "danger";
  headline: string;
  summary: string;
  coachAdvice: string;
  factors: ReadinessFactor[];
  stats: {
    sleepHours: number | null;
    sleepScore: number | null;
    sleepQuality: number | null;
    sleepTrend3dAvg: number | null;
    yesterdayTrained: boolean;
    yesterdayDiscipline: string | null;
    yesterdayRpe: number | null;
    last48hLoad: number;
    prevWeekCompletedSessions: number;
    prevWeekLoad: number;
    todayDiscipline: string | null;
    todayPlannedCode: string | null;
  };
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function computeDailyReadiness(targetDate: string): DailyReadiness {
  const yesterday = addDays(targetDate, -1);
  const twoDaysAgo = addDays(targetDate, -2);
  const threeDaysAgo = addDays(targetDate, -3);
  const sevenDaysAgo = addDays(targetDate, -7);

  // 1. Obtener sueño (anoche y últimos 7 días)
  const sleepList = listSleepBetween(sevenDaysAgo, targetDate);
  const sleepToday = sleepList.find((s) => s.date === targetDate);
  const sleepYesterday = sleepList.find((s) => s.date === yesterday);
  // En apps como Zepp, el sueño de anoche puede estar guardado en targetDate (al despertar hoy) o en yesterday
  const lastNightSleep: SleepRow | undefined = sleepToday ?? sleepYesterday;

  const recent3DaysSleep = sleepList.filter((s) => s.date >= threeDaysAgo && s.date <= targetDate);
  const sleepTrend3dAvg = avg(recent3DaysSleep.map((s) => s.hours ?? NaN));

  // 2. Obtener sesiones (últimos 14 días para carga anterior y actual)
  const fourteenDaysAgo = addDays(targetDate, -14);
  const sessions = listSessionsBetween(fourteenDaysAgo, targetDate);

  // Sesión de hoy
  const todaySessions = sessions.filter((s) => s.date === targetDate && s.discipline !== "descanso");
  const todaySession = todaySessions[0];

  // Sesiones de ayer y anteayer
  const yesterdaySessions = sessions.filter(
    (s) => s.date === yesterday && (s.status === "realizada" || s.status === "parcial")
  );
  const twoDaysAgoSessions = sessions.filter(
    (s) => s.date === twoDaysAgo && (s.status === "realizada" || s.status === "parcial")
  );

  const yesterdayTrained = yesterdaySessions.length > 0;
  const yesterdayDiscipline = yesterdaySessions[0]?.discipline ?? null;
  const yesterdayRpe = yesterdaySessions[0]?.rpe ?? null;

  const loadYesterday = yesterdaySessions.reduce((sum, s) => sum + sessionLoad(s), 0);
  const loadTwoDaysAgo = twoDaysAgoSessions.reduce((sum, s) => sum + sessionLoad(s), 0);
  const last48hLoad = loadYesterday + loadTwoDaysAgo;

  // Carga de la semana anterior completa
  const currentWeekMonday = weekStartOf(targetDate);
  const prevWeekMonday = addDays(currentWeekMonday, -7);
  const prevWeekSunday = addDays(currentWeekMonday, -1);
  const prevWeekSessions = sessions.filter(
    (s) =>
      s.date >= prevWeekMonday &&
      s.date <= prevWeekSunday &&
      (s.status === "realizada" || s.status === "parcial") &&
      s.discipline !== "descanso"
  );
  const prevWeekLoad = prevWeekSessions.reduce((sum, s) => sum + sessionLoad(s), 0);
  const prevWeekCompletedSessions = prevWeekSessions.length;

  // ==========================================
  // PUNTUACIÓN FACTOR 1: SUEÑO (0 - 100)
  // ==========================================
  let sleepScoreVal = 70; // fallback neutro si no hay registro
  let sleepHeadline = "Sin datos recientes de sueño";
  let sleepDetail = "No se ha registrado sueño para la noche anterior. Registra o importa tu sueño para afinar el readiness.";
  let sleepStatus: ReadinessFactor["status"] = "bueno";
  const sleepMetrics: { label: string; value: string }[] = [];

  if (lastNightSleep && lastNightSleep.hours != null) {
    const hrs = lastNightSleep.hours;
    const score = lastNightSleep.score;
    const quality = lastNightSleep.quality ?? 3;

    // Horas dormidas (base 60 pts)
    let hoursPts = 0;
    if (hrs >= 8.5) hoursPts = 60;
    else if (hrs >= 7.8) hoursPts = 58;
    else if (hrs >= 7.0) hoursPts = 48;
    else if (hrs >= 6.0) hoursPts = 32;
    else hoursPts = 15;

    // Calidad / Score Zepp (base 40 pts)
    let qualityPts = 0;
    if (score != null) {
      if (score >= 85) qualityPts = 40;
      else if (score >= 75) qualityPts = 34;
      else if (score >= 65) qualityPts = 26;
      else qualityPts = 12;
    } else {
      qualityPts = quality >= 5 ? 40 : quality >= 4 ? 32 : quality >= 3 ? 24 : 12;
    }

    sleepScoreVal = Math.min(100, Math.max(10, hoursPts + qualityPts));

    // Ajuste por tendencia 3 días (si hubo déficit previo)
    if (sleepTrend3dAvg !== null && sleepTrend3dAvg < 6.5) {
      sleepScoreVal = Math.max(20, sleepScoreVal - 10);
    }

    sleepMetrics.push({ label: "Duración", value: `${hrs.toFixed(1)} h` });
    if (score != null) sleepMetrics.push({ label: "Puntuación Zepp", value: `${score}/100` });
    else sleepMetrics.push({ label: "Calidad", value: `${quality}/5` });
    if (lastNightSleep.deep_min != null) sleepMetrics.push({ label: "Sueño profundo", value: `${lastNightSleep.deep_min} min` });

    if (sleepScoreVal >= 85) {
      sleepStatus = "optimo";
      sleepHeadline = `Excelente descanso (${hrs.toFixed(1)}h dormidas)`;
      sleepDetail = `Has dormido ${hrs.toFixed(1)} horas con gran calidad y descanso reparador. Tu sistema nervioso y muscular están completamente recargados.`;
    } else if (sleepScoreVal >= 70) {
      sleepStatus = "bueno";
      sleepHeadline = `Buen descanso (${hrs.toFixed(1)}h)`;
      sleepDetail = `Sueño dentro del rango objetivo. Recuperación adecuada para afrontar las demandas del día con normalidad.`;
    } else if (sleepScoreVal >= 50) {
      sleepStatus = "moderado";
      sleepHeadline = `Sueño justo o algo interrumpido (${hrs.toFixed(1)}h)`;
      sleepDetail = `Menos descanso del óptimo. Puedes entrenar, pero conviene calentar con calma y vigilar si notas pesadez o falta de reflejos.`;
    } else {
      sleepStatus = "bajo";
      sleepHeadline = `Déficit de sueño notable (${hrs.toFixed(1)}h)`;
      sleepDetail = `Menos de 6 horas o descanso muy fragmentado. La coordinación y recuperación muscular están mermadas.`;
    }
  }

  // ==========================================
  // PUNTUACIÓN FACTOR 2: FATIGA AGUDA 24-48H (0 - 100)
  // ==========================================
  let fatigueScoreVal = 85;
  let fatigueStatus: ReadinessFactor["status"] = "bueno";
  let fatigueHeadline = "";
  let fatigueDetail = "";
  const fatigueMetrics: { label: string; value: string }[] = [];

  fatigueMetrics.push({ label: "Carga 48h", value: `${Math.round(last48hLoad)} pts` });
  fatigueMetrics.push({ label: "Ayer", value: yesterdayTrained ? `${yesterdayDiscipline} (RPE ${yesterdayRpe ?? "—"})` : "Descanso" });

  if (!yesterdayTrained) {
    fatigueScoreVal = 95;
    fatigueStatus = "optimo";
    fatigueHeadline = "Cuerpo fresco tras día de descanso ayer";
    fatigueDetail = "Ayer no hubo impacto de entrenamiento, lo que ha permitido al cuerpo asimilar la carga anterior y reparar fibras.";
  } else {
    const isVeryHardYesterday = (yesterdayRpe ?? 0) >= 8 || loadYesterday >= 400;
    const isModerateYesterday = (yesterdayRpe ?? 0) >= 6 || loadYesterday >= 220;

    if (isVeryHardYesterday) {
      fatigueScoreVal = 55;
      fatigueStatus = "moderado";
      fatigueHeadline = `Fatiga residual de la sesión de ayer (${yesterdayDiscipline})`;
      fatigueDetail = `Ayer metiste una sesión intensa (RPE ${yesterdayRpe}). Las piernas y el glucógeno pueden estar parcialmente recuperados pero con tono muscular alto.`;
    } else if (isModerateYesterday) {
      fatigueScoreVal = 75;
      fatigueStatus = "bueno";
      fatigueHeadline = `Carga asimilada de ayer (${yesterdayDiscipline})`;
      fatigueDetail = `La sesión de ayer tuvo una intensidad asumible. Tienes tono muscular activo sin sobrecarga excesiva.`;
    } else {
      fatigueScoreVal = 88;
      fatigueStatus = "optimo";
      fatigueHeadline = "Sesión ligera ayer, mínima fatiga residual";
      fatigueDetail = "El estímulo de ayer fue suave y aeróbico, favoreciendo la circulación sin mermar tu energía para hoy.";
    }

    // Si además hace 2 días hubo otra sesión dura
    if (twoDaysAgoSessions.length > 0 && (twoDaysAgoSessions[0]?.rpe ?? 0) >= 8) {
      fatigueScoreVal = Math.max(30, fatigueScoreVal - 15);
      fatigueDetail += " Además, sumas la intensidad acumulada de hace dos días.";
    }
  }

  // ==========================================
  // PUNTUACIÓN FACTOR 3: CARGA SEMANAL PREVIA (0 - 100)
  // ==========================================
  let weeklyScoreVal = 80;
  let weeklyStatus: ReadinessFactor["status"] = "bueno";
  let weeklyHeadline = "";
  let weeklyDetail = "";
  const weeklyMetrics: { label: string; value: string }[] = [];

  weeklyMetrics.push({ label: "Sesiones semana pasada", value: `${prevWeekCompletedSessions}` });
  weeklyMetrics.push({ label: "Carga Foster semana", value: `${Math.round(prevWeekLoad)} pts` });

  if (prevWeekCompletedSessions >= 4) {
    weeklyScoreVal = 90;
    weeklyStatus = "optimo";
    weeklyHeadline = `Gran base construida la semana anterior (${prevWeekCompletedSessions} entrenos)`;
    weeklyDetail = `Completaste ${prevWeekCompletedSessions} sesiones con buen volumen y variedad de disciplinas. Tu capacidad aeróbica y de tolerancia a la carga está en un punto óptimo.`;
  } else if (prevWeekCompletedSessions >= 2) {
    weeklyScoreVal = 80;
    weeklyStatus = "bueno";
    weeklyHeadline = `Carga regular la semana pasada (${prevWeekCompletedSessions} entrenos)`;
    weeklyDetail = `Entrenaste con regularidad suficiente para mantener las adaptaciones sin generar saturación crónica.`;
  } else {
    weeklyScoreVal = 70;
    weeklyStatus = "moderado";
    weeklyHeadline = `Semana anterior de volumen bajo o descarga (${prevWeekCompletedSessions} entrenos)`;
    weeklyDetail = `Pocos entrenamientos registrados en la semana previa. El cuerpo está fresco, pero conviene retomar el ritmo progresivamente sin picos bruscos.`;
  }

  // ==========================================
  // SCORE GLOBAL DE READINESS (Ponderado)
  // 45% Sueño + 35% Fatiga 48h + 20% Carga Semanal
  // ==========================================
  const overallScore = Math.round(
    sleepScoreVal * 0.45 + fatigueScoreVal * 0.35 + weeklyScoreVal * 0.20
  );

  let level: DailyReadiness["level"] = "bueno";
  let levelLabel = "Bueno";
  let tone: DailyReadiness["tone"] = "brand";
  let headline = "";
  let summary = "";
  let coachAdvice = "";

  const todayName = todaySession ? `${todaySession.discipline} (${todaySession.planned_code ?? "sesión"})` : "descanso";

  if (overallScore >= 82) {
    level = "optimo";
    levelLabel = "Óptimo · Luz Verde";
    tone = "success";
    headline = "¡Estado de forma y recuperación excelente!";
    summary = "Tu cuerpo ha descansado profundamente y ha asimilado la carga previa. Todos los biomarcadores indican que estás en tu mejor ventana para rendir.";
    if (todaySession?.discipline === "gimnasio") {
      coachAdvice = "Hoy toca Gimnasio: tienes luz verde total para mover los pesos objetivo con técnica firme y buscar tu mejor rendimiento en los básicos.";
    } else if (todaySession?.discipline === "carrera") {
      coachAdvice = "Hoy toca Carrera: tus piernas están frescas y el pulso basal descansado. Puedes clavar los ritmos previstos con total soltura.";
    } else if (todaySession?.discipline === "natacion") {
      coachAdvice = "Hoy toca Natación: buena coordinación y energía para deslizar bien en el agua y mantener brazadas largas.";
    } else if (todaySession?.discipline === "crossfit") {
      coachAdvice = "Hoy toca CrossFit: depósito de energía lleno para afrontar el WOD con intensidad controlada.";
    } else {
      coachAdvice = "Día perfecto para entrenar con calidad o aprovechar al máximo el descanso.";
    }
  } else if (overallScore >= 68) {
    level = "bueno";
    levelLabel = "Bueno · Listo para entrenar";
    tone = "brand";
    headline = "Recuperación adecuada y buen tono físico";
    summary = "Tus niveles de fatiga y descanso están equilibrados. Puedes completar el entreno programado según lo planeado.";
    coachAdvice = `Sesión prevista: ${todayName}. Mantén el plan pautado y escucha a tu cuerpo en el calentamiento; no fuerces más allá de lo necesario.`;
  } else if (overallScore >= 52) {
    level = "moderado";
    levelLabel = "Moderado · Con cautela";
    tone = "warning";
    headline = "Fatiga residual o sueño insuficiente";
    summary = "Existe algo de deuda de descanso o carga acumulada en las últimas 48h. El cuerpo rinde, pero con menor margen de reserva.";
    coachAdvice = `Para hoy (${todayName}): calienta 5-10 min extra. Si notas pesadez, baja un 5-10% la carga o corre a ritmos netamente conversacionales (RPE 5-6).`;
  } else {
    level = "bajo";
    levelLabel = "Fatiga Alta · Priorizar Descarga";
    tone = "danger";
    headline = "Señales de fatiga alta o descanso deficiente";
    summary = "La combinación de poco sueño y esfuerzo reciente aconseja prudencia para evitar sobrecargas o lesiones.";
    coachAdvice = `Valora reducir a la mitad la sesión de hoy (${todayName}), hacer movilidad suave o cambiar a un paseo/descanso activo.`;
  }

  const factors: ReadinessFactor[] = [
    {
      id: "sleep",
      title: "Sueño y Recuperación",
      score: sleepScoreVal,
      status: sleepStatus,
      badge: `${sleepScoreVal}/100`,
      headline: sleepHeadline,
      detail: sleepDetail,
      metrics: sleepMetrics,
    },
    {
      id: "acute_fatigue",
      title: "Fatiga Aguda (24-48h)",
      score: fatigueScoreVal,
      status: fatigueStatus,
      badge: `${fatigueScoreVal}/100`,
      headline: fatigueHeadline,
      detail: fatigueDetail,
      metrics: fatigueMetrics,
    },
    {
      id: "weekly_load",
      title: "Carga y Asimilación Previa",
      score: weeklyScoreVal,
      status: weeklyStatus,
      badge: `${weeklyScoreVal}/100`,
      headline: weeklyHeadline,
      detail: weeklyDetail,
      metrics: weeklyMetrics,
    },
  ];

  return {
    date: targetDate,
    score: overallScore,
    level,
    levelLabel,
    tone,
    headline,
    summary,
    coachAdvice,
    factors,
    stats: {
      sleepHours: lastNightSleep?.hours ?? null,
      sleepScore: lastNightSleep?.score ?? null,
      sleepQuality: lastNightSleep?.quality ?? null,
      sleepTrend3dAvg,
      yesterdayTrained,
      yesterdayDiscipline,
      yesterdayRpe,
      last48hLoad,
      prevWeekCompletedSessions,
      prevWeekLoad,
      todayDiscipline: todaySession?.discipline ?? null,
      todayPlannedCode: todaySession?.planned_code ?? null,
    },
  };
}
