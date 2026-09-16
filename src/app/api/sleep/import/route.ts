import { NextRequest, NextResponse } from "next/server";
import { extractZeppSleep } from "@/lib/import/zepp-sleep";

// Solo LEE el archivo (.json o .csv) y devuelve una vista previa — no escribe nada en la base de
// datos todavía. El propio usuario confirma la importación noche a
// noche desde Registro o Progreso.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  }
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv") && !fileName.endsWith(".json")) {
    return NextResponse.json(
      { error: "Solo se admite formato .json o .csv (exportado desde ZeppBridge o archivo de sueño con columnas fecha, horas, calidad)." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await extractZeppSleep(buffer);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No se ha encontrado ninguna noche de sueño en este archivo. Revisa que al exportar desde ZeppBridge tuvieras marcado el dato «Sleep»." },
        { status: 400 }
      );
    }
    return NextResponse.json({ rows });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
