import { put } from "@vercel/blob";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

async function upload() {
  const dbPath = path.resolve("data/entrenoapp.db");

  // Checkpoint WAL and consolidate single file before reading
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  db.exec("PRAGMA journal_mode = DELETE;");
  const checkSessions = db.prepare("SELECT date, discipline, status FROM sessions WHERE date >= '2026-11-06' AND date <= '2026-11-12' ORDER BY date").all();
  const checkSleep = db.prepare("SELECT date, hours, score FROM sleep_logs ORDER BY date DESC LIMIT 3").all();
  db.close();

  console.log("Verificación pre-subida (Sesiones 06-12/11):", checkSessions);
  console.log("Verificación pre-subida (Último sueño):", checkSleep);

  const buf = fs.readFileSync(dbPath);
  console.log(`Subiendo snapshot consolidado de BD (${buf.length} bytes) a Vercel Blob...`);

  const result = await put("entrenoapp/entrenoapp.db", buf, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("Snapshot subido con éxito:", result.url);
}

upload().catch(console.error);
