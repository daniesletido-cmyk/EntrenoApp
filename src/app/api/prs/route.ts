import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { EXERCISE_CATEGORIES } from "@/lib/prs-catalog";

export async function GET() {
  try {
    const db = getDb();

    // Obtener catálogo completo
    const catalog = db.prepare<{
      id: number;
      name: string;
      category: string;
      unit: string;
      is_custom: number;
    }>("SELECT * FROM exercise_catalog ORDER BY category ASC, name ASC").all();

    // Obtener todos los récords agrupados
    const allRecords = db.prepare<{
      id: number;
      exercise_name: string;
      weight_kg: number;
      reps: number;
      date: string;
      notes: string | null;
      rpe: number | null;
    }>("SELECT id, exercise_name, weight_kg, reps, date, notes, rpe FROM exercise_records ORDER BY date ASC, id ASC").all();

    // Mapear récords por ejercicio
    const recordsByExercise = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      const list = recordsByExercise.get(r.exercise_name) || [];
      list.push(r);
      recordsByExercise.set(r.exercise_name, list);
    }

    const exercises = catalog.map((ex) => {
      const logs = recordsByExercise.get(ex.name) || [];
      let pr: { max_weight: number; reps: number; date: string; notes: string | null } | null = null;
      let latest: { weight_kg: number; reps: number; date: string; notes: string | null } | null = null;

      if (logs.length > 0) {
        // Encontrar récord máximo
        let maxVal = -Infinity;
        for (const l of logs) {
          if (l.weight_kg > maxVal) {
            maxVal = l.weight_kg;
            pr = {
              max_weight: l.weight_kg,
              reps: l.reps || 1,
              date: l.date,
              notes: l.notes,
            };
          }
        }
        const lastLog = logs[logs.length - 1];
        latest = {
          weight_kg: lastLog.weight_kg,
          reps: lastLog.reps || 1,
          date: lastLog.date,
          notes: lastLog.notes,
        };
      }

      return {
        id: ex.id,
        name: ex.name,
        category: ex.category,
        unit: ex.unit || "kg",
        is_custom: ex.is_custom === 1,
        total_records: logs.length,
        pr,
        latest,
        history: logs,
      };
    });

    // Ordenar: primero los que tienen marcas registradas (ordenados por total_records DESC), luego el resto alfabético
    exercises.sort((a, b) => {
      if (a.total_records > 0 && b.total_records === 0) return -1;
      if (a.total_records === 0 && b.total_records > 0) return 1;
      if (a.total_records > 0 && b.total_records > 0) {
        return b.total_records - a.total_records;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      exercises,
      categories: EXERCISE_CATEGORIES,
    });
  } catch (error) {
    console.error("Error fetching PRS:", error);
    return NextResponse.json({ error: "Error al cargar marcas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exercise_name, category, weight_kg, reps, date, rpe, notes } = body;

    if (!exercise_name || weight_kg === undefined || weight_kg === null) {
      return NextResponse.json({ error: "Nombre y peso/marca son obligatorios" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const finalDate = date || now.slice(0, 10);
    const finalReps = Number(reps) || 1;
    const finalWeight = Number(weight_kg);
    const finalCategory = category || "Fuerza & Powerlifting";

    // Asegurar que el ejercicio existe en el catálogo
    db.prepare(`
      INSERT OR IGNORE INTO exercise_catalog (name, category, unit, is_custom, created_at)
      VALUES (?, ?, 'kg', 0, ?)
    `).run(exercise_name, finalCategory, now);

    // Insertar registro
    const result = db.prepare(`
      INSERT INTO exercise_records (exercise_name, category, weight_kg, reps, date, rpe, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exercise_name,
      finalCategory,
      finalWeight,
      finalReps,
      finalDate,
      rpe !== undefined && rpe !== null && rpe !== "" ? Number(rpe) : null,
      notes ? String(notes).trim() : null,
      now,
      now
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error("Error guardando PR:", error);
    return NextResponse.json({ error: "Error al guardar registro de marca" }, { status: 500 });
  }
}
