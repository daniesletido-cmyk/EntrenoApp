import { getDb } from "@/lib/db";
import { sendShoeWearAlertPush } from "@/lib/push-notifications";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

function syncToSeedDb(query: string, ...params: any[]) {
  try {
    const seedPath = path.resolve(process.cwd(), "seed/entrenoapp.db");
    if (fs.existsSync(seedPath)) {
      const seedDb = new DatabaseSync(seedPath);
      seedDb.prepare(query).run(...params);
    }
  } catch (err) {
    console.warn("[DualSync] Warning syncing shoe to seed.db:", err);
  }
}

export interface ShoeRow {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  initial_km: number;
  total_km: number;
  max_km: number;
  is_primary: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  wear_pct?: number;
  is_near_limit?: boolean;
  is_limit_reached?: boolean;
}

export interface CreateShoeInput {
  name: string;
  brand?: string | null;
  model?: string | null;
  initial_km?: number;
  max_km?: number;
  is_primary?: boolean | number;
  notes?: string | null;
}

export interface UpdateShoeInput {
  name?: string;
  brand?: string | null;
  model?: string | null;
  initial_km?: number;
  max_km?: number;
  is_primary?: boolean | number;
  notes?: string | null;
  is_active?: boolean | number;
}

/**
 * Recalcula los kilómetros acumulados para una zapatilla sumando los km iniciales
 * más la distancia de todas las sesiones de carrera completadas asociadas.
 */
export function calculateShoeMileage(shoe: {
  id: number;
  initial_km: number;
  max_km: number;
  is_primary: number;
}): { total_km: number; wear_pct: number; is_near_limit: boolean; is_limit_reached: boolean } {
  const db = getDb();

  // Sumar sesiones donde shoe_id coincide o, si no tiene shoe_id y esta es la principal, asignarle los km
  const row = db
    .prepare<{ km: number }>(
      `SELECT COALESCE(SUM(distance_km), 0) as km
       FROM sessions
       WHERE discipline = 'carrera'
         AND (status = 'realizada' OR fit_data IS NOT NULL)
         AND (shoe_id = ? OR (shoe_id IS NULL AND ? = 1))`
    )
    .get(shoe.id, shoe.is_primary ? 1 : 0);

  const assignedKm = row?.km ?? 0;
  const total_km = Math.round((shoe.initial_km + assignedKm) * 10) / 10;
  const max_km = shoe.max_km || 700;
  const wear_pct = Math.round((total_km / max_km) * 100);

  return {
    total_km,
    wear_pct,
    is_near_limit: wear_pct >= 75 && wear_pct < 90,
    is_limit_reached: wear_pct >= 90,
  };
}

/**
 * Lista todos los pares de zapatillas activos con sus métricas actualizadas de desgaste.
 */
export function listShoes(): ShoeRow[] {
  const db = getDb();
  const rows = db
    .prepare<ShoeRow>("SELECT * FROM shoes WHERE is_active = 1 ORDER BY is_primary DESC, id ASC")
    .all();

  return rows.map((s) => {
    const calc = calculateShoeMileage(s);
    // Sincronizar total_km en tabla si difiere
    if (Math.abs(s.total_km - calc.total_km) > 0.05) {
      try {
        db.prepare("UPDATE shoes SET total_km = ? WHERE id = ?").run(calc.total_km, s.id);
      } catch {}
    }
    return {
      ...s,
      total_km: calc.total_km,
      wear_pct: calc.wear_pct,
      is_near_limit: calc.is_near_limit,
      is_limit_reached: calc.is_limit_reached,
    };
  });
}

/**
 * Obtiene una zapatilla por su ID con sus métricas de desgaste.
 */
export function getShoeById(id: number): ShoeRow | undefined {
  const db = getDb();
  const shoe = db.prepare<ShoeRow>("SELECT * FROM shoes WHERE id = ?").get(id);
  if (!shoe) return undefined;

  const calc = calculateShoeMileage(shoe);
  return {
    ...shoe,
    total_km: calc.total_km,
    wear_pct: calc.wear_pct,
    is_near_limit: calc.is_near_limit,
    is_limit_reached: calc.is_limit_reached,
  };
}

/**
 * Obtiene el par de zapatillas actualmente marcado como "Principal".
 */
export function getPrimaryShoe(): ShoeRow | undefined {
  const db = getDb();
  const shoe = db
    .prepare<ShoeRow>("SELECT * FROM shoes WHERE is_primary = 1 AND is_active = 1 LIMIT 1")
    .get();
  if (!shoe) return undefined;

  const calc = calculateShoeMileage(shoe);
  return {
    ...shoe,
    total_km: calc.total_km,
    wear_pct: calc.wear_pct,
    is_near_limit: calc.is_near_limit,
    is_limit_reached: calc.is_limit_reached,
  };
}

/**
 * Crea un nuevo par de zapatillas.
 */
export function createShoe(input: CreateShoeInput): ShoeRow {
  const db = getDb();
  const now = new Date().toISOString();
  const isPrimary = input.is_primary ? 1 : 0;

  if (isPrimary === 1) {
    db.prepare("UPDATE shoes SET is_primary = 0").run();
    syncToSeedDb("UPDATE shoes SET is_primary = 0");
  }

  const initialKm = input.initial_km ?? 0;
  const maxKm = input.max_km ?? 700;

  const insertSql = `INSERT INTO shoes (name, brand, model, initial_km, total_km, max_km, is_primary, is_active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`;

  const res = db
    .prepare(insertSql)
    .run(
      input.name,
      input.brand ?? null,
      input.model ?? null,
      initialKm,
      initialKm,
      maxKm,
      isPrimary,
      input.notes ?? null,
      now,
      now
    );

  syncToSeedDb(
    insertSql,
    input.name,
    input.brand ?? null,
    input.model ?? null,
    initialKm,
    initialKm,
    maxKm,
    isPrimary,
    input.notes ?? null,
    now,
    now
  );

  const id = Number(res.lastInsertRowid);
  return getShoeById(id)!;
}

/**
 * Actualiza los datos de un par de zapatillas existente.
 */
export function updateShoe(id: number, input: UpdateShoeInput): ShoeRow | undefined {
  const db = getDb();
  const current = getShoeById(id);
  if (!current) return undefined;

  const now = new Date().toISOString();

  if (input.is_primary) {
    db.prepare("UPDATE shoes SET is_primary = 0 WHERE id != ?").run(id);
    syncToSeedDb("UPDATE shoes SET is_primary = 0 WHERE id != ?", id);
  }

  const name = input.name !== undefined ? input.name : current.name;
  const brand = input.brand !== undefined ? input.brand : current.brand;
  const model = input.model !== undefined ? input.model : current.model;
  const initialKm = input.initial_km !== undefined ? input.initial_km : current.initial_km;
  const maxKm = input.max_km !== undefined ? input.max_km : current.max_km;
  const isPrimary = input.is_primary !== undefined ? (input.is_primary ? 1 : 0) : current.is_primary;
  const isActive = input.is_active !== undefined ? (input.is_active ? 1 : 0) : current.is_active;
  const notes = input.notes !== undefined ? input.notes : current.notes;

  const updateSql = `UPDATE shoes
     SET name = ?, brand = ?, model = ?, initial_km = ?, max_km = ?, is_primary = ?, is_active = ?, notes = ?, updated_at = ?
     WHERE id = ?`;

  db.prepare(updateSql).run(name, brand, model, initialKm, maxKm, isPrimary, isActive, notes, now, id);
  syncToSeedDb(updateSql, name, brand, model, initialKm, maxKm, isPrimary, isActive, notes, now, id);

  const updated = getShoeById(id)!;

  // Si alcanza el 90%+ de desgaste, disparar notificación push
  if (updated.wear_pct && updated.wear_pct >= 90) {
    sendShoeWearAlertPush({
      id: updated.id,
      name: updated.name,
      totalKm: updated.total_km,
      maxKm: updated.max_km,
      wearPct: updated.wear_pct,
    }).catch(() => {});
  }

  return updated;
}

/**
 * Marca un par de zapatillas como "Principal".
 */
export function setPrimaryShoe(id: number): ShoeRow | undefined {
  const db = getDb();
  db.prepare("UPDATE shoes SET is_primary = 0").run();
  db.prepare("UPDATE shoes SET is_primary = 1 WHERE id = ?").run(id);
  syncToSeedDb("UPDATE shoes SET is_primary = 0");
  syncToSeedDb("UPDATE shoes SET is_primary = 1 WHERE id = ?", id);
  return getShoeById(id);
}

/**
 * Elimina (desactiva) un par de zapatillas.
 */
export function deleteShoe(id: number): boolean {
  const db = getDb();
  const res = db.prepare("UPDATE shoes SET is_active = 0 WHERE id = ?").run(id);
  syncToSeedDb("UPDATE shoes SET is_active = 0 WHERE id = ?", id);
  return res.changes > 0;
}

/**
 * Asocia una zapatilla específica a una sesión de entrenamiento y chequea alerta de desgaste.
 */
export function assignShoeToSession(sessionId: number, shoeId: number | null): boolean {
  const db = getDb();
  const res = db.prepare("UPDATE sessions SET shoe_id = ? WHERE id = ?").run(shoeId, sessionId);
  syncToSeedDb("UPDATE sessions SET shoe_id = ? WHERE id = ?", shoeId, sessionId);

  if (shoeId) {
    const shoe = getShoeById(shoeId);
    if (shoe && shoe.wear_pct && shoe.wear_pct >= 90) {
      sendShoeWearAlertPush({
        id: shoe.id,
        name: shoe.name,
        totalKm: shoe.total_km,
        maxKm: shoe.max_km,
        wearPct: shoe.wear_pct,
      }).catch(() => {});
    }
  }

  return res.changes > 0;
}
