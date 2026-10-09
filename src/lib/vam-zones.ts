"use client";

export interface VamZone {
  code: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  name: string;
  minPaceKm: string;
  maxPaceKm: string;
  rangeLabel: string;
  pctVam: string;
  targetRpe: string;
  description: string;
  badgeTone: "success" | "brand" | "warning" | "danger" | "info";
}

export const VAM_TEST_PROFILE = {
  pace: "3:59 min/km",
  speedKmh: 15.06,
  testDate: "2026-09-27",
  durationMin: 5,
  protocol: "Test VAM 5 minutos en llano a máxima intensidad sostenida",
};

export const VAM_ZONES: Record<string, VamZone> = {
  R0: {
    code: "R0",
    name: "Regenerativo Suave / Descarga",
    minPaceKm: "6:00",
    maxPaceKm: "5:25",
    rangeLabel: "> 5:25 min/km (5:25 - 6:00/km)",
    pctVam: "< 70% VAM",
    targetRpe: "RPE 3 - 4",
    description: "Rodaje regenerativo para drenar fatiga y favorecer retorno venoso sin impacto articular.",
    badgeTone: "info",
  },
  R1: {
    code: "R1",
    name: "Base Aeróbica / Rodaje Cómodo",
    minPaceKm: "5:25",
    maxPaceKm: "4:59",
    rangeLabel: "5:25 - 4:59 min/km",
    pctVam: "70% - 78% VAM",
    targetRpe: "RPE 4 - 5",
    description: "Zona fundamental para construir base lipolítica. Conversacional, cómodo y fluido.",
    badgeTone: "success",
  },
  R2: {
    code: "R2",
    name: "Tempo Progresivo / Umbral Aeróbico",
    minPaceKm: "4:59",
    maxPaceKm: "4:35",
    rangeLabel: "4:59 - 4:35 min/km",
    pctVam: "78% - 85% VAM",
    targetRpe: "RPE 6 - 7",
    description: "Velocidad de crucero medio sostenido. Eficiencia mecánica y tolerancia al ácido láctico.",
    badgeTone: "brand",
  },
  R3: {
    code: "R3",
    name: "Ritmo Maratón / Sub-Umbral",
    minPaceKm: "4:35",
    maxPaceKm: "4:15",
    rangeLabel: "4:35 - 4:15 min/km",
    pctVam: "85% - 90% VAM",
    targetRpe: "RPE 7 - 8",
    description: "Ritmo específico de carrera maratón. Máxima concentración y economía de zancada.",
    badgeTone: "warning",
  },
  R4: {
    code: "R4",
    name: "Umbral Anaeróbico / RMC Específico",
    minPaceKm: "4:20",
    maxPaceKm: "4:10",
    rangeLabel: "4:20 - 4:10 min/km",
    pctVam: "90% - 93% VAM",
    targetRpe: "RPE 8 - 8.5",
    description: "Estado estable máximo de lactato. Rodajes controlados fuertes y series largas.",
    badgeTone: "warning",
  },
  R5: {
    code: "R5",
    name: "Series / Intervalos VAM / VO2max",
    minPaceKm: "4:10",
    maxPaceKm: "3:45",
    rangeLabel: "< 4:10 min/km (VAM: 3:59 min/km)",
    pctVam: "93% - 100%+ VAM",
    targetRpe: "RPE 9 - 10",
    description: "Intervalos y series cortas a ritmo de test VAM (3:59/km) para expandir VO2max.",
    badgeTone: "danger",
  },
};

/**
 * Detecta la zona de ritmo VAM correspondiente a una sesión de carrera.
 */
export function detectVamZoneForSession(session?: {
  discipline?: string;
  planned_code?: string | null;
  notes?: string | null;
} | null): VamZone | null {
  if (!session) return null;
  if (session.discipline !== "carrera") return null;

  const text = `${session.planned_code ?? ""} ${session.notes ?? ""}`.toUpperCase();

  if (text.includes("R5") || text.includes("SERIES") || text.includes("INTERVAL") || text.includes("VO2MAX") || text.includes("VAM")) {
    return VAM_ZONES.R5;
  }
  if (text.includes("R4") || text.includes("RMC") || text.includes("UMBRAL ANAERÓBICO") || text.includes("UMBRAL ANAEROBICO")) {
    return VAM_ZONES.R4;
  }
  if (text.includes("R3") || text.includes("RITMO MARATÓN") || text.includes("RITMO MARATON") || text.includes("MARATON") || text.includes("MARATÓN")) {
    return VAM_ZONES.R3;
  }
  if (text.includes("R2") || text.includes("TEMPO") || text.includes("PROGRESIVO") || text.includes("UMBRAL AERÓBICO") || text.includes("UMBRAL AEROBICO")) {
    return VAM_ZONES.R2;
  }
  if (text.includes("R0") || text.includes("REGENERATIVO") || text.includes("DESCARGA") || text.includes("RECUPERACIÓN")) {
    return VAM_ZONES.R0;
  }
  if (text.includes("R1") || text.includes("BASE AERÓBICA") || text.includes("BASE AEROBICA") || text.includes("RODAJE") || text.includes("TIRADA")) {
    return VAM_ZONES.R1;
  }

  // Por defecto en sesiones de carrera sin código específico: R1
  return VAM_ZONES.R1;
}
