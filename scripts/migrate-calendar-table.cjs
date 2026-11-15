const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

for (const dbRel of dbs) {
  const fullPath = path.resolve(process.cwd(), dbRel);
  const db = new DatabaseSync(fullPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      description TEXT,
      source TEXT DEFAULT 'ical',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events (start_time);
  `);
  console.log(`✅ Table calendar_events verified in ${dbRel}`);
}
