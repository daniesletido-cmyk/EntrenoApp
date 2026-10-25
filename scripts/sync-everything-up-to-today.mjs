import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { extractZeppSleep } from "../src/lib/import/zepp-sleep.ts";

console.log("=== SYNCING ALL DATA UP TO 2026-10-25 ===");

// 1. Load sleep from JSON if present
let jsonSleep = [];
const jsonPath = "d:/Users/Dani/Downloads/zeppbridge-2026-10-19-2026-10-25.json";
if (fs.existsSync(jsonPath)) {
  const buf = fs.readFileSync(jsonPath);
  jsonSleep = await extractZeppSleep(buf);
  console.log(`Loaded ${jsonSleep.length} nights from JSON`);
}

// 2. Load sleep from zepp.db
const zeppDbPath = "C:/Users/danie/AppData/Local/ZeppBridge/data/zepp.db";
let zeppDbSleep = [];
let metricsByDate = {};
if (fs.existsSync(zeppDbPath)) {
  fs.copyFileSync(zeppDbPath, "temp_zepp_sync.db");
  const zeppDb = new DatabaseSync("temp_zepp_sync.db");
  const allSessions = zeppDb.prepare(`
    SELECT id, sleep_id, start_time, end_time, score, duration_minutes, deep_minutes, light_minutes, rem_minutes, awake_minutes
    FROM sleep_sessions
    ORDER BY start_time ASC
  `).all();

  const allMetrics = zeppDb.prepare(`
    SELECT date, metric, value FROM daily_metrics
  `).all();

  for (const m of allMetrics) {
    if (!metricsByDate[m.date]) metricsByDate[m.date] = {};
    metricsByDate[m.date][m.metric] = m.value;
  }

  zeppDb.close();
  fs.unlinkSync("temp_zepp_sync.db");

  function getLocalDate(isoUtcString) {
    const d = new Date(isoUtcString);
    const localMs = d.getTime() + (2 * 60 * 60 * 1000);
    const localD = new Date(localMs);
    return localD.toISOString().slice(0, 10);
  }

  function getLocalHour(isoUtcString) {
    const d = new Date(isoUtcString);
    const localMs = d.getTime() + (2 * 60 * 60 * 1000);
    const localD = new Date(localMs);
    return localD.getUTCHours();
  }

  function scoreToQuality(score) {
    if (!score) return 3;
    if (score >= 85) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 45) return 2;
    return 1;
  }

  const groupsByDate = new Map();
  for (const s of allSessions) {
    if (!s.end_time) continue;
    const targetDate = getLocalDate(s.end_time);
    const startHour = getLocalHour(s.start_time);
    const durMin = s.duration_minutes ?? ((s.deep_minutes ?? 0) + (s.light_minutes ?? 0) + (s.rem_minutes ?? 0));
    const isNap = (startHour >= 11 && startHour <= 19 && durMin <= 210);

    let g = groupsByDate.get(targetDate);
    if (!g) {
      g = { date: targetDate, night: null, naps: [] };
      groupsByDate.set(targetDate, g);
    }

    if (isNap) {
      g.naps.push({ ...s, durMin });
    } else {
      if (!g.night || durMin > (g.night.duration_minutes ?? 0)) {
        if (g.night) g.naps.push(g.night);
        g.night = s;
      } else {
        g.naps.push(s);
      }
    }
  }

  for (const [date, g] of groupsByDate.entries()) {
    const night = g.night;
    const nightMin = night ? (night.duration_minutes ?? ((night.deep_minutes ?? 0) + (night.light_minutes ?? 0) + (night.rem_minutes ?? 0))) : 0;
    const hours = night ? Number((nightMin / 60).toFixed(2)) : null;
    const score = night?.score ?? null;
    const quality = scoreToQuality(score);
    const deep_min = night?.deep_minutes ?? null;
    const light_min = night?.light_minutes ?? null;
    const rem_min = night?.rem_minutes ?? null;
    const awake_min = night?.awake_minutes ?? null;

    const totalNapMin = g.naps.reduce((sum, n) => sum + (n.durMin ?? n.duration_minutes ?? 0), 0);
    const nap_min = totalNapMin > 0 ? totalNapMin : null;
    const nap_count = g.naps.length;
    const nap_notes = totalNapMin > 0 ? `Siesta de ${totalNapMin} min` : null;

    const dayMetrics = metricsByDate[date] || {};
    const notesArr = [];
    if (dayMetrics.sleep_hrv) notesArr.push(`HRV: ${Math.round(dayMetrics.sleep_hrv)} ms`);
    if (dayMetrics.resting_hr || dayMetrics.sleep_rhr) notesArr.push(`RHR: ${Math.round(dayMetrics.resting_hr || dayMetrics.sleep_rhr)} lpm`);
    if (dayMetrics.readiness) notesArr.push(`Readiness: ${Math.round(dayMetrics.readiness)}`);
    const notes = notesArr.length > 0 ? notesArr.join(" | ") : null;

    zeppDbSleep.push({
      date,
      hours,
      quality,
      score,
      deep_min,
      light_min,
      rem_min,
      awake_min,
      nap_min,
      nap_count,
      nap_notes,
      notes,
      source: "zepp"
    });
  }
  console.log(`Processed ${zeppDbSleep.length} nights from zepp.db`);
}

// Merge JSON sleep and Zepp DB sleep
const allSleepMap = new Map();
for (const s of zeppDbSleep) {
  allSleepMap.set(s.date, s);
}
for (const s of jsonSleep) {
  const existing = allSleepMap.get(s.date);
  allSleepMap.set(s.date, {
    ...existing,
    ...s,
    source: "zepp",
    notes: existing?.notes || s.notes
  });
}

const finalSleep = Array.from(allSleepMap.values()).sort((a, b) => a.date.localeCompare(b.date));
console.log(`Total merged sleep nights: ${finalSleep.length} (up to ${finalSleep[finalSleep.length - 1]?.date})`);

// 3. Update both databases
for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);

  // A. Ensure sleep table columns
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

  // B. Upsert all sleep
  const upsertSleep = db.prepare(`
    INSERT INTO sleep_logs (
      date, hours, quality, notes, score, deep_min, light_min, rem_min, awake_min, source, nap_min, nap_count, nap_notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
    ON CONFLICT(date) DO UPDATE SET
      hours = excluded.hours,
      quality = excluded.quality,
      notes = COALESCE(excluded.notes, sleep_logs.notes),
      score = excluded.score,
      deep_min = excluded.deep_min,
      light_min = excluded.light_min,
      rem_min = excluded.rem_min,
      awake_min = excluded.awake_min,
      source = excluded.source,
      nap_min = excluded.nap_min,
      nap_count = excluded.nap_count,
      nap_notes = excluded.nap_notes,
      updated_at = datetime('now')
  `);

  for (const r of finalSleep) {
    upsertSleep.run(
      r.date,
      r.hours,
      r.quality,
      r.notes,
      r.score,
      r.deep_min,
      r.light_min,
      r.rem_min,
      r.awake_min,
      r.source,
      r.nap_min,
      r.nap_count,
      r.nap_notes
    );
  }

  // C. Update sessions for Week 7 (Oct 19 - Oct 25)
  // Lunes 19: Natación
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 45, distance_km = 1.9, rpe = 4.5 WHERE date = '2026-10-19'`).run();
  // Martes 20: CrossFit Desafío
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 55, distance_km = 2.4, rpe = 8.5 WHERE date = '2026-10-20'`).run();
  // Miércoles 21: Carrera R1
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 35.2, distance_km = 6.76, rpe = 5.5 WHERE date = '2026-10-21'`).run();
  // Jueves 22: CrossFit Steady
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-22'`).run();
  // Viernes 23: Descanso & asimilación
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 20, rpe = 2 WHERE date = '2026-10-23'`).run();

  // Sábado 24: Carrera R1 Activación (FIT real: 4.22km en 24.6min, FC 170)
  db.prepare(`
    UPDATE sessions 
    SET status = 'realizada', 
        duration_min = 24.6, 
        distance_km = 4.22, 
        rpe = 5.0
    WHERE date = '2026-10-24'
  `).run();

  // Domingo 25: Tirada Larga Maratón R5 (FIT real: 16.03km en 88.6min, 5:31/km, FC 179)
  db.prepare(`
    UPDATE sessions 
    SET status = 'realizada', 
        duration_min = 88.6, 
        distance_km = 16.03, 
        rpe = 6.0
    WHERE date = '2026-10-25'
  `).run();

  console.log(`Database ${dbPath} synchronized successfully!`);
  db.close();
}

console.log("ALL DATA FULLY SYNCHRONIZED!");
