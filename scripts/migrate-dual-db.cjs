const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const dbFiles = [
  path.join(process.cwd(), "data", "entrenoapp.db"),
  path.join(process.cwd(), "seed", "entrenoapp.db"),
];

function columnExists(db, table, column) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some((r) => r.name === column);
  } catch {
    return false;
  }
}

for (const dbPath of dbFiles) {
  if (!fs.existsSync(dbPath)) {
    console.log("DB does not exist, skipping:", dbPath);
    continue;
  }
  console.log("Migrating DB:", dbPath);
  const db = new DatabaseSync(dbPath);

  // New columns for sleep_logs
  const newCols = [
    { name: "hrv_rmssd", type: "REAL" },
    { name: "resting_hr", type: "REAL" },
    { name: "respiratory_rate", type: "REAL" },
    { name: "efficiency", type: "REAL" },
    { name: "sleep_start", type: "TEXT" },
    { name: "sleep_end", type: "TEXT" },
    { name: "latency_min", type: "REAL" },
  ];

  for (const col of newCols) {
    if (!columnExists(db, "sleep_logs", col.name)) {
      console.log(`Adding column ${col.name} to sleep_logs`);
      db.exec(`ALTER TABLE sleep_logs ADD COLUMN ${col.name} ${col.type};`);
    }
  }

  // mental_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mental_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      motivation INTEGER,
      mental_stress INTEGER,
      mental_energy INTEGER,
      focus_technique TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  console.log("Migration complete for:", dbPath);
}
