import { NextRequest, NextResponse } from "next/server";
import { listMenuForPhase, hasMenuImported, PHASE_MACROS, addMenuItem, bulkCreateMenuItems, clearMenuForPhase } from "@/lib/repo/menu";

export async function GET(req: NextRequest) {
  const phase = Number(req.nextUrl.searchParams.get("phase") ?? "1");
  const items = listMenuForPhase(phase);
  return NextResponse.json({
    phase,
    macros: PHASE_MACROS[phase] ?? null,
    imported: hasMenuImported(phase),
    items,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Inserción en lote atómica (usado al importar)
  if (body.items && Array.isArray(body.items)) {
    const phase = Number(body.phase ?? 1);
    bulkCreateMenuItems(phase, body.items, !!body.replaceExisting);
    return NextResponse.json({ ok: true, count: body.items.length }, { status: 201 });
  }

  if (!body.phase || !body.day_of_week || !body.meal) {
    return NextResponse.json({ error: "phase, day_of_week y meal son obligatorios" }, { status: 400 });
  }
  const item = addMenuItem({
    phase: Number(body.phase),
    day_of_week: Number(body.day_of_week),
    meal: body.meal,
    option_label: body.option_label ?? null,
    foods_text: body.foods_text ?? null,
    kcal: body.kcal ?? null,
    protein_g: body.protein_g ?? null,
    carbs_g: body.carbs_g ?? null,
    fat_g: body.fat_g ?? null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const phase = Number(req.nextUrl.searchParams.get("phase"));
  if (!phase) return NextResponse.json({ error: "Falta la fase" }, { status: 400 });
  clearMenuForPhase(phase);
  return NextResponse.json({ ok: true });
}
