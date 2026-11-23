import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createServerSupabase } from "@/lib/supabase/server";
import { getDb, flushDbPersistence } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user?.id || req.headers.get("x-user-id") || "default_user";

    const db = getDb();
    const rows = db.prepare<any>("SELECT * FROM integrations WHERE user_id = ?").all(userId);

    const integrations = rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      athleteId: r.athlete_id,
      isActive: Boolean(r.is_active),
      lastSyncAt: r.last_sync_at,
      hasToken: Boolean(r.access_token),
      tokenExpiresAt: r.token_expires_at,
    }));

    return NextResponse.json({ success: true, integrations });
  } catch (error) {
    console.error("Error en GET /api/integrations:", error);
    return NextResponse.json({ error: "Error consultando integraciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user?.id || req.headers.get("x-user-id") || "default_user";
    const body = await req.json();

    const provider = body.provider; // 'intervals' | 'strava' | 'suunto'
    if (!provider) {
      return NextResponse.json({ error: "Falta el proveedor de integración" }, { status: 400 });
    }

    const athleteId = body.athleteId || body.athlete_id || null;
    const accessToken = body.accessToken || body.api_key || body.access_token || null;
    const refreshToken = body.refreshToken || body.refresh_token || null;
    const settings = body.settings ? JSON.stringify(body.settings) : "{}";
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      INSERT INTO integrations (
        user_id, provider, athlete_id, access_token, refresh_token, settings, is_active, last_sync_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        athlete_id = COALESCE(excluded.athlete_id, athlete_id),
        access_token = COALESCE(excluded.access_token, access_token),
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        settings = excluded.settings,
        is_active = 1,
        last_sync_at = excluded.last_sync_at,
        updated_at = excluded.updated_at
    `).run(userId, provider, athleteId, accessToken, refreshToken, settings, now, now, now);

    // Si Supabase está disponible, sincronizar tabla integrations
    const supabase = await createServerSupabase();
    if (supabase && user?.id) {
      try {
        await supabase.from("integrations").upsert({
          user_id: user.id,
          provider,
          athlete_id: athleteId,
          access_token: accessToken,
          refresh_token: refreshToken,
          is_active: true,
          last_sync_at: now,
          updated_at: now,
        }, { onConflict: "user_id,provider" });
      } catch (err) {
        console.warn("[Integrations] Advertencia guardando en Supabase:", err);
      }
    }

    await flushDbPersistence();

    return NextResponse.json({
      success: true,
      message: `Integración con ${provider.toUpperCase()} guardada con éxito`,
      provider,
    });
  } catch (error) {
    console.error("Error en POST /api/integrations:", error);
    return NextResponse.json({ error: "Error al guardar integración" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user?.id || req.headers.get("x-user-id") || "default_user";
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "Falta especificar el proveedor" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM integrations WHERE user_id = ? AND provider = ?").run(userId, provider);

    const supabase = await createServerSupabase();
    if (supabase && user?.id) {
      try {
        await supabase.from("integrations").delete().eq("user_id", user.id).eq("provider", provider);
      } catch (err) {
        console.warn("[Integrations] Advertencia eliminando en Supabase:", err);
      }
    }

    await flushDbPersistence();

    return NextResponse.json({ success: true, message: `Integración con ${provider} desconectada` });
  } catch (error) {
    console.error("Error en DELETE /api/integrations:", error);
    return NextResponse.json({ error: "Error al eliminar integración" }, { status: 500 });
  }
}
