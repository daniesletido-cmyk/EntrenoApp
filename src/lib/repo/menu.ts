import { getDb } from "@/lib/db";

export interface MenuItemRow {
  id: number;
  phase: number;
  day_of_week: number; // 1 lunes .. 7 domingo
  meal: string;
  option_label: string | null;
  foods_text: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

// Objetivos de macros por fase, tal y como están calculados en el documento
// completo del plan (Mifflin-St Jeor, ~1.672 kcal BMR). El detalle exacto de
// alimentos/gramos por día vive en Menu_Semanal_JavaTec.docx — pendiente de
// importar ese contenido real (nunca se inventa un menú día a día).
export const PHASE_MACROS: Record<number, { kcal: number; protein_g: number; carbs_g: number; fat_g: number; label: string }> = {
  1: { kcal: 2900, protein_g: 139, carbs_g: 312, fat_g: 122, label: "Fase 1 — Base + Hipertrofia" },
  2: { kcal: 3050, protein_g: 132, carbs_g: 381, fat_g: 111, label: "Fase 2 — Build / Transición" },
  3: { kcal: 3300, protein_g: 118, carbs_g: 485, fat_g: 99, label: "Fase 3 — Específico Maratón" },
  4: { kcal: 2900, protein_g: 118, carbs_g: 416, fat_g: 85, label: "Fase 4 — Tapering" },
};

export function listMenuForPhase(phase: number): MenuItemRow[] {
  return getDb()
    .prepare<MenuItemRow>("SELECT * FROM menu_items WHERE phase = ? ORDER BY day_of_week ASC, id ASC")
    .all(phase);
}

export function hasMenuImported(phase: number): boolean {
  const row = getDb()
    .prepare<{ c: number }>("SELECT COUNT(*) as c FROM menu_items WHERE phase = ?")
    .get(phase);
  return (row?.c ?? 0) > 0;
}

export function addMenuItem(input: Omit<MenuItemRow, "id">): MenuItemRow {
  const db = getDb();
  const res = db
    .prepare(
      `INSERT INTO menu_items (phase, day_of_week, meal, option_label, foods_text, kcal, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.phase,
      input.day_of_week,
      input.meal,
      input.option_label,
      input.foods_text,
      input.kcal,
      input.protein_g,
      input.carbs_g,
      input.fat_g
    );
  return db.prepare<MenuItemRow>("SELECT * FROM menu_items WHERE id = ?").get(Number(res.lastInsertRowid))!;
}

export function clearMenuForPhase(phase: number): void {
  getDb().prepare("DELETE FROM menu_items WHERE phase = ?").run(phase);
}

export function bulkCreateMenuItems(
  phase: number,
  items: Omit<MenuItemRow, "id" | "phase">[],
  replaceExisting: boolean = false
): void {
  const db = getDb();
  const insertStmt = db.prepare(
    `INSERT INTO menu_items (phase, day_of_week, meal, option_label, foods_text, kcal, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const runTx = db.transaction(() => {
    if (replaceExisting) {
      db.prepare("DELETE FROM menu_items WHERE phase = ?").run(phase);
    }
    for (const item of items) {
      insertStmt.run(
        phase,
        item.day_of_week,
        item.meal,
        item.option_label ?? null,
        item.foods_text ?? null,
        item.kcal ?? null,
        item.protein_g ?? null,
        item.carbs_g ?? null,
        item.fat_g ?? null
      );
    }
  });
  runTx();
}
