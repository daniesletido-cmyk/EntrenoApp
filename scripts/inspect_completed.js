const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./data/entrenoapp.db');

console.log('--- COMPLETED SESSIONS ---');
const completed = db.prepare("SELECT date, discipline, planned_code, duration_min, distance_km, rpe, status, user_notes, fit_data FROM sessions WHERE status = 'realizada' OR fit_data IS NOT NULL ORDER BY date DESC LIMIT 30").all();
console.log(`Found ${completed.length} completed/fit sessions:`);
for (const s of completed) {
  let fitSummary = null;
  if (s.fit_data) {
    try {
      const parsed = JSON.parse(s.fit_data);
      fitSummary = {
        avgHr: parsed.avgHr || parsed.avg_heart_rate,
        maxHr: parsed.maxHr || parsed.max_heart_rate,
        avgPace: parsed.avgPace || parsed.avg_pace,
        totalKm: parsed.totalDistanceKm || parsed.distance_km,
        duration: parsed.totalDurationMin || parsed.duration_min
      };
    } catch (e) {
      fitSummary = 'error parsing';
    }
  }
  console.log({
    date: s.date,
    discipline: s.discipline,
    planned_code: s.planned_code,
    km: s.distance_km,
    duration: s.duration_min,
    rpe: s.rpe,
    notes: s.user_notes,
    fitSummary
  });
}

console.log('\n--- SESSIONS AROUND CURRENT DATE (Oct 2026) ---');
const currentSessions = db.prepare("SELECT date, discipline, planned_code, duration_min, distance_km, status, rpe, user_notes FROM sessions WHERE date >= '2026-10-01' AND date <= '2026-11-15' ORDER BY date ASC").all();
console.log(`Found ${currentSessions.length} sessions in Oct-Nov 2026:`);
for (const s of currentSessions) {
  console.log(s);
}
