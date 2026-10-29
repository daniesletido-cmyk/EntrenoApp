import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureAnnualPlanPopulated } from "@/lib/annual-plan-seed";
import { DEFAULT_EXERCISES } from "@/lib/prs-catalog";

let db: DatabaseSync | null = null;
let activeDbPath: string | null = null;
let lastCloudSyncTime = 0;
let syncScheduled = false;

function resolveDbPath(): string {
  let targetPath = path.join(process.cwd(), "data", "entrenoapp.db");
  if (process.env.VERCEL) {
    targetPath = path.join("/tmp", "entrenoapp.db");
  } else if (process.env.DB_PATH) {
    targetPath = process.env.DB_PATH;
  } else if (process.env.ENTRENO_DATA_DIR) {
    targetPath = path.join(process.env.ENTRENO_DATA_DIR, "entrenoapp.db");
  }

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const seedPath = path.join(process.cwd(), "seed", "entrenoapp.db");

  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, targetPath);
      } catch (e) {
        console.error("[DB] Error al inicializar desde seed:", e);
      }
    }
  } else if (process.env.VERCEL) {
    // En Vercel, si existe seed con un hash diferente al actualmente activo y no hay persistencia en Blob,
    // comprobar si se necesita actualizar.
    try {
      if (fs.existsSync(seedPath)) {
        const hashFile = path.join(dir, ".seed_hash");
        const seedBuffer = fs.readFileSync(seedPath);
        const seedHash = crypto.createHash("md5").update(seedBuffer).digest("hex");
        let activeHash = "";
        if (fs.existsSync(hashFile)) {
          activeHash = fs.readFileSync(hashFile, "utf8").trim();
        }
        if (activeHash !== seedHash && !fs.existsSync(targetPath)) {
          fs.writeFileSync(targetPath, seedBuffer);
          fs.writeFileSync(hashFile, seedHash, "utf8");
        }
      }
    } catch (e) {
      console.error("[DB] Error de verificación de seed en Vercel:", e);
    }
  }

  return targetPath;
}

function toPlainObject<T>(row: T): T {
  if (row === undefined || row === null) return row;
  return JSON.parse(JSON.stringify(row));
}

export interface AppDb {
  prepare<T = Record<string, unknown>>(sql: string): {
    run: (...params: unknown[]) => { lastInsertRowid: number | bigint; changes: number };
    get: (...params: unknown[]) => T | undefined;
    all: (...params: unknown[]) => T[];
  };
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
}

function wrap(raw: DatabaseSync): AppDb {
  return {
    prepare<T = Record<string, unknown>>(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        run: (...params: unknown[]) => {
          const res = stmt.run(...(params as never[]));
          triggerDataPersistence();
          return { lastInsertRowid: res.lastInsertRowid, changes: Number(res.changes) };
        },
        get: (...params: unknown[]) => toPlainObject(stmt.get(...(params as never[])) as T | undefined),
        all: (...params: unknown[]) => (stmt.all(...(params as never[])) as T[]).map(toPlainObject),
      };
    },
    exec(sql: string) {
      raw.exec(sql);
      triggerDataPersistence();
    },
    transaction<T>(fn: () => T) {
      return () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          const result = fn();
          raw.exec("COMMIT");
          triggerDataPersistence();
          return result;
        } catch (err) {
          raw.exec("ROLLBACK");
          throw err;
        }
      };
    },
  };
}

export function triggerDataPersistence(): void {
  if (syncScheduled) return;
  syncScheduled = true;

  setTimeout(async () => {
    syncScheduled = false;
    try {
      const dbPath = activeDbPath || resolveDbPath();
      if (!fs.existsSync(dbPath)) return;

      // 1. En desarrollo local o servidor dedicado: sincronizar con seed/entrenoapp.db
      // para que cualquier commit a git o despliegue en la nube contenga los datos actuales.
      if (!process.env.VERCEL) {
        const seedPath = path.join(process.cwd(), "seed", "entrenoapp.db");
        try {
          const seedDir = path.dirname(seedPath);
          if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
          fs.copyFileSync(dbPath, seedPath);
        } catch (e) {
          console.warn("[DB] Fallo silencioso al sincronizar seed:", e);
        }

        // Crear copia de seguridad rotativa periódica (máximo cada 1 hora)
        const now = Date.now();
        if (now - lastCloudSyncTime > 3600000) {
          lastCloudSyncTime = now;
          rotateLocalBackup(dbPath);
        }
      } else {
        // 2. En Vercel: si existe BLOB_READ_WRITE_TOKEN, subir snapshot persistente a Vercel Blob
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const { put } = await import("@vercel/blob");
            const buffer = fs.readFileSync(dbPath);
            await put("entrenoapp-db/entrenoapp.db", buffer, {
              access: "public",
              addRandomSuffix: false,
            });
            lastCloudSyncTime = Date.now();
          } catch (e) {
            console.warn("[DB] Error sincronizando con Vercel Blob:", e);
          }
        }
      }
    } catch (err) {
      console.warn("[DB] Error en persistencia de datos:", err);
    }
  }, 1000);
}

function rotateLocalBackup(dbPath: string): void {
  try {
    const backupDir = path.join(path.dirname(dbPath), "tmp-backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const backupFile = path.join(backupDir, `entrenoapp-backup-${stamp}.db`);
    fs.copyFileSync(dbPath, backupFile);

    // Mantener como máximo los 7 backups más recientes
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("entrenoapp-backup-") && f.endsWith(".db"))
      .sort();

    while (files.length > 7) {
      const oldest = files.shift();
      if (oldest) {
        try {
          fs.unlinkSync(path.join(backupDir, oldest));
        } catch {}
      }
    }
  } catch (err) {
    console.warn("[DB] Error rotando backups locales:", err);
  }
}

function columnExists(d: AppDb, table: string, column: string): boolean {
  try {
    const rows = d.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
    return rows.some((r) => r.name === column);
  } catch {
    return false;
  }
}

function isMigrationExecuted(d: AppDb, version: string): boolean {
  try {
    const row = d.prepare<{ c: number }>("SELECT COUNT(*) as c FROM _schema_migrations WHERE version = ?").get(version);
    return (row?.c ?? 0) > 0;
  } catch {
    return false;
  }
}

function recordMigration(d: AppDb, version: string): void {
  try {
    d.prepare("INSERT OR REPLACE INTO _schema_migrations (version, executed_at) VALUES (?, datetime('now'))").run(version);
  } catch (e) {
    console.error("[DB] Error registrando migración:", version, e);
  }
}

function createSchema(d: AppDb) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      week_start TEXT NOT NULL,
      discipline TEXT NOT NULL,
      planned_code TEXT,
      is_long_run INTEGER NOT NULL DEFAULT 0,
      is_extra INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pendiente',
      rpe REAL,
      duration_min REAL,
      distance_km REAL,
      notes TEXT,
      user_notes TEXT,
      fit_backup TEXT,
      fit_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      hours REAL,
      quality INTEGER,
      notes TEXT,
      score INTEGER,
      deep_min REAL,
      light_min REAL,
      rem_min REAL,
      awake_min REAL,
      source TEXT,
      nap_min REAL,
      nap_count INTEGER DEFAULT 0,
      nap_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      meal TEXT NOT NULL,
      option_label TEXT,
      foods_text TEXT,
      kcal REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      target_value TEXT,
      current_value TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'activo',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gym_day_id INTEGER NOT NULL REFERENCES gym_days(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL REFERENCES gym_exercises(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      weight_kg REAL,
      sets INTEGER,
      reps INTEGER,
      notes TEXT,
      completed INTEGER DEFAULT 0,
      series_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(exercise_id, date)
    );

    CREATE TABLE IF NOT EXISTS exercise_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      reps INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      rpe REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function migrateSchema(d: AppDb) {
  // Asegurar columnas faltantes en tablas existentes
  if (!columnExists(d, "sessions", "fit_backup")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN fit_backup TEXT;`);
  }
  if (!columnExists(d, "sessions", "fit_data")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN fit_data TEXT;`);
  }
  if (!columnExists(d, "sessions", "is_extra")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN is_extra INTEGER NOT NULL DEFAULT 0;`);
  }
  if (!columnExists(d, "sessions", "user_notes")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN user_notes TEXT;`);
  }

  if (!columnExists(d, "sleep_logs", "score")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN score INTEGER;`);
  }
  if (!columnExists(d, "sleep_logs", "deep_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN deep_min REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "light_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN light_min REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "rem_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN rem_min REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "awake_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN awake_min REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "source")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN source TEXT;`);
  }
  if (!columnExists(d, "sleep_logs", "nap_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN nap_min REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "nap_count")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN nap_count INTEGER DEFAULT 0;`);
  }
  if (!columnExists(d, "sleep_logs", "nap_notes")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN nap_notes TEXT;`);
  }

  if (!columnExists(d, "gym_logs", "completed")) {
    d.exec(`ALTER TABLE gym_logs ADD COLUMN completed INTEGER DEFAULT 0;`);
  }
  if (!columnExists(d, "gym_logs", "series_data")) {
    d.exec(`ALTER TABLE gym_logs ADD COLUMN series_data TEXT;`);
  }

  // Migración idempotente para índices de alto rendimiento
  if (!isMigrationExecuted(d, "20261029_create_performance_indexes")) {
    try {
      d.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
        CREATE INDEX IF NOT EXISTS idx_sessions_week_start ON sessions(week_start);
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sleep_date ON sleep_logs(date);
        CREATE INDEX IF NOT EXISTS idx_gym_logs_date ON gym_logs(date);
        CREATE INDEX IF NOT EXISTS idx_exercise_records_date ON exercise_records(date);
      `);
      recordMigration(d, "20261029_create_performance_indexes");
    } catch (e) {
      console.error("[DB] Error creando índices:", e);
    }
  }

  // Catálogo de PRs y plan anual poblado de manera garantizada
  ensureAnnualPlanPopulated(d);
  ensurePrsCatalogAndRecords(d);
}

function ensurePrsCatalogAndRecords(d: AppDb) {
  try {
    const countRow = d.prepare<{ c: number }>("SELECT COUNT(*) as c FROM exercise_catalog").get();
    if (!countRow || countRow.c === 0) {
      const now = new Date().toISOString();
      const insert = d.prepare("INSERT OR IGNORE INTO exercise_catalog (name, category, unit, is_custom, created_at) VALUES (?, ?, ?, 0, ?)");
      for (const item of DEFAULT_EXERCISES) {
        insert.run(item.name, item.category, item.unit, now);
      }
    }
  } catch (err) {
    console.error("[DB] Error en ensurePrsCatalogAndRecords:", err);
  }
}

function applyPendingRestoreIfAny(dbPath: string) {
  const pendingPath = `${dbPath}.restore-pending`;
  if (!fs.existsSync(pendingPath)) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, `${dbPath}.antes-de-restaurar-${stamp}`);
  }
  for (const ext of ["-wal", "-shm", "-journal"]) {
    const p = `${dbPath}${ext}`;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.renameSync(pendingPath, dbPath);
}

export function getDb(): AppDb {
  if (db) return wrap(db);
  const dbPath = resolveDbPath();
  activeDbPath = dbPath;
  applyPendingRestoreIfAny(dbPath);

  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA synchronous = NORMAL;");

  const wrapped = wrap(db);
  createSchema(wrapped);
  migrateSchema(wrapped);
  return wrapped;
}

export function getDbPath(): string {
  return activeDbPath || resolveDbPath();
}
