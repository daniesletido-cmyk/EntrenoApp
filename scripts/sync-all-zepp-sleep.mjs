import fs from "fs";
import { DatabaseSync } from "node:sqlite";

const zeppDbPath = "C:/Users/danie/AppData/Local/ZeppBridge/data/zepp.db";
const tempZeppPath = "temp_zepp_sync.db";
fs.copyFileSync(zeppDbPath, tempZeppPath);
const zeppDb = new DatabaseSync(tempZeppPath);

console.log("Reading sleep sessions and metrics from zepp.db...");

const allSessions = zeppDb.prepare(`
  SELECT id, sleep_id, start_time, end_time, score, duration_minutes, deep_minutes, light_minutes, rem_minutes, awake_minutes
  FROM sleep_sessions
  ORDER BY start_time ASC
`).all();

const allMetrics = zeppDb.prepare(`
  SELECT date, metric, value FROM daily_metrics
`).all();

const metricsByDate = {};
for (const m of allMetrics) {
  if (!metricsByDate[m.date]) metricsByDate[m.date] = {};
  metricsByDate[m.date][m.metric] = m.value;
}

zeppDb.close();
fs.unlinkSync(tempZeppPath);

console.log(`Loaded ${allSessions.length} total sleep sessions from ZeppBridge.`);

function getLocalDate(isoUtcString) {
  const d = new Date(isoUtcString);
  // Madrid is UTC+2 (summer time until late October)
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
  
  // Is nap if started between 11:00 and 19:30 local and duration <= 210 min
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

const processed = [];
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
  if (dayMetrics.resting_heart_rate) notesArr.push(`RHR: ${Math.round(dayMetrics.resting_heart_rate)} lpm`);
  if (dayMetrics.sleep_hrv) notesArr.push(`HRV: ${Math.round(dayMetrics.sleep_hrv)} ms`);
  if (dayMetrics.readiness_score) notesArr.push(`Readiness: ${Math.round(dayMetrics.readiness_score)}`);
  const notes = notesArr.length > 0 ? notesArr.join(" | ") : null;

  processed.push({
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

processed.sort((a, b) => a.date.localeCompare(b.date));

console.log(`Processed ${processed.length} distinct days of sleep.`);

for (const targetDbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(targetDbPath);

  // Ensure columns exist
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

  let count = 0;
  for (const r of processed) {
    upsertStmt.run(
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
    count++;
  }

  // Ensure Sunday Oct 18 is marked as realizada
  db.prepare(`
    UPDATE sessions SET status = 'realizada' WHERE date = '2026-10-18'
  `).run();

  console.log(`Updated ${count} sleep records in ${targetDbPath}`);
}

console.log("Sync complete!");
