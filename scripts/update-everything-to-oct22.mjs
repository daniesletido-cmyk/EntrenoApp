import fs from "fs";
import { DatabaseSync } from "node:sqlite";

// 1. Sync all sleep from zepp.db
const zeppDbPath = "C:/Users/danie/AppData/Local/ZeppBridge/data/zepp.db";
const tempZeppPath = "temp_zepp_full_sync.db";
fs.copyFileSync(zeppDbPath, tempZeppPath);
const zeppDb = new DatabaseSync(tempZeppPath);

console.log("Loading all sleep sessions from zepp.db...");

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

console.log(`Loaded ${allSessions.length} total sleep sessions.`);

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

const processedSleep = [];
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

  processedSleep.push({
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

processedSleep.sort((a, b) => a.date.localeCompare(b.date));
console.log(`Processed ${processedSleep.length} distinct sleep days.`);

// 2. Target databases: update both data/entrenoapp.db and seed/entrenoapp.db
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

  // B. Upsert all sleep records
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

  for (const r of processedSleep) {
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

  // C. Update sessions for Week 4 (Sep 28 - Oct 4)
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 5 WHERE date = '2026-09-29'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 44, distance_km = 8, rpe = 5 WHERE date = '2026-09-30'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-01'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 5 WHERE date = '2026-10-02'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 51, distance_km = 9.5, rpe = 6 WHERE date = '2026-10-03'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 62, distance_km = 11.5, rpe = 5.5 WHERE date = '2026-10-04'`).run();

  // D. Update sessions for Week 5 (Oct 5 - Oct 11)
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-05'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 44, distance_km = 8, rpe = 5 WHERE date = '2026-10-06'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 5 WHERE date = '2026-10-07'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 8 WHERE date = '2026-10-08'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 20, rpe = 2 WHERE date = '2026-10-09'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 32, distance_km = 6, rpe = 4 WHERE date = '2026-10-10'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 64, distance_km = 12, rpe = 5.5 WHERE date = '2026-10-11'`).run();

  // E. Update sessions for Week 6 (Oct 12 - Oct 18)
  db.prepare(`UPDATE sessions SET status = 'no_realizada' WHERE date = '2026-10-12'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 45, distance_km = 2, rpe = 5 WHERE date = '2026-10-13'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-14'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 35, distance_km = 6.5, rpe = 5 WHERE date = '2026-10-15'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 45, rpe = 8 WHERE date = '2026-10-16'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 20, rpe = 2 WHERE date = '2026-10-17'`).run();
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 74, distance_km = 14, rpe = 5.5 WHERE date = '2026-10-18'`).run();

  // F. Update sessions for Current Week 7 (Oct 19 - Oct 25)
  // Lunes 19: Natacion regenerativa post-14km
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 45, distance_km = 1.9, rpe = 4.5 WHERE date = '2026-10-19'`).run();

  // Martes 20: CrossFit Desafío (Peso Muerto + WOD 3 RFT)
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 55, distance_km = 2.4, rpe = 8.5 WHERE date = '2026-10-20'`).run();

  // Miercoles 21: Carrera R1 con datos reales del FIT (6.76km en 35.17min, 5:12/km, HR 171/179)
  db.prepare(`
    UPDATE sessions 
    SET status = 'realizada', 
        duration_min = 35.2, 
        distance_km = 6.76, 
        rpe = 5.5,
        notes = notes || char(10) || char(10) || 'DATOS REALES REGISTRADOS DEL ARCHIVO .FIT (Garmin/Zepp):' || char(10) || '- Distancia real: 6,76 km' || char(10) || '- Tiempo real: 35 min 10 s' || char(10) || '- Ritmo medio real: 5:12 min/km' || char(10) || '- Frecuencia cardíaca media: 171 lpm (máxima: 179 lpm)'
    WHERE date = '2026-10-21'
  `).run();

  // Jueves 22 (Hoy): CrossFit Steady (WOD 5 RFT GHD + Burpees + Press Banca)
  db.prepare(`UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-22'`).run();

  // Viernes 23, Sabado 24, Domingo 25: pendiente
  db.prepare(`UPDATE sessions SET status = 'pendiente' WHERE date >= '2026-10-23'`).run();

  console.log(`Updated all sleep and training records in ${dbPath}`);
}

console.log("Full update completed successfully!");
