import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { addDays, weekDates } from "@/lib/dates";

/**
 * Motor de recomendaciones de EntrenoApp.
 *
 * Principios:
 * - Carga de sesión (Foster et al.): RPE (0-10) x duración en minutos = "carga" de esa sesión.
 * - ACWR, ratio de carga aguda:crónica: últimos 7 días frente a media de 4 semanas.
 * - Solo se analizan molestias/síntomas en sesiones YA REALIZADAS (no en las pendientes planificadas).
 * - Se evitan falsos positivos por nombres de ejercicios (tobillo, gemelo, etc.).
 */

export type Severity = "info" | "aviso" | "alerta_medica";

export interface RecommendationFlag {
  severity: Severity;
  title: string;
  detail: string;
}

export interface WeeklyRecommendation {
  weekStart: string;
  compliancePct: number | null;
  rpeAvg: number | null;
  sleepHoursAvg: number | null;
  sleepQualityAvg: number | null;
  acwr: number | null;
  flags: RecommendationFlag[];
  action: "mantener" | "reducir" | "alerta_medica";
  summary: string;
}

const CARDIO_RED_FLAGS = [
  "dolor en el pecho",
  "dolor de pecho",
  "opresión en el pecho",
  "opresion en el pecho",
  "palpitaciones fuertes",
  "mareo intenso",
  "desmayo",
  "me desmaye",
  "falta de aire",
  "dificultad para respirar",
  "vision borrosa",
  "visión borrosa",
];

const INJURY_KEYWORDS = [
  "dolor",
  "molestia",
  "tirón muscular",
  "tiron muscular",
  "tiron en",
  "tirón en",
  "pinchazo",
  "lesión",
  "lesion",
  "tendinitis",
  "fascitis",
  "inflamación",
  "inflamacion",
  "contractura",
];

function sessionLoad(s: SessionRow): number {
  if ((s.status !== "realizada" && s.status !== "parcial") || !s.rpe || !s.duration_min) return 0;
  return s.rpe * s.duration_min;
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

const NEGATION_PATTERNS = [
  "sin ",
  "cero ",
  "ningun ",
  "ningún ",
  "ninguna ",
  "no noto ",
  "no he notado ",
  "no hay ",
  "no siento ",
  "desaparece ",
  "desapareció ",
  "desaparecio ",
  "nada de ",
  "evitar ",
  "prevenir ",
  "empuje / ",
  "empuje/ ",
  "empuje/",
  "empuje y ",
];

function isNegated(text: string, kwIndex: number): boolean {
  const windowStart = Math.max(0, kwIndex - 25);
  const preceding = text.slice(windowStart, kwIndex);
  return NEGATION_PATTERNS.some((p) => preceding.endsWith(p) || preceding.includes(p));
}

function hasAffirmativeMatch(text: string, kw: string): boolean {
  let startIndex = 0;
  while (startIndex < text.length) {
    const idx = text.indexOf(kw, startIndex);
    if (idx === -1) break;
    if (!isNegated(text, idx)) return true;
    startIndex = idx + kw.length;
  }
  return false;
}

function scanNotes(sessions: SessionRow[], keywords: string[]): string[] {
  const hits: string[] = [];
  for (const s of sessions) {
    // Solo escanear sesiones que el usuario haya registrado como realizadas o parciales
    if (s.status !== "realizada" && s.status !== "parcial") continue;
    if (!s.notes) continue;

    const lower = s.notes.toLowerCase();
    for (const kw of keywords) {
      if (hasAffirmativeMatch(lower, kw)) {
        const kwIdx = lower.indexOf(kw);
        const start = Math.max(0, kwIdx - 15);
        const end = Math.min(s.notes.length, kwIdx + kw.length + 25);
        let snippet = s.notes.slice(start, end).replace(/\n+/g, " ").trim();
        if (start > 0) snippet = "..." + snippet;
        if (end < s.notes.length) snippet = snippet + "...";
        hits.push(`${s.date} (${s.discipline}): "${snippet}"`);
        break;
      }
    }
  }
  return hits;
}

export function computeWeeklyRecommendation(weekStart: string): WeeklyRecommendation {
  const weekEnd = addDays(weekStart, 6);
  const thisWeekSessions = listSessionsBetween(weekStart, weekEnd);
  const thisWeekSleep = listSleepBetween(weekStart, weekEnd);

  // Carga crónica: media semanal de carga en las 4 semanas que terminan con esta (incluida).
  const chronicStart = addDays(weekStart, -21);
  const chronicSessions = listSessionsBetween(chronicStart, weekEnd);
  const weeklyLoads: number[] = [];
  for (let i = 0; i < 4; i++) {
    const wStart = addDays(weekStart, -7 * (3 - i));
    const wEnd = addDays(wStart, 6);
    const sessions = chronicSessions.filter((s) => s.date >= wStart && s.date <= wEnd);
    const wLoad = sessions.reduce((sum, s) => sum + sessionLoad(s), 0);
    weeklyLoads.push(wLoad);
  }
  const acuteLoad = weeklyLoads[3];
  const chronicWeeklyAvg = avg(weeklyLoads.slice(0, 3));
  const acwr = chronicWeeklyAvg && chronicWeeklyAvg > 0 ? acuteLoad / chronicWeeklyAvg : null;

  // Cumplimiento de la semana actual
  const plannedSessions = thisWeekSessions.filter((s) => s.discipline !== "descanso");
  const completedSessions = plannedSessions.filter((s) => s.status === "realizada" || s.status === "parcial");
  const compliancePct = plannedSessions.length > 0 ? (completedSessions.length / plannedSessions.length) * 100 : null;

  // RPE medio de las sesiones completadas
  const rpeValues = completedSessions.map((s) => s.rpe).filter((r): r is number => r !== null && r !== undefined);
  const rpeAvg = avg(rpeValues);

  // Sueño de la semana
  const sleepHours = thisWeekSleep
    .map((s) => s.hours)
    .filter((h): h is number => typeof h === "number");
  const sleepHoursAvg = avg(sleepHours);
  const sleepQualities = thisWeekSleep
    .map((s) => s.quality)
    .filter((q): q is number => typeof q === "number");
  const sleepQualityAvg = avg(sleepQualities);

  const flags: RecommendationFlag[] = [];

  const cardioHits = scanNotes(thisWeekSessions, CARDIO_RED_FLAGS);
  if (cardioHits.length > 0) {
    flags.push({
      severity: "alerta_medica",
      title: "Síntoma cardiovascular nuevo anotado esta semana",
      detail:
        "Se ha detectado una nota compatible con un síntoma cardiovascular de alarma (" +
        cardioHits.join("; ") +
        "). Dado el antecedente de taquicardia, esto no se ajusta con carga: para el entrenamiento y consulta médicamente antes de la próxima sesión.",
    });
  }

  const injuryHits = scanNotes(thisWeekSessions, INJURY_KEYWORDS);
  if (injuryHits.length > 0) {
    flags.push({
      severity: "aviso",
      title: "Molestia física anotada esta semana",
      detail:
        "Notas registradas con molestia: " +
        injuryHits.join("; ") +
        ". Si es la primera vez que aparece, reduce carga en esa zona y vigila 3-4 días.",
    });
  }

  if (acwr !== null && acwr > 1.5) {
    flags.push({
      severity: "aviso",
      title: "Subida brusca de carga (ACWR alto)",
      detail: `La carga de esta semana es ${acwr.toFixed(2)}x la media de las últimas semanas (por encima de 1.5 se asocia a fatiga alta). Conviene no seguir subiendo la próxima semana.`,
    });
  }

  if (sleepHoursAvg !== null && sleepHoursAvg < 6.5 && thisWeekSleep.length >= 3) {
    flags.push({
      severity: "aviso",
      title: "Sueño por debajo de lo habitual",
      detail: `Media de ${sleepHoursAvg.toFixed(1)}h esta semana. Conviene priorizar descanso y modular las sesiones de calidad.`,
    });
  }

  if (sleepQualityAvg !== null && sleepQualityAvg <= 2.5 && thisWeekSleep.length >= 3) {
    flags.push({
      severity: "aviso",
      title: "Calidad de sueño baja de forma sostenida",
      detail: `Calidad media ${sleepQualityAvg.toFixed(1)}/5 esta semana. Señal de fatiga acumulada.`,
    });
  }

  let action: WeeklyRecommendation["action"] = "mantener";
  if (flags.some((f) => f.severity === "alerta_medica")) action = "alerta_medica";
  else if (flags.some((f) => f.severity === "aviso")) action = "reducir";

  let summary: string;
  if (action === "alerta_medica") {
    summary = "Señal de alarma esta semana: para el entrenamiento y consulta médicamente antes de continuar.";
  } else if (action === "reducir") {
    summary =
      "Hay al menos una señal (molestia registrada, carga o sueño) que aconseja bajar volumen o intensidad la semana que viene.";
  } else if (compliancePct !== null) {
    summary = `Semana sin señales de alarma. Cumplimiento ${compliancePct.toFixed(0)}% — se puede mantener o progresar el plan con normalidad.`;
  } else {
    summary = "Semana en curso sin alertas. Entrena según las sensaciones y el readiness diario.";
  }

  return {
    weekStart,
    compliancePct,
    rpeAvg,
    sleepHoursAvg,
    sleepQualityAvg,
    acwr,
    flags,
    action,
    summary,
  };
}

export { sessionLoad };
