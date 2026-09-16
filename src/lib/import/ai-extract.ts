import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";

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

function getClient(): Anthropic | null {
  const apiKey = getSetting("anthropic_api_key");
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function hasApiKeyConfigured(): boolean {
  return !!getSetting("anthropic_api_key");
}

function getModel(): string {
  return getSetting("anthropic_model") || "claude-sonnet-4-5";
}

const PLAN_INSTRUCTIONS = `Eres un asistente que extrae datos de un plan de entrenamiento semanal a partir de un documento (tabla, texto o imagen). El documento puede tener un formato denso: cada día puede incluir varios ejercicios de gimnasio con series, repeticiones, RPE y pesos de referencia, o una sesión de carrera/natación estructurada en calentamiento + cuerpo + vuelta a la calma, o una tirada larga cuya distancia exacta remite a otra hoja de seguimiento.

Devuelve EXCLUSIVAMENTE un array JSON (sin texto antes ni después, sin bloque de código markdown) donde cada elemento sea una sesión de entrenamiento (un día puede tener más de una sesión, p. ej. gimnasio + carrera el mismo día — en ese caso son dos elementos distintos), con esta forma exacta:
{
  "day_of_week": <1 a 7, 1=lunes...7=domingo, o null si no se puede determinar>,
  "date": <"YYYY-MM-DD" solo si el documento trae una fecha concreta y explícita, si no null>,
  "discipline": <uno de "carrera", "gimnasio", "natacion", "crossfit", "otro", o null si no está claro>,
  "code": <el código o nombre de la sesión tal cual aparece en el documento (p. ej. "R2", "Día A", "N1"), o null>,
  "is_long_run": <true SOLO si el documento indica explícitamente que es una tirada/sesión larga, si no false>,
  "notes": <el contenido COMPLETO y literal de la sesión, ver instrucciones abajo, o null>
}

Instrucciones para "notes" — esto es lo más importante de la extracción:
- Copia TODO el detalle del entrenamiento tal cual aparece, sin resumir ni omitir nada: cada ejercicio de gimnasio con sus series, repeticiones, RPE y peso de referencia (p. ej. "Sentadilla 4x8 RPE7 @60kg; Press banca 3x10 RPE6 @35kg; ..."); en sesiones de carrera/natación estructuradas, incluye calentamiento, cuerpo/serie principal y vuelta a la calma tal cual estén descritos, con ritmos o tiempos si los hay.
- Usa saltos de línea (\\n) entre ejercicios o bloques para que quede legible, pero no acortes ni parafrasees el contenido — es preferible una nota larga y literal que una corta y resumida.
- Si la distancia de una tirada larga remite a otro documento (p. ej. "ver hoja de seguimiento", "según tabla semanal"), copia esa referencia tal cual en las notas — NUNCA inventes ni calcules un número de kilómetros que no esté escrito explícitamente en este documento.
- Si no hay ningún detalle más allá del código de la sesión, deja notes en null.
- IMPORTANTE sobre comillas: NUNCA uses comillas dobles (") dentro de las notas o textos (por ejemplo, para segundos de ritmo como 15-20"/km, escribe '15-20s/km' o '15-20 seg/km' o usa comillas simples '). Las comillas dobles no escapadas rompen el formato JSON.

Reglas estrictas: NUNCA inventes una sesión que no aparezca en el documento. Si un campo no está claro o no aparece, pon null (o false para is_long_run) en vez de adivinar. Si el documento no parece un plan de entrenamiento, devuelve un array vacío [].`;

const MENU_INSTRUCTIONS = `Eres un asistente que extrae datos de un menú semanal de comidas a partir de un documento (tabla, texto o imagen).

Devuelve EXCLUSIVAMENTE un array JSON (sin texto antes ni después, sin bloque de código markdown) donde cada elemento sea una comida de un día concreto, con esta forma exacta:
{
  "day_of_week": <1 a 7, 1=lunes...7=domingo, o null si no se puede determinar>,
  "meal": <nombre de la comida tal cual aparece, p. ej. "Desayuno", "Almuerzo", "Comida", "Merienda", "Cena", o null>,
  "foods": <descripción de los alimentos/cantidades tal cual aparece en el documento, o null>,
  "kcal": <número de kcal si aparece explícitamente, si no null>,
  "protein_g": <gramos de proteína si aparece explícitamente, si no null>,
  "carbs_g": <gramos de carbohidratos si aparece explícitamente, si no null>,
  "fat_g": <gramos de grasa si aparece explícitamente, si no null>
}

Reglas estrictas: NUNCA inventes una comida que no aparezca en el documento, y NUNCA calcules o estimes macros que no estén ya escritos explícitamente en el documento — si no aparecen, pon null. Si el documento no parece un menú de comidas, devuelve un array vacío [].`;

const GYM_INSTRUCTIONS = `Eres un asistente que extrae una rutina de gimnasio (catálogo de ejercicios agrupados por día o bloque) a partir de un documento (tabla, texto o imagen). El documento puede organizar los ejercicios por "Día A", "Día B", "Push/Pull/Legs", grupos musculares, etc.

Devuelve EXCLUSIVAMENTE un array JSON (sin texto antes ni después, sin bloque de código markdown) donde cada elemento sea UN ejercicio, con esta forma exacta:
{
  "day_label": <el nombre o código del día/bloque tal cual aparece en el documento (p. ej. "Día A", "Push"), o null si no se puede determinar>,
  "exercise": <el nombre del ejercicio tal cual aparece (p. ej. "Sentadilla", "Press banca"), o null si no está claro>,
  "detail": <series, repeticiones, RPE o peso de referencia tal cual aparezcan (p. ej. "4x8 RPE7 @60kg"), o null si no hay ese detalle>
}

Reglas estrictas: NUNCA inventes un ejercicio que no aparezca en el documento. Si el nombre del ejercicio no está claro, pon null en "exercise" (esa fila se descartará). Si el documento no parece una rutina de gimnasio, devuelve un array vacío [].`;

function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("La respuesta no contenía un array JSON reconocible.");
  }
  const jsonSlice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    try {
      const repaired = jsonSlice
        .replace(/(\d+)"(\/km)/gi, '$1 seg$2')
        .replace(/(\d+)"(\s)/g, '$1 seg$2')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(repaired);
    } catch {
      throw new Error("La respuesta de la IA no contenía un array JSON válido.");
    }
  }
}

async function callClaude(kind: "plan" | "menu" | "gym", content: Anthropic.MessageParam["content"]): Promise<unknown[]> {
  const client = getClient();
  if (!client) {
    throw new Error(
      "No hay ninguna clave de API de Anthropic configurada. Añádela en Configuración para poder leer PDFs o imágenes."
    );
  }
  const system = kind === "plan" ? PLAN_INSTRUCTIONS : kind === "menu" ? MENU_INSTRUCTIONS : GYM_INSTRUCTIONS;
  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("La IA no devolvió texto en la respuesta.");
  }
  return extractJsonArray(textBlock.text);
}

export async function extractPlanFromText(text: string): Promise<PlanRowAI[]> {
  const rows = await callClaude("plan", [{ type: "text", text: `Documento a analizar:\n\n${text}` }]);
  return rows as PlanRowAI[];
}

export async function extractMenuFromText(text: string): Promise<MenuRowAI[]> {
  const rows = await callClaude("menu", [{ type: "text", text: `Documento a analizar:\n\n${text}` }]);
  return rows as MenuRowAI[];
}

export async function extractGymFromText(text: string): Promise<GymRowAI[]> {
  const rows = await callClaude("gym", [{ type: "text", text: `Documento a analizar:\n\n${text}` }]);
  return rows as GymRowAI[];
}

export async function extractPlanFromImage(base64: string, mediaType: string): Promise<PlanRowAI[]> {
  const rows = await callClaude("plan", [
    { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
    { type: "text", text: "Extrae el plan de entrenamiento de esta imagen." },
  ]);
  return rows as PlanRowAI[];
}

export async function extractMenuFromImage(base64: string, mediaType: string): Promise<MenuRowAI[]> {
  const rows = await callClaude("menu", [
    { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
    { type: "text", text: "Extrae el menú de comidas de esta imagen." },
  ]);
  return rows as MenuRowAI[];
}

export async function extractGymFromImage(base64: string, mediaType: string): Promise<GymRowAI[]> {
  const rows = await callClaude("gym", [
    { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
    { type: "text", text: "Extrae la rutina de gimnasio de esta imagen." },
  ]);
  return rows as GymRowAI[];
}
