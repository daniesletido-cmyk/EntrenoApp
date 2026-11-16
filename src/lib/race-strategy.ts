/**
 * Motor de Cálculo de Estrategia de Competición
 * Integrando el criterio de:
 * 1. Preparador Físico de Élite: Pacing, gestión de ritmos y parciales cada 5 km.
 * 2. Nutricionista Deportivo: Timing de carbohidratos (CHO g/h), sales y agua.
 * 
 * REGLA MÉDICA INMUTABLE: Cero frutos secos (nueces, avellanas, almendras).
 */

export type RaceDistancePreset = "10k" | "21k" | "42k" | "custom";
export type PacingStrategy = "even" | "negative_split" | "progressive";

export interface RacePresetConfig {
  id: RaceDistancePreset;
  name: string;
  distanceKm: number;
  defaultTimeSeconds: number; // e.g. 10k: 45m, 21k: 1h40m, 42k: 3h30m
}

export const RACE_PRESETS: Record<RaceDistancePreset, RacePresetConfig> = {
  "10k": {
    id: "10k",
    name: "10K",
    distanceKm: 10.0,
    defaultTimeSeconds: 45 * 60, // 45:00 (4:30 min/km)
  },
  "21k": {
    id: "21k",
    name: "Media Maratón",
    distanceKm: 21.0975,
    defaultTimeSeconds: 100 * 60, // 1:40:00 (4:44 min/km)
  },
  "42k": {
    id: "42k",
    name: "Maratón (Zuera / Valencia / Sevilla)",
    distanceKm: 42.195,
    defaultTimeSeconds: 210 * 60, // 3:30:00 (4:58 min/km)
  },
  custom: {
    id: "custom",
    name: "Personalizada",
    distanceKm: 15.0,
    defaultTimeSeconds: 75 * 60,
  },
};

export interface SegmentNutritionPlan {
  carbsLabel: string | null;
  carbsGrams: number;
  waterMl: number;
  electrolytesLabel: string | null;
  advice: string;
  badge?: "gel" | "sales" | "agua" | "cafeina" | "meta";
}

export interface RaceSplitSegment {
  index: number;
  label: string; // "0 - 5 km"
  kmStart: number;
  kmEnd: number;
  segmentKm: number;
  paceSecPerKm: number;
  paceFormatted: string; // "4:58 min/km"
  segmentTimeSec: number;
  segmentTimeFormatted: string; // "00:24:50"
  cumulativeTimeSec: number;
  cumulativeTimeFormatted: string; // "00:49:40"
  nutrition: SegmentNutritionPlan;
}

export interface RaceStrategyResult {
  distanceKm: number;
  targetTimeSec: number;
  targetTimeFormatted: string;
  avgPaceSecPerKm: number;
  avgPaceFormatted: string;
  pacingStrategy: PacingStrategy;
  strategyLabel: string;
  totalCarbsGrams: number;
  carbsPerHour: number;
  totalWaterMl: number;
  totalElectrolyteCaps: number;
  segments: RaceSplitSegment[];
  coachAdvice: string[];
  nutritionAdvice: string[];
}

export function formatTimeSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatPaceFromSec(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} min/km`;
}

/**
 * Calcula la pauta de nutrición exacta para un punto kilométrico según la distancia total y tiempo.
 */
function getNutritionForKm(
  kmPoint: number,
  totalDistanceKm: number,
  targetTimeHours: number,
  isFinish: boolean
): SegmentNutritionPlan {
  if (isFinish) {
    return {
      carbsLabel: "Recuperador líquido (Maltodextrina / Glucosa)",
      carbsGrams: 40,
      waterMl: 300,
      electrolytesLabel: "Electrolitos + Sodio",
      advice: "¡Cruzada la meta! Inicia la ventana de recuperación con hidratación y reincorporación de glucógeno.",
      badge: "meta",
    };
  }

  // ESTRATEGIA 10K (< 1h)
  if (totalDistanceKm <= 12) {
    if (kmPoint === 5) {
      return {
        carbsLabel: targetTimeHours > 0.8 ? "Gel isotónico suave (opcional)" : null,
        carbsGrams: targetTimeHours > 0.8 ? 25 : 0,
        waterMl: 150,
        electrolytesLabel: null,
        advice: "Sorbos pequeños de agua. En 10K las reservas de glucógeno son suficientes si la cena previa fue adecuada.",
        badge: "agua",
      };
    }
    return {
      carbsLabel: null,
      carbsGrams: 0,
      waterMl: 100,
      electrolytesLabel: null,
      advice: "Mantén ritmo estable y foco en la zancada sin distraerte en avituallamientos.",
      badge: "agua",
    };
  }

  // ESTRATEGIA MEDIA MARATÓN (21.1K)
  if (totalDistanceKm <= 25) {
    if (kmPoint === 5) {
      return {
        carbsLabel: null,
        carbsGrams: 0,
        waterMl: 150,
        electrolytesLabel: null,
        advice: "Agua a pequeños sorbos. Controla la respiración y no aceleres por la adrenalina inicial.",
        badge: "agua",
      };
    }
    if (kmPoint === 10) {
      return {
        carbsLabel: "Gel energético 1 (Glucosa/Fructosa 1:0.8)",
        carbsGrams: 30,
        waterMl: 150,
        electrolytesLabel: null,
        advice: "Toma el gel 200m antes del puesto para beber el agua inmediatamente y facilitar el vaciado gástrico.",
        badge: "gel",
      };
    }
    if (kmPoint === 15) {
      return {
        carbsLabel: "Gel energético 2 (con cafeína moderada 50mg)",
        carbsGrams: 30,
        waterMl: 150,
        electrolytesLabel: "1 Cápsula de sales minerales (Sodio)",
        advice: "Sales para evitar calambres y cafeína para retrasar la percepción de fatiga del último tercio.",
        badge: "cafeina",
      };
    }
    if (kmPoint === 20) {
      return {
        carbsLabel: null,
        carbsGrams: 0,
        waterMl: 100,
        electrolytesLabel: null,
        advice: "Último enjuague o sorbo de agua. ¡Cambio de ritmo final hacia meta!",
        badge: "agua",
      };
    }
  }

  // ESTRATEGIA MARATÓN (42.2K)
  if (kmPoint === 5) {
    return {
      carbsLabel: null,
      carbsGrams: 0,
      waterMl: 150,
      electrolytesLabel: null,
      advice: "Primer avituallamiento obligatorio: bebe agua aunque no sientas sed para retrasar la deshidratación.",
      badge: "agua",
    };
  }
  if (kmPoint === 10) {
    return {
      carbsLabel: "Gel energético 1 (Isotónico sin cafeína)",
      carbsGrams: 30,
      waterMl: 150,
      electrolytesLabel: null,
      advice: "Primer chute de hidratos. Asegura 30g CHO disueltos con agua.",
      badge: "gel",
    };
  }
  if (kmPoint === 15) {
    return {
      carbsLabel: null,
      carbsGrams: 0,
      waterMl: 150,
      electrolytesLabel: "1 Cápsula de sales minerales (200-250mg Sodio)",
      advice: "Reponer sodio para evitar hiponatremia y conservar el volumen plasmático.",
      badge: "sales",
    };
  }
  if (kmPoint === 20) {
    return {
      carbsLabel: "Gel energético 2 (Maltodextrina / Fructosa)",
      carbsGrams: 30,
      waterMl: 150,
      electrolytesLabel: null,
      advice: "Paso por la media maratón. Recarga de carbohidratos para no tocar la reserva crítica.",
      badge: "gel",
    };
  }
  if (kmPoint === 25) {
    return {
      carbsLabel: "Gel energético 3 (Hidratos limpios)",
      carbsGrams: 30,
      waterMl: 150,
      electrolytesLabel: null,
      advice: "Clave antes del km 30: mantener glucosa circulante para evitar el desfallecimiento del muro.",
      badge: "gel",
    };
  }
  if (kmPoint === 30) {
    return {
      carbsLabel: "Gel energético 4 (con Cafeína 80-100mg)",
      carbsGrams: 30,
      waterMl: 150,
      electrolytesLabel: "1 Cápsula de sales minerales",
      advice: "El punto psicológico y fisiológico decisivo. La cafeína reduce el RPE y el dolor muscular.",
      badge: "cafeina",
    };
  }
  if (kmPoint === 35) {
    return {
      carbsLabel: "Gel energético 5 (Isotónico de rápida absorción)",
      carbsGrams: 30,
      waterMl: 150,
      electrolytesLabel: null,
      advice: "Última inyección de energía. Si notas el estómago lleno, toma la mitad y enjuaga con agua.",
      badge: "gel",
    };
  }
  if (kmPoint === 40) {
    return {
      carbsLabel: null,
      carbsGrams: 0,
      waterMl: 100,
      electrolytesLabel: null,
      advice: "Solo agua y foco mental. Quedan 2.195 metros: visualiza la llegada y mantén la cadencia viva.",
      badge: "agua",
    };
  }

  // Otros puntos intermedios
  return {
    carbsLabel: null,
    carbsGrams: 0,
    waterMl: 150,
    electrolytesLabel: null,
    advice: "Hidratación constante según tolerancia gástrica.",
    badge: "agua",
  };
}

/**
 * Genera la estrategia completa de carrera dividida en parciales de 5 km
 */
export function calculateRaceStrategy(
  distanceKm: number,
  targetTimeSec: number,
  strategy: PacingStrategy = "negative_split"
): RaceStrategyResult {
  const baseAvgPaceSec = targetTimeSec / distanceKm;
  const targetTimeHours = targetTimeSec / 3600;

  // Creamos los tramos cada 5 km
  const splitPoints: number[] = [];
  let currentKm = 5;
  while (currentKm < distanceKm) {
    splitPoints.push(currentKm);
    currentKm += 5;
  }
  splitPoints.push(distanceKm);

  // Definir factores de ritmo por tramo según la estrategia
  // even: factor 1.0 en todos
  // negative_split: primera mitad +1.5% (más lento), segunda mitad -1.5% (más rápido)
  // progressive: tramo 1 (+3%), tramo central (1.0), tramo final (-3%)
  const halfDist = distanceKm / 2;

  let prevKm = 0;
  let cumulativeTime = 0;
  const segments: RaceSplitSegment[] = [];

  let totalCarbs = 0;
  let totalWater = 0;
  let totalCaps = 0;

  splitPoints.forEach((kmEnd, idx) => {
    const kmStart = prevKm;
    const segmentKm = kmEnd - kmStart;
    const midKm = (kmStart + kmEnd) / 2;

    let paceFactor = 1.0;
    if (strategy === "negative_split") {
      if (midKm < halfDist) {
        paceFactor = 1.018; // ~4-5 seg/km más controlado en la 1ª mitad
      } else {
        paceFactor = 0.982; // ~4-5 seg/km más rápido en la 2ª mitad
      }
    } else if (strategy === "progressive") {
      if (midKm <= 5) {
        paceFactor = 1.03; // Inicio conservador
      } else if (midKm >= distanceKm - 7) {
        paceFactor = 0.97; // Aceleración final
      } else {
        paceFactor = 1.0;
      }
    }

    const paceSecPerKm = baseAvgPaceSec * paceFactor;
    const segmentTimeSec = paceSecPerKm * segmentKm;
    cumulativeTime += segmentTimeSec;

    const isFinish = Math.abs(kmEnd - distanceKm) < 0.05;
    const nutrition = getNutritionForKm(
      isFinish ? kmEnd : Math.round(kmEnd),
      distanceKm,
      targetTimeHours,
      isFinish
    );

    totalCarbs += nutrition.carbsGrams;
    totalWater += nutrition.waterMl;
    if (nutrition.electrolytesLabel) totalCaps += 1;

    segments.push({
      index: idx + 1,
      label: isFinish
        ? `Km ${kmStart.toFixed(0)} - ${kmEnd.toFixed(1)} (Meta)`
        : `Km ${kmStart.toFixed(0)} - ${kmEnd.toFixed(0)}`,
      kmStart,
      kmEnd,
      segmentKm,
      paceSecPerKm,
      paceFormatted: formatPaceFromSec(paceSecPerKm),
      segmentTimeSec,
      segmentTimeFormatted: formatTimeSeconds(segmentTimeSec),
      cumulativeTimeSec: cumulativeTime,
      cumulativeTimeFormatted: formatTimeSeconds(cumulativeTime),
      nutrition,
    });

    prevKm = kmEnd;
  });

  // Ajuste fino para que cumulativeTime final coincida exactamente con targetTimeSec
  const timeDiff = targetTimeSec - cumulativeTime;
  if (Math.abs(timeDiff) > 0.5 && segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    lastSeg.segmentTimeSec += timeDiff;
    lastSeg.cumulativeTimeSec = targetTimeSec;
    lastSeg.cumulativeTimeFormatted = formatTimeSeconds(targetTimeSec);
  }

  const carbsPerHour = targetTimeHours > 0 ? Math.round(totalCarbs / targetTimeHours) : 0;

  // Consejos multidisciplinares
  const coachAdvice: string[] = [
    strategy === "negative_split"
      ? "Preparador Físico: El split negativo protege tus reservas musculares de glucógeno y evita el colapso neuromuscular tras el km 30. No salgas más rápido de lo estipulado en los primeros 5 km."
      : "Preparador Físico: El ritmo parejo exige una cadencia biomecánica regular (~176-180 ppm). Mantén la respiración acompasada (2:2) y evita los tirones en las subidas.",
    "Fisioterapeuta: Si notas sobrecarga en gemelos o isquiotibiales antes del km 25, alarga levemente la exhalación, relaja los hombros y apóyate con el mediopié sin talonar excesivamente.",
  ];

  const nutritionAdvice: string[] = [
    `Nutricionista: Pauta calculada a ${carbsPerHour}g CHO/hora. Absorción óptima comprobada mediante mezcla de glucosa y fructosa sin riesgo de malestar gastrointestinal.`,
    "Hidratación: Bebe a pequeños sorbos en cada estación (150 ml) combinándolo con cápsulas de sales para garantizar equilibrio hidroelectrolítico.",
    "Seguridad médica: Pauta 100% limpia de frutos secos (sin trazas de nueces, avellanas ni almendras). Utilizar exclusivamente geles de formulación simple y maltodextrina.",
  ];

  const strategyLabels: Record<PacingStrategy, string> = {
    even: "Ritmo Parejo (Even Pace)",
    negative_split: "Split Negativo (Progresivo -1.8% en 2ª mitad)",
    progressive: "Progresivo Prudente (Salida suave)",
  };

  return {
    distanceKm,
    targetTimeSec,
    targetTimeFormatted: formatTimeSeconds(targetTimeSec),
    avgPaceSecPerKm: baseAvgPaceSec,
    avgPaceFormatted: formatPaceFromSec(baseAvgPaceSec),
    pacingStrategy: strategy,
    strategyLabel: strategyLabels[strategy],
    totalCarbsGrams: totalCarbs,
    carbsPerHour,
    totalWaterMl: totalWater,
    totalElectrolyteCaps: totalCaps,
    segments,
    coachAdvice,
    nutritionAdvice,
  };
}
