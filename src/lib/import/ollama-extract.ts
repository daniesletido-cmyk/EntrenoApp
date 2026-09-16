// Extracción de planes/menús desde PDF (texto) o imagen usando un modelo LOCAL
// vía Ollama — sin API externa, sin clave, sin coste y sin internet. Mismo
// comportamiento que la versión con Claude: el prompt exige devolver null
// cuando algo no esté claro, en vez de inventar, y el resultado se muestra
// siempre en una vista previa editable antes de guardar nada.

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
  day_label: string | null; // nombre/código del día o bloque tal cual aparece, p. ej. "Día A", "Push"
  exercise: string | null;
  detail: string | null; // series/repeticiones/RPE/peso de referencia tal cual aparezcan, o null
}

const OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen-entreno";

function getModel(): string {
  return DEFAULT_MODEL;
}

/** Comprueba si Ollama está corriendo en el equipo. */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
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

Reglas estrictas: NUNCA inventes una sesión que no aparezca en el documento. Si un campo no está claro o no aparece, pon null (o false para is_long_run) en vez de adivinar. Si el documento no parece un plan de entrenamiento, devuelve un array vacío []. Responde EXCLUSIVAMENTE con el array JSON, sin ningún comentario ni explicación adicional.`;

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

Reglas estrictas: NUNCA inventes una comida que no aparezca en el documento, y NUNCA calcules o estimes macros que no estén ya escritos explícitamente en el documento — si no aparecen, pon null. Si el documento no parece un menú de comidas, devuelve un array vacío []. Responde EXCLUSIVAMENTE con el array JSON, sin ningún comentario ni explicación adicional.`;

const GYM_INSTRUCTIONS = `Eres un asistente que extrae una rutina de gimnasio (catálogo de ejercicios agrupados por día o bloque) a partir de un documento (tabla, texto o imagen). El documento puede organizar los ejercicios por "Día A", "Día B", "Push/Pull/Legs", grupos musculares, etc.

Devuelve EXCLUSIVAMENTE un array JSON (sin texto antes ni después, sin bloque de código markdown) donde cada elemento sea UN ejercicio, con esta forma exacta:
{
  "day_label": <el nombre o código del día/bloque tal cual aparece en el documento (p. ej. "Día A", "Push"), o null si no se puede determinar>,
  "exercise": <el nombre del ejercicio tal cual aparece (p. ej. "Sentadilla", "Press banca"), o null si no está claro>,
  "detail": <series, repeticiones, RPE o peso de referencia tal cual aparezcan (p. ej. "4x8 RPE7 @60kg"), o null si no hay ese detalle>
}

Reglas estrictas: NUNCA inventes un ejercicio que no aparezca en el documento. Si el nombre del ejercicio no está claro, pon null en "exercise" (esa fila se descartará). Si el documento no parece una rutina de gimnasio, devuelve un array vacío []. Responde EXCLUSIVAMENTE con el array JSON, sin ningún comentario ni explicación adicional.`;

function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      "El modelo local no devolvió un array JSON reconocible. Prueba con un modelo más grande en Configuración."
    );
  }
  const jsonSlice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    // Reparar errores sintácticos habituales de LLMs (comillas de segundos 15-20"/km, comillas internas, comas finales)
    try {
      const repaired = jsonSlice
        .replace(/(\d+)"(\/km)/gi, '$1 seg$2')
        .replace(/(\d+)"(\s)/g, '$1 seg$2')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(repaired);
    } catch {
      throw new Error(
        "El modelo local devolvió una respuesta con formato JSON inválido. Inténtalo de nuevo o importa el plan en formato Excel (.xlsx)."
      );
    }
  }
}

async function callOllama(kind: "plan" | "menu" | "gym", userText: string, images?: string[]): Promise<unknown[]> {
  const system = kind === "plan" ? PLAN_INSTRUCTIONS : kind === "menu" ? MENU_INSTRUCTIONS : GYM_INSTRUCTIONS;
  const model = getModel();

  console.log(
    `[ollama-extract] INICIO modelo=${model} kind=${kind} imagenes=${images ? images.length : 0} longitudTexto=${userText.length}`
  );

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0, num_ctx: 8192 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText, ...(images ? { images } : {}) },
        ],
      }),
    });
  } catch (err) {
    console.error("[ollama-extract] ERROR de red al llamar a Ollama:", err);
    throw new Error(
      "No se ha podido conectar con Ollama. Comprueba que la aplicación Ollama está abierta en tu equipo (icono en la bandeja del sistema) e inténtalo de nuevo."
    );
  }

  console.log(`[ollama-extract] respuesta HTTP status=${res.status} ok=${res.ok}`);

  const rawBody = await res.text();
  console.log(`[ollama-extract] cuerpo crudo de la respuesta (primeros 4000 caracteres):\n${rawBody.slice(0, 4000)}`);

  if (!res.ok) {
    if (res.status === 404 && /model.*not found/i.test(rawBody)) {
      throw new Error(`El modelo "${model}" no está descargado. Ejecuta "ollama pull ${model}" en una terminal y vuelve a intentarlo.`);
    }
    throw new Error(`Ollama respondió con error (${res.status}): ${rawBody || "sin detalle"}.`);
  }

  let data: { message?: { content?: string } };
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    console.error("[ollama-extract] ERROR: la respuesta de Ollama no es JSON válido:", err);
    throw new Error("Ollama devolvió una respuesta que no se pudo interpretar (ver terminal del servidor para el detalle).");
  }

  const content = data?.message?.content;
  console.log(`[ollama-extract] contenido del mensaje del modelo:\n${content}`);
  if (!content) {
    throw new Error("El modelo local no devolvió texto en la respuesta.");
  }
  return extractJsonArray(content);
}

export async function extractPlanFromText(text: string): Promise<PlanRowAI[]> {
  const rows = await callOllama("plan", `Documento a analizar:\n\n${text}`);
  return rows as PlanRowAI[];
}

export async function extractMenuFromText(text: string): Promise<MenuRowAI[]> {
  const rows = await callOllama("menu", `Documento a analizar:\n\n${text}`);
  return rows as MenuRowAI[];
}

// mediaType se mantiene en la firma por compatibilidad con quien llama a esta
// función (orchestrate.ts) aunque Ollama detecta el formato de la imagen solo.
export async function extractPlanFromImage(base64: string, _mediaType: string): Promise<PlanRowAI[]> {
  const rows = await callOllama("plan", "Extrae el plan de entrenamiento de esta imagen.", [base64]);
  return rows as PlanRowAI[];
}

export async function extractMenuFromImage(base64: string, _mediaType: string): Promise<MenuRowAI[]> {
  const rows = await callOllama("menu", "Extrae el menú de comidas de esta imagen.", [base64]);
  return rows as MenuRowAI[];
}

export async function extractGymFromText(text: string): Promise<GymRowAI[]> {
  const rows = await callOllama("gym", `Documento a analizar:\n\n${text}`);
  return rows as GymRowAI[];
}

export async function extractGymFromImage(base64: string, _mediaType: string): Promise<GymRowAI[]> {
  const rows = await callOllama("gym", "Extrae la rutina de gimnasio de esta imagen.", [base64]);
  return rows as GymRowAI[];
}