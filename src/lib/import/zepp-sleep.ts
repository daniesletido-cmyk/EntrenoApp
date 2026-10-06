import ExcelJS from "exceljs";
import { Readable } from "node:stream";

// Lector específico del CSV que exporta ZeppBridge (github.com/lingcang728/ZeppBridge,
// pantalla "Hand to AI" → formato CSV) y archivos de sueño tabulares o JSON.
//
// Soporta detección inteligente de:
// 1. Sueño nocturno principal (hours, score, fases de sueño deep/light/rem/awake).
// 2. Siestas diurnas (naps): identifica tramos horarios de día (10:00 a 19:30), duración
//    de la siesta (nap_min), conteo (nap_count) y notas (nap_notes), diferenciándolos
//    completamente para que la app recalcule la recuperación y descanso efectivo.

export interface ZeppSleepRow {
  date: string; // YYYY-MM-DD
  hours: number | null; // Horas de sueño nocturno
  quality: number | null; // Escala 1 a 5 para el registro de la app
  score: number | null; // Puntuación 0-100 si la proporciona el dispositivo
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  start_time: string;
  end_time: string;
  notes?: string | null;
  nap_min?: number | null; // Duración total de siestas en minutos
  nap_count?: number | null; // Número de siestas ese día
  nap_notes?: string | null; // Detalle horario de la siesta (ej. '15:30 a 16:15 (45 min)')
  has_nap?: boolean; // Flag booleano de siesta
}

const REQUIRED_ZEPP_COLUMNS = ["record_type", "record_id", "start_time", "end_time", "metric", "value"];

export function scoreToQuality(score: number): number {
  if (score >= 85) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 45) return 2;
  return 1;
}

export function isNapRawSession(s: {
  sleep_type?: number | string | null;
  is_nap?: boolean | null;
  type?: string | null;
  record_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
}): boolean {
  // 1. Flag explícito de siesta / sueño esporádico (Zepp sleep_type = 2)
  if (
    s.sleep_type === 2 ||
    s.sleep_type === "2" ||
    String(s.sleep_type).toLowerCase() === "nap" ||
    s.is_nap === true ||
    String(s.type).toLowerCase() === "nap" ||
    String(s.record_type).toLowerCase() === "nap" ||
    String(s.record_type).toLowerCase() === "sporadic_sleep"
  ) {
    return true;
  }

  // 2. Heurística horaria diurna: si inicia entre las 10:00 y las 19:45
  const timeStr = s.start_time || s.end_time;
  if (timeStr) {
    const match = timeStr.match(/[T ](\d{1,2}):(\d{2})/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const dur = s.duration_minutes ?? null;
      if (hour >= 10 && hour <= 19) {
        if (dur == null || dur <= 210) return true; // Hasta 3.5h de descanso diurno
      }
    }
  }
  return false;
}

export function formatNapTimeWindow(startTime?: string, endTime?: string, durMin?: number | null): string {
  let text = "Siesta";
  const startMatch = startTime?.match(/[T ](\d{1,2}:\d{2})/);
  const endMatch = endTime?.match(/[T ](\d{1,2}:\d{2})/);
  if (startMatch && endMatch) {
    text += ` ${startMatch[1]} a ${endMatch[1]}`;
  }
  if (durMin != null && durMin > 0) {
    text += ` (${Math.round(durMin)} min)`;
  }
  return text;
}

interface NormalizedRawSession {
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  score: number | null;
  deep_minutes: number | null;
  light_minutes: number | null;
  rem_minutes: number | null;
  awake_minutes: number | null;
  quality: number | null;
  notes?: string | null;
  is_nap?: boolean;
}

function processGroupedSessions(
  date: string,
  rawList: NormalizedRawSession[],
  dailyMetrics?: Record<string, number>
): ZeppSleepRow {
  const napCandidates: NormalizedRawSession[] = [];
  const nightCandidates: NormalizedRawSession[] = [];

  for (const item of rawList) {
    if (item.is_nap || isNapRawSession(item)) {
      napCandidates.push(item);
    } else {
      nightCandidates.push(item);
    }
  }

  // Si todas parecían siestas pero la sesión más larga supera 3.5h, esa es el sueño nocturno
  if (nightCandidates.length === 0 && napCandidates.length > 1) {
    napCandidates.sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0));
    if ((napCandidates[0].duration_minutes ?? 0) > 210) {
      nightCandidates.push(napCandidates.shift()!);
    }
  } else if (nightCandidates.length > 1) {
    // Si hay más de una noche, la más larga o con score es la noche principal; las demás son siestas
    nightCandidates.sort((a, b) => {
      if (a.score != null && b.score == null) return -1;
      if (b.score != null && a.score == null) return 1;
      return (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0);
    });
    for (let i = 1; i < nightCandidates.length; i++) {
      napCandidates.push(nightCandidates[i]);
    }
    nightCandidates.length = 1;
  }

  const mainNight = nightCandidates[0] ?? null;

  // Procesar siestas
  let napTotalMin = 0;
  let napCount = 0;
  const napNotesParts: string[] = [];

  for (const nap of napCandidates) {
    const dur =
      nap.duration_minutes ??
      (nap.deep_minutes != null && nap.light_minutes != null ? nap.deep_minutes + nap.light_minutes : 0);
    if (dur > 0) {
      napTotalMin += dur;
      napCount++;
      napNotesParts.push(formatNapTimeWindow(nap.start_time, nap.end_time, dur));
    }
  }

  const hasNap = napCount > 0;
  const napMin = hasNap ? Math.round(napTotalMin) : null;
  const napNotes = hasNap ? napNotesParts.join("; ") : null;

  // Notas biométricas del día (RHR, HRV, Readiness)
  const notesParts: string[] = [];
  if (dailyMetrics) {
    if (dailyMetrics.sleep_rhr != null) notesParts.push(`RHR sueño: ${Math.round(dailyMetrics.sleep_rhr)} lpm`);
    if (dailyMetrics.sleep_hrv != null) notesParts.push(`HRV sueño: ${Math.round(dailyMetrics.sleep_hrv)} ms`);
    if (dailyMetrics.readiness != null && dailyMetrics.readiness !== 255) notesParts.push(`Readiness: ${Math.round(dailyMetrics.readiness)}`);
  }
  if (napNotes) {
    notesParts.push(`💤 ${napNotes}`);
  }
  if (mainNight?.notes) {
    notesParts.push(mainNight.notes);
  }

  const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

  const hours =
    mainNight?.duration_minutes != null
      ? Math.round((mainNight.duration_minutes / 60) * 100) / 100
      : null;

  return {
    date,
    hours,
    quality: mainNight?.quality ?? null,
    score: mainNight?.score ?? null,
    deep_min: mainNight?.deep_minutes != null ? Math.round(mainNight.deep_minutes) : null,
    light_min: mainNight?.light_minutes != null ? Math.round(mainNight.light_minutes) : null,
    rem_min: mainNight?.rem_minutes != null ? Math.round(mainNight.rem_minutes) : null,
    awake_min: mainNight?.awake_minutes != null ? Math.round(mainNight.awake_minutes) : null,
    start_time: mainNight?.start_time || (napCandidates[0]?.start_time ?? date),
    end_time: mainNight?.end_time || (napCandidates[0]?.end_time ?? date),
    notes,
    nap_min: napMin,
    nap_count: hasNap ? napCount : null,
    nap_notes: napNotes,
    has_nap: hasNap,
  };
}

interface ZeppRawSession {
  sleep_id?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  score?: number;
  deep_minutes?: number;
  light_minutes?: number;
  rem_minutes?: number;
  awake_minutes?: number;
  wake_count?: number;
  sleep_type?: number | string;
  is_nap?: boolean;
  type?: string;
  record_type?: string;
  quality?: number;
  notes?: string;
  [key: string]: unknown;
}

interface ZeppDailyMetric {
  date?: string;
  metric?: string;
  value?: number;
  unit?: string;
  [key: string]: unknown;
}

export function extractZeppSleepJson(json: unknown): ZeppSleepRow[] {
  let sessions: ZeppRawSession[] = [];
  let dailyMetrics: ZeppDailyMetric[] = [];

  if (Array.isArray(json)) {
    sessions = json as ZeppRawSession[];
  } else if (json && typeof json === "object") {
    const record = json as Record<string, unknown>;
    const dataObj = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;

    if (Array.isArray(dataObj?.sleep_sessions)) {
      sessions = dataObj.sleep_sessions as ZeppRawSession[];
    } else if (Array.isArray(record.sleep_sessions)) {
      sessions = record.sleep_sessions as ZeppRawSession[];
    }

    if (Array.isArray(dataObj?.daily_metrics)) {
      dailyMetrics = dataObj.daily_metrics as ZeppDailyMetric[];
    } else if (Array.isArray(record.daily_metrics)) {
      dailyMetrics = record.daily_metrics as ZeppDailyMetric[];
    }
  }

  if (sessions.length === 0) {
    throw new Error(
      "No se encontraron sesiones de sueño ('sleep_sessions') en el archivo JSON. Asegúrate de exportar la opción «Sleep» desde ZeppBridge."
    );
  }

  const metricsByDate = new Map<string, Record<string, number>>();
  for (const m of dailyMetrics) {
    if (m.date && m.metric && typeof m.value === "number") {
      let map = metricsByDate.get(m.date);
      if (!map) {
        map = {};
        metricsByDate.set(m.date, map);
      }
      map[m.metric] = m.value;
    }
  }

  // Agrupar sesiones por fecha
  const groupsByDate = new Map<string, NormalizedRawSession[]>();

  for (const s of sessions) {
    const rawTime = s.end_time || s.start_time;
    if (!rawTime || rawTime.length < 10) continue;
    const date = rawTime.slice(0, 10);

    const dur =
      s.duration_minutes != null && Number.isFinite(s.duration_minutes)
        ? s.duration_minutes
        : s.deep_minutes != null && s.light_minutes != null
        ? s.deep_minutes + s.light_minutes + (s.rem_minutes ?? 0)
        : null;

    let score: number | null = null;
    if (s.score != null && Number.isFinite(s.score)) {
      score = Math.round(s.score);
    }

    let quality: number | null = null;
    if (typeof s.quality === "number" && Number.isFinite(s.quality)) {
      quality = s.quality > 5 ? scoreToQuality(s.quality) : Math.max(1, Math.min(5, Math.round(s.quality)));
    } else if (score !== null) {
      quality = scoreToQuality(score);
    }

    const isNap = isNapRawSession(s);

    const normalized: NormalizedRawSession = {
      start_time: s.start_time || date,
      end_time: s.end_time || date,
      duration_minutes: dur,
      score,
      deep_minutes: s.deep_minutes != null && Number.isFinite(s.deep_minutes) ? Math.round(s.deep_minutes) : null,
      light_minutes: s.light_minutes != null && Number.isFinite(s.light_minutes) ? Math.round(s.light_minutes) : null,
      rem_minutes: s.rem_minutes != null && Number.isFinite(s.rem_minutes) ? Math.round(s.rem_minutes) : null,
      awake_minutes: s.awake_minutes != null && Number.isFinite(s.awake_minutes) ? Math.round(s.awake_minutes) : null,
      quality,
      notes: typeof s.notes === "string" ? s.notes : undefined,
      is_nap: isNap,
    };

    let list = groupsByDate.get(date);
    if (!list) {
      list = [];
      groupsByDate.set(date, list);
    }
    list.push(normalized);
  }

  const out: ZeppSleepRow[] = [];
  for (const [date, list] of groupsByDate.entries()) {
    const metrics = metricsByDate.get(date);
    out.push(processGroupedSessions(date, list, metrics));
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export async function extractZeppSleep(buffer: Buffer): Promise<ZeppSleepRow[]> {
  const text = buffer.toString("utf-8").trim();
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return extractZeppSleepJson(parsed);
    } catch {
      // Si fallase el parseo JSON, intentamos como CSV
    }
  }
  return extractZeppSleepCsv(buffer);
}

async function readCsvRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.csv.read(Readable.from(buffer));
  const rows: string[][] = [];
  for (const sheet of workbook.worksheets) {
    const colCount = Math.max(sheet.columnCount, 1);
    sheet.eachRow((row) => {
      const values: string[] = [];
      for (let c = 1; c <= colCount; c++) {
        const v = row.getCell(c).value;
        values.push(v === null || v === undefined ? "" : String(v).trim());
      }
      if (values.some((v) => v !== "")) rows.push(values);
    });
  }
  return rows;
}

function parseTabularSleepCsv(rows: string[][]): ZeppSleepRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());

  const dateIdx = header.findIndex((h) => h.includes("date") || h.includes("fecha") || h === "día" || h === "dia");
  const hoursIdx = header.findIndex((h) => h.includes("hour") || h.includes("hora") || h.includes("duracion") || h.includes("duration"));
  const qualityIdx = header.findIndex((h) => h.includes("calidad") || h.includes("quality"));
  const scoreIdx = header.findIndex((h) => h.includes("score") || h.includes("puntuacion") || h.includes("puntuación"));
  const notesIdx = header.findIndex((h) => h.includes("nota") || h.includes("note") || h.includes("coment"));
  const napIdx = header.findIndex((h) => h.includes("siesta") || h.includes("nap"));

  if (dateIdx === -1 || (hoursIdx === -1 && qualityIdx === -1 && scoreIdx === -1 && napIdx === -1)) {
    return [];
  }

  const groupsByDate = new Map<string, NormalizedRawSession[]>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawDate = row[dateIdx]?.trim();
    if (!rawDate) continue;

    let date = rawDate;
    if (rawDate.includes("/")) {
      const parts = rawDate.split("/");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else {
          date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    } else if (rawDate.length >= 10) {
      date = rawDate.slice(0, 10);
    }

    const rawHours = hoursIdx !== -1 ? Number(row[hoursIdx]) : null;
    const hours = rawHours !== null && Number.isFinite(rawHours) ? Math.round(rawHours * 100) / 100 : null;
    const durationMinutes = hours != null ? Math.round(hours * 60) : null;

    let score: number | null = null;
    if (scoreIdx !== -1) {
      const s = Number(row[scoreIdx]);
      if (Number.isFinite(s)) score = Math.round(s);
    }

    let quality: number | null = null;
    if (qualityIdx !== -1) {
      const q = Number(row[qualityIdx]);
      if (Number.isFinite(q)) {
        if (q > 5) quality = scoreToQuality(q);
        else quality = Math.max(1, Math.min(5, Math.round(q)));
      }
    } else if (score !== null) {
      quality = scoreToQuality(score);
    }

    const notes = notesIdx !== -1 ? row[notesIdx]?.trim() || null : null;

    // Si viene columna explícita de siesta
    let napMinFromCol: number | null = null;
    if (napIdx !== -1) {
      const rawNap = Number(row[napIdx]);
      if (Number.isFinite(rawNap) && rawNap > 0) {
        napMinFromCol = Math.round(rawNap);
      }
    }

    const normalized: NormalizedRawSession = {
      start_time: date,
      end_time: date,
      duration_minutes: durationMinutes,
      score,
      deep_minutes: null,
      light_minutes: null,
      rem_minutes: null,
      awake_minutes: null,
      quality,
      notes,
      is_nap: false,
    };

    let list = groupsByDate.get(date);
    if (!list) {
      list = [];
      groupsByDate.set(date, list);
    }

    list.push(normalized);

    // Si había siesta en columna separada, crear una sesión secundaria de siesta
    if (napMinFromCol != null && napMinFromCol > 0) {
      list.push({
        start_time: date,
        end_time: date,
        duration_minutes: napMinFromCol,
        score: null,
        deep_minutes: null,
        light_minutes: null,
        rem_minutes: null,
        awake_minutes: null,
        quality: null,
        notes: `Siesta (${napMinFromCol} min)`,
        is_nap: true,
      });
    }
  }

  const out: ZeppSleepRow[] = [];
  for (const [date, list] of groupsByDate.entries()) {
    out.push(processGroupedSessions(date, list));
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export async function extractZeppSleepCsv(buffer: Buffer): Promise<ZeppSleepRow[]> {
  const rows = await readCsvRows(buffer);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const colIndex: Record<string, number> = {};
  for (const col of REQUIRED_ZEPP_COLUMNS) colIndex[col] = header.indexOf(col);

  const missing = REQUIRED_ZEPP_COLUMNS.filter((c) => colIndex[c] === -1);
  if (missing.length > 0) {
    const tabular = parseTabularSleepCsv(rows);
    if (tabular.length > 0) return tabular;

    throw new Error(
      `El archivo CSV no tiene el formato de ZeppBridge (faltan: ${missing.join(", ")}) ni cabeceras reconocibles de sueño (fecha, horas, calidad/score).`
    );
  }

  interface SessionAcc {
    start_time: string;
    end_time: string;
    metrics: Record<string, number>;
    is_nap: boolean;
  }
  const sessions = new Map<string, SessionAcc>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const recType = String(row[colIndex.record_type] ?? "").toLowerCase();
    if (recType !== "sleep_session" && recType !== "nap" && recType !== "sporadic_sleep") continue;
    const id = row[colIndex.record_id];
    if (!id) continue;

    let acc = sessions.get(id);
    if (!acc) {
      acc = {
        start_time: row[colIndex.start_time] ?? "",
        end_time: row[colIndex.end_time] ?? "",
        metrics: {},
        is_nap: recType === "nap" || recType === "sporadic_sleep",
      };
      sessions.set(id, acc);
    }
    const metric = row[colIndex.metric];
    const rawValue = row[colIndex.value];
    const value = Number(rawValue);
    if (metric && rawValue !== "" && Number.isFinite(value)) {
      acc.metrics[metric] = value;
    }
  }

  // Agrupar por fecha
  const groupsByDate = new Map<string, NormalizedRawSession[]>();

  for (const acc of sessions.values()) {
    if (!acc.end_time || acc.end_time.length < 10) continue;
    const date = acc.end_time.slice(0, 10);
    const durationMin = acc.metrics["duration_minutes"] ?? null;
    const score = acc.metrics["score"] ?? null;

    let quality: number | null = null;
    if (acc.metrics["quality"] != null) {
      const q = acc.metrics["quality"];
      quality = q > 5 ? scoreToQuality(q) : Math.max(1, Math.min(5, Math.round(q)));
    } else if (acc.metrics["calidad"] != null) {
      const q = acc.metrics["calidad"];
      quality = q > 5 ? scoreToQuality(q) : Math.max(1, Math.min(5, Math.round(q)));
    } else if (score !== null) {
      quality = scoreToQuality(score);
    }

    const isNap = acc.is_nap || isNapRawSession({
      start_time: acc.start_time,
      end_time: acc.end_time,
      duration_minutes: durationMin,
    });

    const normalized: NormalizedRawSession = {
      start_time: acc.start_time,
      end_time: acc.end_time,
      duration_minutes: durationMin,
      score,
      deep_minutes: acc.metrics["deep_minutes"] ?? null,
      light_minutes: acc.metrics["light_minutes"] ?? null,
      rem_minutes: acc.metrics["rem_minutes"] ?? null,
      awake_minutes: acc.metrics["awake_minutes"] ?? null,
      quality,
      is_nap: isNap,
    };

    let list = groupsByDate.get(date);
    if (!list) {
      list = [];
      groupsByDate.set(date, list);
    }
    list.push(normalized);
  }

  const out: ZeppSleepRow[] = [];
  for (const [date, list] of groupsByDate.entries()) {
    out.push(processGroupedSessions(date, list));
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
