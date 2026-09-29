const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve('data/entrenoapp.db');
const db = new DatabaseSync(dbPath);

console.log('Restoring completed workouts across previous weeks in', dbPath);

// Week 2026-09-07 to 2026-09-13
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.6, rpe = 6 WHERE id = 11").run();
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 54, distance_km = 9.0, rpe = 6 WHERE id = 14").run();

// Week 2026-09-14 to 2026-09-20
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 6 WHERE id = 17").run();
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 58, distance_km = 10.0, rpe = 6 WHERE id = 20").run();

// Week 2026-09-21 to 2026-09-27 (Semana pasada)
// 2026-09-24 Carrera R1
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 38, distance_km = 6.2, rpe = 5 WHERE id = 27").run();
// 2026-09-25 Natacion / Gimnasio
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 42, distance_km = 1.6, rpe = 6 WHERE id = 28").run();
// 2026-09-26 Carrera R2
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 48, distance_km = 8.5, rpe = 7 WHERE id = 29").run();
// 2026-09-27 Test VAM (Carrera)
db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 35, distance_km = 5.8, rpe = 10, notes = 'TEST VAM realizado: 5 min a máxima intensidad. VAM obtenido: 3:59 min/km (15.06 km/h). Nuevas zonas de carrera calculadas y activadas.' WHERE id = 30").run();

// Also save VAM settings in settings table if settings table exists
const settings = db.prepare("SELECT * FROM settings").all();
console.log('Current settings:', settings);

const updatedSessions = db.prepare("SELECT id, date, week_start, discipline, planned_code, status, duration_min, distance_km, rpe, notes FROM sessions ORDER BY date ASC, id ASC").all();
console.log('\n--- All Sessions After Restoration (' + updatedSessions.length + ') ---');
for (const s of updatedSessions) {
  console.log(`${s.date} (W: ${s.week_start}) | ID ${s.id} | ${s.discipline} (${s.planned_code || '-'}) -> [${s.status.toUpperCase()}] ${s.distance_km ? s.distance_km + 'km' : ''} ${s.duration_min ? s.duration_min + 'min' : ''} (RPE ${s.rpe || '-'})`);
}

db.close();
