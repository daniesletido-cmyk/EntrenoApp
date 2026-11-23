const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const dbPaths = [
  path.join(__dirname, '..', 'data', 'entrenoapp.db'),
  path.join(__dirname, '..', 'seed', 'entrenoapp.db')
];

const newHash = hashPassword("Daniel2026!");
const now = new Date().toISOString();

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) continue;
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'athlete',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.prepare(`
    INSERT INTO auth_accounts (id, email, password_hash, full_name, role, created_at, updated_at)
    VALUES ('default_user', 'daniespinosa973@gmail.com', ?, 'Daniel Espinosa', 'owner', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = 'daniespinosa973@gmail.com',
      password_hash = excluded.password_hash,
      full_name = 'Daniel Espinosa',
      role = 'owner',
      updated_at = excluded.updated_at
  `).run(newHash, now, now);

  console.log(`✅ Cuenta de Daniel actualizada con contraseña segura en ${path.basename(dbPath)}`);
}
