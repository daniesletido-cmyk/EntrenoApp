import { getDb } from "@/lib/db";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export interface MeasurementRow {
  id: number;
  date: string;
  weight_kg: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  source?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function upsertMeasurement(input: {
  date: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  source?: string | null;
  notes?: string | null;
}): MeasurementRow {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare<MeasurementRow>("SELECT * FROM measurements WHERE date = ?").get(input.date);

  if (existing) {
    db.prepare(`
      UPDATE measurements 
      SET weight_kg = COALESCE(?, weight_kg),
          body_fat_pct = COALESCE(?, body_fat_pct),
          muscle_mass_kg = COALESCE(?, muscle_mass_kg),
          water_pct = COALESCE(?, water_pct),
          source = COALESCE(?, source),
          notes = COALESCE(?, notes),
          updated_at = ? 
      WHERE date = ?
    `).run(
      input.weight_kg ?? null,
      input.body_fat_pct ?? null,
      input.muscle_mass_kg ?? null,
      input.water_pct ?? null,
      input.source ?? null,
      input.notes ?? null,
      now,
      input.date
    );
  } else {
    db.prepare(`
      INSERT INTO measurements (
        date, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, source, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.date,
      input.weight_kg ?? null,
      input.body_fat_pct ?? null,
      input.muscle_mass_kg ?? null,
      input.water_pct ?? null,
      input.source ?? null,
      input.notes ?? null,
      now,
      now
    );
  }

  // Sincronización dual en seed/entrenoapp.db
  try {
    const seedPath = path.resolve(process.cwd(), "seed/entrenoapp.db");
    if (fs.existsSync(seedPath)) {
      const seedDb = new DatabaseSync(seedPath);
      const seedExisting = seedDb.prepare("SELECT * FROM measurements WHERE date = ? LIMIT 1").get(input.date) as any;
      if (seedExisting) {
        seedDb.prepare(`
          UPDATE measurements 
          SET weight_kg = COALESCE(?, weight_kg),
              body_fat_pct = COALESCE(?, body_fat_pct),
              muscle_mass_kg = COALESCE(?, muscle_mass_kg),
              water_pct = COALESCE(?, water_pct),
              source = COALESCE(?, source),
              notes = COALESCE(?, notes),
              updated_at = ? 
          WHERE date = ?
        `).run(
          input.weight_kg ?? null,
          input.body_fat_pct ?? null,
          input.muscle_mass_kg ?? null,
          input.water_pct ?? null,
          input.source ?? null,
          input.notes ?? null,
          now,
          input.date
        );
      } else {
        seedDb.prepare(`
          INSERT INTO measurements (
            date, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, source, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.date,
          input.weight_kg ?? null,
          input.body_fat_pct ?? null,
          input.muscle_mass_kg ?? null,
          input.water_pct ?? null,
          input.source ?? null,
          input.notes ?? null,
          now,
          now
        );
      }
    }
  } catch (err) {
    console.warn("[DualSync] Warning syncing measurement to seed.db:", err);
  }

  return db.prepare<MeasurementRow>("SELECT * FROM measurements WHERE date = ?").get(input.date)!;
}

export function getLatestMeasurement(): MeasurementRow | null {
  const db = getDb();
  return db.prepare<MeasurementRow>("SELECT * FROM measurements WHERE weight_kg IS NOT NULL ORDER BY date DESC, updated_at DESC LIMIT 1").get() || null;
}

export function listMeasurements(limit = 60): MeasurementRow[] {
  return getDb()
    .prepare<MeasurementRow>("SELECT * FROM measurements ORDER BY date DESC LIMIT ?")
    .all(limit)
    .reverse();
}
