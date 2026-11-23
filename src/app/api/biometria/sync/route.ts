import { NextRequest, NextResponse } from "next/server";
import { getDb, flushDbPersistence } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { createAdminSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || req.headers.get("x-webhook-token");

    if (!token) {
      return NextResponse.json({ error: "Falta el token de sincronización (?token=...)" }, { status: 401 });
    }

    const db = getDb();
    let profile = db.prepare<any>("SELECT * FROM profiles WHERE webhook_token = ?").get(token);

    // Si no está en SQLite, buscar en Supabase
    if (!profile) {
      const adminSb = createAdminSupabase();
      if (adminSb) {
        const { data } = await adminSb
          .from("profiles")
          .select("*")
          .eq("webhook_token", token)
          .maybeSingle();
        if (data) profile = data;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "Token de webhook no válido o no encontrado" }, { status: 403 });
    }

    const userId = profile.id;
    const body = await req.json().catch(() => ({}));
    const date = body.date || body.fecha || todayISO();
    const now = new Date().toISOString();

    // Campos de peso y composición corporal
    const weightKg = Number(body.weight_kg || body.weight || body.peso || body.peso_kg || 0) || null;
    const bodyFatPct = Number(body.body_fat_pct || body.fat || body.grasa || body.grasa_pct || 0) || null;
    const muscleMassKg = Number(body.muscle_mass_kg || body.muscle || body.musculo || 0) || null;
    const waterPct = Number(body.water_pct || body.agua || 0) || null;
    const source = body.source || body.fuente || "webhook_sync";
    const notes = body.notes || body.notas || "Sincronizado vía Webhook de Biometría";

    // Campos de sueño y recuperación (opcionales si vienen en el mismo paquete)
    const sleepHours = Number(body.sleep_hours || body.horas_sueno || body.sleep || 0) || null;
    const sleepScore = Number(body.sleep_score || body.score || body.puntuacion_sueno || 0) || null;
    const restingHr = Number(body.resting_hr || body.fc_reposo || body.hr || 0) || null;

    let updatedMetrics: string[] = [];

    // 1. Guardar medición biométrica si viene peso o composición
    if (weightKg !== null || bodyFatPct !== null) {
      db.prepare(`
        INSERT INTO measurements (
          date, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, source, notes, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          weight_kg = COALESCE(excluded.weight_kg, weight_kg),
          body_fat_pct = COALESCE(excluded.body_fat_pct, body_fat_pct),
          muscle_mass_kg = COALESCE(excluded.muscle_mass_kg, muscle_mass_kg),
          water_pct = COALESCE(excluded.water_pct, water_pct),
          source = excluded.source,
          updated_at = excluded.updated_at
      `).run(date, weightKg, bodyFatPct, muscleMassKg, waterPct, source, notes, userId, now, now);

      updatedMetrics.push(`Peso: ${weightKg}kg`);

      // Actualizar también peso en profiles
      if (weightKg !== null) {
        db.prepare(`UPDATE profiles SET weight_kg = ?, updated_at = ? WHERE id = ?`).run(weightKg, now, userId);
      }
    }

    // 2. Guardar sueño si viene reportado
    if (sleepHours !== null || restingHr !== null) {
      db.prepare(`
        INSERT INTO sleep_logs (
          date, hours, score, resting_hr, source, notes, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          hours = COALESCE(excluded.hours, hours),
          score = COALESCE(excluded.score, score),
          resting_hr = COALESCE(excluded.resting_hr, resting_hr),
          source = excluded.source,
          updated_at = excluded.updated_at
      `).run(date, sleepHours, sleepScore, restingHr, source, notes, userId, now, now);

      updatedMetrics.push(`Sueño: ${sleepHours}h`);
    }

    // 3. Sincronizar en Supabase si está activo
    const adminSb = createAdminSupabase();
    if (adminSb) {
      try {
        if (weightKg !== null || bodyFatPct !== null) {
          await adminSb.from("biometrics").upsert({
            user_id: userId,
            date,
            weight_kg: weightKg,
            body_fat_pct: bodyFatPct,
            muscle_mass_kg: muscleMassKg,
            water_pct: waterPct,
            source,
            notes,
            updated_at: now,
          }, { onConflict: "user_id,date" });
        }

        if (sleepHours !== null) {
          await adminSb.from("sleep_records").upsert({
            user_id: userId,
            date,
            hours: sleepHours,
            score: sleepScore,
            resting_hr: restingHr,
            source,
            notes,
            updated_at: now,
          }, { onConflict: "user_id,date" });
        }
      } catch (err) {
        console.warn("[Biometria Sync] Advertencia sincronizando en Supabase:", err);
      }
    }

    await flushDbPersistence();

    return NextResponse.json({
      success: true,
      message: "Biometría registrada correctamente",
      athlete: profile.full_name,
      date,
      metrics: updatedMetrics,
    });
  } catch (error) {
    console.error("Error en POST /api/biometria/sync:", error);
    return NextResponse.json({ error: "Error procesando sincronización biométrica" }, { status: 500 });
  }
}
