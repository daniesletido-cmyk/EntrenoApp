import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { addDays, weekStartOf } from "@/lib/dates";

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

export type VerdictType = "push" | "maintain" | "reduce" | "rest";

export interface ReadinessVerdict {
  type: VerdictType;
  badgeLabel: string;
  tone: "success" | "brand" | "warning" | "danger";
  title: string;
  description: string;
  actionGuidance: string;
  canPushMore: boolean;
  shouldRest: boolean;
  paceAdvice: {
    r0: string; // >5:23 (5:25 - 5:50)
    r1: string; // 5:23 - 4:59
    r2: string; // 4:59 - 4:35
    r3: string; // 4:23 - 4:11
    rmc: string; // 5:00 - 5:15
    activeRecommendation: string;
  };
}

export interface ProposedMicroAdjustment {
  sessionId: number;
  date: string;
  discipline: string;
  originalPlannedCode: string | null;
  suggestedDiscipline: string;
  suggestedPlannedCode: string | null;
  suggestedPaceGuidance: string | null;
  action: "modulate_run" | "convert_recovery" | "convert_rest" | "boost_session";
  reason: string;
  isApplied: boolean;
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
  verdict: ReadinessVerdict;
  proposedMicroAdjustments: ProposedMicroAdjustment[];
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

function sessionLoad(s: SessionRow): number {
  if ((s.status !== "realizada" && s.status !== "parcial") || !s.rpe || !s.duration_min) return 0;
  return s.rpe * s.duration_min;
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
  const lastNightSleep: SleepRow | undefined = sleepToday ?? sleepYesterday;

  const recent3DaysSleep = sleepList.filter((s) => s.date >= threeDaysAgo && s.date <= targetDate);
  const sleepTrend3dAvg = avg(recent3DaysSleep.map((s) => s.hours ?? NaN));

  // 2. Obtener sesiones (últimos 14 días y próximos 4 días)
  const fourteenDaysAgo = addDays(targetDate, -14);
  const fourDaysAhead = addDays(targetDate, 4);
  const allSessions = listSessionsBetween(fourteenDaysAgo, fourDaysAhead);

  const pastAndTodaySessions = allSessions.filter((s) => s.date <= targetDate);

  // Sesión de hoy
  const todaySessions = pastAndTodaySessions.filter((s) => s.date === targetDate && s.discipline !== "descanso");
  const todaySession = todaySessions[0];

  // Sesiones de ayer y anteayer
  const yesterdaySessions = pastAndTodaySessions.filter(
    (s) => s.date === yesterday && (s.status === "realizada" || s.status === "parcial")
  );
  const twoDaysAgoSessions = pastAndTodaySessions.filter(
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
  const prevWeekSessions = pastAndTodaySessions.filter(
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
  let sleepScoreVal = 70; // fallback neutro
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

  // Veredicto estructurado y semáforo de cargas
  let verdictType: VerdictType = "maintain";
  let verdictBadgeLabel = "🟡 MANTÉN EL RITMO";
  let verdictTitle = "Rendimiento Estable · Sigue el Plan";
  let verdictDesc = "Tus niveles de fatiga y sueño están equilibrados. Puedes cumplir el entrenamiento programado.";
  let actionGuidance = "Mantén las intensidades pautadas. En carrera corre en zona R1 (5:23–4:59 min/km) o R2 (4:59–4:35 min/km) sin exceder RPE 6-7.";
  let activeRecPace = "R1 (5:23 - 4:59 min/km) o R2 (4:59 - 4:35 min/km)";

  if (overallScore >= 82) {
    level = "optimo";
    levelLabel = "Óptimo · Luz Verde";
    tone = "success";
    headline = "¡Estado de forma y recuperación excelente!";
    summary = "Tu cuerpo ha descansado profundamente y ha asimilado la carga previa. Tienes luz verde total para apretar y rendir al máximo.";
    
    verdictType = "push";
    verdictBadgeLabel = "🟢 PUEDES APRETAR MÁS";
    verdictTitle = "Luz Verde Total · Máxima Capacidad";
    verdictDesc = "Recuperación plena y sistema nervioso fresco. Puedes buscar la parte más rápida de tus zonas objetivo o subir peso.";
    actionGuidance = "Si hoy toca Carrera, puedes rodar con soltura en la parte alta de R1 (5:00 min/km), buscar R2 fuerte (4:35 min/km) o clavar RMC (5:00–5:15 min/km). En gimnasio puedes añadir 2.5–5 kg.";
    activeRecPace = "Zona rápida: R1 (5:00 min/km) / R2 (4:35 min/km) / RMC (5:05 min/km)";

    if (todaySession?.discipline === "gimnasio") {
      coachAdvice = "Hoy toca Gimnasio: tienes luz verde total para mover los pesos objetivo con técnica firme y buscar tu mejor rendimiento en los básicos.";
    } else if (todaySession?.discipline === "carrera") {
      coachAdvice = "Hoy toca Carrera: tus piernas están frescas y el pulso basal descansado. Puedes clavar los ritmos previstos con total soltura buscando la parte alta de la zona.";
    } else if (todaySession?.discipline === "natacion") {
      coachAdvice = "Hoy toca Natación: excelente coordinación y energía para deslizar bien en el agua y mantener brazadas potentes.";
    } else if (todaySession?.discipline === "crossfit") {
      coachAdvice = "Hoy toca CrossFit: depósito de energía al 100% para afrontar el WOD con intensidad alta y buen control postural.";
    } else {
      coachAdvice = "Día perfecto para entrenar con calidad y aprovechar tu excelente recuperación.";
    }
  } else if (overallScore >= 66) {
    level = "bueno";
    levelLabel = "Bueno · Listo para entrenar";
    tone = "brand";
    headline = "Recuperación adecuada y buen tono físico";
    summary = "Tus niveles de fatiga y descanso están equilibrados. Puedes completar el entreno programado según lo planeado.";
    
    verdictType = "maintain";
    verdictBadgeLabel = "🟡 MANTÉN EL RITMO";
    verdictTitle = "Buen Tono · Ritmo Crucero";
    verdictDesc = "El cuerpo está listo para el entreno regular. No fuerces ritmos por encima de lo planificado.";
    actionGuidance = `Sesión prevista: ${todayName}. Mantén RPE entre 5 y 7. Respeta los ritmos VAM estables (R1 a 5:15–5:23 min/km).`;
    activeRecPace = "R1 (5:15 - 5:23 min/km) / R2 (4:45 - 4:59 min/km)";
    coachAdvice = `Sesión prevista: ${todayName}. Mantén el plan pautado y escucha a tu cuerpo en el calentamiento; no fuerces más allá de lo necesario.`;
  } else if (overallScore >= 48) {
    level = "moderado";
    levelLabel = "Moderado · Con cautela";
    tone = "warning";
    headline = "Fatiga residual o sueño insuficiente";
    summary = "Existe deuda de descanso o fatiga muscular de las últimas 48h. Conviene modular la intensidad para no acumular sobreentrenamiento.";
    
    verdictType = "reduce";
    verdictBadgeLabel = "🟠 BAJA LA INTENSIDAD";
    verdictTitle = "Precaución · Modula la Carga";
    verdictDesc = "Se aconseja rodar suave o rebajar series para permitir la regeneración tisular.";
    actionGuidance = "Hoy reduce la exigencia: corre estrictamente en R0 / R1 regenerativo (>5:23 min/km, ej. 5:30–5:45 min/km) a RPE ≤ 5. En fuerza, mantén peso submáximo con 3-4 reps en recámara (RIR 3-4).";
    activeRecPace = "R0 Regenerativo (>5:23 min/km, ej. 5:30 - 5:50 min/km)";
    coachAdvice = `Para hoy (${todayName}): calienta 5-10 min extra. Si notas pesadez o pulso alto, baja un 10-15% la carga o corre a ritmos conversacionales suaves (RPE 4-5).`;
  } else {
    level = "bajo";
    levelLabel = "Fatiga Alta · Priorizar Descanso";
    tone = "danger";
    headline = "Señales de fatiga alta o descanso deficiente";
    summary = "La combinación de poco sueño y esfuerzo reciente aconseja prudencia para evitar sobrecargas musculares, sobreentrenamiento o lesiones.";
    
    verdictType = "rest";
    verdictBadgeLabel = "🔴 PRIORIZA DESCANSO";
    verdictTitle = "Descanso / Descarga Necesaria";
    verdictDesc = "Déficit agudo de sueño o saturación de impacto. El entrenamiento duro hoy sería contraproducente.";
    actionGuidance = "Se recomienda descanso total, sesión suave de movilidad o natación regenerativa muy ligera (RPE 3). Si decides correr, no pases de 20-30 min a R0 muy suave (>5:40 min/km).";
    activeRecPace = "R0 Muy Suave (>5:45 min/km) o Descanso Activo / Movilidad";
    coachAdvice = `Valora cambiar la sesión de hoy (${todayName}) por descanso total, paseo suave o movilidad articular para permitir que el cuerpo recupere el glucógeno y la homeostasis.`;
  }

  const verdict: ReadinessVerdict = {
    type: verdictType,
    badgeLabel: verdictBadgeLabel,
    tone,
    title: verdictTitle,
    description: verdictDesc,
    actionGuidance,
    canPushMore: verdictType === "push",
    shouldRest: verdictType === "rest",
    paceAdvice: {
      r0: "> 5:23 min/km (5:25 - 5:50)",
      r1: "5:23 - 4:59 min/km",
      r2: "4:59 - 4:35 min/km",
      r3: "4:23 - 4:11 min/km",
      rmc: "5:00 - 5:15 min/km",
      activeRecommendation: activeRecPace,
    },
  };

  // ==========================================
  // PROPUESTA DE AJUSTES MICRO (Próximos 3 días)
  // ==========================================
  const proposedMicroAdjustments: ProposedMicroAdjustment[] = [];
  const upcomingSessions = allSessions.filter(
    (s) => s.date > targetDate && s.date <= addDays(targetDate, 3) && s.discipline !== "descanso"
  );

  for (const s of upcomingSessions) {
    const isAlreadyApplied = !!s.notes && s.notes.includes("[Ajuste inteligente]");
    
    // Caso 1: Fatiga alta o déficit severo de sueño -> Modular carrera intensa o crossfit de mañana
    if (overallScore < 55 || (yesterdayRpe !== null && yesterdayRpe >= 8 && last48hLoad > 350)) {
      if (s.discipline === "carrera") {
        const code = (s.planned_code ?? "").toLowerCase();
        const isIntenseRun = code.includes("r2") || code.includes("r3") || code.includes("r4") || code.includes("serie") || code.includes("fartlek") || s.is_long_run === 1;
        
        if (isIntenseRun) {
          proposedMicroAdjustments.push({
            sessionId: s.id,
            date: s.date,
            discipline: s.discipline,
            originalPlannedCode: s.planned_code,
            suggestedDiscipline: "carrera",
            suggestedPlannedCode: "R1 Regenerativo (suave 5:25-5:45 min/km)",
            suggestedPaceGuidance: "5:25 - 5:50 min/km (R0/R1) a RPE ≤ 5",
            action: "modulate_run",
            reason: `Fatiga acumulada en las últimas 48h (RPE ${yesterdayRpe ?? "alto"}) o descanso bajo (${sleepScoreVal}/100). Se adapta para evitar sobrecarga y asimilar el trabajo previo.`,
            isApplied: isAlreadyApplied,
          });
        }
      } else if (s.discipline === "crossfit" || s.discipline === "gimnasio") {
        if (overallScore < 45) {
          proposedMicroAdjustments.push({
            sessionId: s.id,
            date: s.date,
            discipline: s.discipline,
            originalPlannedCode: s.planned_code,
            suggestedDiscipline: "descanso",
            suggestedPlannedCode: null,
            suggestedPaceGuidance: null,
            action: "convert_rest",
            reason: "Readiness muy bajo (<45/100). Se sugiere convertir a descanso o movilidad para proteger tendones y sistema nervioso.",
            isApplied: isAlreadyApplied,
          });
        }
      }
    } else if (overallScore >= 85 && s.discipline === "carrera") {
      // Caso 2: Estado óptimo -> Animar a buscar objetivo alto
      if (!isAlreadyApplied && s.planned_code && (s.planned_code.includes("R1") || s.planned_code.includes("R2"))) {
        proposedMicroAdjustments.push({
          sessionId: s.id,
          date: s.date,
          discipline: s.discipline,
          originalPlannedCode: s.planned_code,
          suggestedDiscipline: "carrera",
          suggestedPlannedCode: s.planned_code,
          suggestedPaceGuidance: "Puedes buscar el ritmo alto de la zona (ej. R1 a 5:00 min/km o R2 a 4:35 min/km)",
          action: "boost_session",
          reason: "Recuperación y biomarcadores en nivel óptimo (Luz Verde).",
          isApplied: false,
        });
      }
    }
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
    verdict,
    proposedMicroAdjustments,
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
