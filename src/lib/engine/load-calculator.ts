/**
 * Motor de Cálculo de Carga de Entrenamiento (TSS / TRIMP)
 *
 * Implementa las metodologías científicas estándar de fisiología del ejercicio:
 * - Banister TRIMP (Training Impulse) exponencial basado en Reserva de Frecuencia Cardíaca (HRR).
 * - hrTSS (Heart Rate Training Stress Score) respecto al Umbral de Lactato (LTHR).
 * - Zonificación de carga por tiempo en zonas de pulso (Z1 a Z5).
 * - Estimación sRPE (Foster) cuando no hay pulsómetro disponible.
 */

export interface LoadCalculatorParams {
  durationMin: number;
  avgHr?: number | null;
  maxHr?: number | null;
  restHr?: number | null;
  lthr?: number | null; // Umbral de lactato / funcional de FC
  rpe?: number | null; // 1 a 10
  sportType?: string;
  isFemale?: boolean;
  timeInHrZonesSec?: {
    z1?: number; // <60%
    z2?: number; // 60-70%
    z3?: number; // 70-80%
    z4?: number; // 80-90%
    z5?: number; // >90%
  };
}

export interface LoadCalculationResult {
  tss: number;
  trimp: number;
  intensityFactor: number;
  strainCategory: "baja" | "moderada" | "alta" | "extrema";
  formulaUsed: string;
  notes: string;
}

// Valores de referencia por defecto para atletas de resistencia
const DEFAULT_MAX_HR = 190;
const DEFAULT_REST_HR = 50;
const DEFAULT_LTHR = 168; // Frecuencia cardíaca en umbral anaeróbico

/**
 * Calcula el TRIMP de Eric Banister:
 * TRIMP = Duración(min) * HR_ratio * 0.64 * exp(y * HR_ratio)
 * Donde y = 1.92 para hombres y 1.67 para mujeres.
 */
export function calculateBanisterTrimp(
  durationMin: number,
  avgHr: number,
  maxHr: number = DEFAULT_MAX_HR,
  restHr: number = DEFAULT_REST_HR,
  isFemale = false
): number {
  if (durationMin <= 0 || avgHr <= restHr) return 0;

  const effectiveMax = Math.max(maxHr, avgHr + 5);
  const effectiveRest = Math.min(restHr, avgHr - 10);
  const hrRatio = Math.min(1.0, Math.max(0.0, (avgHr - effectiveRest) / (effectiveMax - effectiveRest)));

  const y = isFemale ? 1.67 : 1.92;
  const factor = 0.64 * Math.exp(y * hrRatio);
  const trimp = durationMin * hrRatio * factor;

  return Math.round(trimp * 10) / 10;
}

/**
 * Calcula hrTSS (Heart Rate Training Stress Score):
 * hrTSS = (segundos * IF^2) / (3600) * 100
 * Donde IF (Intensity Factor) = avgHr / LTHR
 */
export function calculateHrTss(
  durationMin: number,
  avgHr: number,
  lthr: number = DEFAULT_LTHR
): { tss: number; intensityFactor: number } {
  if (durationMin <= 0 || avgHr <= 0) return { tss: 0, intensityFactor: 0 };

  const intensityFactor = Math.round((avgHr / lthr) * 100) / 100;
  // Duración en horas * IF^2 * 100
  const durationHours = durationMin / 60;
  const tss = Math.round(durationHours * Math.pow(intensityFactor, 2) * 100 * 10) / 10;

  return { tss, intensityFactor };
}

/**
 * Calcula TSS basado en distribución de tiempo en zonas de FC si están disponibles:
 * Z1 (<60%): 25 TSS/h
 * Z2 (60-70%): 45 TSS/h
 * Z3 (70-80%): 65 TSS/h
 * Z4 (80-90%): 85 TSS/h
 * Z5 (>90%): 115 TSS/h
 */
export function calculateZoneDistributionTss(zonesSec: {
  z1?: number;
  z2?: number;
  z3?: number;
  z4?: number;
  z5?: number;
}): number {
  const z1h = (zonesSec.z1 ?? 0) / 3600;
  const z2h = (zonesSec.z2 ?? 0) / 3600;
  const z3h = (zonesSec.z3 ?? 0) / 3600;
  const z4h = (zonesSec.z4 ?? 0) / 3600;
  const z5h = (zonesSec.z5 ?? 0) / 3600;

  const totalTss = z1h * 25 + z2h * 48 + z3h * 68 + z4h * 90 + z5h * 125;
  return Math.round(totalTss * 10) / 10;
}

/**
 * Estimación de Foster sRPE:
 * Carga = duración (min) * RPE (1-10)
 * Normalizado a escala equivalente TSS
 */
export function calculateRpeTss(durationMin: number, rpe: number): number {
  if (durationMin <= 0 || rpe <= 0) return 0;
  const sRpe = durationMin * Math.min(10, Math.max(1, rpe));
  // 60 min a RPE 10 (all-out) equivale a 100 TSS
  const estimatedTss = Math.round((sRpe / 6.0) * 10) / 10;
  return estimatedTss;
}

/**
 * Calcula la carga integral de un entrenamiento eligiendo la metodología más precisa disponible
 */
export function calculateSessionLoad(params: LoadCalculatorParams): LoadCalculationResult {
  const duration = Math.max(0, params.durationMin || 0);
  const avgHr = params.avgHr ?? null;
  const maxHr = params.maxHr ?? DEFAULT_MAX_HR;
  const restHr = params.restHr ?? DEFAULT_REST_HR;
  const lthr = params.lthr ?? DEFAULT_LTHR;
  const rpe = params.rpe ?? null;

  // 1. Si disponemos de FC Media y pulsómetro
  if (avgHr && avgHr > 40) {
    const trimp = calculateBanisterTrimp(duration, avgHr, maxHr, restHr, params.isFemale);
    let { tss, intensityFactor } = calculateHrTss(duration, avgHr, lthr);

    // Si además tenemos tiempo en zonas, afinamos la ponderación
    if (params.timeInHrZonesSec && Object.values(params.timeInHrZonesSec).some((v) => (v ?? 0) > 0)) {
      const zoneTss = calculateZoneDistributionTss(params.timeInHrZonesSec);
      if (zoneTss > 0) {
        tss = Math.round(((tss + zoneTss) / 2) * 10) / 10;
      }
    }

    const strainCategory = categorizeStrain(tss);

    return {
      tss,
      trimp,
      intensityFactor,
      strainCategory,
      formulaUsed: "Banister TRIMP + hrTSS (Umbral LTHR)",
      notes: `FC Media: ${avgHr} ppm · IF: ${intensityFactor} · Carga: ${tss} TSS`,
    };
  }

  // 2. Si no hay pulsómetro pero sí RPE subjetivo (ej. gimnasio o sesión sin sensor)
  if (rpe && rpe > 0) {
    const tss = calculateRpeTss(duration, rpe);
    const trimp = Math.round(tss * 1.15 * 10) / 10;
    const intensityFactor = Math.round((rpe / 10) * 100) / 100;
    const strainCategory = categorizeStrain(tss);

    return {
      tss,
      trimp,
      intensityFactor,
      strainCategory,
      formulaUsed: "Foster Session-RPE (Estimación de Carga)",
      notes: `RPE: ${rpe}/10 · Duración: ${duration} min · TSS estimado: ${tss}`,
    };
  }

  // 3. Fallback heurístico basado en duración y tipo de deporte
  const defaultRatePerMin = getDefaultTssRatePerMin(params.sportType);
  const tss = Math.round(duration * defaultRatePerMin * 10) / 10;
  const trimp = Math.round(tss * 1.1 * 10) / 10;
  const intensityFactor = 0.75;
  const strainCategory = categorizeStrain(tss);

  return {
    tss,
    trimp,
    intensityFactor,
    strainCategory,
    formulaUsed: "Estimación heurística por disciplina y duración",
    notes: `Estimado para ${params.sportType || "actividad"}: ${duration} min · ${tss} TSS`,
  };
}

function categorizeStrain(tss: number): "baja" | "moderada" | "alta" | "extrema" {
  if (tss < 50) return "baja";
  if (tss < 100) return "moderada";
  if (tss < 150) return "alta";
  return "extrema";
}

function getDefaultTssRatePerMin(sportType?: string): number {
  const sport = (sportType || "").toLowerCase();
  if (sport.includes("crossfit") || sport.includes("hiit")) return 1.35;
  if (sport.includes("run") || sport.includes("carrera")) return 1.15;
  if (sport.includes("swim") || sport.includes("nataci")) return 1.1;
  if (sport.includes("cycl") || sport.includes("bici")) return 0.95;
  if (sport.includes("gym") || sport.includes("pesas")) return 0.85;
  if (sport.includes("camin")) return 0.45;
  return 0.9;
}
