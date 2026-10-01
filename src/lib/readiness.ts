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

function getSportSpecificReadinessAdvice(
  overallScore: number,
  todaySession: SessionRow | null
): {
  verdictType: VerdictType;
  verdictBadgeLabel: string;
  verdictTitle: string;
  verdictDesc: string;
  actionGuidance: string;
  coachAdvice: string;
  activeRecPace: string;
} {
  const discipline = todaySession?.discipline ?? "descanso";
  const code = todaySession?.planned_code ? ` · ${todaySession.planned_code}` : "";
  const name = todaySession ? `${todaySession.discipline}${code}` : "descanso";

  if (overallScore >= 82) {
    const verdictType: VerdictType = "push";
    const verdictBadgeLabel = "🟢 PUEDES APRETAR MÁS";
    const verdictTitle = "Luz Verde Total · Máxima Capacidad";
    const verdictDesc = "Recuperación plena y sistema nervioso fresco. Tienes luz verde para dar el 100% en tu sesión programada.";
    const activeRecPace = "Zona alta / Ritmo rápido / Cargas al 100%";

    let actionGuidance = "";
    let coachAdvice = "";

    switch (discipline) {
      case "crossfit":
        actionGuidance = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD + Skill"}): Depósito de energía al 100% y sistema neuromuscular fresco. Tienes luz verde para dar máxima intensidad en el WOD, clavar ritmos altos y atacar las transiciones con agresividad (RPE 8.5–9).`;
        coachAdvice = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD"}): Tienes luz verde total para afrontar el entrenamiento con máxima intensidad, controlando la técnica en fatiga.`;
        break;
      case "carrera":
        actionGuidance = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Piernas frescas y pulso basal descansado. Puedes rodar con soltura en la parte rápida de tu zona objetivo (R1 a 5:00 min/km, buscar R2 a 4:35 min/km o clavar RMC a 5:00–5:15 min/km).`;
        coachAdvice = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Tus piernas están frescas y el pulso descansado. Puedes buscar la parte más rápida de tus zonas VAM con total soltura.`;
        break;
      case "gimnasio":
        actionGuidance = `Hoy toca Fuerza / Gimnasio (${todaySession?.planned_code || "Pesas"}): Recuperación neuromuscular óptima. Puedes mover los pesos objetivo con máxima aceleración concéntrica y añadir 2.5–5 kg si la técnica en básicos es sólida (RIR 1-2).`;
        coachAdvice = `Hoy toca Gimnasio (${todaySession?.planned_code || "Pesas"}): Luz verde total para mover los pesos objetivo con técnica firme y buscar tu mejor rendimiento en los básicos.`;
        break;
      case "natacion":
        actionGuidance = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Energía y coordinación al máximo. Excelente día para meter metros de calidad, buscando brazadas potentes, óptimo deslizamiento y ritmo constante por /100m.`;
        coachAdvice = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Excelente coordinación para deslizar bien en el agua y mantener brazadas eficientes.`;
        break;
      case "ciclismo":
        actionGuidance = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Frescura muscular total. Tienes luz verde para sostener vatios altos en subidas o tramos de tempo y rodar ágil a 85–95 rpm.`;
        coachAdvice = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Buenas piernas para rodar a ritmo vivo y mantener una cadencia fluida.`;
        break;
      case "caminata":
        actionGuidance = `Hoy toca Caminata / Senderismo (${todaySession?.planned_code || "Caminata"}): Excelente activación aeróbica sin impacto articular. Mantén un paso ágil y constante para oxigenar la musculatura.`;
        coachAdvice = `Hoy toca Caminata: Actividad aeróbica perfecta para sumar movimiento activo sin fatiga articular.`;
        break;
      case "descanso":
        actionGuidance = `Hoy es día de Descanso programado: Supercompensación óptima. Tu cuerpo está asimilando la carga acumulada y recargando glucógeno al 100% para los próximos entrenos.`;
        coachAdvice = `Día de descanso programado: Aprovecha para recuperar profundamente y llegar fresco a la siguiente sesión.`;
        break;
      default:
        actionGuidance = `Hoy toca ${todaySession?.planned_code || "Entrenamiento"}: Luz verde total. Tienes los depósitos llenos y la energía al máximo para rendir al 100%.`;
        coachAdvice = `Día perfecto para entrenar con calidad y aprovechar tu excelente recuperación.`;
        break;
    }

    return { verdictType, verdictBadgeLabel, verdictTitle, verdictDesc, actionGuidance, coachAdvice, activeRecPace };
  } else if (overallScore >= 66) {
    const verdictType: VerdictType = "maintain";
    const verdictBadgeLabel = "🟡 MANTÉN EL RITMO";
    const verdictTitle = "Buen Tono · Ritmo Crucero";
    const verdictDesc = "Nivel de energía y recuperación equilibrado. Cumple el entrenamiento programado según lo planeado.";
    const activeRecPace = "Ritmo planificado / RPE 6-7";

    let actionGuidance = "";
    let coachAdvice = "";

    switch (discipline) {
      case "crossfit":
        actionGuidance = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD"}): Nivel de energía estable. Completa el WOD a ritmo crucero constante (RPE 7-8), gestionando bien las pausas y sin quemarte en las primeras rondas.`;
        coachAdvice = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD"}): Mantén un ritmo sostenido y buena técnica en cada movimiento.`;
        break;
      case "carrera":
        actionGuidance = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Tono físico estable. Cumple con precisión los ritmos pautados en tu zona VAM (R1 a 5:15–5:23 min/km) manteniendo RPE 5–7 sin forzar de más.`;
        coachAdvice = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Mantén el plan pautado y rueda con fluidez sin exceder los ritmos objetivo.`;
        break;
      case "gimnasio":
        actionGuidance = `Hoy toca Fuerza / Gimnasio (${todaySession?.planned_code || "Pesas"}): Buen tono muscular. Cumple las series y repeticiones prescritas manteniendo RIR 2 y descansos completos entre series.`;
        coachAdvice = `Hoy toca Gimnasio (${todaySession?.planned_code || "Pesas"}): Ejecuta las series pautadas con técnica impecable y buena recuperación entre series.`;
        break;
      case "natacion":
        actionGuidance = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Tono aeróbico adecuado. Sigue la pauta de metros e intervalos buscando ritmo constante y buen SWOLF.`;
        coachAdvice = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Concéntrate en la fluidez del nado y la respiración regular.`;
        break;
      case "ciclismo":
        actionGuidance = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Buen nivel de energía. Rueda en zona Z2 aeróbica con cadencia ágil y cómoda sin sobrepasar el umbral.`;
        coachAdvice = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Mantén un pedaleo redondo y constante a lo largo de la ruta.`;
        break;
      case "caminata":
        actionGuidance = `Hoy toca Caminata (${todaySession?.planned_code || "Caminata"}): Paso continuo y cómodo para favorecer el retorno venoso y la quema aeróbica.`;
        coachAdvice = `Hoy toca Caminata: Mantén un paso regular y oxigenante.`;
        break;
      case "descanso":
        actionGuidance = `Hoy es día de Descanso programado: Recuperación adecuada. Mantén una buena hidratación y nutrición equilibrada para llegar a punto mañana.`;
        coachAdvice = `Día de descanso: Asimilando el trabajo de la semana.`;
        break;
      default:
        actionGuidance = `Sesión prevista: ${name}. Mantén las intensidades pautadas y RPE entre 5 y 7 según el plan.`;
        coachAdvice = `Sesión prevista: ${name}. Mantén el plan pautado y escucha a tu cuerpo en el calentamiento.`;
        break;
    }

    return { verdictType, verdictBadgeLabel, verdictTitle, verdictDesc, actionGuidance, coachAdvice, activeRecPace };
  } else if (overallScore >= 48) {
    const verdictType: VerdictType = "reduce";
    const verdictBadgeLabel = "🟠 BAJA LA INTENSIDAD";
    const verdictTitle = "Precaución · Modula la Carga";
    const verdictDesc = "Existe fatiga muscular residual o descanso incompleto. Conviene adaptar la sesión para no sobrecargar el organismo.";
    const activeRecPace = "Ritmo regenerativo / RPE 4-5";

    let actionGuidance = "";
    let coachAdvice = "";

    switch (discipline) {
      case "crossfit":
        actionGuidance = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD"}): Fatiga acumulada detectada. Modula la intensidad del WOD: baja el ritmo a RPE 6, escala cargas o impactos si lo necesitas y prioriza técnica limpia sobre cronómetro.`;
        coachAdvice = `Hoy toca CrossFit (${todaySession?.planned_code || "WOD"}): Calienta 5-10 min extra y no busques ir al fallo; entrena con margen de seguridad.`;
        break;
      case "carrera":
        actionGuidance = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Fatiga o deuda de sueño detectada. Rueda exclusivamente en zona R0/R1 regenerativa (>5:25 min/km, ej. 5:35–5:50 min/km) a RPE ≤ 5 sin meter series ni cambios de ritmo.`;
        coachAdvice = `Hoy toca Carrera (${todaySession?.planned_code || "Running"}): Si notas pesadez o pulso alto, reduce ritmos a trote conversacional suave (RPE 4-5).`;
        break;
      case "gimnasio":
        actionGuidance = `Hoy toca Fuerza / Gimnasio (${todaySession?.planned_code || "Pesas"}): Fatiga neuromuscular. Trabaja con pesos submáximos dejando 3–4 repeticiones en recámara (RIR 3-4) y evita series al fallo.`;
        coachAdvice = `Hoy toca Gimnasio (${todaySession?.planned_code || "Pesas"}): Prioriza la calidad técnica y no fuerces kilos extras hoy.`;
        break;
      case "natacion":
        actionGuidance = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Energía moderada. Realiza un nado suave y continuo sin series lácticas, buscando soltar hombros y espalda.`;
        coachAdvice = `Hoy toca Natación (${todaySession?.planned_code || "Piscina"}): Nado regenerativo para soltar tensión articular.`;
        break;
      case "ciclismo":
        actionGuidance = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Fatiga en piernas. Rueda suave en llano en Z1/Z2 regenerativo con desarrollo blando y cadencia suelta.`;
        coachAdvice = `Hoy toca Ciclismo (${todaySession?.planned_code || "Bici"}): Pedaleo regenerativo sin forzar en repechos.`;
        break;
      case "caminata":
        actionGuidance = `Hoy toca Caminata: Paseo suave y regenerativo a paso muy cómodo para favorecer la recuperación.`;
        coachAdvice = `Paseo regenerativo suave para soltar piernas.`;
        break;
      case "descanso":
        actionGuidance = `Hoy es día de Descanso: Excelente momento para recuperar la fatiga acumulada en las últimas 48h. Prioriza descanso, siesta e hidratación.`;
        coachAdvice = `Descanso necesario: Permite que tus músculos y sistema nervioso se regeneren.`;
        break;
      default:
        actionGuidance = `Hoy toca ${todaySession?.planned_code || "Entrenamiento"}: Reduce la exigencia hoy a un nivel suave o regenerativo (RPE ≤ 5).`;
        coachAdvice = `Modula la sesión de hoy para no acumular sobreentrenamiento.`;
        break;
    }

    return { verdictType, verdictBadgeLabel, verdictTitle, verdictDesc, actionGuidance, coachAdvice, activeRecPace };
  } else {
    const verdictType: VerdictType = "rest";
    const verdictBadgeLabel = "🔴 PRIORIZA DESCANSO";
    const verdictTitle = "Descanso / Descarga Necesaria";
    const verdictDesc = "Déficit agudo de sueño o saturación de carga. El entrenamiento duro hoy sería contraproducente para el rendimiento.";
    const activeRecPace = "Descanso total o movilidad suave";

    let actionGuidance = "";
    let coachAdvice = "";

    switch (discipline) {
      case "crossfit":
        actionGuidance = `Hoy toca CrossFit: Fatiga alta o descanso muy deficiente. Se aconseja cambiar el WOD de alta intensidad por una sesión suave de movilidad articular, estiramientos o descanso total para no sobrecargar el SNC.`;
        coachAdvice = `Valora cambiar el CrossFit de hoy por descanso o movilidad articular para permitir que el cuerpo recupere.`;
        break;
      case "carrera":
        actionGuidance = `Hoy toca Carrera: Sobrecarga o fatiga aguda. Se recomienda descanso total o paseo suave. Si decides trotar, no pases de 20 min en R0 regenerativo (>5:45 min/km).`;
        coachAdvice = `Valora cambiar la carrera de hoy por descanso total o trote muy suave regenerativo.`;
        break;
      case "gimnasio":
        actionGuidance = `Hoy toca Gimnasio: Fatiga alta. Reduce el volumen a la mitad o cambia la sesión por trabajo de movilidad y estiramientos para proteger tendones y articulaciones.`;
        coachAdvice = `Descanso o descarga activa aconsejada para proteger el sistema muscular y articular.`;
        break;
      case "natacion":
        actionGuidance = `Hoy toca Natación: Nivel de energía bajo. Limita la sesión a un baño regenerativo muy suave para soltar musculatura o tómate el día libre.`;
        coachAdvice = `Sesión de descarga muy suave o descanso total.`;
        break;
      case "ciclismo":
        actionGuidance = `Hoy toca Ciclismo: Fatiga alta. Limita el tiempo a un rodaje muy suave o sustituye por descanso total.`;
        coachAdvice = `Descanso o rodaje regenerativo muy corto.`;
        break;
      case "descanso":
        actionGuidance = `Hoy es día de Descanso crucial: El cuerpo necesita recuperación total. Hidrátate bien y prioriza dormir al menos 8 horas esta noche.`;
        coachAdvice = `Descanso prioritario hoy.`;
        break;
      default:
        actionGuidance = `Se recomienda descanso total o sesión suave de movilidad para permitir la recuperación.`;
        coachAdvice = `Prioriza la recuperación y el descanso hoy.`;
        break;
    }

    return { verdictType, verdictBadgeLabel, verdictTitle, verdictDesc, actionGuidance, coachAdvice, activeRecPace };
  }
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

  if (overallScore >= 82) {
    level = "optimo";
    levelLabel = "Óptimo · Luz Verde";
    tone = "success";
    headline = "¡Estado de forma y recuperación excelente!";
    summary = "Tu cuerpo ha descansado profundamente y ha asimilado la carga previa. Tienes luz verde total para rendir al máximo.";
  } else if (overallScore >= 66) {
    level = "bueno";
    levelLabel = "Bueno · Listo para entrenar";
    tone = "brand";
    headline = "Recuperación adecuada y buen tono físico";
    summary = "Tus niveles de fatiga y descanso están equilibrados. Puedes completar el entreno programado según lo planeado.";
  } else if (overallScore >= 48) {
    level = "moderado";
    levelLabel = "Moderado · Con cautela";
    tone = "warning";
    headline = "Fatiga residual o sueño insuficiente";
    summary = "Existe deuda de descanso o fatiga muscular de las últimas 48h. Conviene modular la intensidad para no acumular sobreentrenamiento.";
  } else {
    level = "bajo";
    levelLabel = "Fatiga Alta · Priorizar Descanso";
    tone = "danger";
    headline = "Señales de fatiga alta o descanso deficiente";
    summary = "La combinación de poco sueño y esfuerzo reciente aconseja prudencia para evitar sobrecargas musculares o sobreentrenamiento.";
  }

  // Obtener diagnóstico y guía 100% personalizada al deporte de hoy
  const sportAdvice = getSportSpecificReadinessAdvice(overallScore, todaySession);

  const verdict: ReadinessVerdict = {
    type: sportAdvice.verdictType,
    badgeLabel: sportAdvice.verdictBadgeLabel,
    tone,
    title: sportAdvice.verdictTitle,
    description: sportAdvice.verdictDesc,
    actionGuidance: sportAdvice.actionGuidance,
    canPushMore: sportAdvice.verdictType === "push",
    shouldRest: sportAdvice.verdictType === "rest",
    paceAdvice: {
      r0: "> 5:23 min/km (5:25 - 5:50)",
      r1: "5:23 - 4:59 min/km",
      r2: "4:59 - 4:35 min/km",
      r3: "4:23 - 4:11 min/km",
      rmc: "5:00 - 5:15 min/km",
      activeRecommendation: sportAdvice.activeRecPace,
    },
  };

  const coachAdvice = sportAdvice.coachAdvice;

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
