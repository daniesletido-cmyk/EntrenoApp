import { NextRequest, NextResponse } from "next/server";
import { extractZeppSleepCsv } from "@/lib/import/zepp-sleep";

// Solo LEE el archivo y devuelve una vista previa — no escribe nada en la base de
// datos todavía. El propio formulario de Progreso confirma la importación noche a
// noche, igual que hacen Menú y Gimnasio con sus preview.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Solo se admite el CSV exportado desde ZeppBridge (pestaña «Hand to AI» → Export format CSV)." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await extractZeppSleepCsv(buffer);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No se ha encontrado ninguna noche de sueño en este CSV. Revisa que al exportar desde ZeppBridge tuvieras marcado el dato «Sleep»." },
        { status: 400 }
      );
    }
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
