import { extractPdfText } from "@/lib/import/pdf-text";
import { extractPlanHeuristic, extractMenuHeuristic, extractGymHeuristic } from "@/lib/import/spreadsheet-heuristic";
import * as AnthropicAI from "@/lib/import/ai-extract";
import * as OllamaAI from "@/lib/import/ollama-extract";
import type { PlanRowAI, MenuRowAI, GymRowAI } from "@/lib/import/ai-extract";

export type ImportKind = "plan" | "menu" | "gym";

function extOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

const IMAGE_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function extractFromFile(
  kind: ImportKind,
  buffer: Buffer,
  fileName: string
): Promise<{
  rows: PlanRowAI[] | MenuRowAI[] | GymRowAI[];
  method: string;
}> {
  const ext = extOf(fileName);

  if (ext === "xlsx" || ext === "csv") {
    const rows =
      kind === "plan"
        ? await extractPlanHeuristic(buffer, fileName)
        : kind === "menu"
          ? await extractMenuHeuristic(buffer, fileName)
          : await extractGymHeuristic(buffer, fileName);
    return { rows, method: "hoja de cálculo" };
  }

  if (ext === "xls") {
    throw new Error("El formato .xls antiguo no está soportado — guarda el archivo como .xlsx y vuelve a intentarlo.");
  }

  const useAnthropic = AnthropicAI.hasApiKeyConfigured();
  const ollamaOk = !useAnthropic && (await OllamaAI.isOllamaAvailable());

  if (!useAnthropic && !ollamaOk) {
    throw new Error(
      "Para leer PDFs o imágenes hace falta añadir una clave de Anthropic en Configuración o tener Ollama activo en el equipo. Con archivos Excel (.xlsx) o CSV no hace falta ninguna IA."
    );
  }

  const aiEngine = useAnthropic ? AnthropicAI : OllamaAI;
  const methodLabel = useAnthropic ? "IA Claude" : "IA local (Ollama)";

  if (ext === "pdf") {
    const text = await extractPdfText(buffer);
    if (!text || text.trim().length < 20) {
      throw new Error(
        "No se ha podido extraer texto de este PDF (probablemente es un PDF escaneado, sin texto real). Prueba a subirlo como imagen (captura de pantalla o foto de cada página) en su lugar."
      );
    }
    const rows =
      kind === "plan"
        ? await aiEngine.extractPlanFromText(text)
        : kind === "menu"
          ? await aiEngine.extractMenuFromText(text)
          : await aiEngine.extractGymFromText(text);
    return { rows, method: `${methodLabel} (texto)` };
  }

  if (ext in IMAGE_EXT) {
    const base64 = buffer.toString("base64");
    const rows =
      kind === "plan"
        ? await aiEngine.extractPlanFromImage(base64, IMAGE_EXT[ext])
        : kind === "menu"
          ? await aiEngine.extractMenuFromImage(base64, IMAGE_EXT[ext])
          : await aiEngine.extractGymFromImage(base64, IMAGE_EXT[ext]);
    return { rows, method: `${methodLabel} (imagen)` };
  }

  throw new Error("Formato no soportado. Usa .xlsx, .csv, .pdf, .png o .jpg.");
}
