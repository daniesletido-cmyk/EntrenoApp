import { getDb } from "@/lib/db";

export type GoalStatus = "activo" | "cumplido" | "abandonado";
export type MetricType = "tiempo_carrera" | "peso" | "fuerza" | "distancia" | "otro";

export interface GoalRow {
  id: number;
  title: string;
  metric_type: MetricType;
  target_value: string | null;
  current_value: string | null;
  target_date: string | null;
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewGoalInput {
  title: string;
  metric_type: MetricType;
  target_value?: string | null;
  current_value?: string | null;
  target_date?: string | null;
  notes?: string | null;
}

export function listGoals(): GoalRow[] {
  return getDb().prepare<GoalRow>("SELECT * FROM goals ORDER BY (target_date IS NULL), target_date ASC, id ASC").all();
}

export function createGoal(input: NewGoalInput): GoalRow {
  const db = getDb();
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO goals (title, metric_type, target_value, current_value, target_date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'activo', ?, ?, ?)`
    )
    .run(
      input.title,
      input.metric_type,
      input.target_value ?? null,
      input.current_value ?? null,
      input.target_date ?? null,
      input.notes ?? null,
      now,
      now
    );
  return db.prepare<GoalRow>("SELECT * FROM goals WHERE id = ?").get(Number(res.lastInsertRowid))!;
}

export function updateGoal(
  id: number,
  input: Partial<Pick<GoalRow, "title" | "metric_type" | "target_value" | "current_value" | "target_date" | "status" | "notes">>
): GoalRow | undefined {
  const db = getDb();
  const current = db.prepare<GoalRow>("SELECT * FROM goals WHERE id = ?").get(id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE goals SET title = ?, metric_type = ?, target_value = ?, current_value = ?, target_date = ?, status = ?, notes = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.title ?? current.title,
    input.metric_type ?? current.metric_type,
    input.target_value !== undefined ? input.target_value : current.target_value,
    input.current_value !== undefined ? input.current_value : current.current_value,
    input.target_date !== undefined ? input.target_date : current.target_date,
    input.status ?? current.status,
    input.notes !== undefined ? input.notes : current.notes,
    now,
    id
  );
  return db.prepare<GoalRow>("SELECT * FROM goals WHERE id = ?").get(id);
}

export function deleteGoal(id: number): void {
  getDb().prepare("DELETE FROM goals WHERE id = ?").run(id);
}
