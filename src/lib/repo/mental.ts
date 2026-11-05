import { getDb } from "@/lib/db";

export interface MentalLogRow {
  id: number;
  date: string;
  motivation: number | null; // 1-5
  mental_stress: number | null; // 1-5
  mental_energy: number | null; // 1-5
  focus_technique: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MentalLogInput = Partial<
  Pick<MentalLogRow, "motivation" | "mental_stress" | "mental_energy" | "focus_technique" | "notes">
> & { date: string };

export function upsertMentalLog(input: MentalLogInput): MentalLogRow {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare<MentalLogRow>("SELECT * FROM mental_logs WHERE date = ?").get(input.date);

  if (existing) {
    db.prepare(
      `UPDATE mental_logs SET motivation = ?, mental_stress = ?, mental_energy = ?, focus_technique = ?, notes = ?, updated_at = ? WHERE date = ?`
    ).run(
      input.motivation !== undefined ? input.motivation : existing.motivation,
      input.mental_stress !== undefined ? input.mental_stress : existing.mental_stress,
      input.mental_energy !== undefined ? input.mental_energy : existing.mental_energy,
      input.focus_technique !== undefined ? input.focus_technique : existing.focus_technique,
      input.notes !== undefined ? input.notes : existing.notes,
      now,
      input.date
    );
  } else {
    db.prepare(
      `INSERT INTO mental_logs (date, motivation, mental_stress, mental_energy, focus_technique, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.date,
      input.motivation ?? null,
      input.mental_stress ?? null,
      input.mental_energy ?? null,
      input.focus_technique ?? null,
      input.notes ?? null,
      now,
      now
    );
  }

  return db.prepare<MentalLogRow>("SELECT * FROM mental_logs WHERE date = ?").get(input.date)!;
}

export function getMentalLogByDate(date: string): MentalLogRow | undefined {
  return getDb().prepare<MentalLogRow>("SELECT * FROM mental_logs WHERE date = ?").get(date);
}

export function listMentalLogsBetween(fromDate: string, toDate: string): MentalLogRow[] {
  return getDb()
    .prepare<MentalLogRow>("SELECT * FROM mental_logs WHERE date >= ? AND date <= ? ORDER BY date ASC")
    .all(fromDate, toDate);
}
