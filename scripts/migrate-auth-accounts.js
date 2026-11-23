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

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) continue;
  console.log(`[Migrate Auth] Procesando ${dbPath}...`);
  const db = new DatabaseSync(dbPath);

  // Crear tabla auth_accounts
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

  // Comprobar si existe Daniel Espinosa
  const daniel = db.prepare("SELECT * FROM auth_accounts WHERE id = 'default_user' OR email = 'daniespinosa973@gmail.com'").get();
  if (!daniel) {
    const defaultPasswordHash = hashPassword("Entreno2026!");
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO auth_accounts (id, email, password_hash, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('default_user', 'daniespinosa973@gmail.com', defaultPasswordHash, 'Daniel Espinosa', 'owner', now, now);
    console.log(`  ✅ Creada cuenta propietaria para Daniel Espinosa en ${path.basename(dbPath)}`);
  } else {
    console.log(`  ℹ️ Cuenta de Daniel ya existe en ${path.basename(dbPath)}`);
  }
}

console.log('Migración de auth_accounts completada con éxito.');
