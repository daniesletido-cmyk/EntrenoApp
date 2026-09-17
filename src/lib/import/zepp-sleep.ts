import ExcelJS from "exceljs";
import { Readable } from "node:stream";

// Lector específico del CSV que exporta ZeppBridge (github.com/lingcang728/ZeppBridge,
// pantalla "Hand to AI" → formato CSV). No es un formato de tabla plana como los demás
// importadores (plan/menu/gym): es un "log" largo, una fila por cada dato suelto, con
// columnas record_type, record_id, start_time, end_time, metric, value, unit,
// source_scope, device_id. Las noches de sueño llegan como varias filas con
// record_type = "sleep_session" que comparten el mismo record_id — una fila por
// métrica (duration_minutes, score, deep_minutes, light_minutes, rem_minutes,
// awake_minutes) — así que hay que agruparlas por record_id antes de poder sacar
// una noche completa.
//
// Como en el resto de importadores de esta app: si una métrica no viene en el CSV,
// se deja en null. Nunca se calcula ni se estima un valor que Zepp no ha dado.

export interface ZeppSleepRow {
  date: string; // YYYY-MM-DD
  hours: number | null;
  quality: number | null; // Escala 1 a 5 para el registro de la app
  score: number | null; // Puntuación 0-100 si la proporciona el dispositivo
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  start_time: string;
  end_time: string;
  notes?: string | null;
}

const REQUIRED_ZEPP_COLUMNS = ["record_type", "record_id", "start_time", "end_time", "metric", "value"];

export function scoreToQuality(score: number): number {
  if (score >= 85) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 45) return 2;
  return 1;
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

  // Indexar métricas diarias por fecha para complementar (RHR sueño, HRV sueño, Readiness)
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

  const byDate = new Map<string, ZeppSleepRow>();

  for (const s of sessions) {
    const rawTime = s.end_time || s.start_time;
    if (!rawTime || rawTime.length < 10) continue;
    const date = rawTime.slice(0, 10);

    const dur = s.duration_minutes != null && Number.isFinite(s.duration_minutes)
      ? s.duration_minutes
      : s.deep_minutes != null && s.light_minutes != null
      ? s.deep_minutes + s.light_minutes + (s.rem_minutes ?? 0)
      : null;

    const hours = dur != null ? Math.round((dur / 60) * 100) / 100 : null;

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

    const dm = metricsByDate.get(date);
    const notesParts: string[] = [];
    if (dm) {
      if (dm.sleep_rhr != null) notesParts.push(`RHR sueño: ${Math.round(dm.sleep_rhr)} lpm`);
      if (dm.sleep_hrv != null) notesParts.push(`HRV sueño: ${Math.round(dm.sleep_hrv)} ms`);
      if (dm.readiness != null && dm.readiness !== 255) notesParts.push(`Readiness: ${Math.round(dm.readiness)}`);
    }
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : (typeof s.notes === "string" ? s.notes : null);

    const row: ZeppSleepRow = {
      date,
      hours,
      quality,
      score,
      deep_min: s.deep_minutes != null && Number.isFinite(s.deep_minutes) ? Math.round(s.deep_minutes) : null,
      light_min: s.light_minutes != null && Number.isFinite(s.light_minutes) ? Math.round(s.light_minutes) : null,
      rem_min: s.rem_minutes != null && Number.isFinite(s.rem_minutes) ? Math.round(s.rem_minutes) : null,
      awake_min: s.awake_minutes != null && Number.isFinite(s.awake_minutes) ? Math.round(s.awake_minutes) : null,
      start_time: s.start_time || date,
      end_time: s.end_time || date,
      notes,
    };

    const existing = byDate.get(date);
    if (!existing) {
      byDate.set(date, row);
    } else {
      // Si hay siestas u otra sesión el mismo día, conservar la sesión con mayor duración o con score
      const currentHours = row.hours ?? 0;
      const prevHours = existing.hours ?? 0;
      if ((row.score != null && existing.score == null) || currentHours > prevHours) {
        byDate.set(date, row);
      }
    }
  }

  const out = Array.from(byDate.values());
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

  if (dateIdx === -1 || (hoursIdx === -1 && qualityIdx === -1 && scoreIdx === -1)) {
    return [];
  }

  const out: ZeppSleepRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawDate = row[dateIdx]?.trim();
    if (!rawDate) continue;

    // Normalizar fecha (YYYY-MM-DD)
    let date = rawDate;
    if (rawDate.includes("/")) {
      const parts = rawDate.split("/");
      if (parts.length === 3) {
        // DD/MM/YYYY o YYYY/MM/DD
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

    out.push({
      date,
      hours,
      quality,
      score,
      deep_min: null,
      light_min: null,
      rem_min: null,
      awake_min: null,
      start_time: date,
      end_time: date,
      notes,
    });
  }

  const byDate = new Map<string, ZeppSleepRow>();
  for (const row of out) {
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, row);
    } else {
      const currentHours = row.hours ?? 0;
      const prevHours = existing.hours ?? 0;
      if ((row.score != null && existing.score == null) || currentHours > prevHours) {
        byDate.set(row.date, row);
      }
    }
  }

  const result = Array.from(byDate.values());
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

export async function extractZeppSleepCsv(buffer: Buffer): Promise<ZeppSleepRow[]> {
  const rows = await readCsvRows(buffer);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const colIndex: Record<string, number> = {};
  for (const col of REQUIRED_ZEPP_COLUMNS) colIndex[col] = header.indexOf(col);

  const missing = REQUIRED_ZEPP_COLUMNS.filter((c) => colIndex[c] === -1);
  if (missing.length > 0) {
    // Si no tiene las columnas de ZeppBridge, intentamos leerlo como CSV tabular genérico
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
  }
  const sessions = new Map<string, SessionAcc>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row[colIndex.record_type] !== "sleep_session") continue;
    const id = row[colIndex.record_id];
    if (!id) continue;

    let acc = sessions.get(id);
    if (!acc) {
      acc = { start_time: row[colIndex.start_time] ?? "", end_time: row[colIndex.end_time] ?? "", metrics: {} };
      sessions.set(id, acc);
    }
    const metric = row[colIndex.metric];
    const rawValue = row[colIndex.value];
    const value = Number(rawValue);
    if (metric && rawValue !== "" && Number.isFinite(value)) {
      acc.metrics[metric] = value;
    }
  }

  const out: ZeppSleepRow[] = [];
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

    out.push({
      date,
      hours: durationMin != null ? Math.round((durationMin / 60) * 100) / 100 : null,
      quality,
      score,
      deep_min: acc.metrics["deep_minutes"] ?? null,
      light_min: acc.metrics["light_minutes"] ?? null,
      rem_min: acc.metrics["rem_minutes"] ?? null,
      awake_min: acc.metrics["awake_minutes"] ?? null,
      start_time: acc.start_time,
      end_time: acc.end_time,
    });
  }

  const byDate = new Map<string, ZeppSleepRow>();
  for (const row of out) {
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, row);
    } else {
      const currentHours = row.hours ?? 0;
      const prevHours = existing.hours ?? 0;
      if ((row.score != null && existing.score == null) || currentHours > prevHours) {
        byDate.set(row.date, row);
      }
    }
  }

  const result = Array.from(byDate.values());
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}
