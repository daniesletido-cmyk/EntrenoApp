import { getDb } from "@/lib/db";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { todayISO, addDays } from "@/lib/dates";

export type HydrationLevel = "sediento" | "normal" | "optimo";
export type EnergyLevel = "baja" | "media" | "alta";

export interface MorningCheckInput {
  date: string;
  weightKg?: number | null;
  hydration: HydrationLevel;
  energy: EnergyLevel;
  notes?: string | null;
}

export interface MorningCheckData {
  date: string;
  weightKg: number | null;
  hydration: HydrationLevel;
  energy: EnergyLevel;
  checkedAt: string;
  source?: string | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  advice: {
    nutritionistAdvice: string;
    physioAdvice: string;
    hydrationStatusText: string;
    energyStatusText: string;
  };
}

/**
 * Cruza los datos del check matinal con el sueño de Zepp y la carga reciente de Suunto
 */
export function buildMorningAdvice(params: {
  hydration: HydrationLevel;
  energy: EnergyLevel;
  weightKg?: number | null;
  sleepHours?: number | null;
  sleepScore?: number | null;
  lastSessionDiscipline?: string | null;
  lastSessionKm?: number | null;
  lastSessionRpe?: number | null;
}): {
  nutritionistAdvice: string;
  physioAdvice: string;
  hydrationStatusText: string;
  energyStatusText: string;
} {
  const { hydration, energy, sleepHours, sleepScore, lastSessionKm, lastSessionRpe } = params;

  // Estado descriptivo
  let hydrationStatusText = "Equilibrio hídrico óptimo";
  if (hydration === "sediento") hydrationStatusText = "Déficit hídrico matinal (deshidratación)";
  else if (hydration === "normal") hydrationStatusText = "Hidratación adecuada";

  let energyStatusText = "Energía plena y vitalidad";
  if (energy === "baja") energyStatusText = "Sensación de fatiga / pesadez al despertar";
  else if (energy === "media") energyStatusText = "Energía moderada / neutra";

  // Criterio Nutricionista Deportivo (Cero frutos secos de forma estricta)
  let nutritionistAdvice = "Nutricionista Deportivo: Estado hidroelectrolítico y energético óptimo. Mantén tu pauta habitual de desayuno e ingesta hídrica a lo largo de la mañana.";

  if (hydration === "sediento" || (lastSessionKm && lastSessionKm >= 12)) {
    nutritionistAdvice = "Nutricionista Deportivo: Se detecta sed o depleción tras la tirada. Bebe de inmediato 500 ml de agua templada con una pizca de sal marina o electrolitos y limón. En el desayuno, prioriza fruta rica en agua (naranja, kiwi) y avena cocida (100% limpia de frutos secos).";
  } else if (energy === "baja" || (sleepHours && sleepHours < 6.8)) {
    nutritionistAdvice = "Nutricionista Deportivo: Energía mermada por descanso breve. Facilita la recuperación de glucógeno con hidratos limpios de asimilación lenta (tostadas de pan de masa madre con AOVE o compota de manzana con semillas de calabaza y chía; cero nueces ni almendras).";
  }

  // Criterio Fisioterapeuta Deportivo
  let physioAdvice = "Fisioterapeuta Deportivo: Tono muscular preparado y articulaciones elásticas. Realiza la activación habitual de 1.0 km a ritmo R0 suave antes de iniciar la Parte Principal.";

  if (energy === "baja" || (sleepScore && sleepScore < 72) || (lastSessionRpe && lastSessionRpe >= 7.5)) {
    physioAdvice = "Fisioterapeuta Deportivo: Sistema neuromuscular reactivo por fatiga. Antes de calzar zapatillas para correr, realiza 5 minutos de movilidad articular de tobillo (knee-to-wall) y apertura 90/90 de cadera. Alarga el calentamiento R0 a 1.5 km muy suave.";
  } else if (hydration === "sediento") {
    physioAdvice = "Fisioterapeuta Deportivo: La deshidratación matinal reduce la viscoelasticidad de la fascia plantar y el tendón de Aquiles. No aceleres en los primeros 10 minutos de entreno para dar tiempo al calentamiento sinocartilaginoso.";
  }

  return {
    nutritionistAdvice,
    physioAdvice,
    hydrationStatusText,
    energyStatusText,
  };
}

/**
 * Guarda o actualiza el check matinal en la base de datos (dual sync)
 */
export function saveMorningCheck(input: MorningCheckInput): MorningCheckData {
  const db = getDb();
  const now = new Date().toISOString();

  const notesObj = {
    hydration: input.hydration,
    energy: input.energy,
    check_time: now,
    custom_notes: input.notes || null,
  };
  const notesJson = JSON.stringify(notesObj);

  // 1. Guardar en data/entrenoapp.db
  const existing = db.prepare("SELECT * FROM measurements WHERE date = ?").get(input.date) as any;
  if (existing) {
    db.prepare(`
      UPDATE measurements 
      SET weight_kg = COALESCE(?, weight_kg), notes = ?, updated_at = ? 
      WHERE date = ?
    `).run(input.weightKg ?? null, notesJson, now, input.date);
  } else {
    db.prepare(`
      INSERT INTO measurements (date, weight_kg, notes, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `).run(input.date, input.weightKg ?? null, notesJson, now, now);
  }

  // 2. Sincronización dual en seed/entrenoapp.db
  try {
    const seedPath = path.resolve(process.cwd(), "seed/entrenoapp.db");
    if (fs.existsSync(seedPath)) {
      const seedDb = new DatabaseSync(seedPath);
      const seedExisting = seedDb.prepare("SELECT * FROM measurements WHERE date = ? LIMIT 1").get(input.date) as any;
      if (seedExisting) {
        seedDb.prepare(`
          UPDATE measurements 
          SET weight_kg = COALESCE(?, weight_kg), notes = ?, updated_at = ? 
          WHERE date = ?
        `).run(input.weightKg ?? null, notesJson, now, input.date);
      } else {
        seedDb.prepare(`
          INSERT INTO measurements (date, weight_kg, notes, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?)
        `).run(input.date, input.weightKg ?? null, notesJson, now, now);
      }
    }
  } catch (err) {
    console.warn("[DualSync] Warning syncing morning check to seed.db:", err);
  }

  // Obtener contexto de sueño y última sesión para afinar la recomendación
  const sleepLog = db.prepare("SELECT * FROM sleep_logs WHERE date = ? LIMIT 1").get(input.date) as any;
  const yesterday = addDays(input.date, -1);
  const lastSession = db.prepare("SELECT * FROM sessions WHERE date = ? LIMIT 1").get(yesterday) as any;

  const advice = buildMorningAdvice({
    hydration: input.hydration,
    energy: input.energy,
    weightKg: input.weightKg,
    sleepHours: sleepLog?.hours ?? null,
    sleepScore: sleepLog?.score ?? null,
    lastSessionDiscipline: lastSession?.discipline ?? null,
    lastSessionKm: lastSession?.distance_km ?? null,
    lastSessionRpe: lastSession?.rpe ?? null,
  });

  return {
    date: input.date,
    weightKg: input.weightKg ?? (existing?.weight_kg || null),
    hydration: input.hydration,
    energy: input.energy,
    checkedAt: now,
    source: existing?.source ?? null,
    bodyFatPct: existing?.body_fat_pct ?? null,
    muscleMassKg: existing?.muscle_mass_kg ?? null,
    waterPct: existing?.water_pct ?? null,
    advice,
  };
}

/**
 * Obtiene el check matinal para una fecha
 */
export function getMorningCheck(date: string): MorningCheckData | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM measurements WHERE date = ? LIMIT 1").get(date) as any;
  if (!row) return null;

  let hydration: HydrationLevel = "normal";
  let energy: EnergyLevel = "media";
  let checkedAt = row.updated_at || row.created_at;

  if (row.notes) {
    try {
      const parsed = JSON.parse(row.notes);
      if (parsed.hydration) hydration = parsed.hydration;
      if (parsed.energy) energy = parsed.energy;
      if (parsed.check_time) checkedAt = parsed.check_time;
    } catch {
      // Ignorar notas de texto libre antiguas
    }
  }

  const sleepLog = db.prepare("SELECT * FROM sleep_logs WHERE date = ? LIMIT 1").get(date) as any;
  const yesterday = addDays(date, -1);
  const lastSession = db.prepare("SELECT * FROM sessions WHERE date = ? LIMIT 1").get(yesterday) as any;

  const advice = buildMorningAdvice({
    hydration,
    energy,
    weightKg: row.weight_kg,
    sleepHours: sleepLog?.hours ?? null,
    sleepScore: sleepLog?.score ?? null,
    lastSessionDiscipline: lastSession?.discipline ?? null,
    lastSessionKm: lastSession?.distance_km ?? null,
    lastSessionRpe: lastSession?.rpe ?? null,
  });

  return {
    date,
    weightKg: row.weight_kg ?? null,
    hydration,
    energy,
    checkedAt,
    source: row.source ?? null,
    bodyFatPct: row.body_fat_pct ?? null,
    muscleMassKg: row.muscle_mass_kg ?? null,
    waterPct: row.water_pct ?? null,
    advice,
  };
}
