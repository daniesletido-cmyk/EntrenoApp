import { NextRequest, NextResponse } from "next/server";
import { extractZeppSleep } from "@/lib/import/zepp-sleep";
import { getSleepLogsByDates } from "@/lib/repo/sleep";

// Solo LEE el archivo (.json o .csv), analiza si cada noche es nueva, actualización o repetida
// consultando la base de datos, y devuelve la vista previa para que el usuario confirme
// importando solo los necesarios.
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
    const rawRows = await extractZeppSleep(buffer);
    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "No se ha encontrado ninguna noche de sueño en este archivo. Revisa que al exportar desde ZeppBridge tuvieras marcado el dato «Sleep»." },
        { status: 400 }
      );
    }

    const dates = rawRows.map((r) => r.date);
    const existingMap = getSleepLogsByDates(dates);

    const rows = rawRows.map((row) => {
      const existing = existingMap.get(row.date);
      if (!existing) {
        return {
          ...row,
          status: "new" as const,
          isDuplicate: false,
          isNecessary: true,
          existingData: null,
        };
      }

      // Comparar datos guardados con los nuevos del archivo
      const hoursMatch =
        existing.hours === null && row.hours === null
          ? true
          : existing.hours !== null && row.hours !== null
          ? Math.abs(existing.hours - row.hours) < 0.05
          : false;

      const scoreMatch = (existing.score ?? null) === (row.score ?? null);
      const deepMatch = (existing.deep_min ?? null) === (row.deep_min ?? null);
      const remMatch = (existing.rem_min ?? null) === (row.rem_min ?? null);
      const lightMatch = (existing.light_min ?? null) === (row.light_min ?? null);

      // Si las horas, score y fases ya son idénticos, es un duplicado innecesario
      const isExactDuplicate = hoursMatch && scoreMatch && deepMatch && remMatch;

      // Si existe pero el archivo aporta nueva información (score o fases que antes eran null, o duración diferente)
      const bringsNewScore = row.score != null && existing.score == null;
      const bringsNewPhases = (row.deep_min != null && existing.deep_min == null) || (row.rem_min != null && existing.rem_min == null);
      const hoursDifferent = !hoursMatch && row.hours != null;

      const isUpdate = !isExactDuplicate && (bringsNewScore || bringsNewPhases || hoursDifferent);
      const status = isUpdate ? ("update" as const) : ("duplicate" as const);
      const isDuplicate = status === "duplicate";
      const isNecessary = !isDuplicate;

      return {
        ...row,
        status,
        isDuplicate,
        isNecessary,
        existingData: {
          hours: existing.hours,
          quality: existing.quality,
          score: existing.score,
          deep_min: existing.deep_min,
          rem_min: existing.rem_min,
        },
      };
    });

    const summary = {
      total: rows.length,
      newCount: rows.filter((r) => r.status === "new").length,
      updateCount: rows.filter((r) => r.status === "update").length,
      duplicateCount: rows.filter((r) => r.status === "duplicate").length,
      necessaryCount: rows.filter((r) => r.isNecessary).length,
    };

    return NextResponse.json({ rows, summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
