import { todayISO, weekStartOf, addDays, isoDayOfWeek } from "@/lib/dates";
import { computeCoachWeeklyAssessment, WeeklyCoachAssessment } from "@/lib/coach-assessment";
import { computeDailyReadiness, DailyReadiness } from "@/lib/readiness";
import { getAllSettings } from "@/lib/repo/settings";
import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listGymPRs } from "@/lib/repo/gym";
import { getDb } from "@/lib/db";
import { paceToSecKm } from "@/lib/pace-zones";

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

export function buildCoachAthleteContext(todayParam?: string, userId?: string): CoachAthleteContext {
  const today = todayParam || todayISO();
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);

  const settings = getAllSettings();
  let athleteName = "Daniel Espinosa";
  let targetDistance = "Maratón";
  let targetDate = settings.goal_race_date || "2027-04-26";
  let targetPace = settings.target_pace_scenario || "5:00-5:15 min/km (Sub 3h45)";
  let vamPace = "3:59 min/km";
  let vamSpeed = "15.06 km/h";
  let allergies = settings.allergies || "Alergia estricta a frutos secos. No come pescado (suplementa Omega-3 diario)";
  let hrNote = settings.resting_hr_note || null;
  let currentPhase = settings.current_phase || "Fase 1a (Base aeróbica + Hipertrofia)";

  if (userId && userId !== "default_user") {
    try {
      const db = getDb();
      const p = db.prepare<any>("SELECT * FROM profiles WHERE id = ?").get(userId);
      if (p) {
        if (p.full_name) athleteName = p.full_name;
        if (p.target_distance) targetDistance = p.target_distance;
        if (p.target_date) targetDate = p.target_date;
        if (p.target_pace) targetPace = p.target_pace;
        if (p.vam_pace) {
          vamPace = `${p.vam_pace} min/km`;
          const sec = paceToSecKm(p.vam_pace) || 270;
          vamSpeed = `${(3600 / sec).toFixed(2)} km/h`;
        }
        if (p.role !== "owner") {
          allergies = "Sin restricciones médicas registradas";
          hrNote = null;
        }
      }
    } catch {}
  }
  const weeklyAssessment = computeCoachWeeklyAssessment(weekStart);
  const dailyReadiness = computeDailyReadiness(today);

  // Sesiones desde hoy hasta el domingo
  const allWeekSessions = listSessionsBetween(today, weekEnd);
  const upcomingSessions = allWeekSessions.filter((s) => s.status === "pendiente" || s.date >= today);

  // Historial de carga y sensaciones de los últimos 14 días
  const fourteenDaysAgo = addDays(today, -14);
  const past14DaysSessions = listSessionsBetween(fourteenDaysAgo, today);
  const completed14Days = past14DaysSessions.filter((s) => s.status === "realizada" || s.status === "parcial");

  let total14DaysKm = 0;
  let total14DaysDurationMin = 0;
  let total14DaysLoadFoster = 0;

  const past14DaysList = completed14Days.map((s) => {
    const km = s.distance_km ?? 0;
    const dur = s.duration_min ?? 0;
    const rpe = s.rpe ?? 6;
    const load = dur * rpe;
    total14DaysKm += km;
    total14DaysDurationMin += dur;
    total14DaysLoadFoster += load;

    // Sensación y notas de Suunto
    const feelingStr = s.feeling
      ? s.feeling === 5 ? "5/5 (Excelente 🔥)"
        : s.feeling === 4 ? "4/5 (Bien 🙂)"
        : s.feeling === 3 ? "3/5 (Normal 😐)"
        : s.feeling === 2 ? "2/5 (Fatigado 😕)"
        : "1/5 (Muy mal 😫)"
      : "Sin feeling registrado";

    const notesSnippet = s.user_notes ? ` · Notas: "${s.user_notes.replace(/\n/g, " ").slice(0, 75)}"` : "";

    return `- **${s.date}**: ${s.discipline.toUpperCase()}${s.planned_code ? ` (${s.planned_code})` : ""} · ${dur} min${km > 0 ? ` · ${km} km` : ""} · RPE ${rpe}/10 · Sensación Suunto: ${feelingStr} · Carga: ${load} pts${notesSnippet}`;
  }).join("\n");

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
- **Nombre**: ${athleteName}
- **Objetivo principal**: ${targetDistance} (${targetDate}), Ritmo objetivo: ${targetPace}
- **Fase de preparación**: ${currentPhase}
- **Prueba VAM Oficial**: ${vamPace} (${vamSpeed}).
- **Nota médica y Fisiología**: ${hrNote || "Apto médicamente. Entrenar por ritmo/RPE."}
- **Alergias / Nutrición**: ${allergies}

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

#### HISTORIAL DE CARGA Y SENSACIONES DE LOS ÚLTIMOS 14 DÍAS (${fourteenDaysAgo} a ${today})
- **Volumen acumulado 14 días**: ${total14DaysDurationMin} min · ${total14DaysKm.toFixed(1)} km · ${Math.round(total14DaysLoadFoster)} pts Foster en ${completed14Days.length} entrenos.
${past14DaysList || "Sin entrenamientos completados en los últimos 14 días."}

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
    athleteName,
    profile: {
      marathonDate: targetDate,
      targetPace: targetPace,
      vamPace: vamPace,
      vamSpeed: vamSpeed,
      hrNote: hrNote,
      currentPhase: currentPhase,
      allergies: allergies,
    },
    weeklyAssessment,
    dailyReadiness,
    upcomingSessions,
    recentGymPRs,
    contextMarkdown,
  };
}
