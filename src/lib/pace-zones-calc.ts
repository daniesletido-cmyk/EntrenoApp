export interface PaceZone {
  id: "z1" | "z2" | "z3" | "z4" | "z5" | "z6";
  code: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  name: string;
  description: string;
  /** Ritmo más rápido en seg/km (límite inferior de tiempo) */
  minSecKm: number;
  /** Ritmo más lento en seg/km (límite superior de tiempo) */
  maxSecKm: number;
  /** Representación legible "M:SS - M:SS /km" */
  formatted: string;
  /** Porcentaje respecto a VAM */
  pctVam: string;
}

export interface PaceZonesConfig {
  vamPaceStr: string;
  vamSecKm: number;
  toleranceSecKm: number;
  zones: Record<string, PaceZone>;
  lastUpdated: string;
}

export function secKmToPace(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function paceToSecKm(paceStr: string): number | null {
  if (!paceStr) return null;
  const clean = paceStr.trim().replace(/\/km|min\/km/gi, "").trim();
  const m = clean.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/**
 * Calcula las 5+1 zonas de ritmo a partir de la VAM (Velocidad Aeróbica Máxima).
 */
export function calculatePaceZonesFromVam(vamSecKm: number = 239, toleranceSecKm: number = 5): PaceZonesConfig {
  const safeVam = Number.isFinite(vamSecKm) && vamSecKm > 120 && vamSecKm < 400 ? vamSecKm : 239;

  // Fórmulas oficiales de fisiología VAM (Susana / Daniels / Canova)
  // R0 (<65% VAM): > 5:23 min/km -> 5:25 a 5:50 /km
  const z1Min = Math.round(safeVam / 0.735); // ~325 s (5:25)
  const z1Max = Math.round(safeVam / 0.68);  // ~350 s (5:50)

  // R1 (65-75% VAM Base Aeróbica): 5:23 a 4:59 /km
  const z2Min = Math.round(safeVam / 0.80);  // ~299 s (4:59)
  const z2Max = Math.round(safeVam / 0.735); // ~325 s (5:25)

  // R2 (75-85% VAM Tempo / Ritmo Maratón): 4:59 a 4:35 /km
  const z3Min = Math.round(safeVam / 0.87);  // ~275 s (4:35)
  const z3Max = Math.round(safeVam / 0.80);  // ~299 s (4:59)

  // R3 (90-95% VAM Umbral / 10K-21K): 4:23 a 4:11 /km
  const z4Min = Math.round(safeVam / 0.95);  // ~251 s (4:11)
  const z4Max = Math.round(safeVam / 0.91);  // ~263 s (4:23)

  // R4 / R3+ (100-105% VAM VO2Max / Series Cortas): 3:59 a 3:47 /km
  const z5Min = Math.round(safeVam / 1.05);  // ~227 s (3:47)
  const z5Max = safeVam;                     // ~239 s (3:59)

  // R5 (>105% VAM Capacidad Anaeróbica)
  const z6Min = Math.round(safeVam / 1.25);  // ~191 s (3:11)
  const z6Max = Math.round(safeVam / 1.05);  // ~227 s (3:47)

  const zones: Record<string, PaceZone> = {
    z1: {
      id: "z1",
      code: "R0",
      name: "Recuperación / Regenerativo",
      description: "Calentamiento, vuelta a la calma y descarga miofascial",
      minSecKm: z1Min,
      maxSecKm: z1Max,
      formatted: `${secKmToPace(z1Min)} – ${secKmToPace(z1Max)} /km`,
      pctVam: "<65%",
    },
    z2: {
      id: "z2",
      code: "R1",
      name: "Aeróbico / Rodaje Base",
      description: "Desarrollo mitocondrial y volumen fundamental de carrera",
      minSecKm: z2Min,
      maxSecKm: z2Max,
      formatted: `${secKmToPace(z2Min)} – ${secKmToPace(z2Max)} /km`,
      pctVam: "65-75%",
    },
    z3: {
      id: "z3",
      code: "R2",
      name: "Tempo / Ritmo Maratón",
      description: "Eficiencia de carrera a ritmo específico de maratón",
      minSecKm: z3Min,
      maxSecKm: z3Max,
      formatted: `${secKmToPace(z3Min)} – ${secKmToPace(z3Max)} /km`,
      pctVam: "75-85%",
    },
    z4: {
      id: "z4",
      code: "R3",
      name: "Umbral de Lactato (10K - 21K)",
      description: "Series largas y umbral anaeróbico funcional",
      minSecKm: z4Min,
      maxSecKm: z4Max,
      formatted: `${secKmToPace(z4Min)} – ${secKmToPace(z4Max)} /km`,
      pctVam: "90-95%",
    },
    z5: {
      id: "z5",
      code: "R4",
      name: "VO2Max / Series Cortas",
      description: "Potencia aeróbica máxima e intervalos de 400m a 1.000m",
      minSecKm: z5Min,
      maxSecKm: z5Max,
      formatted: `${secKmToPace(z5Min)} – ${secKmToPace(z5Max)} /km`,
      pctVam: "100-105%",
    },
    z6: {
      id: "z6",
      code: "R5",
      name: "Capacidad Anaeróbica",
      description: "Cuestas explosivas y cambios de ritmo sub-máximos",
      minSecKm: z6Min,
      maxSecKm: z6Max,
      formatted: `< ${secKmToPace(z6Max)} /km`,
      pctVam: ">105%",
    },
  };

  return {
    vamPaceStr: secKmToPace(safeVam),
    vamSecKm: safeVam,
    toleranceSecKm,
    zones,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Devuelve el rango con la tolerancia aplicada para enviar al reloj Suunto (en m/s)
 */
export function getSuuntoPaceTargetBounds(
  fastSecKm: number,
  slowSecKm: number,
  toleranceSecKm: number = 0
): { speedMinMs: number; speedMaxMs: number } {
  const fast = Math.min(fastSecKm, slowSecKm);
  const slow = Math.max(fastSecKm, slowSecKm);

  const safeFastSec = Math.max(1, fast - toleranceSecKm);
  const safeSlowSec = slow + toleranceSecKm;

  const speedMinMs = +(1000 / safeSlowSec).toFixed(3);
  const speedMaxMs = +(1000 / safeFastSec).toFixed(3);

  return {
    speedMinMs,
    speedMaxMs,
  };
}
