const { DatabaseSync } = require('node:sqlite');

['data/entrenoapp.db', 'seed/entrenoapp.db'].forEach((p) => {
  const db = new DatabaseSync(p);
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map((c) => c.name);
  if (!cols.includes('shoe_id')) {
    db.exec('ALTER TABLE sessions ADD COLUMN shoe_id INTEGER;');
    console.log(p, 'added shoe_id to sessions');
  } else {
    console.log(p, 'sessions.shoe_id already exists');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS shoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      initial_km REAL NOT NULL DEFAULT 0,
      total_km REAL NOT NULL DEFAULT 0,
      max_km REAL NOT NULL DEFAULT 700,
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shoes_is_primary ON shoes(is_primary);
    CREATE INDEX IF NOT EXISTS idx_shoes_is_active ON shoes(is_active);
  `);
  console.log(p, 'shoes table verified');

  // Si no hay zapatillas creadas, crear un par inicial por defecto
  const count = db.prepare('SELECT COUNT(*) as count FROM shoes').get().count;
  if (count === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO shoes (name, brand, model, initial_km, total_km, max_km, is_primary, is_active, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
    `).run(
      'Nike Pegasus 40',
      'Nike',
      'Air Zoom Pegasus 40',
      120.0,
      120.0,
      700.0,
      'Zapatilla principal para rodajes aeróbicos R1 y tiradas en Zuera.',
      now,
      now
    );
    console.log(p, 'inserted default primary shoe: Nike Pegasus 40');
  }
});
