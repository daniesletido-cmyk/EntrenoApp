const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

for (const p of dbs) {
  if (fs.existsSync(p)) {
    const db = new DatabaseSync(path.resolve(p));
    // Week 2026-09-07
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.6, rpe = 6 WHERE id = 11").run();
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 54, distance_km = 9.0, rpe = 6 WHERE id = 14").run();

    // Week 2026-09-14
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 6 WHERE id = 17").run();
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 58, distance_km = 10.0, rpe = 6 WHERE id = 20").run();

    // Week 2026-09-21
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 38, distance_km = 6.2, rpe = 5 WHERE id = 27").run();
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 42, distance_km = 1.6, rpe = 6 WHERE id = 28").run();
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 48, distance_km = 8.5, rpe = 7 WHERE id = 29").run();
    db.prepare("UPDATE sessions SET status = 'realizada', duration_min = 35, distance_km = 5.8, rpe = 10, notes = 'TEST VAM realizado: 5 min a máxima intensidad. VAM obtenido: 3:59 min/km (15.06 km/h). Nuevas zonas de carrera calculadas y activadas.' WHERE id = 30").run();

    console.log('Successfully updated:', p);
    const check = db.prepare("SELECT id, date, discipline, planned_code, status, duration_min, distance_km FROM sessions WHERE week_start = '2026-09-21'").all();
    console.log(check);
    db.close();
  }
}
