import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

async function upload() {
  const dbPath = path.resolve("data/entrenoapp.db");
  const buf = fs.readFileSync(dbPath);
  console.log(`Subiendo snapshot de BD (${buf.length} bytes) a Vercel Blob...`);

  const result = await put("entrenoapp/entrenoapp.db", buf, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("Snapshot subido con éxito:", result.url);
}

upload().catch(console.error);
