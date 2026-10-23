import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureAnnualPlanPopulated } from "@/lib/annual-plan-seed";

// Mismo patrón que FinanzasApp: node:sqlite (nativo de Node, sin compilar nada),
// sin better-sqlite3 ni Prisma. Cada fila se convierte a objeto plano porque
// node:sqlite devuelve prototipo null, que Next.js rechaza pasar de Server a
// Client Component.

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  // En la app de escritorio (Electron), main.cjs fijará DB_PATH a la carpeta
  // de datos de usuario de Windows (userData). En Vercel Serverless, usamos /tmp.
  // En desarrollo o contenedores, usamos ./data.
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
  if (fs.existsSync(seedPath)) {
    let copyRequired = !fs.existsSync(targetPath);
    if (process.env.VERCEL) {
      try {
        const seedBuffer = fs.readFileSync(seedPath);
        const seedHash = crypto.createHash("md5").update(seedBuffer).digest("hex");
        const hashFilePath = path.join(dir, ".seed_hash");
        let activeHash = "";
        if (fs.existsSync(hashFilePath)) {
          try {
            activeHash = fs.readFileSync(hashFilePath, "utf8").trim();
          } catch {}
        }
        if (!copyRequired && activeHash !== seedHash) {
          copyRequired = true;
        }
        if (copyRequired) {
          fs.writeFileSync(targetPath, seedBuffer);
          try {
            fs.writeFileSync(hashFilePath, seedHash, "utf8");
          } catch {}
          return targetPath;
        }
      } catch (e) {
        console.error("Error comprobando hash de seed:", e);
      }
    }

    if (copyRequired) {
      try {
        fs.copyFileSync(seedPath, targetPath);
      } catch (e) {
        console.error("Error copiando seed de base de datos:", e);
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
      user_notes TEXT,
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
      completed INTEGER DEFAULT 0,
      series_data TEXT,
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
  if (!columnExists(d, "sessions", "fit_data")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN fit_data TEXT;`);
  }
  if (!columnExists(d, "sessions", "is_extra")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN is_extra INTEGER NOT NULL DEFAULT 0;`);
  }
  if (!columnExists(d, "sessions", "user_notes")) {
    d.exec(`ALTER TABLE sessions ADD COLUMN user_notes TEXT;`);
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

  // Auto-sincronización garantizada de sesiones históricas realizadas y Test VAM
  try {
    d.exec(`
      UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.6, rpe = 6 WHERE id = 11 OR (date = '2026-09-12' AND discipline = 'natacion');
      UPDATE sessions SET status = 'realizada', duration_min = 54, distance_km = 9.0, rpe = 6 WHERE id = 14 OR (date = '2026-09-13' AND discipline = 'carrera');
      UPDATE sessions SET status = 'realizada', duration_min = 40, distance_km = 1.5, rpe = 6 WHERE id = 17 OR (date = '2026-09-15' AND discipline = 'natacion');
      UPDATE sessions SET status = 'realizada', duration_min = 58, distance_km = 10.0, rpe = 6 WHERE id = 20 OR (date = '2026-09-20' AND discipline = 'carrera');
      UPDATE sessions SET status = 'realizada', duration_min = 38, distance_km = 6.2, rpe = 5 WHERE id = 27 OR (date = '2026-09-24' AND discipline = 'carrera');
      UPDATE sessions SET status = 'realizada', duration_min = 42, distance_km = 1.6, rpe = 6 WHERE id = 28 OR (date = '2026-09-25' AND discipline = 'natacion');
      UPDATE sessions SET status = 'realizada', duration_min = 48, distance_km = 8.5, rpe = 7 WHERE id = 29 OR (date = '2026-09-26' AND discipline = 'carrera');
      UPDATE sessions SET status = 'realizada', duration_min = 35, distance_km = 5.8, rpe = 10, notes = 'TEST VAM realizado: 5 min a máxima intensidad. VAM obtenido: 3:59 min/km (15.06 km/h). Nuevas zonas de carrera calculadas y activadas.' WHERE id = 30 OR (date = '2026-09-27' AND discipline = 'carrera');
      INSERT OR REPLACE INTO settings (key, value) VALUES ('vam_pace', '3:59 min/km');
      INSERT OR REPLACE INTO settings (key, value) VALUES ('vam_speed', '15.06 km/h');
      INSERT OR REPLACE INTO settings (key, value) VALUES ('vam_test_date', '2026-09-27');
      INSERT OR REPLACE INTO settings (key, value) VALUES ('target_pace_scenario', '5:00-5:15 min/km (VAM: 3:59 min/km)');

      -- Reorganización de la semana 2026-10-12 a 2026-10-18 (CrossFit Mié/Vie, Natación Mar, Carreras y Descanso)
      UPDATE sessions SET
        discipline = 'descanso',
        planned_code = 'Descanso / Sin entrenamiento',
        status = 'no_realizada',
        duration_min = 0,
        distance_km = NULL,
        rpe = NULL,
        notes = 'DESCANSO (Día libre sin entrenamiento):\n- Ayer lunes no se entrenó (0 min de actividad).\n- Carga acumulada: 0 UA.'
      WHERE date = '2026-10-12';

      UPDATE sessions SET
        discipline = 'natacion',
        planned_code = 'NAT (Base Aeróbica & Descompresión Articular)',
        status = 'realizada',
        duration_min = 45,
        distance_km = 2.0,
        rpe = 5,
        notes = 'NATACIÓN · Base Aeróbica y Preparación Articular (~2.000m · 45 min · RPE 5 · Carga estimada: 225 UA):\n- Justificación de carga: Ayer descansaste (0 UA); hoy realizas natación técnica aeróbica para preparar el sistema cardiovascular y proteger los hombros/gemelos antes del CrossFit del miércoles y viernes.\n- Calentamiento: 350m suave y variado continuo (200m crol largo y relajado + 150m espalda suave para abrir la cintura escapular).\n- Técnica y Eficiencia: 4x50m técnica con pull-buoy (foco en agarre alto y tracción dorsal fluida, descanso 20s). *Objetivo*: Alinear cadera y soltar piernas.\n- Bloque Principal (Ritmo Crucero Aeróbico): 4x250m crol a ritmo constante y sostenido en zona aeróbica cómoda (descanso 30s entre bloques). *Recomendación*: Realizar las series 1 y 3 con pull-buoy para aislar gemelos y sóleos de cara a la carrera del miércoles.\n- Descarga continua: 200m nado continuo suave a estilo libre.\n- Vuelta a la calma: 150m espalda suave + respiración bilateral para equilibrar hombros y cuello. Cero fatiga acumulada.'
      WHERE date = '2026-10-13';

      UPDATE sessions SET
        discipline = 'crossfit',
        planned_code = 'CrossFit WOD (Steady: Habilidad Pino + 5 Rondas Running & Wall Walks)',
        status = 'realizada',
        duration_min = 50,
        distance_km = NULL,
        rpe = 7.5,
        notes = 'CROSSFIT · DÍA STEADY (Constante y sostenido · Duración ~50 min · RPE 7.5 · Carga estimada: 375 UA):\n\n1. BLOQUE DE FUERZA Y TÉCNICA (10:00 minutos de práctica):\n- Práctica de caminar haciendo el pino (Handstand Walk), mantenimiento de la vertical invertida estática (Handstand Hold) y estabilidad de hombros por encima de la cabeza (Overhead Stability).\n- Enfoque: Trabajo de desarrollo de habilidad y control neuromuscular. Sin medición ni carga máxima; priorizar la técnica limpia.\n\n2. WOD PRINCIPAL FREEDOM RX (Por Tiempo - 5 Rondas completas):\nCompletar en el menor tiempo posible:\n- 400 metros de Carrera continua (Run)\n- 50 Saltos dobles a la comba (Double Unders)\n- 5 Caminatas a la pared / Escaladas de pared (Wall Walks)\n*Puntuación: Tiempo total cronometrado.\n*Ritmo objetivo: Ritmo "Steady" (controlado y sin paradas largas), gestionando la fatiga de hombros en los wall walks y el impacto en gemelos de la comba.\n\n3. VUELTA A LA CALMA (5-10 min):\n- Estiramientos suaves de hombros (manguito rotador, pectorales) y descarga de gemelos y fascia plantar.'
      WHERE date = '2026-10-14';

      UPDATE sessions SET
        discipline = 'carrera',
        planned_code = 'R1 (Rodaje Regenerativo Suave VAM)',
        status = 'realizada',
        duration_min = 38,
        distance_km = 6.5,
        rpe = 4.5,
        notes = 'RUNNING · Rodaje Regenerativo en Zona R1 (~6.5 km · ~38 min · RPE 4-5 · Carga estimada: 171 UA):\n- Ritmo objetivo VAM: 5:25 - 4:59 min/km (Zona R1, 100% conversacional, VAM: 3:59 min/km).\n- Justificación de carga: Recuperar activamente la musculatura tras la carrera y saltos de comba del miércoles, manteniendo las piernas frescas para el esfuerzo de sentadillas pesadas del viernes.\n- Calentamiento: 5 min caminando a paso ligero y trote muy suave (>5:30/km).\n- Cuerpo principal: 30 min continuo a ritmo R1 suave, pisada elástica y cadencia alta (175-180 ppm).\n- Técnica final: 3x60m progresiones suaves soltando piernas (sin sprintar).\n- Vuelta a la calma: 3-5 min andando + estiramientos de sóleos y cuádriceps.'
      WHERE date = '2026-10-15';

      UPDATE sessions SET
        discipline = 'crossfit',
        planned_code = 'CrossFit WOD (Sprint: 8 Series Front Squat + Intervalos Box Step Overs)',
        status = 'realizada',
        duration_min = 50,
        distance_km = NULL,
        rpe = 8.5,
        notes = 'CROSSFIT · DÍA SPRINT (Máxima potencia láctica · Duración ~50 min · RPE 8.5 · Carga estimada: 425 UA):\n\n1. BLOQUE DE FUERZA (8 Series de 2 repeticiones):\n- 8 Series de 2 Sentadillas Frontales (Front Squats).\n- Descanso estricto de 1:00 minuto entre series.\n- Objetivo: Construir peso progresivamente hacia carga pesada. El resultado es el peso más pesado completado con técnica perfecta.\n\n2. WOD PRINCIPAL FREEDOM RX (Cada 3:30 min durante 5 Series):\nEn cada intervalo de 3:30 min, realizar a ritmo de SPRINT:\n- 8 Sentadillas Frontales (Front Squats con 60 kg chicos / 42.5 kg chicas · 135/95 lbs)\n- 16 Pasos por encima del cajón (Box Step Overs con cajón de 61 cm / 50 cm · pueden ser laterales o de frente)\n- 8 Sentadillas Frontales (Front Squats con 60 kg chicos / 42.5 kg chicas · 135/95 lbs)\n*Puntuación: Registrar el tiempo de cada serie individual. El tiempo restante hasta completar los 3:30 min es tu descanso antes de la siguiente serie.\n*Estrategia: Salir fuerte en cada intervalo buscando mantener un tiempo consistente entre las 5 rondas.\n\n3. VUELTA A LA CALMA (5-10 min):\n- Movilidad y descompresión de flexores de cadera, cuádriceps y zona lumbar.'
      WHERE date = '2026-10-16';

      UPDATE sessions SET
        discipline = 'descanso',
        planned_code = 'Descanso Activo & Movilidad Lumbo-Pélvica',
        status = 'realizada',
        duration_min = 20,
        distance_km = NULL,
        rpe = 2,
        notes = 'DESCANSO ACTIVO · Recuperación Lumbo-Pélvica (~20 min · RPE 2 · Carga estimada: 0 UA):\n- Justificación de carga: Tras el alto volumen e impacto excéntrico de sentadillas frontales pesadas y saltos del viernes (425 UA), el sábado se dedica a descompresión para asimilar la carga y llegar en óptimas condiciones a la tirada larga del domingo.\n- 8-10 min de foam roller en cuádriceps, glúteos, banda iliotibial y gemelos.\n- 10 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos y rotación torácica).\n- Cero impacto articular de cara a la tirada larga del domingo.'
      WHERE date = '2026-10-17';

      UPDATE sessions SET
        discipline = 'carrera',
        planned_code = 'R5 (Tirada Larga de Volumen 14 km)',
        status = 'realizada',
        duration_min = 74,
        distance_km = 14.0,
        rpe = 5.5,
        notes = 'RUNNING · Tirada Larga de Volumen Semanal (14 km · ~74 min · RPE 5-6 · Carga estimada: 407 UA):\n- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Ritmo aeróbico cómodo sostenido, VAM: 3:59 min/km).\n- Justificación de carga: Es el bloque principal de volumen aeróbico semanal. Llegarás con las piernas descansadas tras el sábado sin impacto.\n- Calentamiento: 5 min trote muy suave (>5:30/km) + movilidad de tobillos.\n- Bloque de volumen: 14 km continuos manteniendo pulsaciones controladas y cadencia estable (175 ppm).\n- Hidratación / Nutrición: Tomar agua o sales cada 20-25 minutos; 1 gel isotónico en el km 8-9 si es necesario.\n- Vuelta a la calma: 5 min andando a paso lento + estiramientos completos.'
      WHERE date = '2026-10-18';

      -- Semana actual (2026-10-19 a 2026-10-25): Lunes a Viernes completados
      UPDATE sessions SET status = 'realizada', duration_min = 45, distance_km = 1.9, rpe = 4.5 WHERE date = '2026-10-19';
      UPDATE sessions SET status = 'realizada', duration_min = 55, distance_km = 2.4, rpe = 8.5 WHERE date = '2026-10-20';
      UPDATE sessions SET status = 'realizada', duration_min = 35.2, distance_km = 6.76, rpe = 5.5 WHERE date = '2026-10-21';
      UPDATE sessions SET status = 'realizada', duration_min = 50, rpe = 7.5 WHERE date = '2026-10-22';
      UPDATE sessions SET status = 'realizada', duration_min = 20, rpe = 2 WHERE date = '2026-10-23';
    `);

    ensureAnnualPlanPopulated(d);
  } catch (e) {
    console.error("Error auto-sincronizando sesiones históricas y anuales:", e);
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
