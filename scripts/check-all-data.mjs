import fs from "fs";
import { DatabaseSync } from "node:sqlite";

console.log("=== INSPECTING ZEPP DB WORKOUTS ===");
const zeppPath = "C:/Users/danie/AppData/Local/ZeppBridge/data/zepp.db";
if (fs.existsSync(zeppPath)) {
  fs.copyFileSync(zeppPath, "temp_inspect_zepp.db");
  const db = new DatabaseSync("temp_inspect_zepp.db");
  
  try {
    const workouts = db.prepare("SELECT * FROM workouts ORDER BY start_time DESC LIMIT 20").all();
    console.log(`Found ${workouts.length} recent workouts in zepp.db:`);
    console.table(workouts.map(w => ({
      id: w.id,
      workout_id: w.workout_id,
      start_time: w.start_time,
      end_time: w.end_time,
      sport_name: w.sport_name || w.activity_type || w.type,
      duration_minutes: w.duration_minutes || w.duration,
      distance_meters: w.distance_meters || w.distance,
      calories: w.calories,
      avg_hr: w.avg_hr || w.average_heart_rate,
      max_hr: w.max_hr || w.max_heart_rate
    })));
  } catch (e) {
    console.log("Workouts error:", e.message);
  }

  db.close();
  fs.unlinkSync("temp_inspect_zepp.db");
}

console.log("\n=== INSPECTING ENTRENOAPP.DB (data & seed) ===");
for (const p of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  if (!fs.existsSync(p)) continue;
  const db = new DatabaseSync(p);
  console.log(`\n--- ${p} ---`);

  const completed = db.prepare("SELECT date, discipline, planned_code, status, duration_min, distance_km, rpe, notes FROM sessions WHERE status = 'realizada' OR status = 'completado' ORDER BY date DESC LIMIT 15").all();
  console.log("Completed Sessions (last 15):");
  console.table(completed.map(s => ({
    date: s.date,
    discipline: s.discipline,
    status: s.status,
    dur: s.duration_min,
    dist: s.distance_km,
    rpe: s.rpe
  })));

  const week7and8 = db.prepare("SELECT date, discipline, planned_code, status, duration_min, distance_km, rpe FROM sessions WHERE date >= '2026-10-19' AND date <= '2026-11-01' ORDER BY date ASC").all();
  console.log("Sessions Oct 19 - Nov 1:");
  console.table(week7and8);

  db.close();
}
