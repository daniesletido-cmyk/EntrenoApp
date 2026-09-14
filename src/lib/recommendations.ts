import { listSessionsBetween, SessionRow } from "@/lib/repo/sessions";
import { listSleepBetween, SleepRow } from "@/lib/repo/sleep";
import { addDays, weekDates } from "@/lib/dates";

/**
 * Motor de recomendaciones de EntrenoApp.
 *
 * Principios en los que se basa (resumen, no sustituye criterio médico):
 * - Carga de sesión (Foster et al.): RPE (0-10) x duración en minutos = "carga" de esa sesión.
 * - ACWR, ratio de carga aguda:crónica (Gabbett 2016 y revisiones posteriores): carga de los
 *   últimos 7 días frente a la media semanal de las últimas 4 semanas. Zona "razonable" ~0.8-1.3;
 *   por encima de ~1.5 se asocia a mayor riesgo de lesión por subida brusca de carga.
 * - Regla del 10%: evitar subir el volumen semanal más de un ~10% de una semana a otra en fases
 *   de base — heurística clásica, no una ley física, pero razonable como límite de seguridad.
 * - Sueño y fatiga: sueño insuficiente o de mala calidad de forma sostenida reduce la capacidad
 *   de recuperación y sube el riesgo de lesión/enfermedad — señal para bajar intensidad, no para
 *   forzar series de calidad.
 * - Nunca se entrena por pulso en el caso de JavaTec (taquicardia, FC de reposo alta, apto sin
 *   restricciones): todas las recomendaciones son en términos de RPE/ritmo, nunca de frecuencia
 *   cardíaca absoluta.
 * - Señales de alarma (dolor articular persistente, síntomas cardiovasculares nuevos) cortocircuitan
 *   cualquier otra recomendación: la respuesta es parar y consultar médicamente, no "ajustar carga".
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
  "ahogo",
  "falta de aire" ,
  "dificultad para respirar",
  "vision borrosa",
  "visión borrosa",
];

const INJURY_KEYWORDS = [
  "dolor",
  "molestia",
  "tirón",
  "tiron",
  "pinchazo",
  "rodilla",
  "tobillo",
  "gemelo",
  "isquio",
  "fascitis",
  "sobrecarga",
  "inflamación",
  "inflamacion",
  "hinchazón",
  "hinchazon",
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
    if (!s.notes) continue;
    const lower = s.notes.toLowerCase();
    for (const kw of keywords) {
      if (hasAffirmativeMatch(lower, kw)) {
        hits.push(`${s.date} (${s.discipline}): "${s.notes}"`);
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
    const weekSessions = chronicSessions.filter((s) => s.date >= wStart && s.date <= wEnd);
    weeklyLoads.push(weekSessions.reduce((sum, s) => sum + sessionLoad(s), 0));
  }
  const acuteLoad = weeklyLoads[3];
  const chronicLoad = avg(weeklyLoads.slice(0, 3).filter((l) => l > 0)) ?? (weeklyLoads[3] > 0 ? weeklyLoads[3] : null);
  const acwr = chronicLoad && chronicLoad > 0 ? acuteLoad / chronicLoad : null;

  const relevant = thisWeekSessions.filter((s) => s.discipline !== "descanso");
  const withOutcome = relevant.filter((s) => s.status !== "pendiente");
  const compliancePct =
    relevant.length > 0
      ? (relevant.filter((s) => s.status === "realizada" || s.status === "parcial").length / relevant.length) * 100
      : null;
  const rpeAvg = avg(withOutcome.map((s) => s.rpe ?? NaN));
  const sleepHoursAvg = avg(thisWeekSleep.map((s) => s.hours ?? NaN));
  const sleepQualityAvg = avg(thisWeekSleep.map((s) => s.quality ?? NaN));

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
        "Notas con posible molestia: " +
        injuryHits.join("; ") +
        ". Si es la primera vez que aparece, reduce carga en esa zona y vigila 3-4 días; si el dolor es articular y persistente (no solo agujetas musculares) o va a más, para y consulta con un profesional antes de seguir progresando.",
    });
  }

  if (acwr !== null && acwr > 1.5) {
    flags.push({
      severity: "aviso",
      title: "Subida brusca de carga (ACWR alto)",
      detail: `La carga de esta semana es ${acwr.toFixed(2)}x la media de las últimas semanas — por encima de 1.5 se asocia a más riesgo de lesión. Conviene no seguir subiendo y estabilizar o bajar ligeramente la próxima semana.`,
    });
  }

  if (sleepHoursAvg !== null && sleepHoursAvg < 6.5 && thisWeekSleep.length >= 3) {
    flags.push({
      severity: "aviso",
      title: "Sueño por debajo de lo habitual",
      detail: `Media de ${sleepHoursAvg.toFixed(1)}h esta semana (tu habitual son ~8h). El sueño insuficiente reduce la recuperación — si se repite, mejor bajar intensidad de las sesiones de calidad en vez de forzarlas.`,
    });
  }

  if (sleepQualityAvg !== null && sleepQualityAvg <= 2.5 && thisWeekSleep.length >= 3) {
    flags.push({
      severity: "aviso",
      title: "Calidad de sueño baja de forma sostenida",
      detail: `Calidad media ${sleepQualityAvg.toFixed(1)}/5 esta semana. Combinado con el entrenamiento, es una señal de fatiga acumulada más que de falta de forma.`,
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
      "Hay al menos una señal (molestia, carga o sueño) que aconseja bajar volumen o intensidad la semana que viene, no mantener el plan tal cual.";
  } else if (compliancePct !== null) {
    summary = `Semana sin señales de alarma. Cumplimiento ${compliancePct.toFixed(0)}% — se puede mantener o progresar el plan con normalidad.`;
  } else {
    summary = "Todavía no hay datos suficientes esta semana para generar una recomendación fiable.";
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
