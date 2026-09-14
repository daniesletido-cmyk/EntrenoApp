import { NextRequest, NextResponse } from "next/server";
import { extractFromFile } from "@/lib/import/orchestrate";
import type { PlanRowAI } from "@/lib/import/ai-extract";
import { addDays } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const weekStart = formData.get("weekStart");
  if (!(file instanceof File)) return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  if (typeof weekStart !== "string" || !weekStart) {
    return NextResponse.json({ error: "Falta la semana de destino" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, method } = await extractFromFile("plan", buffer, file.name);
    const planRows = rows as PlanRowAI[];

    let skipped = 0;
    const preview = planRows
      .map((r) => {
        const date = r.date ?? (r.day_of_week ? addDays(weekStart, r.day_of_week - 1) : null);
        if (!date) {
          skipped++;
          return null;
        }
        return {
          date,
          discipline: r.discipline ?? "otro",
          planned_code: r.code,
          is_long_run: r.is_long_run,
          notes: r.notes,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ rows: preview, method, skipped, totalFound: planRows.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
