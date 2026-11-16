import { getDb, flushDbPersistence } from "@/lib/db";
import { weekStartOf, addDays } from "@/lib/dates";
import { Discipline, SessionRow } from "@/lib/repo/sessions";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export interface WeeklyPlanDayInput {
  date: string; // YYYY-MM-DD
  discipline: Discipline;
  plannedCode?: string | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  notes?: string | null;
  isLongRun?: boolean;
}

export interface WeeklyPlanUpdateResult {
  success: boolean;
  message: string;
  updatedCount: number;
  days: Array<{
    date: string;
    discipline: string;
    plannedCode: string | null;
    status: string;
    preserved: boolean;
  }>;
}

function syncToSeedDb(query: string, ...params: any[]) {
  try {
    const seedPath = path.resolve(process.cwd(), "seed/entrenoapp.db");
    if (fs.existsSync(seedPath)) {
      const seedDb = new DatabaseSync(seedPath);
      seedDb.prepare(query).run(...params);
    }
  } catch (err) {
    console.warn("[DualSync] Advertencia sincronizando en seed.db:", err);
  }
}

/**
 * Función ejecutiva para actualizar y persistir el plan semanal completo
 * en la base de datos real (data/entrenoapp.db y seed/entrenoapp.db).
 * 
 * Reglas estrictas:
 * 1. NUNCA borra ni sobrescribe sesiones ya completadas ('realizada' o con .fit).
 * 2. Respeta las partes principales de carrera íntegras sin restar calentamientos.
 * 3. Ejecuta sincronización dual y flushDbPersistence() para Vercel.
 */
export function actualizarPlanSemanal(
  weekStart: string,
  days: WeeklyPlanDayInput[]
): WeeklyPlanUpdateResult {
  const db = getDb();
  const now = new Date().toISOString();
  let updatedCount = 0;
  const daysResult: WeeklyPlanUpdateResult["days"] = [];

  for (const day of days) {
    if (!day.date) continue;
    const sessionDate = day.date;
    const currentWeekStart = weekStartOf(sessionDate);

    // Buscar sesión existente para esa fecha
    const existing = db
      .prepare<SessionRow>("SELECT * FROM sessions WHERE date = ? ORDER BY id ASC LIMIT 1")
      .get(sessionDate);

    const isLongRun = day.isLongRun ? 1 : (day.discipline === "carrera" && (day.distanceKm ?? 0) >= 16 ? 1 : 0);

    if (existing) {
      // Si la sesión ya fue completada por el usuario o tiene .fit importado, PRESERVAR sus datos de ejecución
      const isCompleted = existing.status === "realizada" || (existing.status as string) === "completado" || existing.fit_data !== null;

      if (isCompleted) {
        daysResult.push({
          date: sessionDate,
          discipline: existing.discipline,
          plannedCode: existing.planned_code,
          status: existing.status,
          preserved: true,
        });
        continue;
      }

      // Si está pendiente, actualizar con la nueva planificación estructurada
      const updateSql = `
        UPDATE sessions SET
          discipline = ?,
          planned_code = ?,
          duration_min = ?,
          distance_km = ?,
          notes = ?,
          is_long_run = ?,
          updated_at = ?
        WHERE id = ?
      `;

      db.prepare(updateSql).run(
        day.discipline,
        day.plannedCode ?? existing.planned_code,
        day.durationMin !== undefined ? day.durationMin : existing.duration_min,
        day.distanceKm !== undefined ? day.distanceKm : existing.distance_km,
        day.notes !== undefined ? day.notes : existing.notes,
        isLongRun,
        now,
        existing.id
      );

      syncToSeedDb(
        updateSql,
        day.discipline,
        day.plannedCode ?? existing.planned_code,
        day.durationMin !== undefined ? day.durationMin : existing.duration_min,
        day.distanceKm !== undefined ? day.distanceKm : existing.distance_km,
        day.notes !== undefined ? day.notes : existing.notes,
        isLongRun,
        now,
        existing.id
      );

      updatedCount++;
      daysResult.push({
        date: sessionDate,
        discipline: day.discipline,
        plannedCode: day.plannedCode ?? existing.planned_code,
        status: "pendiente",
        preserved: false,
      });
    } else {
      // Crear nueva sesión planificada para ese día
      const insertSql = `
        INSERT INTO sessions (
          date, week_start, discipline, planned_code, is_long_run,
          is_extra, notes, status, duration_min, distance_km, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, 'pendiente', ?, ?, ?, ?)
      `;

      db.prepare(insertSql).run(
        sessionDate,
        currentWeekStart,
        day.discipline,
        day.plannedCode ?? null,
        isLongRun,
        day.notes ?? null,
        day.durationMin ?? null,
        day.distanceKm ?? null,
        now,
        now
      );

      syncToSeedDb(
        insertSql,
        sessionDate,
        currentWeekStart,
        day.discipline,
        day.plannedCode ?? null,
        isLongRun,
        day.notes ?? null,
        day.durationMin ?? null,
        day.distanceKm ?? null,
        now,
        now
      );

      updatedCount++;
      daysResult.push({
        date: sessionDate,
        discipline: day.discipline,
        plannedCode: day.plannedCode ?? null,
        status: "pendiente",
        preserved: false,
      });
    }
  }

  // Persistir en disco y blob
  flushDbPersistence().catch((e) => console.warn("[FlushPersistence] Error:", e));

  return {
    success: true,
    message: "Plan semanal actualizado y guardado en tu calendario",
    updatedCount,
    days: daysResult,
  };
}
