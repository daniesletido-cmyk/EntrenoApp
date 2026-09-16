import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { PlanRowAI, MenuRowAI } from "@/lib/import/ai-extract";
import type { GymRowAI } from "@/lib/import/ollama-extract";

// Lectura de Excel/CSV sin ninguna IA: útil porque no depende de tener una
// clave de API configurada, y una hoja de cálculo ya viene en filas/columnas
// (a diferencia de un PDF o una foto).
//
// Estrategia: detectar una fila de cabecera y mapear cada columna a un campo
// conocido (día, disciplina, código... / día, comida, alimentos, kcal...) —
// NUNCA adivinar un número mirando la celda de al lado sin saber qué
// columna es, porque eso puede atribuir un valor a un campo equivocado
// (por ejemplo, coger las kcal y guardarlas como proteína solo porque la
// celda de al lado contenía la palabra "proteína" dentro de una descripción
// de alimento). Si no hay cabecera reconocible, se usa un modo de reserva
// más limitado que solo extrae día + disciplina/comida (nunca macros, para
// no arriesgarse a inventar un número que no es).

const DAY_NAMES: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
  domingo: 7,
};

const DISCIPLINE_KEYWORDS: [RegExp, PlanRowAI["discipline"]][] = [
  [/carrera|correr|running|rodaje|tirada/i, "carrera"],
  [/gimnasio|fuerza|pesas|gym/i, "gimnasio"],
  [/natacion|natación|piscina|swim/i, "natacion"],
  [/crossfit|wod/i, "crossfit"],
];

const CODE_PATTERN = /\b(R\d{1,2}|N\d{1,2}|D[ií]a\s?[A-Z]|Fase\s?\d)\b/i;
const MEAL_KEYWORDS = /desayuno|almuerzo|comida|merienda|cena|media\s?ma[ñn]ana/i;

async function readRows(buffer: Buffer, fileName: string): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  }
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

function dayOfWeekFromText(text: string): number | null {
  const lower = text.toLowerCase();
  for (const [name, num] of Object.entries(DAY_NAMES)) {
    if (lower.includes(name)) return num;
  }
  return null;
}

function parseNumber(text: string): number | null {
  const m = text.match(/[\d]+([.,]\d+)?/);
  if (!m) return null;
  return Number(m[0].replace(",", "."));
}

// --- Detección de cabecera + mapeo de columnas ---

interface HeaderMatch {
  headerRowIndex: number;
  columns: Record<string, number>; // campo -> índice de columna
}

function detectHeader(rows: string[][], fieldPatterns: Record<string, RegExp>): HeaderMatch | null {
  const searchDepth = Math.min(rows.length, 5);
  let best: HeaderMatch | null = null;
  let bestScore = 0;
  for (let r = 0; r < searchDepth; r++) {
    const columns: Record<string, number> = {};
    let score = 0;
    rows[r].forEach((cell, colIdx) => {
      for (const [field, pattern] of Object.entries(fieldPatterns)) {
        if (columns[field] === undefined && pattern.test(cell)) {
          columns[field] = colIdx;
          score++;
        }
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = { headerRowIndex: r, columns };
    }
  }
  // Exigimos al menos 2 columnas reconocidas para confiar en que es de verdad una cabecera.
  return best && bestScore >= 2 ? best : null;
}

const PLAN_HEADER_PATTERNS: Record<string, RegExp> = {
  day: /^(d[ií]a|fecha)/i,
  discipline: /disciplina|tipo|deporte|sesi[oó]n|actividad/i,
  code: /c[oó]digo|receta|detalle/i,
  notes: /^notas$|observaciones|qu[eé]\s*hacer|descripci[oó]n|contenido|entrenamiento/i,
};

// A diferencia del plan (día de la semana fijo), un "día" de gimnasio es un
// nombre libre (Día A, Push...), así que no hay lista cerrada que reconocer:
// se toma la celda de la columna "día" tal cual, y si viene vacía (celdas
// combinadas en el Excel original) se arrastra el último valor visto.
const GYM_HEADER_PATTERNS: Record<string, RegExp> = {
  day: /^(d[ií]a|bloque|grupo)/i,
  exercise: /ejercicio|movimiento/i,
  detail: /series|reps?|repeticion|rpe|peso|detalle/i,
};

const MENU_HEADER_PATTERNS: Record<string, RegExp> = {
  day: /^(d[ií]a|fecha)/i,
  meal: /comida|momento/i,
  foods: /alimento|men[uú]|opci[oó]n/i,
  kcal: /kcal|calor[ií]as/i,
  protein: /prote[ií]na/i,
  carbs: /carbohidrato|hidratos/i,
  fat: /grasa/i,
};

export async function extractPlanHeuristic(buffer: Buffer, fileName: string): Promise<PlanRowAI[]> {
  const rows = await readRows(buffer, fileName);
  const header = detectHeader(rows, PLAN_HEADER_PATTERNS);
  const results: PlanRowAI[] = [];

  if (header) {
    for (let r = header.headerRowIndex + 1; r < rows.length; r++) {
      const cells = rows[r];
      const dayCell = header.columns.day !== undefined ? cells[header.columns.day] ?? "" : "";
      const day = dayOfWeekFromText(dayCell) ?? dayOfWeekFromText(cells.join(" "));
      if (day === null) continue;

      const disciplineCell = header.columns.discipline !== undefined ? cells[header.columns.discipline] ?? "" : cells.join(" ");
      let discipline: PlanRowAI["discipline"] = null;
      for (const [re, disc] of DISCIPLINE_KEYWORDS) {
        if (re.test(disciplineCell) || re.test(cells.join(" "))) {
          discipline = disc;
          break;
        }
      }
      if (!discipline) continue;

      const codeCell = header.columns.code !== undefined ? cells[header.columns.code] : null;
      const codeMatch = (codeCell ?? cells.join(" ")).match(CODE_PATTERN);
      const isLongRun = /larga|long\s?run/i.test(cells.join(" "));
      const notes = header.columns.notes !== undefined ? cells[header.columns.notes] || null : null;

      results.push({
        day_of_week: day,
        date: null,
        discipline,
        code: codeMatch ? codeMatch[0] : codeCell || null,
        is_long_run: isLongRun,
        notes,
      });
    }
    return results;
  }

  // Reserva sin cabecera reconocible: mismo comportamiento robusto de antes,
  // buscando el día y una disciplina en cada fila completa.
  for (const cells of rows) {
    const joined = cells.join(" | ");
    const day = dayOfWeekFromText(joined);
    if (day === null) continue;
    let discipline: PlanRowAI["discipline"] = null;
    for (const [re, disc] of DISCIPLINE_KEYWORDS) {
      if (re.test(joined)) {
        discipline = disc;
        break;
      }
    }
    if (!discipline) continue;
    const codeMatch = joined.match(CODE_PATTERN);
    results.push({
      day_of_week: day,
      date: null,
      discipline,
      code: codeMatch ? codeMatch[0] : null,
      is_long_run: /larga|long\s?run/i.test(joined),
      notes: null,
    });
  }
  return results;
}

export async function extractMenuHeuristic(buffer: Buffer, fileName: string): Promise<MenuRowAI[]> {
  const rows = await readRows(buffer, fileName);
  const header = detectHeader(rows, MENU_HEADER_PATTERNS);
  const results: MenuRowAI[] = [];

  if (header) {
    for (let r = header.headerRowIndex + 1; r < rows.length; r++) {
      const cells = rows[r];
      const dayCell = header.columns.day !== undefined ? cells[header.columns.day] ?? "" : "";
      const day = dayOfWeekFromText(dayCell);
      const mealCell = header.columns.meal !== undefined ? cells[header.columns.meal] : null;
      if (day === null || !mealCell) continue;

      const foods = header.columns.foods !== undefined ? cells[header.columns.foods] || null : null;
      const kcal = header.columns.kcal !== undefined ? parseNumber(cells[header.columns.kcal] ?? "") : null;
      const protein = header.columns.protein !== undefined ? parseNumber(cells[header.columns.protein] ?? "") : null;
      const carbs = header.columns.carbs !== undefined ? parseNumber(cells[header.columns.carbs] ?? "") : null;
      const fat = header.columns.fat !== undefined ? parseNumber(cells[header.columns.fat] ?? "") : null;

      results.push({ day_of_week: day, meal: mealCell, foods, kcal, protein_g: protein, carbs_g: carbs, fat_g: fat });
    }
    return results;
  }

  // Reserva sin cabecera: solo día + comida + alimentos, NUNCA macros (no
  // hay forma fiable de saber a qué columna pertenece un número suelto).
  for (const cells of rows) {
    const day = dayOfWeekFromText(cells.join(" "));
    const mealIdx = cells.findIndex((c) => MEAL_KEYWORDS.test(c));
    if (day === null || mealIdx === -1) continue;
    const dayIdx = cells.findIndex((c) => dayOfWeekFromText(c) !== null);
    const foods = cells
      .filter((_, i) => i !== mealIdx && i !== dayIdx)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!foods) continue;
    results.push({ day_of_week: day, meal: cells[mealIdx], foods, kcal: null, protein_g: null, carbs_g: null, fat_g: null });
  }
  return results;
}

// Requiere cabecera reconocible con al menos la columna de ejercicio — sin
// eso no hay forma fiable de distinguir una fila de ejercicio de cualquier
// otro texto de la hoja. Si no se detecta, se devuelve vacío (el usuario
// puede usar PDF/foto en su lugar, o añadir los ejercicios a mano).
export async function extractGymHeuristic(buffer: Buffer, fileName: string): Promise<GymRowAI[]> {
  const rows = await readRows(buffer, fileName);
  const header = detectHeader(rows, GYM_HEADER_PATTERNS);
  const results: GymRowAI[] = [];
  if (!header || header.columns.exercise === undefined) return results;

  let lastDay: string | null = null;
  for (let r = header.headerRowIndex + 1; r < rows.length; r++) {
    const cells = rows[r];
    const dayCell = header.columns.day !== undefined ? (cells[header.columns.day] || "").trim() : "";
    if (dayCell) lastDay = dayCell;

    const exerciseCell = (cells[header.columns.exercise] || "").trim();
    if (!exerciseCell) continue;

    const detailCell = header.columns.detail !== undefined ? cells[header.columns.detail]?.trim() || null : null;
    results.push({ day_label: lastDay, exercise: exerciseCell, detail: detailCell });
  }
  return results;
}
