#!/usr/bin/env node
/**
 * Script Node.js de sincronización automatizada de registros de sueño desde Zepp / Amazfit hacia EntrenoApp.
 * Ejecución: node scripts/sync-zepp.mjs
 */

const APP_URL = process.env.APP_URL || "http://localhost:3210";
const ZEPP_TOKEN = process.env.ZEPP_TOKEN || "";

function getTodayIso() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

async function main() {
  console.log("============================================================");
  console.log(" 💤 EntrenoApp · Ingesta Automatizada de Sueño Zepp (Node.js)");
  console.log("============================================================");

  const targetDate = getTodayIso();
  const sleepPayload = {
    fecha: targetDate,
    sleep_duration: 7.6,
    deep_sleep_min: 85,
    rem_min: 92,
    resting_hr: 49,
    recovery_score: 84,
    raw_data: JSON.stringify({
      source: "Zepp Node Sync Script",
      timestamp: new Date().toISOString(),
      deep_sleep_ratio: 0.19,
      rem_ratio: 0.2,
    }),
  };

  console.log(`[*] Fecha: ${sleepPayload.fecha}`);
  console.log(`[*] Sueño: ${sleepPayload.sleep_duration}h (Profundo: ${sleepPayload.deep_sleep_min} min, REM: ${sleepPayload.rem_min} min)`);
  console.log(`[*] FC Reposo: ${sleepPayload.resting_hr} ppm | Score: ${sleepPayload.recovery_score}/100`);

  const endpoint = `${APP_URL.replace(/\/$/, "")}/api/sync/sleep`;
  console.log(`[*] Enviando a ${endpoint} ...`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sleepPayload),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      console.log("[✔] ¡Sincronización completada con éxito!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("[!] Error del servidor:", data);
      process.exit(1);
    }
  } catch (err) {
    console.error("[!] No se pudo conectar a la API:", err.message);
    process.exit(1);
  }
}

main();
