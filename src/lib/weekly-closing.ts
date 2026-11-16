import { getDb } from "@/lib/db";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { weekStartOf, addDays, todayISO, isoDayOfWeek } from "@/lib/dates";
import { sendWeeklyClosingPush } from "@/lib/push-notifications";

export interface WeeklyClosingSummary {
  weekStart: string;
  weekEnd: string;
  nextMonday: string;
  isClosed: boolean; // Si es domingo o semana pasada
  stats: {
    totalSessions: number;
    plannedSessions: number;
    completedSessions: number;
    adaptedSessions: number;
    compliancePct: number;
    totalKm: number;
    totalDurationMin: number;
    totalLoad: number;
    avgRpe: number | null;
  };
  sleep: {
    avgHours: number | null;
    avgScore: number | null;
    nightsCount: number;
    sleepQualityText: string;
  };
  suuntoSensations: {
    reportedFatigue: boolean;
    keywordsFound: string[];
    avgFeeling: number | null;
    notesCount: number;
  };
  verdict: {
    status: "asimilacion_optima" | "descarga_recomendada" | "semana_en_curso";
    title: string;
    summary: string;
    dischargeRecommended: boolean;
    coachVerdict: string;
    physioVerdict: string;
    actionLabel: string;
    nextMondayAdjusted: boolean;
  };
}

export function generateWeeklyClosing(targetDate?: string): WeeklyClosingSummary {
  const db = getDb();
  const today = targetDate || todayISO();
  
  // Determinamos la semana a cerrar:
  // Si hoy es domingo (dow 7) o lunes (dow 1), podemos evaluar la semana cerrada.
  // Por defecto, calculamos la semana actual o la semana pasada si targetDate apunta a un domingo/lunes.
  const currentWeekStart = weekStartOf(today);
  const dow = isoDayOfWeek(today); // 1 = lunes, 7 = domingo
  
  // Si hoy es lunes por la mañana y no pasaron fecha, evaluamos la semana que acaba de terminar (hace 7 días)
  const weekStart = (dow === 1 && !targetDate) ? addDays(currentWeekStart, -7) : currentWeekStart;
  const weekEnd = addDays(weekStart, 6);
  const nextMonday = addDays(weekStart, 7);

  // 1. Sesiones de la semana
  const sessions = db.prepare(`
    SELECT * FROM sessions 
    WHERE date >= ? AND date <= ? 
    ORDER BY date ASC
  `).all(weekStart, weekEnd) as any[];

  let completedCount = 0;
  let plannedCount = 0;
  let adaptedCount = 0;
  let totalKm = 0;
  let totalDurationMin = 0;
  let totalLoad = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  let feelingSum = 0;
  let feelingCount = 0;
  let notesCount = 0;

  const fatigueKeywords = [
    "sobrecarga", "sobrecargado", "molestia", "dolor", "pesadez",
    "pesadas", "cintilla", "sóleo", "soleo", "gemelo", "isquio",
    "rodilla", "fatiga", "agotado", "cansado", "tirantez"
  ];
  const keywordsFound: string[] = [];

  sessions.forEach((s) => {
    if (s.discipline !== "descanso") {
      plannedCount++;
    }

    if (s.status === "realizada" || s.status === "completada") {
      completedCount++;
      const dist = s.distance_km || 0;
      const dur = s.duration_min || 0;
      const rpe = s.rpe || 6;
      totalKm += dist;
      totalDurationMin += dur;
      totalLoad += Math.round(dur * rpe);

      if (s.rpe) {
        rpeSum += s.rpe;
        rpeCount++;
      }
    }

    // Comprobar si fue adaptada
    if (s.notes && (s.notes.includes("Adaptada") || s.notes.includes("adaptada") || s.notes.includes("Regenerativo") || s.notes.includes("descarga"))) {
      adaptedCount++;
    }

    // Sensaciones de Suunto
    if (s.feeling) {
      feelingSum += s.feeling;
      feelingCount++;
    }

    const allNotesText = `${s.notes || ""} ${s.user_notes || ""}`.toLowerCase();
    if (s.user_notes) notesCount++;

    fatigueKeywords.forEach((kw) => {
      if (allNotesText.includes(kw) && !keywordsFound.includes(kw)) {
        keywordsFound.push(kw);
      }
    });
  });

  const compliancePct = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 100;
  const avgRpe = rpeCount > 0 ? Number((rpeSum / rpeCount).toFixed(1)) : null;
  const avgFeeling = feelingCount > 0 ? Number((feelingSum / feelingCount).toFixed(1)) : null;

  // 2. Sueño de Zepp / Amazfit Helio Ring
  const sleepLogs = db.prepare(`
    SELECT * FROM sleep_logs 
    WHERE date >= ? AND date <= ? 
    ORDER BY date ASC
  `).all(weekStart, addDays(weekEnd, 1)) as any[];

  let sleepHoursSum = 0;
  let sleepScoreSum = 0;
  let sleepScoreCount = 0;

  sleepLogs.forEach((sl) => {
    sleepHoursSum += (sl.hours || 0);
    if (sl.score) {
      sleepScoreSum += sl.score;
      sleepScoreCount++;
    }
  });

  const avgHours = sleepLogs.length > 0 ? Number((sleepHoursSum / sleepLogs.length).toFixed(1)) : null;
  const avgScore = sleepScoreCount > 0 ? Math.round(sleepScoreSum / sleepScoreCount) : null;

  let sleepQualityText = "Óptimo para asimilación";
  if (avgHours && avgHours < 6.8) {
    sleepQualityText = "Déficit de descanso (< 6.8h/noche)";
  } else if (avgScore && avgScore < 72) {
    sleepQualityText = "Calidad reducida (recuperación lenta)";
  }

  // 3. Evaluar sesión del próximo lunes para ver si ya fue adaptada
  const nextMondaySession = db.prepare(`
    SELECT * FROM sessions WHERE date = ? LIMIT 1
  `).get(nextMonday) as any;

  const nextMondayAdjusted = Boolean(
    nextMondaySession?.notes?.includes("Cierre semanal") ||
    nextMondaySession?.notes?.includes("Descarga preventiva")
  );

  // 4. Veredicto del Equipo Multidisciplinar
  const hasSensoryFatigue = keywordsFound.length > 0 || (avgRpe !== null && avgRpe >= 7.8);
  const hasSleepDebt = avgHours !== null && avgHours < 6.8;
  const isHighLoad = totalKm >= 45 || totalLoad >= 2600;

  const dischargeRecommended = hasSensoryFatigue || (hasSleepDebt && isHighLoad);

  let status: "asimilacion_optima" | "descarga_recomendada" | "semana_en_curso" = "asimilacion_optima";
  let title = "Supercompensación Positiva · Semana Asimilada";
  let summary = `Cumplimiento del ${compliancePct}% (${completedCount}/${plannedCount} sesiones) con ${totalKm.toFixed(1)} km acumulados. El descanso y las sensaciones confirman asimilación completa.`;
  let coachVerdict = "Preparador Físico: Excelente trabajo de periodización. La carga ha sido absorbida por el sistema neuromuscular y el glucógeno está restablecido. El lunes puedes arrancar con el plan previsto.";
  let physioVerdict = "Fisioterapeuta Deportivo: Tono muscular sin rigidez ni sobrecarga reportada en Suunto. El descanso ha permitido la regeneración miofibrilar. Mantener la activación habitual.";
  let actionLabel = "Confirmar Plan Entrante";

  if (dischargeRecommended) {
    status = "descarga_recomendada";
    title = "Sobrecarga Detectada · Descarga Recomendada el Lunes";
    summary = `Se han detectado indicios de fatiga (${keywordsFound.join(", ") || "RPE alto"} o descanso reducido a ${avgHours ?? "—"}h). Para consolidar adaptaciones y evitar lesiones por sobreuso, el equipo aconseja descarga suave el lunes.`;
    coachVerdict = "Preparador Físico: Es momento de aplicar el principio de supercompensación inteligente. Entrenar sobre fatiga acumulada restaría calidad al resto de la semana. El lunes conviene realizar rodaje regenerativo R0 (< 140 lpm) o natación suave.";
    physioVerdict = "Fisioterapeuta Deportivo: La combinación de kilometraje y sensaciones de fatiga exige preservar la fascia plantar y el tendón de Aquiles. Recomendamos trabajo de movilidad de tobillo, estiramientos de cadena posterior y descarga de impacto.";
    actionLabel = nextMondayAdjusted ? "Descarga ya aplicada el lunes" : "Aplicar Descarga el Lunes";
  }

  return {
    weekStart,
    weekEnd,
    nextMonday,
    isClosed: dow === 7 || dow === 1,
    stats: {
      totalSessions: sessions.length,
      plannedSessions: plannedCount,
      completedSessions: completedCount,
      adaptedSessions: adaptedCount,
      compliancePct,
      totalKm: Number(totalKm.toFixed(1)),
      totalDurationMin,
      totalLoad,
      avgRpe,
    },
    sleep: {
      avgHours,
      avgScore,
      nightsCount: sleepLogs.length,
      sleepQualityText,
    },
    suuntoSensations: {
      reportedFatigue: hasSensoryFatigue,
      keywordsFound,
      avgFeeling,
      notesCount,
    },
    verdict: {
      status,
      title,
      summary,
      dischargeRecommended,
      coachVerdict,
      physioVerdict,
      actionLabel,
      nextMondayAdjusted,
    },
  };
}

/**
 * Aplica simultáneamente en data/entrenoapp.db y seed/entrenoapp.db la descarga en la sesión del próximo lunes
 */
export function applyDischargeToMonday(mondayDate: string): boolean {
  const dbs = ["data/entrenoapp.db", "seed/entrenoapp.db"];
  let successCount = 0;

  for (const relPath of dbs) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;

    const db = new DatabaseSync(fullPath);
    const session = db.prepare("SELECT * FROM sessions WHERE date = ? LIMIT 1").get(mondayDate) as any;

    if (session) {
      // Ajustar la sesión a regenerativa / descarga
      const newDiscipline = session.discipline === "carrera" ? "carrera" : session.discipline;
      const newDuration = Math.min(session.duration_min || 45, 40);
      const newDistance = session.discipline === "carrera" ? 6.0 : session.distance_km;
      const noteAppend = "\n\n🟢 [Cierre Semanal]: Adaptada por el Preparador Físico y Fisioterapeuta a sesión de descarga regenerativa R0 para consolidar supercompensación.";

      db.prepare(`
        UPDATE sessions 
        SET planned_code = ?, duration_min = ?, distance_km = ?, notes = notes || ? 
        WHERE id = ?
      `).run(
        session.discipline === "carrera" ? "Rodaje Regenerativo R0 (Descarga)" : "Descarga Activa / Movilidad",
        newDuration,
        newDistance,
        noteAppend,
        session.id
      );
      successCount++;
    }
  }

  return successCount > 0;
}

/**
 * Dispara la notificación push minimalista "Resumen semanal listo"
 */
export async function triggerWeeklyClosingPushNotification(weekStart?: string) {
  const summary = generateWeeklyClosing(weekStart);
  return sendWeeklyClosingPush({
    weekStart: summary.weekStart,
    verdictTitle: summary.verdict.title,
    compliancePct: summary.stats.compliancePct,
    totalKm: summary.stats.totalKm,
    dischargeRecommended: summary.verdict.dischargeRecommended,
  });
}
