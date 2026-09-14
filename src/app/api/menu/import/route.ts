import { NextRequest, NextResponse } from "next/server";
import { extractFromFile } from "@/lib/import/orchestrate";
import type { MenuRowAI } from "@/lib/import/ai-extract";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, method } = await extractFromFile("menu", buffer, file.name);
    const menuRows = rows as MenuRowAI[];

    let skipped = 0;
    const preview = menuRows
      .map((r) => {
        if (!r.day_of_week || !r.meal) {
          skipped++;
          return null;
        }
        return {
          day_of_week: r.day_of_week,
          meal: r.meal,
          foods_text: r.foods,
          kcal: r.kcal,
          protein_g: r.protein_g,
          carbs_g: r.carbs_g,
          fat_g: r.fat_g,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ rows: preview, method, skipped, totalFound: menuRows.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo procesar el archivo" }, { status: 400 });
  }
}
