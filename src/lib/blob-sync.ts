import { put, list } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { after } from "next/server";

export function isBlobSyncEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.VERCEL === "1"
  );
}

const BLOB_URL = "https://vdzsyfu0zs7gqj1p.private.blob.vercel-storage.com/entrenoapp/entrenoapp.db";
const BLOB_KEY = "entrenoapp/entrenoapp.db";

export async function getRemoteBlobEtag(): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !isBlobSyncEnabled()) return null;
  try {
    const res = await fetch(BLOB_URL, {
      method: "HEAD",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.headers.get("etag") || res.headers.get("last-modified") || null;
  } catch {
    return null;
  }
}

export async function downloadBlobDatabaseAsync(targetPath: string): Promise<{ ok: boolean; etag: string | null }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !isBlobSyncEnabled()) return { ok: false, etag: null };
  try {
    const res = await fetch(BLOB_URL, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, etag: null };
    const etag = res.headers.get("etag") || res.headers.get("last-modified") || null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return { ok: false, etag: null };

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${targetPath}.blob_async_tmp`;
    fs.writeFileSync(tmpPath, buf);
    for (const ext of ["-wal", "-shm"]) {
      const sidecar = `${targetPath}${ext}`;
      if (fs.existsSync(sidecar)) {
        try { fs.unlinkSync(sidecar); } catch {}
      }
    }
    fs.renameSync(tmpPath, targetPath);
    fs.writeFileSync(path.join(dir, ".blob_last_sync"), String(Date.now()));
    if (etag) {
      fs.writeFileSync(path.join(dir, ".blob_last_etag"), etag);
    }
    return { ok: true, etag };
  } catch {
    return { ok: false, etag: null };
  }
}

/**
 * Descarga síncrona de la base de datos persistente desde Vercel Blob en frío (Cold Start)
 */
export function syncDownFromBlobSync(targetPath: string): boolean {
  if (!isBlobSyncEnabled()) return false;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;

  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const stampFile = path.join(dir, ".blob_last_sync");
    // Si ya se descargó en esta misma instancia en los últimos 30 segundos, no repetir
    if (fs.existsSync(targetPath) && fs.existsSync(stampFile)) {
      const stat = fs.statSync(stampFile);
      if (Date.now() - stat.mtimeMs < 30000) return true;
    }

    const tmpDownloadPath = `${targetPath}.blob_tmp`;
    console.log(`[BlobSync] Sincronizando BD desde Vercel Blob hacia ${targetPath}...`);
    execFileSync("curl", [
      "-s",
      "-f",
      "--max-time",
      "8",
      "-H",
      `Authorization: Bearer ${token}`,
      BLOB_URL,
      "-o",
      tmpDownloadPath,
    ]);

    if (!fs.existsSync(tmpDownloadPath) || fs.statSync(tmpDownloadPath).size < 1000) {
      throw new Error("Archivo descargado desde Blob inválido o vacío");
    }

    // Limpiar archivos auxiliares de WAL antes de reemplazar
    for (const ext of ["-wal", "-shm"]) {
      const sidecar = `${targetPath}${ext}`;
      if (fs.existsSync(sidecar)) {
        try { fs.unlinkSync(sidecar); } catch {}
      }
    }

    fs.renameSync(tmpDownloadPath, targetPath);
    fs.writeFileSync(stampFile, String(Date.now()));
    console.log(`[BlobSync] BD descargada con éxito (${fs.statSync(targetPath).size} bytes)`);
    return true;
  } catch (err) {
    console.warn("[BlobSync] Aviso al sincronizar BD desde Vercel Blob:", err);
    return false;
  }
}

/**
 * Sube el snapshot a Vercel Blob con checkpoint WAL
 */
export async function syncDbToBlob(dbPath: string, rawDb?: { exec: (sql: string) => void }): Promise<void> {
  if (!isBlobSyncEnabled()) return;
  if (!fs.existsSync(dbPath)) return;

  try {
    if (rawDb) {
      try {
        rawDb.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      } catch (cpErr) {
        console.warn("[BlobSync] wal_checkpoint aviso:", cpErr);
      }
    }

    const buf = fs.readFileSync(dbPath);
    await put(BLOB_KEY, buf, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const dir = path.dirname(dbPath);
    const etag = await getRemoteBlobEtag();
    if (etag && fs.existsSync(dir)) {
      try {
        fs.writeFileSync(path.join(dir, ".blob_last_etag"), etag);
        fs.writeFileSync(path.join(dir, ".blob_last_sync"), String(Date.now()));
      } catch {}
    }
    console.log(`[BlobSync] BD guardada persistentemente en Vercel Blob (${buf.length} bytes)`);
  } catch (err) {
    console.error("[BlobSync] Error subiendo a Vercel Blob:", err);
  }
}

let syncScheduled = false;

/**
 * Programa la subida a Vercel Blob usando la API oficial after() de Next.js
 * garantizando que se ejecute en Serverless sin cortarse.
 */
export function scheduleDbSyncToBlob(dbPath: string, rawDb?: { exec: (sql: string) => void }): void {
  if (!isBlobSyncEnabled()) return;
  if (syncScheduled) return;
  syncScheduled = true;

  const doSync = async () => {
    syncScheduled = false;
    await syncDbToBlob(dbPath, rawDb);
  };

  try {
    after(doSync);
  } catch {
    setTimeout(doSync, 50);
  }
}
