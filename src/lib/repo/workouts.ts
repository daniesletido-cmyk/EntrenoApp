import { getDb } from "@/lib/db";
import { weekStartOf } from "@/lib/dates";

export interface WorkoutRow {
  id: number;
  suunto_id: string | null;
  fecha: string; // YYYY-MM-DD o ISO string
  tipo: string; // carrera, ciclismo, gimnasio, natacion, crossfit, etc.
  duracion: number; // en minutos
  distancia: number | null; // en km
  fc_media: number | null;
  fc_max: number | null;
  carga_tss: number | null;
  rpe: number | null;
  raw_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutInput {
  id?: number;
  suunto_id?: string | null;
  fecha: string;
  tipo: string;
  duracion: number;
  distancia?: number | null;
  fc_media?: number | null;
  fc_max?: number | null;
  carga_tss?: number | null;
  rpe?: number | null;
  raw_data?: string | null;
}

export function upsertWorkout(input: WorkoutInput): WorkoutRow {
  const db = getDb();
  const now = new Date().toISOString();
  const dateFormatted = input.fecha.includes("T") ? input.fecha.split("T")[0] : input.fecha;

  let existing: WorkoutRow | undefined;
  if (input.suunto_id) {
    existing = db.prepare<WorkoutRow>("SELECT * FROM workouts WHERE suunto_id = ?").get(input.suunto_id);
  } else if (input.id) {
    existing = db.prepare<WorkoutRow>("SELECT * FROM workouts WHERE id = ?").get(input.id);
  }

  let workoutId: number;

  if (existing) {
    db.prepare(`
      UPDATE workouts
      SET suunto_id = COALESCE(?, suunto_id),
          fecha = ?,
          tipo = ?,
          duracion = ?,
          distancia = ?,
          fc_media = ?,
          fc_max = ?,
          carga_tss = ?,
          rpe = ?,
          raw_data = COALESCE(?, raw_data),
          updated_at = ?
      WHERE id = ?
    `).run(
      input.suunto_id ?? null,
      dateFormatted,
      input.tipo,
      input.duracion,
      input.distancia ?? null,
      input.fc_media ?? null,
      input.fc_max ?? null,
      input.carga_tss ?? null,
      input.rpe ?? null,
      input.raw_data ?? null,
      now,
      existing.id
    );
    workoutId = existing.id;
  } else {
    const res = db.prepare(`
      INSERT INTO workouts (suunto_id, fecha, tipo, duracion, distancia, fc_media, fc_max, carga_tss, rpe, raw_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.suunto_id ?? null,
      dateFormatted,
      input.tipo,
      input.duracion,
      input.distancia ?? null,
      input.fc_media ?? null,
      input.fc_max ?? null,
      input.carga_tss ?? null,
      input.rpe ?? null,
      input.raw_data ?? null,
      now,
      now
    );
    workoutId = Number(res.lastInsertRowid);
  }

  // Sincronizar en la tabla sessions para integración completa con el resto de la app
  syncToAppSessions({
    date: dateFormatted,
    discipline: input.tipo,
    durationMin: input.duracion,
    distanceKm: input.distancia ?? null,
    rpe: input.rpe ?? null,
    loadTss: input.carga_tss ?? null,
    notes: `[Suunto Cloud] Tipo: ${input.tipo} · Carga: ${input.carga_tss ?? "-"} TSS · FC: ${input.fc_media ?? "-"} ppm`,
    raw: input.raw_data ?? null,
  });

  return db.prepare<WorkoutRow>("SELECT * FROM workouts WHERE id = ?").get(workoutId)!;
}

export function getWorkoutById(id: number): WorkoutRow | undefined {
  const db = getDb();
  return db.prepare<WorkoutRow>("SELECT * FROM workouts WHERE id = ?").get(id);
}

export function getWorkoutBySuuntoId(suuntoId: string): WorkoutRow | undefined {
  const db = getDb();
  return db.prepare<WorkoutRow>("SELECT * FROM workouts WHERE suunto_id = ?").get(suuntoId);
}

export function listWorkouts(limit = 50, offset = 0): WorkoutRow[] {
  const db = getDb();
  return db.prepare<WorkoutRow>("SELECT * FROM workouts ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?").all(limit, offset);
}

export function getLatestWorkout(): WorkoutRow | undefined {
  const db = getDb();
  return db.prepare<WorkoutRow>("SELECT * FROM workouts ORDER BY fecha DESC, id DESC LIMIT 1").get();
}

export function deleteWorkout(id: number): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM workouts WHERE id = ?").run(id);
  return res.changes > 0;
}

function syncToAppSessions(params: {
  date: string;
  discipline: string;
  durationMin: number;
  distanceKm: number | null;
  rpe: number | null;
  loadTss: number | null;
  notes: string;
  raw: string | null;
}) {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const week_start = weekStartOf(params.date);

    // Mapear disciplina a las reconocidas por la app
    let disc = params.discipline.toLowerCase();
    if (disc.includes("run") || disc.includes("carrera") || disc.includes("trail")) disc = "carrera";
    else if (disc.includes("gym") || disc.includes("pesas") || disc.includes("fuerza")) disc = "gimnasio";
    else if (disc.includes("swim") || disc.includes("nataci")) disc = "natacion";
    else if (disc.includes("crossfit") || disc.includes("wod")) disc = "crossfit";
    else if (disc.includes("cycl") || disc.includes("bici") || disc.includes("ride")) disc = "ciclismo";
    else if (disc.includes("walk") || disc.includes("camin")) disc = "caminata";
    else disc = "otro";

    // Buscar si ya existe una sesión en esa fecha
    const existingSession = db.prepare<{ id: number; status: string }>(
      "SELECT id, status FROM sessions WHERE date = ? AND (discipline = ? OR status = 'pendiente') ORDER BY id ASC LIMIT 1"
    ).get(params.date, disc);

    if (existingSession) {
      db.prepare(`
        UPDATE sessions
        SET status = 'realizada',
            discipline = ?,
            duration_min = ?,
            distance_km = ?,
            rpe = COALESCE(?, rpe),
            notes = COALESCE(notes, '') || ' | ' || ?,
            fit_data = COALESCE(?, fit_data),
            updated_at = ?
        WHERE id = ?
      `).run(
        disc,
        params.durationMin,
        params.distanceKm,
        params.rpe,
        params.notes,
        params.raw,
        now,
        existingSession.id
      );
    } else {
      db.prepare(`
        INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, is_extra, status, rpe, duration_min, distance_km, notes, fit_data, created_at, updated_at)
        VALUES (?, ?, ?, NULL, 0, 1, 'realizada', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        params.date,
        week_start,
        disc,
        params.rpe,
        params.durationMin,
        params.distanceKm,
        params.notes,
        params.raw,
        now,
        now
      );
    }
  } catch (err) {
    console.warn("[Workout] Error sincronizando con sessions:", err);
  }
}
