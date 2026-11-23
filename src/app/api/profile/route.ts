import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import type { UserProfile } from "@/types/profile";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user?.id || req.headers.get("x-user-id") || "default_user";

    // 1. Intentar obtener perfil desde Supabase si está disponible
    const supabase = await createServerSupabase();
    if (supabase && user?.id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data && !error) {
        return NextResponse.json({ profile: data, user });
      }
    }

    // 2. Fallback a base de datos SQLite local
    const db = getDb();
    let row = db.prepare<any>("SELECT * FROM profiles WHERE id = ?").get(userId);

    if (!row) {
      // Si es un usuario nuevo no registrado en SQLite, crear perfil básico
      const now = new Date().toISOString();
      const email = user?.email || "atleta@entrenoapp.es";
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0];
      const webhookToken = "token_" + Math.random().toString(36).slice(2, 12);

      db.prepare(`
        INSERT INTO profiles (
          id, email, full_name, role, weight_kg, resting_hr, vam_pace, vam_sec_km,
          target_distance, target_date, days_per_week, disciplines, webhook_token, onboarded, created_at, updated_at
        ) VALUES (?, ?, ?, 'athlete', 70, 65, '4:30', 270, '10K', null, 4, '["carrera"]', ?, 0, ?, ?)
      `).run(userId, email, name, webhookToken, now, now);

      row = db.prepare<any>("SELECT * FROM profiles WHERE id = ?").get(userId);
    }

    const disciplines = typeof row.disciplines === "string" ? JSON.parse(row.disciplines) : (row.disciplines || []);

    const profile: UserProfile = {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      role: row.role as any,
      weight_kg: row.weight_kg,
      resting_hr: row.resting_hr,
      max_hr: row.max_hr,
      vam_pace: row.vam_pace || "3:59",
      vam_sec_km: row.vam_sec_km || 239,
      target_distance: row.target_distance || "Maratón",
      target_date: row.target_date,
      target_pace: row.target_pace,
      days_per_week: row.days_per_week || 4,
      disciplines,
      webhook_token: row.webhook_token || "default_daniel_webhook_token",
      onboarded: Boolean(row.onboarded),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({ profile, user });
  } catch (error) {
    console.error("Error en GET /api/profile:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user?.id || req.headers.get("x-user-id") || "default_user";
    const body = await req.json();

    const now = new Date().toISOString();
    const db = getDb();

    // Actualizar en SQLite
    db.prepare(`
      UPDATE profiles
      SET full_name = COALESCE(?, full_name),
          weight_kg = COALESCE(?, weight_kg),
          resting_hr = COALESCE(?, resting_hr),
          max_hr = COALESCE(?, max_hr),
          vam_pace = COALESCE(?, vam_pace),
          vam_sec_km = COALESCE(?, vam_sec_km),
          target_distance = COALESCE(?, target_distance),
          target_date = COALESCE(?, target_date),
          target_pace = COALESCE(?, target_pace),
          days_per_week = COALESCE(?, days_per_week),
          disciplines = COALESCE(?, disciplines),
          onboarded = COALESCE(?, onboarded),
          updated_at = ?
      WHERE id = ?
    `).run(
      body.full_name ?? null,
      body.weight_kg ?? null,
      body.resting_hr ?? null,
      body.max_hr ?? null,
      body.vam_pace ?? null,
      body.vam_sec_km ?? null,
      body.target_distance ?? null,
      body.target_date ?? null,
      body.target_pace ?? null,
      body.days_per_week ?? null,
      body.disciplines ? JSON.stringify(body.disciplines) : null,
      body.onboarded != null ? (body.onboarded ? 1 : 0) : null,
      now,
      userId
    );

    // Actualizar en Supabase si está disponible
    const supabase = await createServerSupabase();
    if (supabase && user?.id) {
      await supabase.from("profiles").upsert({
        id: user.id,
        ...body,
        updated_at: now,
      });
    }

    const updated = db.prepare<any>("SELECT * FROM profiles WHERE id = ?").get(userId);
    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Error en PUT /api/profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
