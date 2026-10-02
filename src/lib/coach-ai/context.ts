import { todayISO, weekStartOf, addDays, isoDayOfWeek } from "@/lib/dates";
import { computeCoachWeeklyAssessment, WeeklyCoachAssessment } from "@/lib/coach-assessment";
import { computeDailyReadiness, DailyReadiness } from "@/lib/readiness";
import { getAllSettings } from "@/lib/repo/settings";
import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listGymPRs } from "@/lib/repo/gym";

export interface CoachAthleteContext {
  today: string;
  athleteName: string;
  profile: {
    marathonDate: string | null;
    targetPace: string | null;
    vamPace: string;
    vamSpeed: string;
    hrNote: string | null;
    currentPhase: string | null;
    allergies: string | null;
  };
  weeklyAssessment: WeeklyCoachAssessment;
  dailyReadiness: DailyReadiness;
  upcomingSessions: SessionRow[];
  recentGymPRs: { exercise: string; maxWeight: number; date: string }[];
  contextMarkdown: string;
}

export function buildCoachAthleteContext(todayParam?: string): CoachAthleteContext {
  const today = todayParam || todayISO();
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);

  const settings = getAllSettings();
  const weeklyAssessment = computeCoachWeeklyAssessment(weekStart);
  const dailyReadiness = computeDailyReadiness(today);

  // Sesiones desde hoy hasta el domingo
  const allWeekSessions = listSessionsBetween(today, weekEnd);
  const upcomingSessions = allWeekSessions.filter((s) => s.status === "pendiente" || s.date >= today);

  // Sesión de ayer, hoy y mañana
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const adjacentSessions = listSessionsBetween(yesterday, tomorrow);
  const yesterdaySession = adjacentSessions.find((s) => s.date === yesterday && s.discipline !== "descanso");
  const todaySession = adjacentSessions.find((s) => s.date === today && s.discipline !== "descanso");
  const tomorrowSession = adjacentSessions.find((s) => s.date === tomorrow && s.discipline !== "descanso");

  // Mejores marcas de gimnasio
  let recentGymPRs: { exercise: string; maxWeight: number; date: string }[] = [];
  try {
    const prs = listGymPRs();
    recentGymPRs = prs.slice(0, 5).map((p) => ({
      exercise: p.exercise_name,
      maxWeight: p.max_weight,
      date: p.date,
    }));
  } catch {
    // Si no hay PRs no rompe
  }

  // Generar bloque formateado en Markdown para inyectar en el prompt
  const completedList = weeklyAssessment.sessionsProgress.days
    .filter((d) => d.status === "realizada" || d.status === "parcial")
    .map(
      (d) =>
        `- **${d.dayName} (${d.date})**: ${d.discipline.toUpperCase()}${d.plannedCode ? ` (${d.plannedCode})` : ""} · ${d.durationMin ?? 0} min${d.distanceKm ? ` · ${d.distanceKm} km` : ""} · RPE ${d.rpe ?? "?"}/10 · Carga Foster: ${d.load} pts${d.isPeak ? " [PICO DE CARGA SEMANAL]" : ""}`
    )
    .join("\n");

  const pendingList = upcomingSessions
    .filter((s) => s.status !== "realizada" && s.discipline !== "descanso")
    .map(
      (s) =>
        `- **${s.date}**: ${s.discipline.toUpperCase()}${s.planned_code ? ` (${s.planned_code})` : ""} · ${s.duration_min ? `${s.duration_min} min` : ""}${s.distance_km ? ` · ${s.distance_km} km` : ""} (Objetivo: ${s.notes || "Entreno pautado"})`
    )
    .join("\n");

  const prsList = recentGymPRs.length > 0
    ? recentGymPRs.map((pr) => `- ${pr.exercise}: ${pr.maxWeight} kg (${pr.date})`).join("\n")
    : "Sin registros de RM recientes.";

  const contextMarkdown = `
### DATOS REALES DEL ATLETA (ACTUALIZADOS A FECHA: ${today})
- **Nombre**: Daniel Espinosa
- **Objetivo principal**: 2ª Maratón (${settings.goal_race_date || "2027-04-26"}), Ritmo objetivo: ${settings.target_pace_scenario || "5:00-5:15 min/km (Sub 3h45)"}
- **Fase de preparación**: ${settings.current_phase || "Fase 1a (Base aeróbica + Hipertrofia)"}
- **Prueba VAM Oficial**: 3:59 min/km (15.06 km/h).
- **Zonas de Ritmo Oficiales**:
  * **R0 (Regenerativo)**: > 5:23 min/km (5:25 - 5:50 min/km) a RPE 3-4.
  * **R1 (Aeróbico Ligero / Base)**: 5:23 - 4:59 min/km a RPE 4-5.
  * **RMC (Ritmo Maratón Objetivo)**: 5:00 - 5:15 min/km a RPE 5-6.
  * **R2 (Aeróbico Medio / Umbral Aeróbico)**: 4:59 - 4:35 min/km a RPE 6-7.
  * **R3 (Tempo / Umbral Anaeróbico)**: 4:23 - 4:11 min/km a RPE 7-8.
  * **R3+ (VAM / VO2max)**: 3:59 min/km a RPE 9-10.
- **Nota médica y Fisiología**: ${settings.resting_hr_note || "Taquicardia en reposo (~100 lpm). Apto sin restricciones. Entrenar SIEMPRE por ritmo (min/km) y RPE (1-10 Foster), NUNCA por zonas de pulso absoluto (lpm)."}
- **Alergias / Nutrición**: ${settings.allergies || "Alergia estricta a frutos secos"}. ${settings.fish_note || "No come pescado (suplementa Omega-3 diario)"}.

#### ESTADO DE CARGA SEMANAL (Semana del ${weeklyAssessment.weekStart} al ${weeklyAssessment.weekEnd})
- **Carga Foster acumulada**: ${weeklyAssessment.loadAnalysis.currentWeekLoad} pts (${weeklyAssessment.loadAnalysis.totalMinutes} min · ${weeklyAssessment.loadAnalysis.totalKm} km en ${weeklyAssessment.sessionsProgress.completedCount} sesiones).
- **Semana anterior**: ${weeklyAssessment.loadAnalysis.prevWeekLoad} pts Foster.
- **Ratio ACWR (Carga Aguda : Crónica)**: ${weeklyAssessment.loadAnalysis.acwr !== null ? weeklyAssessment.loadAnalysis.acwr.toFixed(2) : "En cálculo"} (${weeklyAssessment.loadAnalysis.acwrBadge}).
  *Diagnóstico del ratio*: ${weeklyAssessment.loadAnalysis.acwrWhyExplanation}
- **Pico de más carga de la semana**: ${
    weeklyAssessment.peakSession
      ? `${weeklyAssessment.peakSession.dayName} · ${weeklyAssessment.peakSession.discipline.toUpperCase()} (${weeklyAssessment.peakSession.durationMin} min @ RPE ${weeklyAssessment.peakSession.rpe}/10 = ${weeklyAssessment.peakSession.load} pts Foster)`
      : "Ninguno registrado aún."
  }

#### SESIONES INMEDIATAS
- **Ayer**: ${yesterdaySession ? `${yesterdaySession.discipline.toUpperCase()} (${yesterdaySession.planned_code ?? "sesión"}) · Estado: ${yesterdaySession.status} · RPE: ${yesterdaySession.rpe ?? "—"}` : "Descanso"}
- **Hoy**: ${todaySession ? `${todaySession.discipline.toUpperCase()} (${todaySession.planned_code ?? "sesión"}) · ${todaySession.duration_min ?? 45} min` : "Descanso programado"}
- **Mañana**: ${tomorrowSession ? `${tomorrowSession.discipline.toUpperCase()} (${tomorrowSession.planned_code ?? "sesión"}) · ${tomorrowSession.duration_min ?? 45} min` : "Descanso programado"}

#### ENTRENAMIENTOS REALIZADOS ESTA SEMANA
${completedList || "Ningún entrenamiento registrado todavía esta semana."}

#### ENTRENAMIENTOS PENDIENTES ESTA SEMANA
${pendingList || "Todos los entrenamientos de la semana han sido completados o es día de descanso."}

#### RECUPERACIÓN Y SUEÑO DE HOY (${today})
- **Puntuación de Readiness**: ${dailyReadiness.score}/100 (${dailyReadiness.verdict?.badgeLabel || dailyReadiness.levelLabel})
- **Veredicto del Entrenador**: ${dailyReadiness.verdict?.title || dailyReadiness.headline}
- **Pauta para hoy**: ${dailyReadiness.verdict?.actionGuidance || dailyReadiness.coachAdvice}
- **Descanso nocturno**: ${dailyReadiness.stats.sleepHours ? `${dailyReadiness.stats.sleepHours.toFixed(1)} horas` : "No registrado"} (Score Zepp: ${dailyReadiness.stats.sleepScore ?? "—"}/100)

#### RÉCORDS RECIENTES DE FUERZA (GIMNASIO)
${prsList}
`.trim();

  return {
    today,
    athleteName: "Daniel Espinosa",
    profile: {
      marathonDate: settings.goal_race_date ?? "2027-04-26",
      targetPace: settings.target_pace_scenario ?? "5:00-5:15 min/km",
      vamPace: "3:59 min/km",
      vamSpeed: "15.06 km/h",
      hrNote: settings.resting_hr_note ?? null,
      currentPhase: settings.current_phase ?? "Fase 1a (Base aeróbica + Hipertrofia)",
      allergies: settings.allergies ?? "Frutos secos / Sin pescado",
    },
    weeklyAssessment,
    dailyReadiness,
    upcomingSessions,
    recentGymPRs,
    contextMarkdown,
  };
}
