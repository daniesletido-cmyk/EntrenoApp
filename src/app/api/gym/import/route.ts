import { NextRequest, NextResponse } from "next/server";
import { extractFromFile } from "@/lib/import/orchestrate";
import type { GymRowAI } from "@/lib/import/ollama-extract";

// Solo LEE el archivo (Excel/CSV sin IA, o PDF/foto con Ollama local) y
// devuelve una vista previa editable — no crea ningún día ni ejercicio en
// la base de datos. El propio formulario de Gimnasio decide, fila a fila,
// a qué día va cada ejercicio (creando el día si no existe) al confirmar.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, method } = await extractFromFile("gym", buffer, file.name);
    const gymRows = rows as GymRowAI[];

    let skipped = 0;
    const preview = gymRows
      .map((r) => {
        if (!r.exercise || !r.exercise.trim()) {
          skipped++;
          return null;
        }
        return {
          day_label: r.day_label?.trim() || "Día A",
          exercise: r.exercise.trim(),
          detail: r.detail?.trim() || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ rows: preview, method, skipped, totalFound: gymRows.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
