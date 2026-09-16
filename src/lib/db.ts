import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Mismo patrón que FinanzasApp: node:sqlite (nativo de Node, sin compilar nada),
// sin better-sqlite3 ni Prisma. Cada fila se convierte a objeto plano porque
// node:sqlite devuelve prototipo null, que Next.js rechaza pasar de Server a
// Client Component.

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  // En la app de escritorio (Electron), main.cjs fijará DB_PATH a la carpeta
  // de datos de usuario de Windows (userData). En desarrollo, usamos ./data.
  if (process.env.DB_PATH) {
    const dir = path.dirname(process.env.DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    return process.env.DB_PATH;
  }
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "entrenoapp.db");
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
          return { lastInsertRowid: res.lastInsertRowid, changes: Number(res.changes) };
        },
        get: (...params: unknown[]) => toPlainObject(stmt.get(...(params as never[])) as T | undefined),
        all: (...params: unknown[]) => (stmt.all(...(params as never[])) as T[]).map(toPlainObject),
      };
    },
    exec(sql: string) {
      raw.exec(sql);
    },
    transaction<T>(fn: () => T) {
      return () => {
        raw.exec("BEGIN");
        try {
          const result = fn();
          raw.exec("COMMIT");
          return result;
        } catch (err) {
          raw.exec("ROLLBACK");
          throw err;
        }
      };
    },
  };
}

function createSchema(d: AppDb) {
  d.exec(`
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      hours REAL,
      quality INTEGER,
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
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Catálogo de días de gimnasio (Día A, Día B...) definido por el usuario,
    -- y los ejercicios que tocan cada día. Los pesos/series/reps se registran
    -- aparte, en gym_logs, uno por ejercicio y fecha.
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(exercise_id, date)
    );
  `);
}

function columnExists(d: AppDb, table: string, column: string): boolean {
  const rows = d.prepare<{ name: string }>(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

// Igual que en FinanzasApp: sin Prisma, sin herramienta de migraciones.
// CREATE TABLE IF NOT EXISTS no toca tablas ya existentes, así que una
// columna nueva en el futuro necesita añadirse aquí a mano, comprobando
// primero con PRAGMA table_info si ya existe (idempotente).
function migrateSchema(d: AppDb) {
  // Guarda el estado de la sesión (estado, rpe, duración, distancia, notas)
  // justo antes de aplicar un .fit importado, para poder deshacerlo con un
  // botón desde Registro. NULL mientras no se haya importado ningún .fit
  // sobre esa sesión, o después de deshacerlo.
  if (!columnExists(d, "sessions", "fit_backup")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN fit_backup TEXT;`);
  }
  if (!columnExists(d, "sessions", "is_extra")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN is_extra INTEGER NOT NULL DEFAULT 0;`);
  }

  // Puntuación de sueño (0-100) y desglose por fases en minutos, que llegan al
  // importar el CSV exportado desde ZeppBridge (ver src/lib/import/zepp-sleep.ts).
  // La entrada manual de "calidad" (1-5) en Registro sigue viviendo en `quality`
  // y no se toca — son dos cosas distintas, nunca se mezclan en la misma escala.
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

  if (!columnExists(d, "gym_logs", "completed")) {
    d.exec(`ALTER TABLE gym_logs ADD COLUMN completed INTEGER DEFAULT 0;`);
  }
}

// Igual que FinanzasApp: si hay una restauración de copia de seguridad
// pendiente (ver src/lib/repo/backup.ts), se aplica aquí, antes de abrir
// ninguna conexión — nunca se sustituye la base de datos en caliente.
function applyPendingRestoreIfAny(dbPath: string) {
  const pendingPath = `${dbPath}.restore-pending`;
  if (!fs.existsSync(pendingPath)) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, `${dbPath}.antes-de-restaurar-${stamp}`);
  }
  for (const ext of ["-wal", "-shm", "-journal"]) {
    const p = `${dbPath}${ext}`;
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) fs.unlinkSync(/*turbopackIgnore: true*/ p);
  }
  fs.renameSync(pendingPath, dbPath);
}

export function getDb(): AppDb {
  if (db) return wrap(db);
  const dbPath = resolveDbPath();
  applyPendingRestoreIfAny(dbPath);
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  const wrapped = wrap(db);
  createSchema(wrapped);
  migrateSchema(wrapped);
  return wrapped;
}

export function getDbPath(): string {
  return resolveDbPath();
}
