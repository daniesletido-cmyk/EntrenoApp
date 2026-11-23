import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureAnnualPlanPopulated } from "@/lib/annual-plan-seed";
import { DEFAULT_EXERCISES } from "@/lib/prs-catalog";
import { syncDownFromBlobSync, scheduleDbSyncToBlob, syncDbToBlob, getRemoteBlobEtag, downloadBlobDatabaseAsync, isBlobSyncEnabled } from "@/lib/blob-sync";

let db: DatabaseSync | null = null;
let activeDbPath: string | null = null;
let lastCloudSyncTime = 0;
let syncScheduled = false;
let isInitializing = false;
let lastBlobCheckMs = 0;

function isWriteStatement(sql: string): boolean {
  const head = sql.trimStart().slice(0, 10).toUpperCase();
  return (
    head.startsWith("INSERT") ||
    head.startsWith("UPDATE") ||
    head.startsWith("DELETE") ||
    head.startsWith("REPLACE")
  );
}

function resolveDbPath(): string {
  let targetPath = path.join(process.cwd(), "data", "entrenoapp.db");
  if (process.env.VERCEL) {
    targetPath = path.join("/tmp", "entrenoapp.db");
    // En Vercel: intentar descargar primero la base de datos persistente desde Vercel Blob
    try {
      syncDownFromBlobSync(targetPath);
    } catch (e) {
      console.warn("[DB] Fallback al seed en Vercel:", e);
    }
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

  if (!fs.existsSync(targetPath) || (fs.existsSync(targetPath) && fs.statSync(targetPath).size < 1000 && fs.existsSync(seedPath) && fs.statSync(seedPath).size > 1000)) {
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, targetPath);
      } catch (e) {
        console.error("[DB] Error al inicializar desde seed:", e);
      }
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
          if (!isInitializing && isWriteStatement(sql)) {
            triggerDataPersistence();
          }
          return { lastInsertRowid: res.lastInsertRowid, changes: Number(res.changes) };
        },
        get: (...params: unknown[]) => toPlainObject(stmt.get(...(params as never[])) as T | undefined),
        all: (...params: unknown[]) => (stmt.all(...(params as never[])) as T[]).map(toPlainObject),
      };
    },
    exec(sql: string) {
      raw.exec(sql);
      if (!isInitializing && isWriteStatement(sql)) {
        triggerDataPersistence();
      }
    },
    transaction<T>(fn: () => T) {
      return () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          const result = fn();
          raw.exec("COMMIT");
          if (!isInitializing) {
            triggerDataPersistence();
          }
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
  if (isInitializing) return;
  const dbPath = activeDbPath || resolveDbPath();

  // 1. En Vercel: persistencia garantizada en Vercel Blob usando la API after() de Next.js
  if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      scheduleDbSyncToBlob(dbPath, db ?? undefined);
    } catch (err) {
      console.warn("[DB] Error programando sync a Vercel Blob:", err);
    }
  }

  // 2. En local: replicar a seed/entrenoapp.db, data/entrenoapp.db y Electron
  if (!process.env.VERCEL) {
    if (syncScheduled) return;
    syncScheduled = true;

    setTimeout(() => {
      syncScheduled = false;
      try {
        if (!fs.existsSync(dbPath)) return;
        const seedPath = path.join(process.cwd(), "seed", "entrenoapp.db");
        const dataPath = path.join(process.cwd(), "data", "entrenoapp.db");

        const targetPaths = new Set<string>();
        targetPaths.add(seedPath);
        targetPaths.add(dataPath);

        // App de escritorio (%APPDATA%/EntrenoApp)
        const appData = process.env.APPDATA;
        if (appData) {
          const desktopDb1 = path.join(appData, "EntrenoApp", "entrenoapp.db");
          const desktopDb2 = path.join(appData, "EntrenoApp", "data", "entrenoapp.db");
          if (fs.existsSync(path.dirname(desktopDb1))) targetPaths.add(desktopDb1);
          if (fs.existsSync(path.dirname(desktopDb2))) targetPaths.add(desktopDb2);
        }

        // Replicar en todos los destinos para blindar contra cualquier desincronización
        for (const target of targetPaths) {
          if (path.resolve(target) === path.resolve(dbPath)) continue;
          try {
            const dir = path.dirname(target);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(dbPath, target);
          } catch (e) {
            console.warn(`[DB] Fallo al replicar en ${target}:`, e);
          }
        }

        // Crear copia de seguridad rotativa periódica (máximo cada 1 hora)
        const now = Date.now();
        if (now - lastCloudSyncTime > 3600000) {
          lastCloudSyncTime = now;
          rotateLocalBackup(dbPath);
        }
      } catch (err) {
        console.warn("[DB] Error en persistencia de datos local:", err);
      }
    }, 1000);
  }
}

function rotateLocalBackup(dbPath: string): void {
  try {
    const backupDir = path.join(process.cwd(), "data", "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const backupFile = path.join(backupDir, `entrenoapp-backup-${stamp}.db`);
    fs.copyFileSync(dbPath, backupFile);

    // Mantener como máximo los 14 backups más recientes (2 semanas de rotación)
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("entrenoapp-backup-") && f.endsWith(".db"))
      .sort();

    while (files.length > 14) {
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
      feeling INTEGER,
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
      hrv_rmssd REAL,
      resting_hr REAL,
      respiratory_rate REAL,
      efficiency REAL,
      sleep_start TEXT,
      sleep_end TEXT,
      latency_min REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
      body_fat_pct REAL,
      muscle_mass_kg REAL,
      water_pct REAL,
      source TEXT,
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

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suunto_id TEXT UNIQUE,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL,
      duracion REAL NOT NULL,
      distancia REAL,
      fc_media REAL,
      fc_max REAL,
      carga_tss REAL,
      rpe REAL,
      raw_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL UNIQUE,
      sleep_duration REAL,
      deep_sleep_min REAL,
      rem_min REAL,
      resting_hr REAL,
      recovery_score REAL,
      raw_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS training_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semana TEXT NOT NULL UNIQUE,
      sesiones_planificadas TEXT NOT NULL,
      adaptaciones_ia TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      device_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      category TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_app_notifications_created ON app_notifications(created_at DESC);

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

    CREATE TABLE IF NOT EXISTS ai_logs (
      id TEXT PRIMARY KEY,
      feature TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ok','error')),
      latency_ms INTEGER NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      estimated_cost_usd REAL,
      error_message TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature);

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
  if (!columnExists(d, "sessions", "feeling")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN feeling INTEGER;`);
  }
  if (!columnExists(d, "sessions", "shoe_id")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN shoe_id INTEGER;`);
  }
  if (!columnExists(d, "measurements", "body_fat_pct")) {
    d.exec(`ALTER TABLE measurements ADD COLUMN body_fat_pct REAL;`);
  }
  if (!columnExists(d, "measurements", "muscle_mass_kg")) {
    d.exec(`ALTER TABLE measurements ADD COLUMN muscle_mass_kg REAL;`);
  }
  if (!columnExists(d, "measurements", "water_pct")) {
    d.exec(`ALTER TABLE measurements ADD COLUMN water_pct REAL;`);
  }
  if (!columnExists(d, "measurements", "source")) {
    d.exec(`ALTER TABLE measurements ADD COLUMN source TEXT;`);
  }

  d.exec(`
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
  if (!columnExists(d, "sleep_logs", "hrv_rmssd")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN hrv_rmssd REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "resting_hr")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN resting_hr REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "respiratory_rate")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN respiratory_rate REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "efficiency")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN efficiency REAL;`);
  }
  if (!columnExists(d, "sleep_logs", "sleep_start")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN sleep_start TEXT;`);
  }
  if (!columnExists(d, "sleep_logs", "sleep_end")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN sleep_end TEXT;`);
  }
  if (!columnExists(d, "sleep_logs", "latency_min")) {
    d.exec(`ALTER TABLE sleep_logs ADD COLUMN latency_min REAL;`);
  }

  d.exec(`
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

  // Migración idempotente para modelos de Suunto, Zepp, Training Plan y Web Push
  if (!isMigrationExecuted(d, "20261030_suunto_zepp_push_models")) {
    try {
      d.exec(`
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          suunto_id TEXT UNIQUE,
          fecha TEXT NOT NULL,
          tipo TEXT NOT NULL,
          duracion REAL NOT NULL,
          distancia REAL,
          fc_media REAL,
          fc_max REAL,
          carga_tss REAL,
          rpe REAL,
          raw_data TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recovery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha TEXT NOT NULL UNIQUE,
          sleep_duration REAL,
          deep_sleep_min REAL,
          rem_min REAL,
          resting_hr REAL,
          recovery_score REAL,
          raw_data TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS training_plan (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          semana TEXT NOT NULL UNIQUE,
          sesiones_planificadas TEXT NOT NULL,
          adaptaciones_ia TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          device_type TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_workouts_fecha ON workouts(fecha);
        CREATE INDEX IF NOT EXISTS idx_workouts_tipo ON workouts(tipo);
        CREATE INDEX IF NOT EXISTS idx_recovery_fecha ON recovery(fecha);
        CREATE INDEX IF NOT EXISTS idx_training_plan_semana ON training_plan(semana);
      `);
      recordMigration(d, "20261030_suunto_zepp_push_models");
    } catch (e) {
      console.error("[DB] Error aplicando migración 20261030_suunto_zepp_push_models:", e);
    }
  }

  // Migración idempotente para suscripciones y monetización Stripe
  if (!isMigrationExecuted(d, "20261103_subscriptions_and_billing")) {
    try {
      d.exec(`
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
      recordMigration(d, "20261103_subscriptions_and_billing");
    } catch (e) {
      console.error("[DB] Error aplicando migración 20261103_subscriptions_and_billing:", e);
    }
  }

  // Migración idempotente para sincronización bidireccional con Suunto / Intervals.icu
  if (!isMigrationExecuted(d, "20261111_suunto_bidirectional_sync")) {
    try {
      d.exec(`
        CREATE TABLE IF NOT EXISTS session_suunto_sync (
          session_id INTEGER PRIMARY KEY,
          provider TEXT NOT NULL,
          external_id TEXT,
          status TEXT NOT NULL DEFAULT 'synced',
          steps_count INTEGER DEFAULT 0,
          last_error TEXT,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      recordMigration(d, "20261111_suunto_bidirectional_sync");
    } catch (e) {
      console.error("[DB] Error aplicando migración 20261111_suunto_bidirectional_sync:", e);
    }
  }

  // Migración idempotente multi-tenant (profiles, integrations, user_id)
  if (!isMigrationExecuted(d, "20261123_multitenant_profiles_and_user_id")) {
    try {
      if (!columnExists(d, "sessions", "user_id")) {
        d.exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }
      if (!columnExists(d, "sleep_logs", "user_id")) {
        d.exec(`ALTER TABLE sleep_logs ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }
      if (!columnExists(d, "measurements", "user_id")) {
        d.exec(`ALTER TABLE measurements ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }
      if (!columnExists(d, "shoes", "user_id")) {
        d.exec(`ALTER TABLE shoes ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }
      if (!columnExists(d, "goals", "user_id")) {
        d.exec(`ALTER TABLE goals ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }
      if (!columnExists(d, "mental_logs", "user_id")) {
        d.exec(`ALTER TABLE mental_logs ADD COLUMN user_id TEXT DEFAULT 'default_user';`);
      }

      d.exec(`
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

        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sleep_user ON sleep_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_measurements_user ON measurements(user_id);
        CREATE INDEX IF NOT EXISTS idx_shoes_user ON shoes(user_id);
        CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
      `);

      // Crear o vincular el perfil de Daniel Espinosa como propietario histórico
      d.exec(`
        INSERT OR IGNORE INTO profiles (
          id, email, full_name, role, weight_kg, resting_hr, vam_pace, vam_sec_km,
          target_distance, target_date, days_per_week, webhook_token, onboarded, created_at, updated_at
        ) VALUES (
          'default_user', 'danielespinosa@entrenoapp.es', 'Daniel Espinosa', 'owner',
          72.5, 95, '3:59', 239, 'Maratón', '2027-04-26', 4,
          'default_daniel_webhook_token', 1, datetime('now'), datetime('now')
        );
      `);

      recordMigration(d, "20261123_multitenant_profiles_and_user_id");
    } catch (e) {
      console.error("[DB] Error aplicando migración 20261123_multitenant_profiles_and_user_id:", e);
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
  isInitializing = true;
  try {
    createSchema(wrapped);
    migrateSchema(wrapped);
  } finally {
    isInitializing = false;
  }

  // Blindaje de arranque: auto-sincronizar ZeppBridge en segundo plano sin ralentizar el arranque
  if (!process.env.VERCEL) {
    setTimeout(async () => {
      try {
        const { autoSyncZepp } = await import("@/lib/zepp-auto-sync");
        autoSyncZepp(false);
      } catch (e) {
        // Ignorar si no está configurado en este entorno
      }
    }, 1200);
  }

  return wrapped;
}

export function getDbPath(): string {
  return activeDbPath || resolveDbPath();
}

export async function flushDbPersistence(): Promise<void> {
  if (!isBlobSyncEnabled()) return;
  const dbPath = activeDbPath || resolveDbPath();
  await syncDbToBlob(dbPath, db ?? undefined);
}

export async function refreshDbFromBlobIfNewer(force = false): Promise<void> {
  if (!process.env.VERCEL || !isBlobSyncEnabled()) return;
  const now = Date.now();
  if (!force && now - lastBlobCheckMs < 1500) return;
  lastBlobCheckMs = now;

  const targetPath = activeDbPath || path.join("/tmp", "entrenoapp.db");
  const etagFile = path.join(path.dirname(targetPath), ".blob_last_etag");
  const localEtag = fs.existsSync(etagFile) ? fs.readFileSync(etagFile, "utf8").trim() : null;
  const remoteEtag = await getRemoteBlobEtag();

  if (remoteEtag && remoteEtag !== localEtag) {
    try {
      db?.close();
    } catch {}
    db = null;
    await downloadBlobDatabaseAsync(targetPath);
  }
}
