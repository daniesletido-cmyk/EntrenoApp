import { getDb } from "@/lib/db";
import { weekStartOf } from "@/lib/dates";

export type SessionStatus = "pendiente" | "realizada" | "parcial" | "no_realizada";
export type Discipline = "carrera" | "gimnasio" | "natacion" | "crossfit" | "otro" | "descanso";

export interface SessionRow {
  id: number;
  date: string;
  week_start: string;
  discipline: Discipline;
  planned_code: string | null;
  is_long_run: number;
  status: SessionStatus;
  rpe: number | null;
  duration_min: number | null;
  distance_km: number | null;
  notes: string | null;
  // JSON con el estado anterior de la sesión (ver FitBackup) cuando su
  // último cambio fue aplicar un .fit importado — null si no aplica o si ya
  // se deshizo esa importación.
  fit_backup: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewPlannedSession {
  date: string;
  discipline: Discipline;
  planned_code?: string | null;
  is_long_run?: boolean;
  notes?: string | null;
}

export function createPlannedSession(input: NewPlannedSession): SessionRow {
  const db = getDb();
  const now = new Date().toISOString();
  const week_start = weekStartOf(input.date);
  const res = db
    .prepare(
      `INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`
    )
    .run(
      input.date,
      week_start,
      input.discipline,
      input.planned_code ?? null,
      input.is_long_run ? 1 : 0,
      input.notes ?? null,
      now,
      now
    );
  return getSessionById(Number(res.lastInsertRowid))!;
}

export function getSessionById(id: number): SessionRow | undefined {
  return getDb().prepare<SessionRow>("SELECT * FROM sessions WHERE id = ?").get(id);
}

export function listSessionsForWeek(weekStart: string): SessionRow[] {
  return getDb()
    .prepare<SessionRow>("SELECT * FROM sessions WHERE week_start = ? ORDER BY date ASC, id ASC")
    .all(weekStart);
}

export function listSessionsBetween(fromDate: string, toDate: string): SessionRow[] {
  return getDb()
    .prepare<SessionRow>("SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC")
    .all(fromDate, toDate);
}

export interface LogSessionInput {
  status: SessionStatus;
  rpe?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  notes?: string | null;
}

export function logSessionResult(id: number, input: LogSessionInput): SessionRow | undefined {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sessions SET status = ?, rpe = ?, duration_min = ?, distance_km = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.status,
      input.rpe ?? null,
      input.duration_min ?? null,
      input.distance_km ?? null,
      input.notes ?? null,
      now,
      id
    );
  return getSessionById(id);
}

interface FitBackup {
  status: SessionStatus;
  rpe: number | null;
  duration_min: number | null;
  distance_km: number | null;
  notes: string | null;
}

// Igual que logSessionResult, pero además guarda en fit_backup cómo estaba
// la sesión justo antes — así el botón "Deshacer importación .fit" de
// Registro puede restaurarla tal cual. Se llama solo cuando el cambio viene
// de aplicar un archivo .fit (ver /api/sessions/[id], flag fitImport).
export function applyFitImport(id: number, input: LogSessionInput): SessionRow | undefined {
  const current = getSessionById(id);
  if (!current) return undefined;

  const backup: FitBackup = {
    status: current.status,
    rpe: current.rpe,
    duration_min: current.duration_min,
    distance_km: current.distance_km,
    notes: current.notes,
  };

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sessions SET status = ?, rpe = ?, duration_min = ?, distance_km = ?, notes = ?, fit_backup = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.status,
      input.rpe ?? null,
      input.duration_min ?? null,
      input.distance_km ?? null,
      input.notes ?? null,
      JSON.stringify(backup),
      now,
      id
    );
  return getSessionById(id);
}

// Texto con el que fit-import marca la nota que añade (ver src/app/registro/page.tsx,
// applyFitImport) — se usa aquí para reconocer y limpiar importaciones antiguas que
// se aplicaron antes de que existiera fit_backup.
const FIT_IMPORT_MARKER = "Importado desde .fit";

// Quita de las notas solo la parte añadida por una importación de .fit,
// conservando cualquier detalle que hubiera escrito a mano antes. Soporta
// varias importaciones apiladas (cada una añadida con un separador "---").
function stripFitNotes(notes: string): string | null {
  let result = notes.replace(/\n---\nImportado desde \.fit[^\n]*/g, "");
  result = result.replace(/^Importado desde \.fit[^\n]*\n?/, "");
  const trimmed = result.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Deshace la última importación de .fit sobre esta sesión.
// - Si hay fit_backup (importaciones hechas después de añadir este mecanismo):
//   restaura exactamente el estado, RPE, duración, distancia y notas de antes.
// - Si no hay fit_backup pero las notas llevan la marca de una importación
//   (importaciones anteriores a este mecanismo): no se puede recuperar el
//   estado exacto de antes, así que se hace un reset razonable — vuelve a
//   "pendiente", quita RPE/duración/distancia, y limpia solo la nota de la
//   importación (conserva cualquier otro detalle escrito a mano).
// Devuelve undefined si la sesión no existe o no hay ninguna importación que deshacer.
export function undoFitImport(id: number): SessionRow | undefined {
  const current = getSessionById(id);
  if (!current) return undefined;

  const now = new Date().toISOString();

  if (current.fit_backup) {
    let backup: FitBackup;
    try {
      backup = JSON.parse(current.fit_backup) as FitBackup;
    } catch {
      return undefined;
    }
    getDb()
      .prepare(
        `UPDATE sessions SET status = ?, rpe = ?, duration_min = ?, distance_km = ?, notes = ?, fit_backup = NULL, updated_at = ?
         WHERE id = ?`
      )
      .run(backup.status, backup.rpe, backup.duration_min, backup.distance_km, backup.notes, now, id);
    return getSessionById(id);
  }

  if (!current.notes || !current.notes.includes(FIT_IMPORT_MARKER)) return undefined;

  const cleanedNotes = stripFitNotes(current.notes);
  getDb()
    .prepare(
      `UPDATE sessions SET status = 'pendiente', rpe = NULL, duration_min = NULL, distance_km = NULL, notes = ?, fit_backup = NULL, updated_at = ?
       WHERE id = ?`
    )
    .run(cleanedNotes, now, id);
  return getSessionById(id);
}

export function deleteSession(id: number): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

// Añade una nota a una sesión sin tocar su estado ni sus datos de resultado
// — se usa para dejar constancia de un ajuste automático sobre una sesión
// que todavía está pendiente (no se ha "realizado" nada, solo se explica
// por qué se ha tocado su planificación).
export function appendSessionNote(id: number, note: string): SessionRow | undefined {
  const current = getSessionById(id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  const newNotes = current.notes ? `${current.notes}\n${note}` : note;
  getDb().prepare(`UPDATE sessions SET notes = ?, updated_at = ? WHERE id = ?`).run(newNotes, now, id);
  return getSessionById(id);
}

export function updatePlannedSession(
  id: number,
  input: Partial<Pick<SessionRow, "discipline" | "planned_code" | "is_long_run" | "date" | "notes">>
): SessionRow | undefined {
  const current = getSessionById(id);
  if (!current) return undefined;
  const date = input.date ?? current.date;
  const week_start = weekStartOf(date);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE sessions SET date = ?, week_start = ?, discipline = ?, planned_code = ?, is_long_run = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      date,
      week_start,
      input.discipline ?? current.discipline,
      input.planned_code !== undefined ? input.planned_code : current.planned_code,
      input.is_long_run !== undefined ? (input.is_long_run ? 1 : 0) : current.is_long_run,
      input.notes !== undefined ? input.notes : current.notes,
      now,
      id
    );
  return getSessionById(id);
}

// Intercambia el día de dos sesiones entre sí, manteniendo todo su contenido
// (disciplina, código, notas...) intacto — solo se mueve la fecha de cada
// una a la de la otra. Útil para "cambiar el entreno de un día por el de
// otro día" sin tener que reescribir nada a mano.
export function swapSessionDates(idA: number, idB: number): { a: SessionRow; b: SessionRow } | undefined {
  if (idA === idB) return undefined;
  const a = getSessionById(idA);
  const b = getSessionById(idB);
  if (!a || !b) return undefined;

  const now = new Date().toISOString();
  const newDateForA = b.date;
  const newDateForB = a.date;
  const newWeekForA = weekStartOf(newDateForA);
  const newWeekForB = weekStartOf(newDateForB);

  const db = getDb();
  const runSwap = db.transaction(() => {
    db.prepare(`UPDATE sessions SET date = ?, week_start = ?, updated_at = ? WHERE id = ?`).run(
      newDateForA,
      newWeekForA,
      now,
      idA
    );
    db.prepare(`UPDATE sessions SET date = ?, week_start = ?, updated_at = ? WHERE id = ?`).run(
      newDateForB,
      newWeekForB,
      now,
      idB
    );
  });
  runSwap();

  return { a: getSessionById(idA)!, b: getSessionById(idB)! };
}

export function bulkCreateSessions(inputs: NewPlannedSession[]): SessionRow[] {
  if (inputs.length === 0) return [];
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`
  );

  const insertedIds: number[] = [];
  const runBulk = db.transaction(() => {
    for (const input of inputs) {
      const week_start = weekStartOf(input.date);
      const res = stmt.run(
        input.date,
        week_start,
        input.discipline,
        input.planned_code ?? null,
        input.is_long_run ? 1 : 0,
        input.notes ?? null,
        now,
        now
      );
      insertedIds.push(Number(res.lastInsertRowid));
    }
  });
  runBulk();

  return insertedIds.map((id) => getSessionById(id)!).filter(Boolean);
}
