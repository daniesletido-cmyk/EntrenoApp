import { getDb } from "@/lib/db";

export interface MeasurementRow {
  id: number;
  date: string;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function upsertMeasurement(input: { date: string; weight_kg?: number | null; notes?: string | null }): MeasurementRow {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare<MeasurementRow>("SELECT * FROM measurements WHERE date = ?").get(input.date);
  if (existing) {
    db.prepare(`UPDATE measurements SET weight_kg = ?, notes = ?, updated_at = ? WHERE date = ?`).run(
      input.weight_kg ?? null,
      input.notes ?? null,
      now,
      input.date
    );
  } else {
    db.prepare(
      `INSERT INTO measurements (date, weight_kg, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(input.date, input.weight_kg ?? null, input.notes ?? null, now, now);
  }
  return db.prepare<MeasurementRow>("SELECT * FROM measurements WHERE date = ?").get(input.date)!;
}

export function listMeasurements(limit = 60): MeasurementRow[] {
  return getDb()
    .prepare<MeasurementRow>("SELECT * FROM measurements ORDER BY date DESC LIMIT ?")
    .all(limit)
    .reverse();
}
