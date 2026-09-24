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
        `- **${d.dayName} (${d.date})**: ${d.discipline.toUpperCase()}${d.plannedCode ? ` (${d.plannedCode})` : ""} · ${d.durationMin ?? 0} min${d.distanceKm ? ` · ${d.distanceKm} km` : ""} · RPE ${d.rpe ?? "?"}/10 · Carga Foster: ${d.load} pts${d.isPeak ? " [⚡ PICO DE CARGA SEMANAL]" : ""}`
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
- **Objetivo principal**: Maratón (${settings.goal_race_date || "2027-04-26"}), Ritmo objetivo: ${settings.target_pace_scenario || "5:00-5:15 min/km"}
- **Fase de preparación**: ${settings.current_phase || "1a (Base aeróbica + Hipertrofia)"}
- **Nota médica y Fisiología**: ${settings.resting_hr_note || "Taquicardia en reposo (~100 lpm). Apto sin restricciones. Entrenar SIEMPRE por ritmo/RPE y sensaciones, NUNCA por zonas de pulso absoluto."}
- **Alergias / Nutrición**: ${settings.allergies || "Frutos secos"}. ${settings.fish_note || "No come pescado"}.

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

#### ENTRENAMIENTOS REALIZADOS ESTA SEMANA
${completedList || "Ningún entrenamiento registrado todavía esta semana."}

#### ENTRENAMIENTOS PENDIENTES ESTA SEMANA
${pendingList || "Todos los entrenamientos de la semana han sido completados o es día de descanso."}

#### RECUPERACIÓN Y SUEÑO DE HOY (${today})
- **Puntuación de Readiness**: ${dailyReadiness.score}/100 (${dailyReadiness.levelLabel})
- **Descanso nocturno**: ${dailyReadiness.stats.sleepHours ? `${dailyReadiness.stats.sleepHours.toFixed(1)} horas` : "No registrado"} (Score Zepp: ${dailyReadiness.stats.sleepScore ?? "—"}/100)
- **Diagnóstico del día**: ${dailyReadiness.headline}
- **Consejo de recuperación del día**: ${dailyReadiness.coachAdvice}

#### RÉCORDS RECIENTES DE FUERZA (GIMNASIO)
${prsList}
`.trim();

  return {
    today,
    athleteName: "Daniel Espinosa",
    profile: {
      marathonDate: settings.goal_race_date ?? null,
      targetPace: settings.target_pace_scenario ?? null,
      hrNote: settings.resting_hr_note ?? null,
      currentPhase: settings.current_phase ?? null,
      allergies: settings.allergies ?? null,
    },
    weeklyAssessment,
    dailyReadiness,
    upcomingSessions,
    recentGymPRs,
    contextMarkdown,
  };
}
