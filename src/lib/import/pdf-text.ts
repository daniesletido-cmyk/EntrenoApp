// Extraer el texto de un PDF con texto real (no escaneado). pdf-parse no
// necesita ningún binario nativo — por eso se eligió en vez de otras
// librerías, mismo criterio que en FinanzasApp.
import pdfParse from "pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
