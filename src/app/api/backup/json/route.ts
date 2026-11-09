import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase";
import type { SessionRow } from "@/lib/repo/sessions";
import type { SleepRow } from "@/lib/repo/sleep";

export async function GET() {
  try {
    const db = getDb();
    const sessions = db.prepare<SessionRow>("SELECT * FROM sessions ORDER BY date ASC, id ASC").all();
    const sleepLogs = db.prepare<SleepRow>("SELECT * FROM sleep_logs ORDER BY date ASC, id ASC").all();

    return NextResponse.json({
      version: 1,
      exported_at: new Date().toISOString(),
      app: "EntrenoApp",
      author: "Daniel Espinosa",
      sessions_count: sessions.length,
      sleep_count: sleepLogs.length,
      sessions,
      sleep_records: sleepLogs,
    });
  } catch (error) {
    console.error("[Backup JSON GET] Error:", error);
    return NextResponse.json({ error: "No se pudo generar el volcado JSON" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessions: SessionRow[] = Array.isArray(body.sessions) ? body.sessions : [];
    const sleepRecords: SleepRow[] = Array.isArray(body.sleep_records) ? body.sleep_records : [];

    if (sessions.length === 0 && sleepRecords.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron sesiones ni registros de sueño" }, { status: 400 });
    }

    const db = getDb();

    // 1. Inserción atómica en SQLite
    const restoreTx = db.transaction(() => {
      let sessionsInserted = 0;
      let sleepInserted = 0;

      if (sessions.length > 0) {
        const stmtSession = db.prepare(`
          INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, is_extra, status, rpe, duration_min, distance_km, notes, user_notes, fit_backup, fit_data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            rpe = excluded.rpe,
            duration_min = excluded.duration_min,
            distance_km = excluded.distance_km,
            notes = excluded.notes,
            user_notes = excluded.user_notes,
            fit_data = excluded.fit_data,
            updated_at = excluded.updated_at
        `);

        for (const s of sessions) {
          if (!s.date || !s.discipline) continue;
          stmtSession.run(
            s.date,
            s.week_start || s.date,
            s.discipline,
            s.planned_code ?? null,
            s.is_long_run ? 1 : 0,
            s.is_extra ? 1 : 0,
            s.status || "pendiente",
            s.rpe ?? null,
            s.duration_min ?? null,
            s.distance_km ?? null,
            s.notes ?? null,
            s.user_notes ?? null,
            s.fit_backup ?? null,
            s.fit_data ?? null,
            s.created_at || new Date().toISOString(),
            new Date().toISOString()
          );
          sessionsInserted++;
        }
      }

      if (sleepRecords.length > 0) {
        const stmtSleep = db.prepare(`
          INSERT INTO sleep_logs (date, hours, quality, notes, score, deep_min, light_min, rem_min, awake_min, source, nap_min, nap_count, nap_notes, hrv_rmssd, resting_hr, respiratory_rate, efficiency, sleep_start, sleep_end, latency_min, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            hours = excluded.hours,
            quality = excluded.quality,
            score = excluded.score,
            deep_min = excluded.deep_min,
            light_min = excluded.light_min,
            rem_min = excluded.rem_min,
            awake_min = excluded.awake_min,
            resting_hr = excluded.resting_hr,
            hrv_rmssd = excluded.hrv_rmssd,
            notes = excluded.notes,
            updated_at = excluded.updated_at
        `);

        for (const sl of sleepRecords) {
          if (!sl.date) continue;
          stmtSleep.run(
            sl.date,
            sl.hours ?? null,
            sl.quality ?? null,
            sl.notes ?? null,
            sl.score ?? null,
            sl.deep_min ?? null,
            sl.light_min ?? null,
            sl.rem_min ?? null,
            sl.awake_min ?? null,
            sl.source ?? "json_restore",
            sl.nap_min ?? null,
            sl.nap_count ?? 0,
            sl.nap_notes ?? null,
            sl.hrv_rmssd ?? null,
            sl.resting_hr ?? null,
            sl.respiratory_rate ?? null,
            sl.efficiency ?? null,
            sl.sleep_start ?? null,
            sl.sleep_end ?? null,
            sl.latency_min ?? null,
            sl.created_at || new Date().toISOString(),
            new Date().toISOString()
          );
          sleepInserted++;
        }
      }

      return { sessionsInserted, sleepInserted };
    });

    const result = restoreTx();

    // 2. Si Supabase está configurado, replicar inmediatamente
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      if (sb) {
        if (sessions.length > 0) {
          const formattedSessions = sessions.map((s) => ({
            client_id: s.id,
            date: s.date,
            week_start: s.week_start || s.date,
            discipline: s.discipline,
            planned_code: s.planned_code,
            is_long_run: Boolean(s.is_long_run),
            is_extra: Boolean(s.is_extra),
            status: s.status,
            rpe: s.rpe,
            duration_min: s.duration_min,
            distance_km: s.distance_km,
            notes: s.notes,
            user_notes: s.user_notes,
            fit_backup: s.fit_backup,
            updated_at: new Date().toISOString(),
          }));
          try {
            await sb.from("workouts").upsert(formattedSessions, { onConflict: "date,discipline" });
          } catch {}
        }

        if (sleepRecords.length > 0) {
          const formattedSleep = sleepRecords.map((sl) => ({
            date: sl.date,
            hours: sl.hours,
            quality: sl.quality,
            score: sl.score,
            deep_min: sl.deep_min,
            light_min: sl.light_min,
            rem_min: sl.rem_min,
            awake_min: sl.awake_min,
            source: sl.source,
            resting_hr: sl.resting_hr,
            hrv_rmssd: sl.hrv_rmssd,
            notes: sl.notes,
            updated_at: new Date().toISOString(),
          }));
          try {
            await sb.from("sleep_records").upsert(formattedSleep, { onConflict: "date" });
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      restored: result,
      message: `Restauradas ${result.sessionsInserted} sesiones y ${result.sleepInserted} noches de sueño con éxito.`,
    });
  } catch (error) {
    console.error("[Backup JSON POST] Error:", error);
    return NextResponse.json({ error: "Error al procesar la restauración del JSON" }, { status: 500 });
  }
}
