import { getDb } from "@/lib/db";
import { weekStartOf } from "@/lib/dates";

export interface TrainingPlanRow {
  id: number;
  semana: string; // YYYY-MM-DD
  sesiones_planificadas: string; // JSON serializado
  adaptaciones_ia: string | null; // JSON serializado o texto explicativo
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanInput {
  semana: string;
  sesiones_planificadas: string | object;
  adaptaciones_ia?: string | object | null;
}

export function upsertTrainingPlan(input: TrainingPlanInput): TrainingPlanRow {
  const db = getDb();
  const now = new Date().toISOString();
  const semanaNormalized = weekStartOf(input.semana.includes("T") ? input.semana.split("T")[0] : input.semana);

  const planStr = typeof input.sesiones_planificadas === "string"
    ? input.sesiones_planificadas
    : JSON.stringify(input.sesiones_planificadas);

  const adaptStr = input.adaptaciones_ia == null
    ? null
    : typeof input.adaptaciones_ia === "string"
    ? input.adaptaciones_ia
    : JSON.stringify(input.adaptaciones_ia);

  const existing = db.prepare<TrainingPlanRow>("SELECT * FROM training_plan WHERE semana = ?").get(semanaNormalized);

  let planId: number;
  if (existing) {
    db.prepare(`
      UPDATE training_plan
      SET sesiones_planificadas = ?,
          adaptaciones_ia = COALESCE(?, adaptaciones_ia),
          updated_at = ?
      WHERE id = ?
    `).run(planStr, adaptStr, now, existing.id);
    planId = existing.id;
  } else {
    const res = db.prepare(`
      INSERT INTO training_plan (semana, sesiones_planificadas, adaptaciones_ia, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(semanaNormalized, planStr, adaptStr, now, now);
    planId = Number(res.lastInsertRowid);
  }

  return db.prepare<TrainingPlanRow>("SELECT * FROM training_plan WHERE id = ?").get(planId)!;
}

export function getTrainingPlanForWeek(weekDate: string): TrainingPlanRow | undefined {
  const db = getDb();
  const semanaNormalized = weekStartOf(weekDate.includes("T") ? weekDate.split("T")[0] : weekDate);
  return db.prepare<TrainingPlanRow>("SELECT * FROM training_plan WHERE semana = ?").get(semanaNormalized);
}

export function updateTrainingPlanAdaptations(weekDate: string, adaptaciones: string | object): TrainingPlanRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const semanaNormalized = weekStartOf(weekDate.includes("T") ? weekDate.split("T")[0] : weekDate);

  const adaptStr = typeof adaptaciones === "string" ? adaptaciones : JSON.stringify(adaptaciones);

  const existing = db.prepare<TrainingPlanRow>("SELECT * FROM training_plan WHERE semana = ?").get(semanaNormalized);
  if (!existing) {
    // Si no existía, crear uno inicial
    return upsertTrainingPlan({
      semana: semanaNormalized,
      sesiones_planificadas: "[]",
      adaptaciones_ia: adaptStr,
    });
  }

  db.prepare(`
    UPDATE training_plan
    SET adaptaciones_ia = ?,
        updated_at = ?
    WHERE id = ?
  `).run(adaptStr, now, existing.id);

  return db.prepare<TrainingPlanRow>("SELECT * FROM training_plan WHERE id = ?").get(existing.id);
}

export function listRecentTrainingPlans(limit = 10): TrainingPlanRow[] {
  const db = getDb();
  return db.prepare<TrainingPlanRow>("SELECT * FROM training_plan ORDER BY semana DESC LIMIT ?").all(limit);
}
