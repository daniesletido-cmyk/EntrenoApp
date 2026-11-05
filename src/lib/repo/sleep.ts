import { getDb } from "@/lib/db";

export interface SleepRow {
  id: number;
  date: string;
  hours: number | null;
  quality: number | null;
  notes: string | null;
  // Puntuación de sueño 0-100 y desglose por fases, en minutos — solo se rellenan
  // al importar desde ZeppBridge (Zepp/Amazfit); la entrada manual de Registro
  // nunca los toca. NULL = no hay ese dato, nunca se calcula ni se inventa.
  score: number | null;
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  source: string | null; // 'manual' | 'zepp' | null (registros antiguos)
  nap_min: number | null; // Duración de siesta en minutos
  nap_count: number | null; // Número de siestas
  nap_notes: string | null; // Detalle horario de la siesta (ej. '15:30 - 16:15')
  hrv_rmssd: number | null; // HRV basal nocturno en ms
  resting_hr: number | null; // FC en reposo nocturna (lpm)
  respiratory_rate: number | null; // Frecuencia respiratoria en rpm
  efficiency: number | null; // Eficiencia de sueño en %
  sleep_start: string | null; // Hora de acostarse (ej. '23:15')
  sleep_end: string | null; // Hora de despertarse (ej. '07:15')
  latency_min: number | null; // Latencia en minutos hasta conciliar el sueño
  created_at: string;
  updated_at: string;
}

export type SleepLogInput = Partial<
  Pick<
    SleepRow,
    | "hours"
    | "quality"
    | "notes"
    | "score"
    | "deep_min"
    | "light_min"
    | "rem_min"
    | "awake_min"
    | "source"
    | "nap_min"
    | "nap_count"
    | "nap_notes"
    | "hrv_rmssd"
    | "resting_hr"
    | "respiratory_rate"
    | "efficiency"
    | "sleep_start"
    | "sleep_end"
    | "latency_min"
  >
> & { date: string };

const MERGE_FIELDS = [
  "hours",
  "quality",
  "notes",
  "score",
  "deep_min",
  "light_min",
  "rem_min",
  "awake_min",
  "source",
  "nap_min",
  "nap_count",
  "nap_notes",
  "hrv_rmssd",
  "resting_hr",
  "respiratory_rate",
  "efficiency",
  "sleep_start",
  "sleep_end",
  "latency_min",
] as const;

// Actualiza SOLO los campos presentes en `input` (aunque su valor sea null, p.ej.
// al borrar un campo desde el formulario) y conserva los demás tal cual estaban.
// Así una importación de ZeppBridge (que manda hours/score/deep_min/...) nunca
// borra la "calidad" que el usuario haya puesto a mano, y viceversa.
export function upsertSleepLog(input: SleepLogInput): SleepRow {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare<SleepRow>("SELECT * FROM sleep_logs WHERE date = ?").get(input.date);

  const merged: Record<(typeof MERGE_FIELDS)[number], unknown> = {} as never;
  for (const field of MERGE_FIELDS) {
    merged[field] = field in input ? (input as Record<string, unknown>)[field] ?? null : existing?.[field] ?? null;
  }

  if (existing) {
    db.prepare(
      `UPDATE sleep_logs SET hours = ?, quality = ?, notes = ?, score = ?, deep_min = ?, light_min = ?, rem_min = ?, awake_min = ?, source = ?, nap_min = ?, nap_count = ?, nap_notes = ?, hrv_rmssd = ?, resting_hr = ?, respiratory_rate = ?, efficiency = ?, sleep_start = ?, sleep_end = ?, latency_min = ?, updated_at = ? WHERE date = ?`
    ).run(
      merged.hours,
      merged.quality,
      merged.notes,
      merged.score,
      merged.deep_min,
      merged.light_min,
      merged.rem_min,
      merged.awake_min,
      merged.source,
      merged.nap_min,
      merged.nap_count,
      merged.nap_notes,
      merged.hrv_rmssd,
      merged.resting_hr,
      merged.respiratory_rate,
      merged.efficiency,
      merged.sleep_start,
      merged.sleep_end,
      merged.latency_min,
      now,
      input.date
    );
  } else {
    db.prepare(
      `INSERT INTO sleep_logs (date, hours, quality, notes, score, deep_min, light_min, rem_min, awake_min, source, nap_min, nap_count, nap_notes, hrv_rmssd, resting_hr, respiratory_rate, efficiency, sleep_start, sleep_end, latency_min, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.date,
      merged.hours,
      merged.quality,
      merged.notes,
      merged.score,
      merged.deep_min,
      merged.light_min,
      merged.rem_min,
      merged.awake_min,
      merged.source,
      merged.nap_min,
      merged.nap_count,
      merged.nap_notes,
      merged.hrv_rmssd,
      merged.resting_hr,
      merged.respiratory_rate,
      merged.efficiency,
      merged.sleep_start,
      merged.sleep_end,
      merged.latency_min,
      now,
      now
    );
  }
  return db.prepare<SleepRow>("SELECT * FROM sleep_logs WHERE date = ?").get(input.date)!;
}

export function getSleepByDate(date: string): SleepRow | undefined {
  return getDb().prepare<SleepRow>("SELECT * FROM sleep_logs WHERE date = ?").get(date);
}

export function listSleepBetween(fromDate: string, toDate: string): SleepRow[] {
  return getDb()
    .prepare<SleepRow>("SELECT * FROM sleep_logs WHERE date >= ? AND date <= ? ORDER BY date ASC")
    .all(fromDate, toDate);
}

export function getSleepLogsByDates(dates: string[]): Map<string, SleepRow> {
  const map = new Map<string, SleepRow>();
  if (dates.length === 0) return map;
  const db = getDb();
  const chunkSize = 100;
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db.prepare<SleepRow>(`SELECT * FROM sleep_logs WHERE date IN (${placeholders})`).all(...chunk);
    for (const r of rows) map.set(r.date, r);
  }
  return map;
}

export function batchUpsertSleepLogs(inputs: SleepLogInput[]): SleepRow[] {
  const db = getDb();
  const results: SleepRow[] = [];
  db.transaction(() => {
    for (const input of inputs) {
      results.push(upsertSleepLog(input));
    }
  })();
  return results;
}
