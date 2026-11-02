import fs from "fs";
import { DatabaseSync } from "node:sqlite";

console.log("=== INSPECTING DATA/ENTRENOAPP.DB ===");
const db = new DatabaseSync("data/entrenoapp.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
    console.log(`  Table ${t.name}: ${count.c} rows`);
  } catch (e) {
    console.log(`  Table ${t.name}: error ${e.message}`);
  }
}

// Check recent sessions
console.log("\nRecent sessions around Oct 19 - Oct 26:");
const sessions = db.prepare(`
  SELECT id, date, discipline, planned_code, status, duration_min, distance_km, rpe, user_notes, fit_backup, updated_at 
  FROM sessions 
  WHERE date >= '2026-10-18' AND date <= '2026-10-26' 
  ORDER BY date ASC
`).all();
console.table(sessions);

// Check if there are any gym logs
try {
  const gymLogs = db.prepare("SELECT * FROM gym_logs ORDER BY date DESC LIMIT 10").all();
  console.log("\nRecent gym logs:");
  console.table(gymLogs);
} catch (e) {
  console.log("Gym logs table check:", e.message);
}

// Check sleep logs
const sleepLogs = db.prepare("SELECT * FROM sleep_logs WHERE date >= '2026-10-18' ORDER BY date ASC").all();
console.log("\nSleep logs from Oct 18:");
console.table(sleepLogs);

db.close();
