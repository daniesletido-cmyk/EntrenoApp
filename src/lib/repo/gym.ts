import { getDb } from "@/lib/db";

export interface GymDayRow {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GymExerciseRow {
  id: number;
  gym_day_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GymLogRow {
  id: number;
  exercise_id: number;
  date: string;
  weight_kg: number | null;
  sets: number | null;
  reps: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Días de gimnasio ----------

export function listGymDays(): GymDayRow[] {
  return getDb().prepare<GymDayRow>("SELECT * FROM gym_days ORDER BY sort_order ASC, id ASC").all();
}

export function createGymDay(name: string): GymDayRow {
  const db = getDb();
  const now = new Date().toISOString();
  const maxOrder = db.prepare<{ m: number | null }>("SELECT MAX(sort_order) as m FROM gym_days").get();
  const sortOrder = (maxOrder?.m ?? -1) + 1;
  const res = db
    .prepare("INSERT INTO gym_days (name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(name, sortOrder, now, now);
  return db.prepare<GymDayRow>("SELECT * FROM gym_days WHERE id = ?").get(Number(res.lastInsertRowid))!;
}

export function updateGymDay(id: number, input: Partial<Pick<GymDayRow, "name" | "sort_order">>): GymDayRow | undefined {
  const db = getDb();
  const current = db.prepare<GymDayRow>("SELECT * FROM gym_days WHERE id = ?").get(id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  db.prepare("UPDATE gym_days SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?").run(
    input.name ?? current.name,
    input.sort_order ?? current.sort_order,
    now,
    id
  );
  return db.prepare<GymDayRow>("SELECT * FROM gym_days WHERE id = ?").get(id);
}

export function deleteGymDay(id: number): void {
  // ON DELETE CASCADE en gym_exercises/gym_logs se encarga del resto.
  getDb().prepare("DELETE FROM gym_days WHERE id = ?").run(id);
}

// ---------- Ejercicios ----------

export function listGymExercises(gymDayId?: number): GymExerciseRow[] {
  const db = getDb();
  if (gymDayId !== undefined) {
    return db
      .prepare<GymExerciseRow>("SELECT * FROM gym_exercises WHERE gym_day_id = ? ORDER BY sort_order ASC, id ASC")
      .all(gymDayId);
  }
  return db.prepare<GymExerciseRow>("SELECT * FROM gym_exercises ORDER BY gym_day_id ASC, sort_order ASC, id ASC").all();
}

export function createGymExercise(gymDayId: number, name: string): GymExerciseRow {
  const db = getDb();
  const now = new Date().toISOString();
  const maxOrder = db
    .prepare<{ m: number | null }>("SELECT MAX(sort_order) as m FROM gym_exercises WHERE gym_day_id = ?")
    .get(gymDayId);
  const sortOrder = (maxOrder?.m ?? -1) + 1;
  const res = db
    .prepare(
      "INSERT INTO gym_exercises (gym_day_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(gymDayId, name, sortOrder, now, now);
  return db.prepare<GymExerciseRow>("SELECT * FROM gym_exercises WHERE id = ?").get(Number(res.lastInsertRowid))!;
}

export function updateGymExercise(
  id: number,
  input: Partial<Pick<GymExerciseRow, "name" | "sort_order" | "gym_day_id">>
): GymExerciseRow | undefined {
  const db = getDb();
  const current = db.prepare<GymExerciseRow>("SELECT * FROM gym_exercises WHERE id = ?").get(id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  db.prepare("UPDATE gym_exercises SET name = ?, sort_order = ?, gym_day_id = ?, updated_at = ? WHERE id = ?").run(
    input.name ?? current.name,
    input.sort_order ?? current.sort_order,
    input.gym_day_id ?? current.gym_day_id,
    now,
    id
  );
  return db.prepare<GymExerciseRow>("SELECT * FROM gym_exercises WHERE id = ?").get(id);
}

export function deleteGymExercise(id: number): void {
  getDb().prepare("DELETE FROM gym_exercises WHERE id = ?").run(id);
}

// ---------- Registros (peso/series/reps por fecha) ----------

export function listGymLogsForExercise(exerciseId: number): GymLogRow[] {
  return getDb()
    .prepare<GymLogRow>("SELECT * FROM gym_logs WHERE exercise_id = ? ORDER BY date ASC, id ASC")
    .all(exerciseId);
}

export function listGymLogsForDate(date: string): GymLogRow[] {
  return getDb().prepare<GymLogRow>("SELECT * FROM gym_logs WHERE date = ?").all(date);
}

export function getLatestGymLog(exerciseId: number, beforeDate?: string): GymLogRow | undefined {
  const db = getDb();
  if (beforeDate) {
    return db
      .prepare<GymLogRow>(
        "SELECT * FROM gym_logs WHERE exercise_id = ? AND date < ? ORDER BY date DESC, id DESC LIMIT 1"
      )
      .get(exerciseId, beforeDate);
  }
  return db
    .prepare<GymLogRow>("SELECT * FROM gym_logs WHERE exercise_id = ? ORDER BY date DESC, id DESC LIMIT 1")
    .get(exerciseId);
}

export interface UpsertGymLogInput {
  exercise_id: number;
  date: string;
  weight_kg?: number | null;
  sets?: number | null;
  reps?: number | null;
  notes?: string | null;
}

// Un registro por ejercicio y fecha: si ya existe, lo actualiza en vez de duplicar.
export function upsertGymLog(input: UpsertGymLogInput): GymLogRow {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO gym_logs (exercise_id, date, weight_kg, sets, reps, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(exercise_id, date) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       sets = excluded.sets,
       reps = excluded.reps,
       notes = excluded.notes,
       updated_at = excluded.updated_at`
  ).run(
    input.exercise_id,
    input.date,
    input.weight_kg ?? null,
    input.sets ?? null,
    input.reps ?? null,
    input.notes ?? null,
    now,
    now
  );
  return db
    .prepare<GymLogRow>("SELECT * FROM gym_logs WHERE exercise_id = ? AND date = ?")
    .get(input.exercise_id, input.date)!;
}

export function deleteGymLog(id: number): void {
  getDb().prepare("DELETE FROM gym_logs WHERE id = ?").run(id);
}
