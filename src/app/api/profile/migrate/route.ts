import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const targetUserId = user?.id || body.user_id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Usuario no autenticado o falta user_id" }, { status: 401 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // 1. Migrar en SQLite local: reasignar registros con 'default_user' o null al nuevo user_id
    db.prepare(`UPDATE sessions SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);
    db.prepare(`UPDATE sleep_logs SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);
    db.prepare(`UPDATE measurements SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);
    db.prepare(`UPDATE shoes SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);
    db.prepare(`UPDATE goals SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);
    db.prepare(`UPDATE mental_logs SET user_id = ? WHERE user_id = 'default_user' OR user_id IS NULL`).run(targetUserId);

    // Asegurar que el perfil quede marcado como owner y onboarded
    db.prepare(`
      INSERT INTO profiles (
        id, email, full_name, role, weight_kg, resting_hr, vam_pace, vam_sec_km,
        target_distance, target_date, days_per_week, webhook_token, onboarded, created_at, updated_at
      ) VALUES (
        ?, ?, 'Daniel Espinosa', 'owner',
        72.5, 95, '3:59', 239, 'Maratón', '2027-04-26', 4,
        'daniel_webhook_token', 1, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        role = 'owner',
        onboarded = 1,
        full_name = 'Daniel Espinosa',
        updated_at = excluded.updated_at
    `).run(targetUserId, user?.email || "danielespinosa@entrenoapp.es", now, now);

    // 2. Si Supabase está disponible, ejecutar función de migración o actualizar registros
    const adminSb = createAdminSupabase() || (await createServerSupabase());
    if (adminSb) {
      try {
        await adminSb.rpc("migrate_owner_data", { owner_user_id: targetUserId });
      } catch (err) {
        console.warn("[Migrate] Fallback a actualización directa en Supabase:", err);
        await adminSb.from("workouts").update({ user_id: targetUserId }).is("user_id", null);
        await adminSb.from("sleep_records").update({ user_id: targetUserId }).is("user_id", null);
        await adminSb.from("biometrics").update({ user_id: targetUserId }).is("user_id", null);
        await adminSb.from("shoes").update({ user_id: targetUserId }).is("user_id", null);
        await adminSb.from("profiles").upsert({
          id: targetUserId,
          email: user?.email || "danielespinosa@entrenoapp.es",
          full_name: "Daniel Espinosa",
          role: "owner",
          vam_pace: "3:59",
          vam_sec_km: 239,
          target_distance: "Maratón",
          target_date: "2027-04-26",
          onboarded: true,
          updated_at: now,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Datos históricos de Daniel Espinosa vinculados con éxito a " + targetUserId,
      userId: targetUserId,
    });
  } catch (error) {
    console.error("Error en POST /api/profile/migrate:", error);
    return NextResponse.json({ error: "Error al migrar datos de usuario" }, { status: 500 });
  }
}
