import { todayISO, weekStartOf, addDays } from "@/lib/dates";
import { calculatePaceZonesFromVam, secKmToPace, paceToSecKm } from "@/lib/pace-zones";
import type { WeeklyPlanDayInput } from "@/lib/coach-ai/weekly-plan-updater";

export interface OnboardingPlanParams {
  userId: string;
  fullName: string;
  vamSecKm: number;
  targetDistance: "10K" | "Media Maratón" | "Maratón" | "Carrera Popular / Fitness";
  targetDate?: string;
  daysPerWeek: number;
  disciplines: string[];
}

/**
 * Genera la primera semana de entrenamientos personalizados respetando la Regla de Oro
 * de EntrenoApp:
 * 1. La distancia principal es siempre el trabajo clave íntegro.
 * 2. Estructura tripartita: Calentamiento (1-1.5 km) + Parte Principal + Vuelta a la Calma (1 km).
 * 3. Adaptada a los días disponibles y disciplinas seleccionadas (CrossFit, Natación, Gimnasio).
 */
export function generateInitialCustomWeek(params: OnboardingPlanParams): WeeklyPlanDayInput[] {
  const today = todayISO();
  const weekStart = weekStartOf(today);
  const zonesConfig = calculatePaceZonesFromVam(params.vamSecKm, 5);

  const r0 = zonesConfig.zones.z1?.formatted || "5:30 – 5:50 /km";
  const r1 = zonesConfig.zones.z2?.formatted || "4:59 – 5:25 /km";
  const r2 = zonesConfig.zones.z3?.formatted || "4:35 – 4:59 /km";
  const r3 = zonesConfig.zones.z4?.formatted || "4:11 – 4:23 /km";

  const hasCrossFit = params.disciplines.includes("crossfit");
  const hasSwim = params.disciplines.includes("natacion");
  const hasGym = params.disciplines.includes("gimnasio") || params.disciplines.includes("fuerza");

  const days: WeeklyPlanDayInput[] = [];

  // Lunes (Día 1): Rodaje Base Aeróbico de Reincorporación / Inicio
  const run1MainKm = params.targetDistance === "Maratón" ? 8.0 : params.targetDistance === "Media Maratón" ? 7.0 : 5.0;
  const run1TotalKm = run1MainKm + 2.0; // 1.0 km calentamiento + 1.0 km vuelta a la calma
  days.push({
    date: addDays(weekStart, 0),
    discipline: "carrera",
    plannedCode: `R1 Rodaje Base Aeróbico (${run1MainKm} km Clave · ${run1TotalKm.toFixed(1)} km Total)`,
    durationMin: Math.round(run1TotalKm * 5.5),
    distanceKm: run1TotalKm,
    notes: `RUNNING · Rodaje Base Aeróbico (${run1MainKm.toFixed(1)} km Clave · ${run1TotalKm.toFixed(1)} km Total · RPE 4-5):
- 🟢 Calentamiento (1.0 km · ~6 min · Ritmo > 5:30 min/km · R0 suave): Trote suave + activación dinámica de tobillos y caderas.
- ⚡ Parte Principal (${run1MainKm.toFixed(1)} km íntegros · Ritmo: ${r1} (Zona R1 Base Aeróbica)): Rodaje constante y cómodo a respiración nasal/conversacional + 4 rectas progresivas de 80m.
- 🔵 Vuelta a la Calma (1.0 km · ~6 min · Trote muy suave y caminata): Vuelta progresiva a la calma + estiramientos completos.
- Nutrición: Buena hidratación previa. Snack ligero de carbohidratos 45 min antes.`,
    isLongRun: false,
  });

  // Martes (Día 2): CrossFit o Gimnasio de Fuerza o Descanso Activo
  if (hasCrossFit) {
    days.push({
      date: addDays(weekStart, 1),
      discipline: "crossfit",
      plannedCode: "Fuerza Tren Inferior + WOD Metcon",
      durationMin: 60,
      distanceKm: null,
      notes: `CROSSFIT · Fuerza & Potencia Metabólica:
- 🟢 Calentamiento & Movilidad (12 min): Movilidad articular de cadera, tobillos y muñecas + activación escapular.
- ⚡ Bloque 1 — Fuerza: Sentadilla trasera (Back Squat) 5x5 subiendo carga a RPE 7-8.
- ⚡ Bloque 2 — Metcon (For Time 14 min): 3 rondas de 15 Wall Balls (9/6 kg), 12 Burpees over the box y 9 Toes to Bar.
- 🔵 Vuelta a la Calma (8 min): Descompresión lumbar y estiramientos dirigidos de cuádriceps y cadena posterior.`,
    });
  } else if (hasGym) {
    days.push({
      date: addDays(weekStart, 1),
      discipline: "gimnasio",
      plannedCode: "Fuerza General & Core para Corredores",
      durationMin: 55,
      distanceKm: null,
      notes: `GIMNASIO · Acondicionamiento Neuromuscular:
- 🟢 Calentamiento (10 min): Movilidad dinámica y activación de glúteo medio con miniband.
- ⚡ Bloque Principal: Sentadilla búlgara 4x8/pierna, Peso muerto rumano 4x10, Hip Thrust 4x12, Press banca con mancuernas 3x10 y Planchas RKC 3x40s.
- 🔵 Vuelta a la Calma (10 min): Estiramientos miofasciales.`,
    });
  } else {
    days.push({
      date: addDays(weekStart, 1),
      discipline: "descanso",
      plannedCode: "Descanso Activo / Movilidad Articular",
      durationMin: 20,
      distanceKm: null,
      notes: `DESCANSO ACTIVO: 15-20 min de movilidad articular, foam roller y paseo relajante.`,
    });
  }

  // Miércoles (Día 3): Calidad de Running (Series o Cambios de Ritmo)
  const run2MainKm = params.targetDistance === "Maratón" ? 7.0 : 5.0;
  const run2TotalKm = run2MainKm + 2.5;
  days.push({
    date: addDays(weekStart, 2),
    discipline: "carrera",
    plannedCode: `R2 / R3 Intervalos de Umbral (${run2MainKm} km Clave · ${run2TotalKm.toFixed(1)} km Total)`,
    durationMin: Math.round(run2TotalKm * 5.2),
    distanceKm: run2TotalKm,
    notes: `RUNNING · Trabajo de Umbral & Ritmo (${run2MainKm.toFixed(1)} km Clave · ${run2TotalKm.toFixed(1)} km Total · RPE 6-7):
- 🟢 Calentamiento (1.5 km · ~8 min · Ritmo > 5:30 min/km · R0 suave): Movilidad dinámica y técnica de carrera (skipping, talones, zancadas).
- ⚡ Parte Principal (${run2MainKm.toFixed(1)} km Clave): 4x1.000m a Ritmo de Umbral (${r3}) con 90" de recuperación activa al trote suave.
- 🔵 Vuelta a la Calma (1.0 km · Trote regenerativo > 6:00 min/km): Soltura muscular y descompresión.`,
    isLongRun: false,
  });

  // Jueves (Día 4): CrossFit o Natación o Gimnasio
  if (hasCrossFit) {
    days.push({
      date: addDays(weekStart, 3),
      discipline: "crossfit",
      plannedCode: "Halterofilia & Metcon Metabólico",
      durationMin: 60,
      distanceKm: null,
      notes: `CROSSFIT · Empuje & Potencia:
- 🟢 Calentamiento & Activación escapular (12 min).
- ⚡ Bloque 1 — Fuerza: Push Press 4x6 a carga media progresiva.
- ⚡ Bloque 2 — WOD AMRAP 12 min: 10 Dumbbell Snatches, 15 Kettlebell Swings, 20 Sit-ups.
- 🔵 Vuelta a la Calma (8 min): Movilidad torácica y estiramientos.`,
    });
  } else if (hasSwim) {
    days.push({
      date: addDays(weekStart, 3),
      discipline: "natacion",
      plannedCode: "Técnica de Nado & Capacidad Aeróbica (1.500m)",
      durationMin: 45,
      distanceKm: 1.5,
      notes: `NATACIÓN · Regeneración & Técnica Acuática:
- 🟢 Calentamiento (300m): 200m crol suave + 100m espalda doble brazo.
- ⚡ Bloque Principal (1.000m): 4x100m crol con pull-buoy (foco recobro alto, desc. 20") + 6x50m progresivos (desc. 15") + 300m crol continuo ritmo crucero.
- 🔵 Vuelta a la Calma (200m): Nado regenerativo muy suave y estiramientos en bordillo.`,
    });
  } else {
    days.push({
      date: addDays(weekStart, 3),
      discipline: "descanso",
      plannedCode: "Descanso Total / Recuperación Pasiva",
      durationMin: 0,
      distanceKm: null,
      notes: `Descanso completo para absorber la carga acumulada de la semana.`,
    });
  }

  // Viernes (Día 5): Rodaje Suave o Descanso
  if (params.daysPerWeek >= 5) {
    const runFriMainKm = 5.0;
    const runFriTotalKm = 7.0;
    days.push({
      date: addDays(weekStart, 4),
      discipline: "carrera",
      plannedCode: `R0 / R1 Rodaje Regenerativo (${runFriMainKm} km Clave · ${runFriTotalKm.toFixed(1)} km Total)`,
      durationMin: 40,
      distanceKm: runFriTotalKm,
      notes: `RUNNING · Regenerativo pre-tirada (${runFriMainKm} km Clave · ${runFriTotalKm.toFixed(1)} km Total):
- 🟢 Calentamiento (1.0 km trote R0 suave).
- ⚡ Parte Principal (5.0 km cómodos a ritmo ${r1}).
- 🔵 Vuelta a la Calma (1.0 km trote muy suave + estiramientos).`,
      isLongRun: false,
    });
  } else {
    days.push({
      date: addDays(weekStart, 4),
      discipline: "descanso",
      plannedCode: "Descanso Pre-Fin de Semana",
      durationMin: 0,
      distanceKm: null,
      notes: `Día de descanso para llegar fresco a la tirada larga del fin de semana.`,
    });
  }

  // Sábado (Día 6): Natación, Gimnasio o Descanso Activo
  if (hasSwim && !hasCrossFit) {
    days.push({
      date: addDays(weekStart, 5),
      discipline: "natacion",
      plannedCode: "Soltura Acuática (1.200m)",
      durationMin: 40,
      distanceKm: 1.2,
      notes: `NATACIÓN · Descarga sin impacto:
- 🟢 200m crol cómodo.
- ⚡ 6x100m con aletas y tabla (patada continua y soltura de tobillos).
- 🔵 200m suave y descompresión.`,
    });
  } else {
    days.push({
      date: addDays(weekStart, 5),
      discipline: "descanso",
      plannedCode: "Preparación Tirada Larga",
      durationMin: 0,
      distanceKm: null,
      notes: `Cena rica en carbohidratos complejos (arroz, patata o pasta) e hidratación óptima con electrolitos.`,
    });
  }

  // Domingo (Día 7): Tirada Larga de Fin de Semana (Sesión Clave)
  const longRunMainKm = params.targetDistance === "Maratón" ? 14.0 : params.targetDistance === "Media Maratón" ? 12.0 : 8.0;
  const longRunTotalKm = longRunMainKm + 2.5; // 1.5 km calentamiento + 1.0 km vuelta a la calma
  days.push({
    date: addDays(weekStart, 6),
    discipline: "carrera",
    plannedCode: `Tirada Larga Aeróbica (${longRunMainKm} km Clave · ${longRunTotalKm.toFixed(1)} km Total)`,
    durationMin: Math.round(longRunTotalKm * 5.4),
    distanceKm: longRunTotalKm,
    notes: `RUNNING · Sesión Clave de Resistencia (${longRunMainKm.toFixed(1)} km Clave · ${longRunTotalKm.toFixed(1)} km Total · RPE 5):
- 🟢 Calentamiento (1.5 km · ~9 min · Ritmo > 5:30 min/km · R0 suave): Activación gradual de articulaciones.
- ⚡ Parte Principal (${longRunMainKm.toFixed(1)} km íntegros · Ritmo: ${r1} con los últimos 2 km progresando a ${r2}): Ritmo constante, respiración controlada y cadencia fluida (~175-180 ppm).
- 🔵 Vuelta a la Calma (1.0 km · Trote regenerativo y caminata): Enfriamiento gradual y estiramientos profundos de isquiotibiales, gemelos y psoas.
- Pauta Nutricional: Tomar 1 gel energético en el km 7-8 con 150ml de agua. Hidratación regular cada 20 min.`,
    isLongRun: true,
  });

  return days;
}
