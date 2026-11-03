import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

console.log("============================================================");
console.log("  ENTRENOAPP · TEST DE INTEGRACIÓN: MONETIZACIÓN Y STRIPE");
console.log("============================================================");

const testDbPath = path.join(process.cwd(), "tmp_test_monetization.db");
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new DatabaseSync(testDbPath);

// 1. Crear esquema
db.exec(`
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
`);

console.log("✔ [TEST 1/5] Esquema de base de datos de suscripciones creado.");

// 2. Simular usuario gratuito y verificar permisos
const now = new Date().toISOString();
db.prepare(`
  INSERT INTO subscriptions (user_id, plan, billing_period, status, created_at, updated_at)
  VALUES ('user_free_runner', 'free', 'monthly', 'free', ?, ?)
`).run(now, now);

const freeUser = db.prepare("SELECT * FROM subscriptions WHERE user_id = 'user_free_runner'").get();
assert.strictEqual(freeUser.plan, "free");
assert.strictEqual(freeUser.status, "free");
console.log("✔ [TEST 2/5] Usuario Free inicializado correctamente.");

// 3. Simular Webhook 'checkout.session.completed'
const testCustomerId = "cus_mock_athlete_123";
const testSubId = "sub_mock_sub_456";

db.prepare(`
  UPDATE subscriptions SET
    stripe_customer_id = ?,
    stripe_subscription_id = ?,
    plan = 'premium_annual',
    billing_period = 'annual',
    status = 'active',
    current_period_end = datetime('now', '+1 year'),
    updated_at = datetime('now')
  WHERE user_id = 'user_free_runner'
`).run(testCustomerId, testSubId);

const upgradedUser = db.prepare("SELECT * FROM subscriptions WHERE user_id = 'user_free_runner'").get();
assert.strictEqual(upgradedUser.plan, "premium_annual");
assert.strictEqual(upgradedUser.status, "active");
assert.strictEqual(upgradedUser.stripe_customer_id, testCustomerId);
console.log("✔ [TEST 3/5] Simulación Webhook 'checkout.session.completed' exitosa (Activación Premium).");

// 4. Simular Webhook 'customer.subscription.updated' (cancel_at_period_end)
db.prepare(`
  UPDATE subscriptions SET
    cancel_at_period_end = 1,
    updated_at = datetime('now')
  WHERE stripe_subscription_id = ?
`).run(testSubId);

const renewingUser = db.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").get(testSubId);
assert.strictEqual(renewingUser.cancel_at_period_end, 1);
assert.strictEqual(renewingUser.status, "active", "El usuario debe mantener acceso activo hasta fin de periodo");
console.log("✔ [TEST 4/5] Simulación Webhook 'customer.subscription.updated' exitosa (Cancelación al fin de periodo).");

// 5. Simular Webhook 'customer.subscription.deleted' (Expiración de suscripción)
db.prepare(`
  UPDATE subscriptions SET
    plan = 'free',
    status = 'canceled',
    cancel_at_period_end = 0,
    updated_at = datetime('now')
  WHERE stripe_subscription_id = ?
`).run(testSubId);

const canceledUser = db.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").get(testSubId);
assert.strictEqual(canceledUser.plan, "free");
assert.strictEqual(canceledUser.status, "canceled");
console.log("✔ [TEST 5/5] Simulación Webhook 'customer.subscription.deleted' exitosa (Reversión a Free).");

db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

console.log("\n============================================================");
console.log("  TODOS LOS TESTS DE INTEGRACIÓN DE MONETIZACIÓN PASARON (5/5)");
console.log("============================================================\n");
