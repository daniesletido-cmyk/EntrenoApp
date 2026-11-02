import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { extractZeppSleep } from "../src/lib/import/zepp-sleep.ts";

const filePath = "d:/Users/Dani/Downloads/zeppbridge-2026-09-20-2026-10-19.json";
const buffer = fs.readFileSync(filePath);

console.log("Reading file:", filePath);
const extracted = await extractZeppSleep(buffer);
console.log(`Extracted ${extracted.length} nights of sleep.`);

for (const row of extracted) {
  console.log(`Date: ${row.date} | Hours: ${row.hours}h | Score: ${row.score} | Quality: ${row.quality} | Deep: ${row.deep_min}m | Rem: ${row.rem_min}m | Light: ${row.light_min}m | Awake: ${row.awake_min}m | Nap: ${row.nap_min ? `${row.nap_min}m` : "No"}`);
}

const dbTargets = ["data/entrenoapp.db", "seed/entrenoapp.db"];

for (const dbPath of dbTargets) {
  const db = new DatabaseSync(dbPath);
  
  // Create or verify columns exist
  const existingCols = db.prepare("PRAGMA table_info(sleep_logs)").all().map(c => c.name);
  if (!existingCols.includes("score")) db.exec("ALTER TABLE sleep_logs ADD COLUMN score INTEGER");
  if (!existingCols.includes("deep_min")) db.exec("ALTER TABLE sleep_logs ADD COLUMN deep_min REAL");
  if (!existingCols.includes("light_min")) db.exec("ALTER TABLE sleep_logs ADD COLUMN light_min REAL");
  if (!existingCols.includes("rem_min")) db.exec("ALTER TABLE sleep_logs ADD COLUMN rem_min REAL");
  if (!existingCols.includes("awake_min")) db.exec("ALTER TABLE sleep_logs ADD COLUMN awake_min REAL");
  if (!existingCols.includes("source")) db.exec("ALTER TABLE sleep_logs ADD COLUMN source TEXT");
  if (!existingCols.includes("nap_min")) db.exec("ALTER TABLE sleep_logs ADD COLUMN nap_min REAL");
  if (!existingCols.includes("nap_count")) db.exec("ALTER TABLE sleep_logs ADD COLUMN nap_count INTEGER DEFAULT 0");
  if (!existingCols.includes("nap_notes")) db.exec("ALTER TABLE sleep_logs ADD COLUMN nap_notes TEXT");

  const upsertStmt = db.prepare(`
    INSERT INTO sleep_logs (
      date, hours, quality, notes, score, deep_min, light_min, rem_min, awake_min, source, nap_min, nap_count, nap_notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
    ON CONFLICT(date) DO UPDATE SET
      hours = COALESCE(excluded.hours, sleep_logs.hours),
      quality = COALESCE(excluded.quality, sleep_logs.quality),
      notes = COALESCE(excluded.notes, sleep_logs.notes),
      score = COALESCE(excluded.score, sleep_logs.score),
      deep_min = COALESCE(excluded.deep_min, sleep_logs.deep_min),
      light_min = COALESCE(excluded.light_min, sleep_logs.light_min),
      rem_min = COALESCE(excluded.rem_min, sleep_logs.rem_min),
      awake_min = COALESCE(excluded.awake_min, sleep_logs.awake_min),
      source = COALESCE(excluded.source, sleep_logs.source),
      nap_min = COALESCE(excluded.nap_min, sleep_logs.nap_min),
      nap_count = COALESCE(excluded.nap_count, sleep_logs.nap_count),
      nap_notes = COALESCE(excluded.nap_notes, sleep_logs.nap_notes),
      updated_at = datetime('now')
  `);

  let insertedOrUpdated = 0;
  for (const r of extracted) {
    upsertStmt.run(
      r.date,
      r.hours,
      r.quality,
      r.notes ?? null,
      r.score ?? null,
      r.deep_min ?? null,
      r.light_min ?? null,
      r.rem_min ?? null,
      r.awake_min ?? null,
      "zepp",
      r.nap_min ?? null,
      r.nap_count ?? 0,
      r.nap_notes ?? null
    );
    insertedOrUpdated++;
  }

  console.log(`Successfully saved ${insertedOrUpdated} records to ${dbPath}`);
}
