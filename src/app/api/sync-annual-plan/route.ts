import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

export async function GET() {
  const db = getDb();
  const sessions: Array<{
    date: string;
    week_start: string;
    discipline: string;
    planned_code: string;
    is_long_run?: number;
    duration_min?: number;
    distance_km?: number;
    notes: string;
  }> = [];

  // FASE 1B (Semanas 5 a 16: 2026-10-05 a 2026-12-27)
  const longRunsFase1b = [12, 14, 16, 11, 14, 16, 18, 12, 16, 18, 20, 14];
  let startDate = new Date("2026-10-05T12:00:00Z");

  for (let w = 0; w < 12; w++) {
    const monday = addDays(startDate, w * 7);
    const weekStart = formatDate(monday);
    const longRunDist = longRunsFase1b[w];
    const semNum = w + 5;

    sessions.push({
      date: formatDate(monday),
      week_start: weekStart,
      discipline: "crossfit",
      planned_code: `Fuerza Box (Sem ${semNum})`,
      duration_min: 50,
      notes: `CROSSFIT (Fuerza y Potencia · Sem ${semNum}):\n- Clase dirigida en Box, RPE 7-8.\n- Enfoque en progresión de fuerza básica y tren superior/core.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R1 (Base Aeróbica)",
      distance_km: 8,
      duration_min: 45,
      notes: `RUNNING suave en zona R1 (5:23 - 4:59 min/km, RPE 4-5):\n- Calentamiento: 5 min trote muy suave (>5:25/km)\n- Rodaje continuo: 35-40 min a ritmo R1\n- Técnica: 4x80m progresiones con alta cadencia\n- Vuelta a la calma: 5 min andando`
    });

    sessions.push({
      date: formatDate(addDays(monday, 2)),
      week_start: weekStart,
      discipline: "natacion",
      planned_code: "N1 (Aeróbica + Técnica)",
      distance_km: 2.0,
      duration_min: 45,
      notes: `NATACIÓN técnica + aeróbica (~2.000-2.200m):\n- Calentamiento: 400m suave crol\n- Técnica: 4x50m ejercicios (catch-up, recobro alto) desc. 20s\n- Principal: 8x100m crol aeróbico continuo (RPE 5-6) desc. 15-20s\n- Vuelta a la calma: 200m suave`
    });

    sessions.push({
      date: formatDate(addDays(monday, 3)),
      week_start: weekStart,
      discipline: "crossfit",
      planned_code: `WOD Box (Sem ${semNum})`,
      duration_min: 50,
      notes: `CROSSFIT (WOD y Condicionamiento):\n- Clase dirigida en Box, RPE 7-8.\n- Dosificar impacto en gemelos/tendones de cara al rodaje del sábado.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 4)),
      week_start: weekStart,
      discipline: "descanso",
      planned_code: "Descanso Activo",
      duration_min: 20,
      notes: `DESCANSO ACTIVO:\n- 15-20 min de movilidad articular de cadera/tobillos y estiramientos suaves o descanso total.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 5)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R2 (Moderado Progresivo)",
      distance_km: 10.5,
      duration_min: 55,
      notes: `RUNNING moderado progresivo (receta R2 · 10-11 km):\n- Calentamiento 10 min suave\n- Cuerpo: 1er tercio suave en R1 (5:15/km), 2º tercio a ritmo tempo R2 (4:55-4:40/km), último km progresivo a 4:35/km\n- Vuelta a la calma: 5 min suave`
    });

    sessions.push({
      date: formatDate(addDays(monday, 6)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: `R5 (Tirada Larga ${longRunDist}k)`,
      is_long_run: 1,
      distance_km: longRunDist,
      duration_min: Math.round(longRunDist * 5.25),
      notes: `RUNNING Tirada Larga de Volumen (${longRunDist} km · Sem ${semNum}):\n- Ritmo aeróbico cómodo: 5:25 - 5:05 min/km (RPE ≤6)\n- Hidratación: Agua/isotónico cada 20-25 min en tiradas >14 km\n- Vuelta a la calma: 5 min andando + estiramientos`
    });
  }

  // FASE 2 (Semanas 17 a 24: 2026-12-28 a 2027-02-21)
  const longRunsFase2 = [18, 20, 22, 15, 20, 24, 26, 18];
  let startFase2 = new Date("2026-12-28T12:00:00Z");

  for (let w = 0; w < 8; w++) {
    const monday = addDays(startFase2, w * 7);
    const weekStart = formatDate(monday);
    const longRunDist = longRunsFase2[w];
    const semNum = w + 17;

    sessions.push({
      date: formatDate(monday),
      week_start: weekStart,
      discipline: "crossfit",
      planned_code: `CF Mantenimiento (Sem ${semNum})`,
      duration_min: 45,
      notes: `CROSSFIT (Mantenimiento):\n- Cargas moderadas en piernas (RPE 6-7). Foco en fuerza compensatoria y tren superior.`
    });

    const seriesType = w % 3 === 0 ? "6x1000m a 4:20/km" : w % 3 === 1 ? "4x1500m a 4:18/km" : "3x2000m a 4:15/km";
    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: `R3 (Series Umbral: ${seriesType})`,
      distance_km: 11,
      duration_min: 60,
      notes: `RUNNING Series en Zona R3 (Umbral Anaeróbico · 4:23 - 4:11 min/km):\n- Calentamiento: 15 min suave + técnica + 4x80m progresiones\n- Bloque Principal: ${seriesType} (recuperación 90s - 2min al trote suave)\n- Vuelta a la calma: 10 min muy suave`
    });

    sessions.push({
      date: formatDate(addDays(monday, 2)),
      week_start: weekStart,
      discipline: "natacion",
      planned_code: "N2 (Recuperación / Descarga)",
      distance_km: 1.5,
      duration_min: 35,
      notes: `NATACIÓN de recuperación activa (~1.500m):\n- 300m suave + 6x100m crol suave (RPE 4-5) desc. 20s + 200m espalda/suave. Cero impacto.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 3)),
      week_start: weekStart,
      discipline: "crossfit",
      planned_code: "CF Funcional",
      duration_min: 45,
      notes: `CROSSFIT (Mantenimiento funcional y core, RPE 7).`
    });

    sessions.push({
      date: formatDate(addDays(monday, 4)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R1 (Regenerativo 30min)",
      distance_km: 6,
      duration_min: 30,
      notes: `RUNNING suave regenerativo: 30 min en zona R1 (5:23 - 5:00 min/km, RPE 4-5).`
    });

    sessions.push({
      date: formatDate(addDays(monday, 5)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R2 + Ritmo Maratón",
      distance_km: 12,
      duration_min: 65,
      notes: `RUNNING moderado con ritmo maratón:\n- 3 km calentamiento suave R1\n- 6 km a Ritmo Maratón objetivo (5:00 - 5:15 min/km sostenido)\n- 3 km vuelta a la calma suave`
    });

    sessions.push({
      date: formatDate(addDays(monday, 6)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: `R5 (Tirada Larga ${longRunDist}k)`,
      is_long_run: 1,
      distance_km: longRunDist,
      duration_min: Math.round(longRunDist * 5.2),
      notes: `RUNNING Tirada Larga Build (${longRunDist} km · Sem ${semNum}):\n- Base a 5:25 - 5:10 min/km + últimos 3-4 km a Ritmo Maratón (5:05-5:10 min/km)\n- Nutrición: 1 gel cada 45 min + sales/agua cada 20 min`
    });
  }

  // FASE 3 (Semanas 25 a 31: 2027-02-22 a 2027-04-11)
  const longRunsFase3 = [24, 28, 30, 20, 32, 34, 22];
  let startFase3 = new Date("2027-02-22T12:00:00Z");

  for (let w = 0; w < 7; w++) {
    const monday = addDays(startFase3, w * 7);
    const weekStart = formatDate(monday);
    const longRunDist = longRunsFase3[w];
    const semNum = w + 25;

    sessions.push({
      date: formatDate(monday),
      week_start: weekStart,
      discipline: "crossfit",
      planned_code: `CF Movilidad / Core (Sem ${semNum})`,
      duration_min: 40,
      notes: `CROSSFIT Ligero / Movilidad y Core:\n- Trabajo postural, core y tren superior. Cero sentadillas pesadas.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 1)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R4 (Ritmo Maratón Específico)",
      distance_km: 13,
      duration_min: 70,
      notes: `RUNNING Ritmo Maratón Específico (R4 · 12-14 km):\n- Calentamiento: 15 min suave\n- Bloque Principal: 7-8 km clavados a 5:00 - 5:10 min/km (RPE 6-7)\n- Vuelta a la calma: 10 min suave`
    });

    sessions.push({
      date: formatDate(addDays(monday, 2)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R1 (Suave + Core)",
      distance_km: 7,
      duration_min: 40,
      notes: `RUNNING suave regenerativo (35-40 min a 5:20-5:00/km) + 10 min core.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 3)),
      week_start: weekStart,
      discipline: "descanso",
      planned_code: "Descanso / Descarga",
      duration_min: 0,
      notes: `DESCANSO o natación suave opcional (receta N2).`
    });

    sessions.push({
      date: formatDate(addDays(monday, 4)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R6 (Activación)",
      distance_km: 5,
      duration_min: 25,
      notes: `RUNNING activación: 20 min suave + 4 progresiones de 80m vivas (<2:00/km) para activar el SNC.`
    });

    sessions.push({
      date: formatDate(addDays(monday, 5)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: "R2 (Tempo Corto)",
      distance_km: 9,
      duration_min: 45,
      notes: `RUNNING moderado corto (8-9 km a 4:55-4:40 min/km) + técnica de carrera.`
    });

    const isTest = longRunDist === 30 ? "TEST RMC 30K" : longRunDist === 34 ? "TIRADA PICO MÁXIMA" : `Tirada ${longRunDist}k`;
    sessions.push({
      date: formatDate(addDays(monday, 6)),
      week_start: weekStart,
      discipline: "carrera",
      planned_code: `R5 (${isTest})`,
      is_long_run: 1,
      distance_km: longRunDist,
      duration_min: Math.round(longRunDist * 5.15),
      notes: `RUNNING Tirada Larga Específica Maratón (${longRunDist} km · ${isTest}):\n- Base a 5:20-5:10/km con los últimos 6-8 km exactamente a Ritmo Maratón (5:00-5:05/km)\n- Ensayo nutricional obligatorio: geles cada 40-45 min + hidratación cada 20 min`
    });
  }

  // FASE 4 (Semanas 32 a 33: 2027-04-12 a 2027-04-25)
  let startFase4 = new Date("2027-04-12T12:00:00Z");

  const monday32 = startFase4;
  const weekStart32 = formatDate(monday32);
  sessions.push({
    date: formatDate(monday32),
    week_start: weekStart32,
    discipline: "descanso",
    planned_code: "Movilidad / Suave",
    duration_min: 20,
    notes: "Movilidad suave y estiramientos (20 min). Sin pesas ni CrossFit."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 1)),
    week_start: weekStart32,
    discipline: "carrera",
    planned_code: "R4 (Ritmo Taper 8k)",
    distance_km: 8,
    duration_min: 42,
    notes: "RUNNING Taper con ritmo: 2 km calentamiento + 3-4 km a 5:05/km (RMC) + 2 km suaves."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 2)),
    week_start: weekStart32,
    discipline: "natacion",
    planned_code: "N2 (Muy suave)",
    distance_km: 1.0,
    duration_min: 25,
    notes: "Natación muy relajada (1.000m suave) o descanso total."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 3)),
    week_start: weekStart32,
    discipline: "carrera",
    planned_code: "R1 (Suave 25min)",
    distance_km: 5,
    duration_min: 25,
    notes: "RUNNING suave: 25 min a 5:30-5:15/km."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 4)),
    week_start: weekStart32,
    discipline: "descanso",
    planned_code: "Descanso Total",
    duration_min: 0,
    notes: "Descanso total para asimilar energía."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 5)),
    week_start: weekStart32,
    discipline: "carrera",
    planned_code: "R6 (Activación)",
    distance_km: 4,
    duration_min: 20,
    notes: "15-20 min trote suave + 3 progresiones de 60m."
  });
  sessions.push({
    date: formatDate(addDays(monday32, 6)),
    week_start: weekStart32,
    discipline: "carrera",
    planned_code: "R5 (Taper 21k)",
    is_long_run: 1,
    distance_km: 21,
    duration_min: 110,
    notes: "Tirada de Media Maratón Taper (21 km a ritmo cómodo 5:25 - 5:10/km)."
  });

  const monday33 = addDays(startFase4, 7);
  const weekStart33 = formatDate(monday33);
  sessions.push({
    date: formatDate(monday33),
    week_start: weekStart33,
    discipline: "descanso",
    planned_code: "Descanso / Movilidad",
    duration_min: 20,
    notes: "Descanso total y movilidad articular suave (15 min)."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 1)),
    week_start: weekStart33,
    discipline: "carrera",
    planned_code: "R4 (Toque Ritmo 5k)",
    distance_km: 5,
    duration_min: 25,
    notes: "Último toque de ritmo: 2 km suave + 2 km a Ritmo Maratón (5:05/km) + 1 km suave."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 2)),
    week_start: weekStart33,
    discipline: "descanso",
    planned_code: "Descanso y Carga HC",
    duration_min: 0,
    notes: "Descanso total. Iniciar carga progresiva de carbohidratos (8-10g HC/kg)."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 3)),
    week_start: weekStart33,
    discipline: "carrera",
    planned_code: "R1 (Trote 20min)",
    distance_km: 3.5,
    duration_min: 20,
    notes: "Trote regenerativo muy suave (20 min a >5:30/km) para soltar piernas."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 4)),
    week_start: weekStart33,
    discipline: "descanso",
    planned_code: "Descanso y Carga HC",
    duration_min: 0,
    notes: "Descanso, hidratación constante con sales y comida rica en arroz/pasta."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 5)),
    week_start: weekStart33,
    discipline: "carrera",
    planned_code: "R6 (Activación Pre-Carrera)",
    distance_km: 3,
    duration_min: 15,
    notes: "15 min trote muy suave + 3 rectas de 50m progresivas para activar el sistema nervioso. Dormir pronto."
  });
  sessions.push({
    date: formatDate(addDays(monday33, 6)),
    week_start: weekStart33,
    discipline: "descanso",
    planned_code: "Víspera de Carrera",
    duration_min: 0,
    notes: "Paseo de 15 min, recoger dorsal, preparar equipación, geles, zapatillas e hidratación. Cena rica en arroz/pasta con aceite."
  });

  // SEMANA 34: LUNES 26 DE ABRIL DE 2027 — DÍA DE LA MARATÓN + POST-CARRERA
  const monday34 = addDays(startFase4, 14);
  const weekStart34 = formatDate(monday34);

  sessions.push({
    date: formatDate(monday34),
    week_start: weekStart34,
    discipline: "carrera",
    planned_code: "MARATÓN (42.195 km)",
    is_long_run: 1,
    distance_km: 42.195,
    duration_min: 215,
    notes: "🏁 ¡DÍA DE LA MARATÓN! (42.195 km)\n- Objetivo de Ritmo: 5:00 - 5:15 min/km (Meta estimada: 3h30 - 3h41)\n- Estrategia: Salir conservador a 5:15/km los primeros 5K. Estabilizar a 5:05-5:10/km hasta el km 32. Si hay fuerzas, mantener o apretar a 5:00/km los últimos 10K.\n- Nutrición: 1 gel cada 40-45 min + agua/sales en cada avituallamiento (cada 20-25 min).\n- ¡A por todas y a disfrutar de cada kilómetro!"
  });

  sessions.push({
    date: formatDate(addDays(monday34, 1)),
    week_start: weekStart34,
    discipline: "descanso",
    planned_code: "Recuperación Post-Maratón",
    duration_min: 0,
    notes: "Descanso total, comida reconfortante y abundante hidratación."
  });
  sessions.push({
    date: formatDate(addDays(monday34, 2)),
    week_start: weekStart34,
    discipline: "otro",
    planned_code: "Paseo Regenerativo",
    distance_km: 3,
    duration_min: 30,
    notes: "Paseo suave de 30 min para activar circulación y reducir agujetas."
  });
  sessions.push({
    date: formatDate(addDays(monday34, 3)),
    week_start: weekStart34,
    discipline: "natacion",
    planned_code: "N (Flotación y Movilidad)",
    distance_km: 0.8,
    duration_min: 20,
    notes: "Natación muy suave, flotación y descompresión articular (800m suave)."
  });
  sessions.push({
    date: formatDate(addDays(monday34, 4)),
    week_start: weekStart34,
    discipline: "descanso",
    planned_code: "Descanso Activo",
    duration_min: 0,
    notes: "Descanso total o masaje de descarga suave."
  });
  sessions.push({
    date: formatDate(addDays(monday34, 5)),
    week_start: weekStart34,
    discipline: "otro",
    planned_code: "Paseo / Movilidad",
    distance_km: 4,
    duration_min: 40,
    notes: "Paseo y movilidad articular suave."
  });
  sessions.push({
    date: formatDate(addDays(monday34, 6)),
    week_start: weekStart34,
    discipline: "descanso",
    planned_code: "Descanso Total",
    duration_min: 0,
    notes: "Descanso completo."
  });

  // FASE 5 & 6 (Semanas 35 a 52: Mayo a Septiembre 2027)
  let startPostMaraton = new Date("2027-05-03T12:00:00Z");

  for (let w = 0; w < 18; w++) {
    const monday = addDays(startPostMaraton, w * 7);
    const weekStart = formatDate(monday);
    const semNum = w + 35;

    if (w < 2) {
      sessions.push({
        date: formatDate(monday),
        week_start: weekStart,
        discipline: "crossfit",
        planned_code: `CF Suave / Movilidad (Sem ${semNum})`,
        duration_min: 40,
        notes: `CROSSFIT Suave: Vuelta al box con foco en movilidad, técnica y cargas muy ligeras (RPE 5-6).`
      });
      sessions.push({
        date: formatDate(addDays(monday, 1)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: "R1 (Trote Suave 25min)",
        distance_km: 4.5,
        duration_min: 25,
        notes: `Trote muy suave de retorno (25 min a 5:30/km, RPE 4).`
      });
      sessions.push({
        date: formatDate(addDays(monday, 2)),
        week_start: weekStart,
        discipline: "natacion",
        planned_code: "N1 (Aeróbica 1.500m)",
        distance_km: 1.5,
        duration_min: 35,
        notes: `Natación técnica continua y suave (~1.500m).`
      });
      sessions.push({
        date: formatDate(addDays(monday, 3)),
        week_start: weekStart,
        discipline: "crossfit",
        planned_code: "CF Funcional Ligero",
        duration_min: 40,
        notes: `CrossFit funcional sin impacto ni cargas máximas.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 4)),
        week_start: weekStart,
        discipline: "descanso",
        planned_code: "Descanso Activo",
        duration_min: 20,
        notes: `Movilidad y estiramientos suaves.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 5)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: "R1 (Rodaje Cómodo 35min)",
        distance_km: 6.5,
        duration_min: 35,
        notes: `Rodaje continuo en zona R1 (5:20 - 5:00 min/km).`
      });
      sessions.push({
        date: formatDate(addDays(monday, 6)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: "R5 (Rodaje Base 8k)",
        is_long_run: 1,
        distance_km: 8,
        duration_min: 42,
        notes: `Rodaje base aeróbico suave de 8 km a 5:25 - 5:10/km.`
      });
    } else {
      const baseDistances = [10, 12, 14, 10, 12, 14, 16, 11, 13, 15, 12, 14, 16, 12, 14, 15];
      const longDist = baseDistances[w - 2] || 12;

      sessions.push({
        date: formatDate(monday),
        week_start: weekStart,
        discipline: "crossfit",
        planned_code: `Fuerza Box (Sem ${semNum})`,
        duration_min: 50,
        notes: `CROSSFIT (Fuerza y Rendimiento): Clase dirigida en Box (RPE 7-8). Foco en fuerza máxima, potencia y tren superior/core.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 1)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: "R1 (Base Aeróbica 8k)",
        distance_km: 8,
        duration_min: 42,
        notes: `RUNNING Base en zona R1 (5:23 - 4:59 min/km, RPE 4-5) + 4 progresiones de 80m.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 2)),
        week_start: weekStart,
        discipline: "natacion",
        planned_code: "N1 (Aeróbica + Técnica 2k)",
        distance_km: 2.0,
        duration_min: 45,
        notes: `NATACIÓN técnica + aeróbica: 400m calentamiento + 4x50m técnica + 8x100m crol moderado + 200m vuelta.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 3)),
        week_start: weekStart,
        discipline: "crossfit",
        planned_code: `WOD Box (Sem ${semNum})`,
        duration_min: 50,
        notes: `CROSSFIT (WOD y Condicionamiento metabólico): Clase dirigida en Box.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 4)),
        week_start: weekStart,
        discipline: "descanso",
        planned_code: "Descanso Activo",
        duration_min: 20,
        notes: `Movilidad articular y estiramientos suaves o descanso total.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 5)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: "R2 (Tempo Progresivo 10k)",
        distance_km: 10,
        duration_min: 50,
        notes: `RUNNING moderado progresivo: 2 km calentamiento + 6 km en zona R2 (4:55-4:40/km) + 2 km vuelta a la calma.`
      });
      sessions.push({
        date: formatDate(addDays(monday, 6)),
        week_start: weekStart,
        discipline: "carrera",
        planned_code: `R5 (Tirada Base ${longDist}k)`,
        is_long_run: 1,
        distance_km: longDist,
        duration_min: Math.round(longDist * 5.2),
        notes: `RUNNING Tirada Base Semanal (${longDist} km a ritmo aeróbico 5:25 - 5:10 min/km).`
      });
    }
  }

  db.prepare("DELETE FROM sessions WHERE date >= '2026-10-05'").run();

  const insertStmt = db.prepare(`
    INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, is_extra, status, duration_min, distance_km, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 'pendiente', ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const s of sessions) {
    insertStmt.run(
      s.date,
      s.week_start,
      s.discipline,
      s.planned_code || null,
      s.is_long_run ? 1 : 0,
      s.duration_min ?? null,
      s.distance_km ?? null,
      s.notes ?? null,
      now,
      now
    );
  }

  const count = db.prepare("SELECT count(*) as c FROM sessions").get();
  return NextResponse.json({ ok: true, count: count?.c, added: sessions.length });
}
