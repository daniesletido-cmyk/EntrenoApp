const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./data/entrenoapp.db');

const runs = db.prepare(`
  SELECT date, planned_code, duration_min, distance_km, rpe, user_notes
  FROM sessions
  WHERE discipline = 'carrera' AND status = 'realizada'
  ORDER BY date DESC
`).all();

console.log('Completed Running Sessions:');
for (const r of runs) {
  const paceSec = (r.duration_min * 60) / r.distance_km;
  const min = Math.floor(paceSec / 60);
  const sec = Math.round(paceSec % 60).toString().padStart(2, '0');
  console.log(`${r.date} | ${r.planned_code} | ${r.distance_km} km | ${r.duration_min} min | Ritmo: ${min}:${sec}/km | RPE: ${r.rpe}`);
}
