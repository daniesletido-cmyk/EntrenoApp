import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDb = path.join(root, "data", "entrenoapp.db");
const seedDb = path.join(root, "seed", "entrenoapp.db");

function migrate(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[SKIP] No existe ${dbPath}`);
    return;
  }
  console.log(`[MIGRATE] Aplicando a ${dbPath}...`);
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      billing_period TEXT DEFAULT 'monthly',
      status TEXT NOT NULL DEFAULT 'free',
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  `);

  // Registrar migración
  db.prepare("INSERT OR REPLACE INTO _schema_migrations (version, executed_at) VALUES (?, datetime('now'))")
    .run("20261103_subscriptions_and_billing");

  // Verificar o insertar cuenta del propietario (Dani / default_user) con suscripción activa perpetua
  const existing = db.prepare("SELECT * FROM subscriptions WHERE user_id = 'default_user' LIMIT 1").get();
  const now = new Date().toISOString();
  if (!existing) {
    db.prepare(`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, plan, billing_period,
        status, current_period_end, cancel_at_period_end, metadata, created_at, updated_at
      ) VALUES ('default_user', NULL, NULL, 'premium_annual', 'annual', 'active', '2099-12-31T23:59:59.000Z', 0, '{"role":"owner"}', ?, ?)
    `).run(now, now);
    console.log(`  -> Insertada suscripción activa ilimitada para default_user en ${path.basename(dbPath)}`);
  } else {
    console.log(`  -> default_user ya existe en ${path.basename(dbPath)} con plan: ${existing.plan}`);
  }

  db.close();
}

migrate(dataDb);
migrate(seedDb);
console.log("Migración completada con éxito en ambas bases de datos.");
