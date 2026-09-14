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
  date: string; // YYYY-MM-DD — misma fecha "de hoy" que usa todISODate() (UTC), para
  // que coincida con el resto de fechas de la app. Es la fecha en la que terminó
  // esa noche de sueño (end_time), que es como Hoy/Registro ya interpretan la
  // fecha de un registro de sueño ("dormiste X h anoche").
  hours: number | null;
  score: number | null;
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  start_time: string;
  end_time: string;
}

const REQUIRED_COLUMNS = ["record_type", "record_id", "start_time", "end_time", "metric", "value"];

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

export async function extractZeppSleepCsv(buffer: Buffer): Promise<ZeppSleepRow[]> {
  const rows = await readCsvRows(buffer);
  if (rows.length === 0) return [];

  // La primera fila del export de ZeppBridge trae un BOM UTF-8 delante de
  // "record_type" en algunos casos — ExcelJS ya lo gestiona al leer el CSV, pero
  // por si acaso normalizamos a minúsculas y quitamos espacios antes de mapear.
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const colIndex: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) colIndex[col] = header.indexOf(col);

  const missing = REQUIRED_COLUMNS.filter((c) => colIndex[c] === -1);
  if (missing.length > 0) {
    throw new Error(
      `Este archivo no tiene el formato esperado del export de ZeppBridge (faltan columnas: ${missing.join(", ")}). Usa "Hand to AI" → formato CSV → plantilla "Sleep analysis".`
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
    // La fecha del CSV ya viene en ISO con offset +00:00 (UTC) — cortamos los
    // primeros 10 caracteres directamente, igual que toISODate() hace con
    // toISOString(), para que la fecha coincida exactamente con el resto de la app.
    if (!acc.end_time || acc.end_time.length < 10) continue;
    const date = acc.end_time.slice(0, 10);
    const durationMin = acc.metrics["duration_minutes"] ?? null;

    out.push({
      date,
      hours: durationMin != null ? Math.round((durationMin / 60) * 100) / 100 : null,
      score: acc.metrics["score"] ?? null,
      deep_min: acc.metrics["deep_minutes"] ?? null,
      light_min: acc.metrics["light_minutes"] ?? null,
      rem_min: acc.metrics["rem_minutes"] ?? null,
      awake_min: acc.metrics["awake_minutes"] ?? null,
      start_time: acc.start_time,
      end_time: acc.end_time,
    });
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
