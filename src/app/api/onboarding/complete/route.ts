import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createServerSupabase } from "@/lib/supabase/server";
import { getDb, flushDbPersistence } from "@/lib/db";
import { todayISO, weekStartOf } from "@/lib/dates";
import { generateInitialCustomWeek } from "@/lib/onboarding-plan-generator";
import { actualizarPlanSemanal } from "@/lib/coach-ai/weekly-plan-updater";
import { saveActivePaceZones, calculatePaceZonesFromVam } from "@/lib/pace-zones";
import { isSupabaseConfigured, upsertSessionToSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const userId = user?.id || body.userId || req.headers.get("x-user-id") || "default_user";
    const now = new Date().toISOString();

    const fullName = body.fullName || user?.user_metadata?.full_name || "Atleta";
    const weightKg = Number(body.weightKg) || 70;
    const restingHr = body.restingHr ? Number(body.restingHr) : null;
    const maxHr = body.maxHr ? Number(body.maxHr) : null;
    const vamSecKm = Number(body.vamSecKm) || 240;
    const vamPace = body.vamPace || "4:00";
    const targetDistance = body.targetDistance || "10K";
    const targetDate = body.targetDate || null;
    const daysPerWeek = Number(body.daysPerWeek) || 4;
    const disciplines = Array.isArray(body.disciplines) ? body.disciplines : ["carrera"];

    const db = getDb();

    // 1. Guardar o actualizar perfil en SQLite
    db.prepare(`
      INSERT INTO profiles (
        id, email, full_name, role, weight_kg, resting_hr, max_hr,
        vam_pace, vam_sec_km, target_distance, target_date, days_per_week,
        disciplines, onboarded, created_at, updated_at
      ) VALUES (?, ?, ?, 'athlete', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        weight_kg = excluded.weight_kg,
        resting_hr = excluded.resting_hr,
        max_hr = excluded.max_hr,
        vam_pace = excluded.vam_pace,
        vam_sec_km = excluded.vam_sec_km,
        target_distance = excluded.target_distance,
        target_date = excluded.target_date,
        days_per_week = excluded.days_per_week,
        disciplines = excluded.disciplines,
        onboarded = 1,
        updated_at = excluded.updated_at
    `).run(
      userId,
      user?.email || "atleta@entrenoapp.es",
      fullName,
      weightKg,
      restingHr,
      maxHr,
      vamPace,
      vamSecKm,
      targetDistance,
      targetDate,
      daysPerWeek,
      JSON.stringify(disciplines),
      now,
      now
    );

    // 2. Guardar zonas de ritmo calculadas
    const zonesConfig = calculatePaceZonesFromVam(vamSecKm, 5);
    saveActivePaceZones(zonesConfig, userId);

    // 3. Generar la primera semana de entrenamientos personalizados
    const generatedDays = generateInitialCustomWeek({
      userId,
      fullName,
      vamSecKm,
      targetDistance,
      targetDate,
      daysPerWeek,
      disciplines,
    });

    const weekStart = weekStartOf(todayISO());
    const planResult = actualizarPlanSemanal(weekStart, generatedDays, userId);

    // 4. Si Supabase está disponible, sincronizar perfil y sesiones
    const supabase = await createServerSupabase();
    if (supabase && user?.id) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        weight_kg: weightKg,
        resting_hr: restingHr,
        max_hr: maxHr,
        vam_pace: vamPace,
        vam_sec_km: vamSecKm,
        target_distance: targetDistance,
        target_date: targetDate,
        days_per_week: daysPerWeek,
        disciplines,
        onboarded: true,
        updated_at: now,
      });

      // Recuperar las sesiones creadas para subirlas a Supabase
      const createdSessions = db
        .prepare<any>("SELECT * FROM sessions WHERE user_id = ? AND week_start = ?")
        .all(userId, weekStart);

      for (const s of createdSessions) {
        await upsertSessionToSupabase(s, userId).catch(() => {});
      }
    }

    await flushDbPersistence();

    return NextResponse.json({
      success: true,
      message: "Onboarding completado y plan generado con éxito",
      planResult,
      profile: {
        id: userId,
        fullName,
        vamPace,
        targetDistance,
        targetDate,
        daysPerWeek,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/onboarding/complete:", error);
    return NextResponse.json({ error: "Error al completar el onboarding" }, { status: 500 });
  }
}
