import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { callAnthropicStructured } from "@/lib/ai/client";

// Extracción de planes/menús desde PDF o imagen usando la API de Anthropic.
// Regla de oro (igual que en FinanzasApp con las facturas): NUNCA se inventa
// un dato. El prompt pide explícitamente devolver null cuando algo no esté
// claro, en vez de adivinar — y el resultado siempre se muestra al usuario
// en una vista previa editable antes de guardar nada.

export interface PlanRowAI {
  day_of_week: number | null; // 1 lunes .. 7 domingo
  date: string | null; // YYYY-MM-DD si el documento trae fecha explícita
  discipline: "carrera" | "gimnasio" | "natacion" | "crossfit" | "otro" | null;
  code: string | null;
  is_long_run: boolean;
  notes: string | null;
}

export interface MenuRowAI {
  day_of_week: number | null;
  meal: string | null;
  foods: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface GymRowAI {
  day_label: string | null;
  exercise: string | null;
  detail: string | null;
}

export function hasApiKeyConfigured(): boolean {
  return !!(getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY);
}

const PLAN_INSTRUCTIONS = `Eres un asistente que extrae datos de un plan de entrenamiento semanal a partir de un documento (tabla, texto o imagen) usando la herramienta "save_extracted_rows". El documento puede tener un formato denso: cada día puede incluir varios ejercicios de gimnasio con series, repeticiones, RPE y pesos de referencia, o una sesión de carrera/natación estructurada en calentamiento + cuerpo + vuelta a la calma, o una tirada larga cuya distancia exacta remite a otra hoja de seguimiento.

Cada elemento de "rows" representa una sesión de entrenamiento (un día puede tener más de una sesión, p. ej. gimnasio + carrera el mismo día — en ese caso son dos elementos distintos):
- day_of_week: 1 a 7 (1=lunes...7=domingo) o null si no se puede determinar
- date: "YYYY-MM-DD" solo si el documento trae una fecha concreta y explícita, si no null
- discipline: "carrera" | "gimnasio" | "natacion" | "crossfit" | "otro" | null
- code: código o nombre de la sesión tal cual aparece (p. ej. "R2", "Día A", "N1") o null
- is_long_run: true SOLO si el documento indica explícitamente que es una tirada/sesión larga, si no false
- notes: contenido COMPLETO y literal de la sesión o null

Instrucciones para "notes" — esto es lo más importante de la extracción:
- Copia TODO el detalle del entrenamiento tal cual aparece, sin resumir ni omitir nada: cada ejercicio de gimnasio con sus series, repeticiones, RPE y peso de referencia (p. ej. "Sentadilla 4x8 RPE7 @60kg; Press banca 3x10 RPE6 @35kg; ..."); en sesiones de carrera/natación estructuradas, incluye calentamiento, cuerpo/serie principal y vuelta a la calma tal cual estén descritos, con ritmos o tiempos si los hay.
- Usa saltos de línea (\\n) entre ejercicios o bloques para que quede legible, pero no acortes ni parafrasees el contenido — es preferible una nota larga y literal que una corta y resumida.
- Si la distancia de una tirada larga remite a otro documento (p. ej. "ver hoja de seguimiento", "según tabla semanal"), copia esa referencia tal cual en las notas — NUNCA inventes ni calcules un número de kilómetros que no esté escrito explícitamente en este documento.
- Si no hay ningún detalle más allá del código de la sesión, deja notes en null.

Reglas estrictas: NUNCA inventes una sesión que no aparezca en el documento. Si un campo no está claro o no aparece, pon null (o false para is_long_run) en vez de adivinar. Si el documento no parece un plan de entrenamiento, devuelve rows: [].`;

const MENU_INSTRUCTIONS = `Eres un asistente que extrae datos de un menú semanal de comidas a partir de un documento (tabla, texto o imagen) usando la herramienta "save_extracted_rows".

Cada elemento de "rows" representa una comida de un día concreto:
- day_of_week: 1 a 7 (1=lunes...7=domingo) o null
- meal: nombre de la comida tal cual aparece (p. ej. "Desayuno", "Almuerzo", "Comida", "Merienda", "Cena") o null
- foods: descripción de los alimentos/cantidades tal cual aparece en el documento o null
- kcal, protein_g, carbs_g, fat_g: números si aparecen explícitamente, si no null

Reglas estrictas: NUNCA inventes una comida que no aparezca en el documento, y NUNCA calcules o estimes macros que no estén ya escritos explícitamente en el documento — si no aparecen, pon null. Si el documento no parece un menú de comidas, devuelve rows: [].`;

const GYM_INSTRUCTIONS = `Eres un asistente que extrae una rutina de gimnasio (catálogo de ejercicios agrupados por día o bloque) a partir de un documento (tabla, texto o imagen) usando la herramienta "save_extracted_rows". El documento puede organizar los ejercicios por "Día A", "Día B", "Push/Pull/Legs", grupos musculares, etc.

Cada elemento de "rows" representa UN ejercicio:
- day_label: nombre o código del día/bloque tal cual aparece (p. ej. "Día A", "Push") o null
- exercise: nombre del ejercicio tal cual aparece (p. ej. "Sentadilla", "Press banca") o null si no está claro
- detail: series, repeticiones, RPE o peso de referencia tal cual aparezcan (p. ej. "4x8 RPE7 @60kg") o null

Reglas estrictas: NUNCA inventes un ejercicio que no aparezca en el documento. Si el nombre del ejercicio no está claro, pon null en "exercise" (esa fila se descartará). Si el documento no parece una rutina de gimnasio, devuelve rows: [].`;

const PLAN_TOOL_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_of_week: { type: ["number", "null"] },
          date: { type: ["string", "null"] },
          discipline: {
            type: ["string", "null"],
            enum: ["carrera", "gimnasio", "natacion", "crossfit", "otro", null],
          },
          code: { type: ["string", "null"] },
          is_long_run: { type: "boolean" },
          notes: { type: ["string", "null"] },
        },
        required: ["day_of_week", "date", "discipline", "code", "is_long_run", "notes"],
      },
    },
  },
  required: ["rows"],
};

const MENU_TOOL_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_of_week: { type: ["number", "null"] },
          meal: { type: ["string", "null"] },
          foods: { type: ["string", "null"] },
          kcal: { type: ["number", "null"] },
          protein_g: { type: ["number", "null"] },
          carbs_g: { type: ["number", "null"] },
          fat_g: { type: ["number", "null"] },
        },
        required: ["day_of_week", "meal", "foods", "kcal", "protein_g", "carbs_g", "fat_g"],
      },
    },
  },
  required: ["rows"],
};

const GYM_TOOL_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_label: { type: ["string", "null"] },
          exercise: { type: ["string", "null"] },
          detail: { type: ["string", "null"] },
        },
        required: ["day_label", "exercise", "detail"],
      },
    },
  },
  required: ["rows"],
};

function extractJsonArrayFallback(text: string): { rows: unknown[] } {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("La respuesta no contenía un array JSON reconocible.");
  }
  const jsonSlice = trimmed.slice(start, end + 1);
  try {
    return { rows: JSON.parse(jsonSlice) as unknown[] };
  } catch {
    const repaired = jsonSlice
      .replace(/(\d+)"(\/km)/gi, "$1 seg$2")
      .replace(/(\d+)"(\s)/g, "$1 seg$2")
      .replace(/,\s*([}\]])/g, "$1");
    return { rows: JSON.parse(repaired) as unknown[] };
  }
}

function asNullableNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asNullableString(v: unknown): string | null {
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function extractRawRows(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { rows?: unknown }).rows)) {
    return (raw as { rows: unknown[] }).rows;
  }
  throw new Error("La respuesta estructurada no incluía un array 'rows' válido.");
}

const VALID_DISCIPLINES = new Set(["carrera", "gimnasio", "natacion", "crossfit", "otro"]);

function validatePlanRows(raw: unknown): PlanRowAI[] {
  return extractRawRows(raw)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((r) => {
      const day = asNullableNumber(r.day_of_week);
      const disc = typeof r.discipline === "string" && VALID_DISCIPLINES.has(r.discipline)
        ? (r.discipline as PlanRowAI["discipline"])
        : null;
      return {
        day_of_week: day !== null && day >= 1 && day <= 7 ? Math.round(day) : null,
        date: asNullableString(r.date),
        discipline: disc,
        code: asNullableString(r.code),
        is_long_run: r.is_long_run === true,
        notes: typeof r.notes === "string" && r.notes.trim().length > 0 ? r.notes : null,
      };
    });
}

function validateMenuRows(raw: unknown): MenuRowAI[] {
  return extractRawRows(raw)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((r) => {
      const day = asNullableNumber(r.day_of_week);
      return {
        day_of_week: day !== null && day >= 1 && day <= 7 ? Math.round(day) : null,
        meal: asNullableString(r.meal),
        foods: asNullableString(r.foods),
        kcal: asNullableNumber(r.kcal),
        protein_g: asNullableNumber(r.protein_g),
        carbs_g: asNullableNumber(r.carbs_g),
        fat_g: asNullableNumber(r.fat_g),
      };
    });
}

function validateGymRows(raw: unknown): GymRowAI[] {
  return extractRawRows(raw)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((r) => ({
      day_label: asNullableString(r.day_label),
      exercise: asNullableString(r.exercise),
      detail: asNullableString(r.detail),
    }));
}

async function callClaudeStructured<T>(
  kind: "plan" | "menu" | "gym",
  content: Anthropic.MessageParam["content"],
  sourceType: "text" | "image"
): Promise<T[]> {
  const system = kind === "plan" ? PLAN_INSTRUCTIONS : kind === "menu" ? MENU_INSTRUCTIONS : GYM_INSTRUCTIONS;
  const inputSchema = kind === "plan" ? PLAN_TOOL_SCHEMA : kind === "menu" ? MENU_TOOL_SCHEMA : GYM_TOOL_SCHEMA;
  const validate =
    kind === "plan"
      ? (validatePlanRows as (r: unknown) => T[])
      : kind === "menu"
      ? (validateMenuRows as (r: unknown) => T[])
      : (validateGymRows as (r: unknown) => T[]);

  return callAnthropicStructured<T[]>({
    feature: `import_${kind}`,
    toolName: "save_extracted_rows",
    toolDescription: `Guarda las filas extraídas de tipo ${kind} desde el documento.`,
    inputSchema,
    validate,
    fallbackTextParser: extractJsonArrayFallback,
    maxTokens: 8192,
    system,
    messages: [{ role: "user", content }],
    metadata: { kind, sourceType },
  });
}

export async function extractPlanFromText(text: string): Promise<PlanRowAI[]> {
  return callClaudeStructured<PlanRowAI>("plan", [{ type: "text", text: `Documento a analizar:\n\n${text}` }], "text");
}

export async function extractMenuFromText(text: string): Promise<MenuRowAI[]> {
  return callClaudeStructured<MenuRowAI>("menu", [{ type: "text", text: `Documento a analizar:\n\n${text}` }], "text");
}

export async function extractGymFromText(text: string): Promise<GymRowAI[]> {
  return callClaudeStructured<GymRowAI>("gym", [{ type: "text", text: `Documento a analizar:\n\n${text}` }], "text");
}

export async function extractPlanFromImage(base64: string, mediaType: string): Promise<PlanRowAI[]> {
  return callClaudeStructured<PlanRowAI>(
    "plan",
    [
      { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
      { type: "text", text: "Extrae el plan de entrenamiento de esta imagen." },
    ],
    "image"
  );
}

export async function extractMenuFromImage(base64: string, mediaType: string): Promise<MenuRowAI[]> {
  return callClaudeStructured<MenuRowAI>(
    "menu",
    [
      { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
      { type: "text", text: "Extrae el menú de comidas de esta imagen." },
    ],
    "image"
  );
}

export async function extractGymFromImage(base64: string, mediaType: string): Promise<GymRowAI[]> {
  return callClaudeStructured<GymRowAI>(
    "gym",
    [
      { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
      { type: "text", text: "Extrae la rutina de gimnasio de esta imagen." },
    ],
    "image"
  );
}
