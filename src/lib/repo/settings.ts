import { getDb } from "@/lib/db";

// Perfil de JavaTec, recogido en la entrevista inicial (ver memoria del
// usuario / plan de entrenamiento). Sirven de valores por defecto la
// primera vez que arranca la app; editables desde Configuración.
const DEFAULT_SETTINGS: Record<string, string> = {
  goal_race_date: "2027-04-26",
  goal_race_label: "Maratón (segunda)",
  target_pace_scenario: "5:00-5:15 min/km (a confirmar con datos reales)",
  resting_hr_note:
    "Taquicardia, FC de reposo alta (~100 lpm). Apto médicamente sin restricciones. Entrenar por ritmo/RPE, NUNCA por pulso absoluto.",
  allergies: "Nuez, avellana, almendra",
  fish_note: "No come pescado, omega-3 vía suplemento",
  current_phase: "1a", // 1a = Base+Hipertrofia (sep-dic 2026)
  phase_1_start: "2026-09-01",
  phase_1_end: "2026-12-20",
  phase_2_start: "2026-12-21",
  phase_2_end: "2027-02-14",
  phase_3_start: "2027-02-15",
  phase_3_end: "2027-04-04",
  phase_4_start: "2027-04-05",
  phase_4_end: "2027-04-26",
};

export function getSetting(key: string): string | null {
  const row = getDb().prepare<{ value: string }>("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : DEFAULT_SETTINGS[key] ?? null;
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare<{ key: string; value: string }>("SELECT key, value FROM settings").all();
  const merged = { ...DEFAULT_SETTINGS };
  for (const r of rows) merged[r.key] = r.value;
  return merged;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function setSettings(values: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  const runBatch = db.transaction(() => {
    for (const [k, v] of Object.entries(values)) {
      stmt.run(k, v);
    }
  });
  runBatch();
}
