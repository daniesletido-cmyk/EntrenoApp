const fs = require('fs');

// Let's see if there are any other files or sleep logs or session notes
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./data/entrenoapp.db');

const sleep = db.prepare("SELECT * FROM sleep_logs ORDER BY date DESC LIMIT 10").all();
console.log('Recent Sleep Logs:', sleep);

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'realizada' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'realizada' AND discipline = 'carrera' THEN distance_km ELSE 0 END) as total_km_run
  FROM sessions
`).get();
console.log('Stats:', stats);

// Check current week (around 2026-10-25)
const thisWeek = db.prepare(`
  SELECT date, discipline, planned_code, duration_min, distance_km, status, rpe, user_notes
  FROM sessions 
  WHERE date >= '2026-10-19' AND date <= '2026-10-25'
  ORDER BY date ASC
`).all();
console.log('This week (19-25 Oct 2026):', thisWeek);
