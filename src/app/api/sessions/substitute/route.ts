import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { updateSession, getSessionById, listSessionsForWeek } from "@/lib/repo/sessions";
import { sendWorkoutUpdatedPush } from "@/lib/push-notifications";
import { todayISO, weekStartOf } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date || todayISO();
    const sessionId = body.sessionId ? Number(body.sessionId) : null;
    const mode = body.mode || "caminata"; // 'caminata' | 'descanso' | 'restaurar'
    const durationMin = body.durationMin ? Number(body.durationMin) : null;
    const distanceKm = body.distanceKm ? Number(body.distanceKm) : null;
    const isCompleted = body.completed === true;

    const db = getDb();

    // Localizar sesión objetivo
    let session = sessionId ? getSessionById(sessionId) : null;
    if (!session) {
      session = db
        .prepare<any>(
          "SELECT id, date, discipline, planned_code, duration_min, distance_km, notes, status, fit_data FROM sessions WHERE date = ? ORDER BY id ASC LIMIT 1"
        )
        .get(date);
    }

    if (!session) {
      return NextResponse.json({ ok: false, error: `No se encontró ninguna sesión para la fecha ${date}` }, { status: 404 });
    }

    let updatedSession = null;
    let pushActivityName = "Caminata";
    let finalDuration = durationMin;
    let finalDistance = distanceKm;

    if (mode === "caminata") {
      finalDuration = durationMin || 40;
      finalDistance = distanceKm || 3.5;
      pushActivityName = "Caminata";

      const walkingNotes = `CAMINATA REGENERATIVA (Modo Enfermedad / Recuperación Activa · RPE 2-3):
- Justificación médica: Sustitución adaptativa para proteger el organismo y no forzar el sistema cardiovascular durante la recuperación.
- Pauta: Paseo continuo suave de ${finalDuration} min (~${finalDistance} km) en terreno completamente llano. Respiración nasal tranquila.
- Hidratación y Descanso: Agua constante con sales si se desea, comida ligera y siesta reparadora.`;

      updatedSession = updateSession(session.id, {
        discipline: "caminata",
        planned_code: "Entreno modificado · Caminata",
        duration_min: finalDuration,
        distance_km: finalDistance,
        rpe: 3,
        status: isCompleted ? "realizada" : session.status === "realizada" ? "realizada" : "pendiente",
        notes: walkingNotes,
      });
    } else if (mode === "descanso") {
      finalDuration = 0;
      finalDistance = null;
      pushActivityName = "Descanso";

      const restNotes = `DESCANSO TOTAL POR ENFERMEDAD / RECUPERACIÓN:
- Prioridad absoluta: El cuerpo necesita toda la energía disponible para el sistema inmunitario y la regeneración celular.
- Pauta: 0 km y 0 impacto articular. Dormir sin despertador, hidratación abundante y alimentación limpia.`;

      updatedSession = updateSession(session.id, {
        discipline: "descanso",
        planned_code: "Entreno modificado · Descanso por Enfermedad",
        duration_min: 0,
        distance_km: null,
        rpe: 1,
        status: "realizada",
        notes: restNotes,
      });
    } else if (mode === "restaurar") {
      // Restaurar desde seed o plan anual
      const seedDb = new (require("node:sqlite").DatabaseSync)("seed/entrenoapp.db");
      const seedSession = seedDb.prepare("SELECT discipline, planned_code, duration_min, distance_km, notes, is_long_run FROM sessions WHERE id = ?").get(session.id);

      if (seedSession) {
        updatedSession = updateSession(session.id, {
          discipline: seedSession.discipline,
          planned_code: seedSession.planned_code,
          duration_min: seedSession.duration_min,
          distance_km: seedSession.distance_km,
          notes: seedSession.notes,
          is_long_run: seedSession.is_long_run,
          status: "pendiente",
        });
        pushActivityName = seedSession.discipline;
        finalDuration = seedSession.duration_min;
        finalDistance = seedSession.distance_km;
      }
    }

    if (!updatedSession) {
      return NextResponse.json({ ok: false, error: "No se pudo actualizar la sesión" }, { status: 500 });
    }

    // Disparar Notificación Push automática del cambio
    try {
      await sendWorkoutUpdatedPush({
        date: session.date,
        newActivity: pushActivityName,
        durationMin: finalDuration,
        distanceKm: finalDistance,
        changeId: `manual-substitute-${mode}-${Date.now()}`,
      });
    } catch (pushErr) {
      console.warn("[Substitute] Error enviando Web Push:", pushErr);
    }

    return NextResponse.json({
      ok: true,
      session: updatedSession,
      message: `Entreno de ${session.date} actualizado a ${pushActivityName} correctamente`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[SUBSTITUTE_POST] Error:", errorMsg);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
