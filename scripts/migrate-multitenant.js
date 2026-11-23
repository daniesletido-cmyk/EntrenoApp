const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

function runMig(path) {
  if (!fs.existsSync(path)) return;
  console.log('Migrating', path);
  const db = new DatabaseSync(path);
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map(r => r.name);
  if (!cols.includes('user_id')) {
    db.exec("ALTER TABLE sessions ADD COLUMN user_id TEXT DEFAULT 'default_user';");
  }
  const sleepCols = db.prepare('PRAGMA table_info(sleep_logs)').all().map(r => r.name);
  if (!sleepCols.includes('user_id')) {
    db.exec("ALTER TABLE sleep_logs ADD COLUMN user_id TEXT DEFAULT 'default_user';");
  }
  const measCols = db.prepare('PRAGMA table_info(measurements)').all().map(r => r.name);
  if (!measCols.includes('user_id')) {
    db.exec("ALTER TABLE measurements ADD COLUMN user_id TEXT DEFAULT 'default_user';");
  }
  const shoesCols = db.prepare('PRAGMA table_info(shoes)').all().map(r => r.name);
  if (!shoesCols.includes('user_id')) {
    db.exec("ALTER TABLE shoes ADD COLUMN user_id TEXT DEFAULT 'default_user';");
  }
  const goalsCols = db.prepare('PRAGMA table_info(goals)').all().map(r => r.name);
  if (!goalsCols.includes('user_id')) {
    db.exec("ALTER TABLE goals ADD COLUMN user_id TEXT DEFAULT 'default_user';");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'athlete',
      weight_kg REAL,
      resting_hr REAL,
      max_hr REAL,
      vam_pace TEXT DEFAULT '3:59',
      vam_sec_km REAL DEFAULT 239,
      target_distance TEXT DEFAULT 'Maratón',
      target_date TEXT,
      target_pace TEXT,
      days_per_week INTEGER DEFAULT 4,
      disciplines TEXT DEFAULT '["carrera", "crossfit", "fuerza"]',
      webhook_token TEXT UNIQUE,
      onboarded INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      athlete_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      webhook_token TEXT,
      settings TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );

    INSERT OR IGNORE INTO profiles (
      id, email, full_name, role, weight_kg, resting_hr, vam_pace, vam_sec_km,
      target_distance, target_date, days_per_week, webhook_token, onboarded, created_at, updated_at
    ) VALUES (
      'default_user', 'danielespinosa@entrenoapp.es', 'Daniel Espinosa', 'owner',
      72.5, 95, '3:59', 239, 'Maratón', '2027-04-26', 4,
      'default_daniel_webhook_token', 1, datetime('now'), datetime('now')
    );
  `);
  console.log('Migrated successfully:', path);
}

runMig('data/entrenoapp.db');
runMig('seed/entrenoapp.db');
