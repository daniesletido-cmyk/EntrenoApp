const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.resolve('data/entrenoapp.db'));

const cols = db.prepare("PRAGMA table_info(sessions)").all();
console.log('Columns in sessions:', cols.map(c => c.name));

const allSessions = db.prepare("SELECT * FROM sessions ORDER BY date DESC, id DESC").all();
console.log(`Total sessions in DB (${allSessions.length}):`);
for (const s of allSessions) {
  console.log(`ID: ${s.id} | Date: ${s.date} | Sport: ${s.sport} | Type: ${s.session_type || s.type || '-'} | Status: ${s.status} | Dist: ${s.distance_km}km | Dur: ${s.duration_minutes}m | HR: ${s.avg_hr} | RPE: ${s.rpe} | Notes: ${(s.notes || '').substring(0, 30)}`);
}

console.log('\n--- Gym Logs ---');
const gymLogs = db.prepare("SELECT * FROM gym_logs ORDER BY date DESC").all();
console.log(`Gym logs count: ${gymLogs.length}`);
for (const g of gymLogs.slice(0, 10)) {
  console.log(g);
}

console.log('\n--- Sleep Logs ---');
const sleepLogs = db.prepare("SELECT * FROM sleep_logs ORDER BY date DESC").all();
console.log(`Sleep logs count: ${sleepLogs.length}`);
for (const sl of sleepLogs.slice(0, 10)) {
  console.log(sl);
}

db.close();
