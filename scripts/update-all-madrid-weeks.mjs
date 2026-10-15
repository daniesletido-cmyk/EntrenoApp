import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "entrenoapp.db");
const db = new DatabaseSync(dbPath);

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

console.log("Iniciando actualización integral del Plan Maratón de Madrid en todas las semanas...");

const sessions = [];

// =========================================================================
// FASE 1B (Semanas 5 a 16: 2026-10-05 a 2026-12-27)
// Base Aeróbica, Fuerza en Box y Potencia en Cuesta Específica Madrid
// =========================================================================
const longRunsFase1b = [12, 14, 16, 11, 14, 16, 18, 12, 16, 18, 20, 14];
const startDate = new Date("2026-10-05T12:00:00Z");

for (let w = 0; w < 12; w++) {
  const monday = addDays(startDate, w * 7);
  const weekStart = formatDate(monday);
  const longRunDist = longRunsFase1b[w];
  const semNum = w + 5;
  const isRecoveryWeek = longRunDist <= 12;

  // Lunes: CrossFit Fuerza
  sessions.push({
    date: formatDate(monday),
    week_start: weekStart,
    discipline: "crossfit",
    planned_code: `Fuerza Box (Sem ${semNum})`,
    duration_min: 50,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT (Fuerza y Potencia · Sem ${semNum}):\n- Enfoque en progresión de sentadilla trasera/frontal, peso muerto y estabilidad escapular.\n- Trabajo accesorio de glúteos e isquiotibiales para blindar la rodilla de cara al impacto excéntrico en bajadas.\n- Clase dirigida en Box, RPE 7-8.`
  });

  // Martes: Alternancia de Calidad (Cuestas vs Intervalos Umbral vs Base)
  if (semNum === 5) {
    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R1 (Base Aeróbica 8k)",
      duration_min: 45,
      distance_km: 8,
      is_long_run: 0,
      notes: "RUNNING suave en zona R1 (5:20 - 5:05 min/km, RPE 4-5) + 4x80m progresiones."
    });
  } else if (semNum % 2 === 1) {
    // Semanas impares: Cuestas cortas de potencia
    const reps = semNum >= 11 ? 10 : 8;
    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: `R1 + ${reps} Cuestas Cortas (Potencia Madrid)`,
      duration_min: 48,
      distance_km: 8,
      is_long_run: 0,
      notes: `RUNNING · Potencia Mecánica en Cuestas (${reps}x70m · RPE 7-8):\n- 20 min calentamiento en zona R1 (5:20-5:05/km) + técnica de carrera reactiva.\n- Bloque de Cuestas: ${reps}x70m en rampa tendida (4-5% de pendiente) a ritmo vivo y potente, braceo firme y apoyo elástico de metatarso. Recuperación: bajada caminando al paso (cero impacto articular).\n- Vuelta a la calma: 10 min trote muy suave regenerativo (>5:30/km) + estiramiento de sóleos y gemelos.`
    });
  } else {
    // Semanas pares: Intervalos Umbral R3 controlado o Fartlek
    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R3 (Intervalos Umbral: 4x1.200m a 4:18-4:20/km)",
      duration_min: 52,
      distance_km: 10,
      is_long_run: 0,
      notes: "RUNNING · Intervalos de Umbral Anaeróbico (R3 · VAM 3:59 min/km · ~10 km total):\n- Calentamiento: 2 km suave (5:20/km) + técnica dinámica + 4 progresiones de 60m.\n- Bloque Principal: 4x1.200m a 4:18 - 4:20 min/km (recuperación activa: 90s al trote muy suave a 6:00/km, no estática).\n- Vuelta a la calma: 1.5 km muy suave + estiramientos completos.\n- Objetivo: Desarrollar aclaramiento de lactato y eficiencia a ritmo submáximo sin fatiga residual lesiva."
    });
  }

  // Miércoles: Natación Compensatoria
  const swimDist = isRecoveryWeek ? 1.5 : 1.9;
  sessions.push({
    date: formatDate(addDays(monday, 2)),
    week_start: weekStart,
    discipline: "natacion",
    planned_code: isRecoveryWeek ? "NAT-D (Regeneración Activa & Aletas)" : "NAT-C (Umbral Protegido & Pull · 1.900m)",
    duration_min: 45,
    distance_km: swimDist,
    is_long_run: 0,
    notes: `NATACIÓN COMPENSATORIA (~${swimDist * 1000}m · RPE ${isRecoveryWeek ? "4" : "6"}):\n- 350m calentamiento suave variado.\n- Bloque con pull-buoy para aislamiento pélvico y flotabilidad, neutralizando el impacto en gemelos, sóleos y fascia plantar tras las cuestas o series del martes.\n- Vuelta a la calma con nado largo y relajación de cintura escapular.`
  });

  // Jueves: CrossFit WOD
  sessions.push({
    date: formatDate(addDays(monday, 3)),
    week_start: weekStart,
    discipline: "crossfit",
    planned_code: `WOD Box (Sem ${semNum})`,
    duration_min: 50,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT (WOD y Condicionamiento):\n- Clase dirigida en Box, RPE 7-8.\n- Dosificar impacto excéntrico repetitivo en gemelos y tendones de cara al rodaje y tirada del fin de semana.`
  });

  // Viernes: Descanso Total / Movilidad
  sessions.push({
    date: formatDate(addDays(monday, 4)),
    week_start: weekStart,
    discipline: "descanso",
    planned_code: "Descanso Total & Movilidad Lumbo-Pélvica",
    duration_min: 20,
    distance_km: null,
    is_long_run: 0,
    notes: "DESCANSO TOTAL & MOVILIDAD:\n- 15-20 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos, tobillos) y estiramientos suaves.\n- Cero impacto articular para asimilar la semana y recargar glucógeno de cara al fin de semana."
  });

  // Sábado: R1 Regenerativo Suave + Técnica
  sessions.push({
    date: formatDate(addDays(monday, 5)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: "R1 Regenerativo Suave + Técnica (6 km)",
    duration_min: 32,
    distance_km: 6,
    is_long_run: 0,
    notes: "RUNNING · Regenerativo de Activación (6 km · RPE 3-4):\n- 6 km continuos muy cómodos a ritmo R1/R0 (>5:25 - 5:15 min/km).\n- 4 rectas de 80m progresivas para activar tono neuromuscular sin generar fatiga previa a la tirada larga dominical.\n- Hidratación constante y descanso temprano."
  });

  // Domingo: R5 Tirada Larga con Desnivel Específico Madrid
  const elevD = isRecoveryWeek ? "+90m" : `+${110 + (w * 10)}m`;
  sessions.push({
    date: formatDate(addDays(monday, 6)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: `R5 (Tirada Larga ${longRunDist}k · Madrid Spec ${elevD} D+)`,
    duration_min: Math.round(longRunDist * 5.2),
    distance_km: longRunDist,
    is_long_run: 1,
    notes: `RUNNING · Tirada Larga con Desnivel Específico Madrid (${longRunDist} km · ${elevD} D+ · RPE 5-6):\n- Base aeróbica: Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (178-180 ppm) y contención de zancada en bajadas para mitigar el daño excéntrico en cuádriceps.\n- Bloque específico en pendiente: En los últimos 3-4 km buscar repechos y toboganes manteniendo el esfuerzo a Ritmo Maratón (5:05-5:10 min/km).\n- Nutrición/Hidratación: Beber agua o sales cada 20-25 min; 1 gel isotónico cada 40-45 min.\n- Vuelta a la calma: 5 min caminando + estiramientos completos.`
  });
}

// =========================================================================
// FASE 2 (Semanas 17 a 24: 2026-12-28 a 2027-02-21)
// Construcción de Umbral, Eficiencia de Ritmo Maratón y Resistencia a la Fatiga
// =========================================================================
const longRunsFase2 = [18, 20, 22, 15, 20, 24, 26, 18];
const startFase2 = new Date("2026-12-28T12:00:00Z");

for (let w = 0; w < 8; w++) {
  const monday = addDays(startFase2, w * 7);
  const weekStart = formatDate(monday);
  const longRunDist = longRunsFase2[w];
  const semNum = w + 17;
  const isRecovery = longRunDist <= 18;

  sessions.push({
    date: formatDate(monday),
    week_start: weekStart,
    discipline: "crossfit",
    planned_code: `CF Mantenimiento (Sem ${semNum})`,
    duration_min: 45,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT (Mantenimiento Específico · Sem ${semNum}):\n- Cargas moderadas en piernas (RPE 6-7). Foco en fuerza compensatoria, core y cadena posterior.`
  });

  // Series Umbral R3
  const seriesPlan = w % 3 === 0 ? "6x1.000m a 4:18-4:20/km" : w % 3 === 1 ? "4x1.500m a 4:16-4:18/km" : "3x2.000m a 4:14-4:16/km";
  sessions.push({
    date: formatDate(addDays(monday, 1)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: `R3 (Series Umbral: ${seriesPlan})`,
    duration_min: 60,
    distance_km: 11.5,
    is_long_run: 0,
    notes: `RUNNING · Series en Zona R3 (Umbral Anaeróbico · VAM 3:59 min/km · ~11.5 km total):\n- Calentamiento: 2.5 km suave + movilidad dinámica + 4 progresiones de 80m.\n- Bloque Principal: ${seriesPlan} con recuperación activa de 90s a 2 min al trote suave (6:00/km).\n- Vuelta a la calma: 1.5 km muy suave + estiramientos.`
  });

  // Miércoles: Natación
  sessions.push({
    date: formatDate(addDays(monday, 2)),
    week_start: weekStart,
    discipline: "natacion",
    planned_code: isRecovery ? "NAT-D (Hidroterapia & Aletas)" : "NAT-B (Crucero & Pull · 1.800m)",
    duration_min: 42,
    distance_km: 1.8,
    is_long_run: 0,
    notes: "NATACIÓN FASE 2 · Ritmo Crucero Ligero con Pull-buoy (~1.800m · RPE 5):\n- Trabajo respiratorio y tracción de tronco, protegiendo hombros y eliminando tensión de pantorrillas y sóleos."
  });

  // Jueves: CrossFit Funcional
  sessions.push({
    date: formatDate(addDays(monday, 3)),
    week_start: weekStart,
    discipline: "crossfit",
    planned_code: "CF Funcional & Core",
    duration_min: 45,
    distance_km: null,
    is_long_run: 0,
    notes: "CROSSFIT (Mantenimiento funcional, core y movilidad articular, RPE 6-7). Cero sentadillas pesadas."
  });

  // Viernes: Descanso o Regenerativo Corto
  sessions.push({
    date: formatDate(addDays(monday, 4)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: "R1 (Regenerativo Suave 30min · 6 km)",
    duration_min: 30,
    distance_km: 6,
    is_long_run: 0,
    notes: "RUNNING suave regenerativo: 30 min en zona R1 (5:20 - 5:10 min/km, RPE 3-4) para lavar lactato."
  });

  // Sábado: Descanso Activo / Movilidad
  sessions.push({
    date: formatDate(addDays(monday, 5)),
    week_start: weekStart,
    discipline: "descanso",
    planned_code: "Descanso Activo & Preparación Pre-Tirada",
    duration_min: 25,
    distance_km: null,
    is_long_run: 0,
    notes: "DESCANSO ACTIVO PRE-TIRADA:\n- 20 min de movilidad articular de cadera, tobillos y foam roller.\n- Preparar sales minerales, geles y cena rica en carbohidratos complejos."
  });

  // Domingo: Tirada Larga Build Madrid
  const elevF2 = isRecovery ? "+140m" : `+${180 + (w * 10)}m`;
  sessions.push({
    date: formatDate(addDays(monday, 6)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: `R5 (Tirada Larga Build ${longRunDist}k · Madrid Spec ${elevF2} D+)`,
    duration_min: Math.round(longRunDist * 5.15),
    distance_km: longRunDist,
    is_long_run: 1,
    notes: `RUNNING · Tirada Larga Build Específica Madrid (${longRunDist} km · ${elevF2} D+ · RPE 5-6):\n- Base aeróbica a 5:25 - 5:10 min/km con cadencia alta en bajadas.\n- Tramo final a Ritmo Maratón: Los últimos ${isRecovery ? "3" : "5"} km exactamente a Ritmo Maratón objetivo (5:00 - 5:08 min/km) sobre circuito ondulado.\n- Nutrición: 1 gel de 35g HC cada 40 min + agua/sales cada 20 min.`
  });
}

// =========================================================================
// FASE 3 (Semanas 25 a 31: 2027-02-22 a 2027-04-11)
// Bloque Específico Maratón de Madrid y Tiradas Pico
// =========================================================================
const longRunsFase3 = [24, 28, 30, 20, 32, 34, 22];
const startFase3 = new Date("2027-02-22T12:00:00Z");

for (let w = 0; w < 7; w++) {
  const monday = addDays(startFase3, w * 7);
  const weekStart = formatDate(monday);
  const longRunDist = longRunsFase3[w];
  const semNum = w + 25;
  const isSpecial = longRunDist === 30 ? "TEST RMC 30K (SIMULACIÓN MADRID)" : longRunDist === 34 ? "TIRADA PICO MÁXIMA 34K" : `Tirada Específica ${longRunDist}k`;

  sessions.push({
    date: formatDate(monday),
    week_start: weekStart,
    discipline: "crossfit",
    planned_code: `CF Movilidad / Core (Sem ${semNum})`,
    duration_min: 40,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT LIGERO / CORE & POSTURA (Sem ${semNum}):\n- Trabajo postural, core, fuerza de glúteos e isometría. Cero sentadillas pesadas ni pliometría de impacto.`
  });

  sessions.push({
    date: formatDate(addDays(monday, 1)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: "R4 (Ritmo Maratón Específico con Pendiente)",
    duration_min: 70,
    distance_km: 13,
    is_long_run: 0,
    notes: "RUNNING · Ritmo Maratón Específico (R4 · 13 km):\n- Calentamiento: 2 km suave\n- Bloque Principal: 8-9 km clavados a Ritmo Maratón (5:00 - 5:05 min/km, RPE 6) en terreno con toboganes para simular Madrid Río y Casa de Campo.\n- Vuelta a la calma: 2 km suave."
  });

  sessions.push({
    date: formatDate(addDays(monday, 2)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: "R1 (Suave + Core · 7 km)",
    duration_min: 40,
    distance_km: 7,
    is_long_run: 0,
    notes: "RUNNING regenerativo suave: 35-40 min a 5:25 - 5:10 min/km + 10 min de trabajo de core y estabilizadores de cadera."
  });

  sessions.push({
    date: formatDate(addDays(monday, 3)),
    week_start: weekStart,
    discipline: "natacion",
    planned_code: "NAT-R (Regenerativo Ligero & Flotación)",
    duration_min: 35,
    distance_km: 1.4,
    is_long_run: 0,
    notes: "NATACIÓN · Descarga muscular sin impacto (~1.400m suave con pull-buoy). Máxima relajación de espalda y piernas."
  });

  sessions.push({
    date: formatDate(addDays(monday, 4)),
    week_start: weekStart,
    discipline: "descanso",
    planned_code: "Descanso Total & Carga Glucógeno",
    duration_min: 0,
    distance_km: null,
    is_long_run: 0,
    notes: "DESCANSO TOTAL: Asimilación metabólica, hidratación continua y comida nutritiva rica en hidratos complejos."
  });

  sessions.push({
    date: formatDate(addDays(monday, 5)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: "R6 (Activación Pre-Tirada · 5 km)",
    duration_min: 25,
    distance_km: 5,
    is_long_run: 0,
    notes: "RUNNING activación: 20 min muy suave + 4 progresiones de 80m vivas y fluidas para encender el sistema neuromuscular."
  });

  const elevF3 = `+${200 + (w * 15)}m`;
  sessions.push({
    date: formatDate(addDays(monday, 6)),
    week_start: weekStart,
    discipline: "carrera",
    planned_code: `R5 (${isSpecial} · ${elevF3} D+)`,
    duration_min: Math.round(longRunDist * 5.12),
    distance_km: longRunDist,
    is_long_run: 1,
    notes: `RUNNING · ${isSpecial} (${longRunDist} km · ${elevF3} D+ · RPE 6):\n- Base aeróbica controlada a 5:20-5:10/km con los últimos 6 a 8 km clavados a Ritmo Maratón (5:00-5:05/km) simulando la subida final de Atocha a Retiro.\n- Ensayo nutricional obligatorio: Ingerir 1 gel cada 40 min con sorbo de agua/sales (50-60g HC/h). Simular la equipación y zapatillas de carrera.`
  });
}

// =========================================================================
// FASE 4 (Semanas 32 a 34: 2027-04-12 a 2027-04-26)
// Tapering, Carga de Carbohidratos y DOMINGO 25 DE ABRIL DE 2027
// =========================================================================
const startFase4 = new Date("2027-04-12T12:00:00Z");

// Semana 32 (Taper 1)
const monday32 = startFase4;
const weekStart32 = formatDate(monday32);
sessions.push({
  date: formatDate(monday32),
  week_start: weekStart32,
  discipline: "descanso",
  planned_code: "Movilidad & Estiramientos Suaves",
  duration_min: 20,
  distance_km: null,
  is_long_run: 0,
  notes: "Movilidad suave y estiramientos (20 min). Sin cargas de gimnasio ni CrossFit de impacto."
});
sessions.push({
  date: formatDate(addDays(monday32, 1)),
  week_start: weekStart32,
  discipline: "carrera",
  planned_code: "R4 (Ritmo Taper 8k)",
  duration_min: 42,
  distance_km: 8,
  is_long_run: 0,
  notes: "RUNNING Taper con ritmo: 2 km calentamiento + 4 km a Ritmo Maratón (5:05/km) + 2 km suaves."
});
sessions.push({
  date: formatDate(addDays(monday32, 2)),
  week_start: weekStart32,
  discipline: "natacion",
  planned_code: "NAT-R (Regenerativo Ligero 1.000m)",
  duration_min: 25,
  distance_km: 1.0,
  is_long_run: 0,
  notes: "Natación muy relajada (1.000m suave con pull-buoy) o descanso total."
});
sessions.push({
  date: formatDate(addDays(monday32, 3)),
  week_start: weekStart32,
  discipline: "carrera",
  planned_code: "R1 (Suave 25min · 5 km)",
  duration_min: 25,
  distance_km: 5,
  is_long_run: 0,
  notes: "RUNNING suave regenerativo: 25 min a 5:25 - 5:15 min/km."
});
sessions.push({
  date: formatDate(addDays(monday32, 4)),
  week_start: weekStart32,
  discipline: "descanso",
  planned_code: "Descanso Total",
  duration_min: 0,
  distance_km: null,
  is_long_run: 0,
  notes: "Descanso total para asimilar energía y rellenar glucógeno."
});
sessions.push({
  date: formatDate(addDays(monday32, 5)),
  week_start: weekStart32,
  discipline: "carrera",
  planned_code: "R6 (Activación 4 km)",
  duration_min: 20,
  distance_km: 4,
  is_long_run: 0,
  notes: "15-20 min trote muy suave + 3 progresiones de 60m fluidas."
});
sessions.push({
  date: formatDate(addDays(monday32, 6)),
  week_start: weekStart32,
  discipline: "carrera",
  planned_code: "R5 (Media Maratón Taper 21k)",
  duration_min: 110,
  distance_km: 21,
  is_long_run: 1,
  notes: "Tirada de Media Maratón Taper (21 km a ritmo cómodo 5:25 - 5:10/km). Buen ensayo de desayuno y material."
});

// Semana 33 (Semana de Carrera: 2027-04-19 a 2027-04-25)
const monday33 = addDays(startFase4, 7);
const weekStart33 = formatDate(monday33);
sessions.push({
  date: formatDate(monday33),
  week_start: weekStart33,
  discipline: "descanso",
  planned_code: "Descanso Total & Movilidad Articular",
  duration_min: 20,
  distance_km: null,
  is_long_run: 0,
  notes: "Descanso total y movilidad suave (15 min). Hidratación constante."
});
sessions.push({
  date: formatDate(addDays(monday33, 1)),
  week_start: weekStart33,
  discipline: "carrera",
  planned_code: "R4 (Toque de Ritmo 5k)",
  duration_min: 25,
  distance_km: 5,
  is_long_run: 0,
  notes: "Último toque de ritmo maratón: 2 km suave + 2 km a Ritmo Maratón (5:05/km) + 1 km suave."
});
sessions.push({
  date: formatDate(addDays(monday33, 2)),
  week_start: weekStart33,
  discipline: "descanso",
  planned_code: "Descanso y Carga de Hidratos (Día 1)",
  duration_min: 0,
  distance_km: null,
  is_long_run: 0,
  notes: "Descanso total. Iniciar protocolo de sobrecarga de carbohidratos (8-10g HC/kg de peso corporal). Beber abundante agua con electrolitos."
});
sessions.push({
  date: formatDate(addDays(monday33, 3)),
  week_start: weekStart33,
  discipline: "carrera",
  planned_code: "R1 (Trote Regenerativo 20min · 3.5k)",
  duration_min: 20,
  distance_km: 3.5,
  is_long_run: 0,
  notes: "Trote regenerativo muy suave (20 min a >5:30/km) para soltar piernas y activar el retorno venoso."
});
sessions.push({
  date: formatDate(addDays(monday33, 4)),
  week_start: weekStart33,
  discipline: "descanso",
  planned_code: "Descanso y Carga de Hidratos (Día 2)",
  duration_min: 0,
  distance_km: null,
  is_long_run: 0,
  notes: "Descanso total, piernas en alto. Dieta estricta rica en arroz blanco, pasta, patata y avena. Cero alcohol, baja fibra."
});
sessions.push({
  date: formatDate(addDays(monday33, 5)), // Sábado 24 de Abril
  week_start: weekStart33,
  discipline: "carrera",
  planned_code: "R6 (Activación Pre-Carrera · 3 km)",
  duration_min: 15,
  distance_km: 3,
  is_long_run: 0,
  notes: "Víspera de carrera: 15 min trote muy suave + 3 rectas de 50m progresivas para encender el sistema nervioso. Recoger dorsal, preparar geles, equipación y zapatillas. Cena temprana rica en arroz y descansar pronto."
});
sessions.push({
  date: formatDate(addDays(monday33, 6)), // DOMINGO 25 DE ABRIL DE 2027
  week_start: weekStart33,
  discipline: "carrera",
  planned_code: "MARATÓN DE MADRID (42.195 km)",
  duration_min: 215,
  distance_km: 42.195,
  is_long_run: 1,
  notes: `¡DÍA DEL MARATÓN DE MADRID! (42.195 km)\n- Objetivo Táctico: 5:00 - 5:12 min/km (Meta: Sub-3h35 / 3h40)\n- Estrategia Madrid por Sectores:\n  1. Km 0-5 (Castellana a Plaza de Castilla): Salida conservadora a 5:15-5:20/km. No quemar cerillas en subida.\n  2. Km 5-20 (Bravo Murillo, Gran Vía y Centro): Rodar fluido a 5:00-5:05/km conteniendo la zancada en bajadas para proteger cuádriceps.\n  3. Km 20-30 (Casa de Campo y Río): Ritmo crucero a 5:05/km. Mantener concentración y tomar gel en km 21 y 28.\n  4. Km 30-42 (Pirámides, Atocha, Alfonso XII y Retiro): La gran subida final. Cadencia alta (180 ppm), braceo potente con el glúteo y mente fría a 5:10-5:15/km hasta cruzar meta.\n- Nutrición: 1 gel cada 40 min + agua/sales en cada avituallamiento.\n- ¡Orgullo de todo el trabajo realizado y a por todas!`
});

// Semana 34 (Lunes 26 de Abril: Post-Carrera)
const monday34 = addDays(startFase4, 14);
const weekStart34 = formatDate(monday34);
sessions.push({
  date: formatDate(monday34),
  week_start: weekStart34,
  discipline: "descanso",
  planned_code: "Recuperación Post-Maratón",
  duration_min: 0,
  distance_km: null,
  is_long_run: 0,
  notes: "Descanso total, comida reconfortante, masaje suave de descarga y máxima hidratación. ¡Eres maratoniano de Madrid!"
});

// =========================================================================
// Ejecución de inserción en SQLite (INSERT OR REPLACE)
// =========================================================================
const selectStmt = db.prepare(`SELECT id, status FROM sessions WHERE date = ? AND is_extra = 0 LIMIT 1`);
const updateStmt = db.prepare(`
  UPDATE sessions
  SET week_start = ?,
      discipline = ?,
      planned_code = ?,
      distance_km = ?,
      duration_min = ?,
      is_long_run = ?,
      notes = ?,
      updated_at = ?
  WHERE id = ?
`);
const insertStmt = db.prepare(`
  INSERT INTO sessions (date, week_start, discipline, planned_code, distance_km, duration_min, is_long_run, status, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)
`);

const nowIso = new Date().toISOString();
let updatedCount = 0;
for (const s of sessions) {
  const existing = selectStmt.get(s.date);
  if (existing) {
    updateStmt.run(
      s.week_start,
      s.discipline,
      s.planned_code,
      s.distance_km,
      s.duration_min,
      s.is_long_run,
      s.notes,
      nowIso,
      existing.id
    );
  } else {
    insertStmt.run(
      s.date,
      s.week_start,
      s.discipline,
      s.planned_code,
      s.distance_km,
      s.duration_min,
      s.is_long_run,
      s.notes,
      nowIso,
      nowIso
    );
  }
  updatedCount++;
}

console.log(`¡Actualizadas con éxito ${updatedCount} sesiones en todo el macrociclo de Madrid (2026-10-05 a 2027-04-26)!`);
