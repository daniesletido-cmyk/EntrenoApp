#!/usr/bin/env node
/**
 * Sincronizador Automático de Dispositivos (Amazfit Helio Strap / ZeppBridge + carpeta de .fit Suunto)
 * - Lee C:\Users\danie\AppData\Local\ZeppBridge\data\zepp.db
 * - Actualiza data/entrenoapp.db y seed/entrenoapp.db (con checkpoint WAL limpio)
 * - Empuja los registros nuevos/actualizados a https://entrenoapp-blond.vercel.app/api/sleep
 * - Detecta archivos .fit/.gpx/.json nuevos en D:\Users\Dani\Downloads y los importa automáticamente a la nube
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const CLOUD_URL = (process.env.ENTRENO_CLOUD_URL || "https://entrenoapp-blond.vercel.app").replace(/\/$/, "");
const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DOWNLOADS_DIR = "D:\\Users\\Dani\\Downloads";
const ARCHIVE_DIR = path.join(DOWNLOADS_DIR, "EntrenoApp_Importados");

function getZeppDbPath() {
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Local") : "");
  if (!localAppData) return null;
  const p = path.join(localAppData, "ZeppBridge", "data", "zepp.db");
  return fs.existsSync(p) ? p : null;
}

function toMadridDate(isoUtcString) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtcString));
}

function toMadridTime(isoUtcString) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtcString));
}

function getLocalHour(isoUtcString) {
  return parseInt(
    new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false,
    }).format(new Date(isoUtcString)),
    10
  );
}

function scoreToQuality(score) {
  if (!score) return 3;
  if (score >= 85) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 45) return 2;
  return 1;
}

function extractZeppSleep(daysLookback = 14) {
  const zeppDbPath = getZeppDbPath();
  if (!zeppDbPath) {
    console.log("[ZeppSync] zepp.db no encontrada.");
    return [];
  }

  const tempPath = path.join(REPO_ROOT, "data", ".zepp_auto_tmp.db");
  fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  fs.copyFileSync(zeppDbPath, tempPath);

  const cutoffDate = new Date(Date.now() - daysLookback * 86400 * 1000).toISOString().slice(0, 10);
  let zeppDb = null;

  try {
    zeppDb = new DatabaseSync(tempPath, { readOnly: true });
    const allSessions = zeppDb
      .prepare("SELECT id, sleep_id, start_time, end_time, score, duration_minutes, deep_minutes, light_minutes, rem_minutes, awake_minutes FROM sleep_sessions ORDER BY start_time ASC")
      .all();
    const allMetrics = zeppDb.prepare("SELECT date, metric, value FROM daily_metrics").all();
    zeppDb.close();
    zeppDb = null;
    try { fs.unlinkSync(tempPath); } catch {}

    const metricsByDate = {};
    for (const m of allMetrics) {
      const d = String(m.date);
      if (!metricsByDate[d]) metricsByDate[d] = {};
      metricsByDate[d][String(m.metric)] = Number(m.value);
    }

    const groups = new Map();
    for (const s of allSessions) {
      if (!s.end_time) continue;
      const targetDate = toMadridDate(s.end_time);
      if (targetDate < cutoffDate) continue;

      const startHour = getLocalHour(s.start_time);
      const durMin = s.duration_minutes ?? ((s.deep_minutes ?? 0) + (s.light_minutes ?? 0) + (s.rem_minutes ?? 0));
      const isNap = startHour >= 11 && startHour <= 19 && durMin <= 210;

      let g = groups.get(targetDate);
      if (!g) {
        g = { date: targetDate, night: null, naps: [] };
        groups.set(targetDate, g);
      }
      if (isNap) {
        g.naps.push({ ...s, durMin });
      } else if (!g.night || durMin > (g.night.duration_minutes ?? 0)) {
        if (g.night) g.naps.push({ ...g.night, durMin: g.night.duration_minutes ?? 0 });
        g.night = s;
      } else {
        g.naps.push({ ...s, durMin });
      }
    }

    const processed = [];
    for (const [date, g] of groups.entries()) {
      const night = g.night;
      const nightMin = night ? (night.duration_minutes ?? ((night.deep_minutes ?? 0) + (night.light_minutes ?? 0) + (night.rem_minutes ?? 0))) : 0;
      const hours = night ? Number((nightMin / 60).toFixed(2)) : null;
      const score = night?.score ?? null;
      const quality = scoreToQuality(score);
      const awake_min = night?.awake_minutes ?? 0;
      const efficiency =
        nightMin > 0 && awake_min !== null
          ? Math.min(100, Math.max(50, Math.round(((nightMin - (awake_min || 0)) / nightMin) * 100)))
          : score
          ? Math.min(100, Math.max(75, Math.round(score * 0.98)))
          : null;

      const totalNapMin = g.naps.reduce((sum, n) => sum + (n.durMin ?? 0), 0);
      const dayMetrics = metricsByDate[date] || {};
      const hrv_rmssd = dayMetrics.sleep_hrv ?? dayMetrics.hrv_baseline ?? null;
      const resting_hr = dayMetrics.sleep_rhr ?? dayMetrics.resting_hr ?? dayMetrics.rhr_baseline ?? null;
      const respiratory_rate = dayMetrics.respiratory_rate ?? null;

      const notesArr = [];
      if (resting_hr) notesArr.push(`RHR: ${Math.round(resting_hr)} lpm`);
      if (hrv_rmssd) notesArr.push(`HRV: ${Math.round(hrv_rmssd)} ms`);
      if (dayMetrics.readiness) notesArr.push(`Readiness: ${Math.round(dayMetrics.readiness)}`);

      processed.push({
        date,
        hours,
        quality,
        score,
        deep_min: night?.deep_minutes ?? null,
        light_min: night?.light_minutes ?? null,
        rem_min: night?.rem_minutes ?? null,
        awake_min,
        nap_min: totalNapMin > 0 ? totalNapMin : null,
        nap_count: g.naps.length,
        nap_notes: totalNapMin > 0 ? `Siesta de ${totalNapMin} min` : null,
        hrv_rmssd,
        resting_hr,
        respiratory_rate,
        efficiency,
        sleep_start: night?.start_time ? toMadridTime(night.start_time) : null,
        sleep_end: night?.end_time ? toMadridTime(night.end_time) : null,
        notes: notesArr.length > 0 ? notesArr.join(" | ") : null,
        source: "zepp",
      });
    }

    return processed;
  } catch (err) {
    if (zeppDb) {
      try { zeppDb.close(); } catch {}
    }
    try { fs.unlinkSync(tempPath); } catch {}
    throw err;
  }
}

function syncSleepToLocalDbs(logs) {
  if (!logs.length) return;
  for (const relPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
    const dbPath = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(dbPath)) continue;
    const db = new DatabaseSync(dbPath);
    const stmt = db.prepare(`
      INSERT INTO sleep_logs (
        date, hours, quality, notes, score, deep_min, light_min, rem_min, awake_min, source, nap_min, nap_count, nap_notes,
        hrv_rmssd, resting_hr, respiratory_rate, efficiency, sleep_start, sleep_end, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
      ON CONFLICT(date) DO UPDATE SET
        hours = excluded.hours,
        quality = excluded.quality,
        notes = COALESCE(excluded.notes, sleep_logs.notes),
        score = excluded.score,
        deep_min = excluded.deep_min,
        light_min = excluded.light_min,
        rem_min = excluded.rem_min,
        awake_min = excluded.awake_min,
        source = excluded.source,
        nap_min = excluded.nap_min,
        nap_count = excluded.nap_count,
        nap_notes = excluded.nap_notes,
        hrv_rmssd = COALESCE(excluded.hrv_rmssd, sleep_logs.hrv_rmssd),
        resting_hr = COALESCE(excluded.resting_hr, sleep_logs.resting_hr),
        respiratory_rate = COALESCE(excluded.respiratory_rate, sleep_logs.respiratory_rate),
        efficiency = COALESCE(excluded.efficiency, sleep_logs.efficiency),
        sleep_start = COALESCE(excluded.sleep_start, sleep_logs.sleep_start),
        sleep_end = COALESCE(excluded.sleep_end, sleep_logs.sleep_end),
        updated_at = datetime('now')
    `);
    for (const r of logs) {
      stmt.run(
        r.date, r.hours, r.quality, r.notes, r.score, r.deep_min, r.light_min, r.rem_min, r.awake_min, r.source,
        r.nap_min, r.nap_count, r.nap_notes, r.hrv_rmssd, r.resting_hr, r.respiratory_rate, r.efficiency, r.sleep_start, r.sleep_end
      );
    }
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      db.exec("PRAGMA journal_mode = DELETE;");
    } catch {}
    db.close();
  }
}

async function pushSleepToCloud(logs) {
  if (!logs.length) return;
  const dates = logs.map((l) => l.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];

  // Comprobar si ya son idénticos en la nube para evitar escrituras innecesarias
  try {
    const existingRes = await fetch(`${CLOUD_URL}/api/sleep?from=${from}&to=${to}`);
    if (existingRes.ok) {
      const { logs: cloudLogs = [] } = await existingRes.json();
      const cloudMap = new Map(cloudLogs.map((l) => [l.date, l]));
      const changed = logs.filter((l) => {
        const c = cloudMap.get(l.date);
        if (!c) return true;
        return Number(c.hours || 0) !== Number(l.hours || 0) || Number(c.score || 0) !== Number(l.score || 0) || Number(c.hrv_rmssd || 0) !== Number(l.hrv_rmssd || 0);
      });
      if (changed.length === 0) {
        console.log(`[CloudSleep] Todos los registros (${from}..${to}) ya están al día en la nube.`);
        return;
      }
      console.log(`[CloudSleep] Sincronizando ${changed.length} día(s) actualizado(s): ${changed.map((c) => c.date).join(", ")}`);
      const res = await fetch(`${CLOUD_URL}/api/sleep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: changed }),
      });
      console.log(`[CloudSleep] Respuesta nube (${res.status}):`, await res.text());
      return;
    }
  } catch (err) {
    console.warn("[CloudSleep] Error consultando nube:", err.message);
  }

  const res = await fetch(`${CLOUD_URL}/api/sleep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs }),
  });
  console.log(`[CloudSleep] Subida lote completo (${res.status})`);
}

async function processDownloadsFitFiles() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return;
  const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  const fitFiles = entries.filter(
    (e) => e.isFile() && /\.(fit|gpx)$/i.test(e.name)
  );

  if (fitFiles.length === 0) return;
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  for (const entry of fitFiles) {
    const fullPath = path.join(DOWNLOADS_DIR, entry.name);
    try {
      const buf = fs.readFileSync(fullPath);
      const form = new FormData();
      form.append("file", new Blob([buf]), entry.name);

      console.log(`[AutoFIT] Procesando ${entry.name}...`);
      const parseRes = await fetch(`${CLOUD_URL}/api/sessions/import-fit`, {
        method: "POST",
        body: form,
      });
      if (!parseRes.ok) {
        console.warn(`[AutoFIT] Error parseando ${entry.name}:`, await parseRes.text());
        continue;
      }
      const parsed = await parseRes.json();
      const { summary, matchedSessionId } = parsed;

      const avgHr = summary.avgHeartRate ?? null;
      const estimatedRpe = avgHr ? (avgHr > 170 ? 9 : avgHr > 150 ? 8 : avgHr > 130 ? 7 : 6) : 7;

      const payload = {
        status: "realizada",
        duration_min: summary.durationMin ? Math.round(summary.durationMin) : null,
        distance_km: summary.distanceKm ?? null,
        rpe: estimatedRpe,
        fitImport: true,
        fit_data: JSON.stringify(summary),
        user_notes: `Auto-importado (${entry.name}): ${summary.durationMin ?? "?"} min${summary.distanceKm ? `, ${summary.distanceKm} km` : ""}${avgHr ? `, FC media ${avgHr} ppm` : ""}.`,
      };

      let saved = false;
      if (matchedSessionId) {
        const patchRes = await fetch(`${CLOUD_URL}/api/sessions/${matchedSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        saved = patchRes.ok;
        console.log(`[AutoFIT] Sesión #${matchedSessionId} (${summary.date}) actualizada:`, saved);
      } else {
        const postRes = await fetch(`${CLOUD_URL}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: summary.date,
            discipline: summary.sport || "otro",
            planned_code: summary.activityName || "Entrenamiento Auto-importado",
            is_extra: true,
            ...payload,
          }),
        });
        saved = postRes.ok;
        console.log(`[AutoFIT] Nueva sesión creada para ${summary.date}:`, saved);
      }

      if (saved) {
        fs.renameSync(fullPath, path.join(ARCHIVE_DIR, entry.name));
        console.log(`[AutoFIT] Archivado en ${ARCHIVE_DIR}`);
      }
    } catch (err) {
      console.error(`[AutoFIT] Error procesando ${entry.name}:`, err.message);
    }
  }
}

async function triggerCloudIntervalsSync() {
  try {
    const res = await fetch(`${CLOUD_URL}/api/sync/intervals`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.importedCount > 0) {
        console.log(`[IntervalsSync] Importados ${data.importedCount} entrenos de Suunto/Intervals.`);
      }
    }
  } catch {}
}

async function runCycle() {
  console.log(`[AutoSync] Ejecutando sincronización automática (${new Date().toISOString()})...`);
  const logs = extractZeppSleep(14);
  if (logs.length > 0) {
    syncSleepToLocalDbs(logs);
    await pushSleepToCloud(logs);
  }
  await processDownloadsFitFiles();
  await triggerCloudIntervalsSync();
  console.log("[AutoSync] Ciclo completado.");
}

async function main() {
  const isWatch = process.argv.includes("--watch");
  await runCycle();
  if (isWatch) {
    console.log("[AutoSync] Modo vigilancia continuo activo (cada 5 minutos)...");
    setInterval(() => {
      runCycle().catch((err) => console.error("[AutoSync] Error en ciclo:", err.message));
    }, 5 * 60 * 1000);
  }
}

main().catch((err) => {
  console.error("[AutoSync] Error fatal:", err);
  if (!process.argv.includes("--watch")) process.exit(1);
});
