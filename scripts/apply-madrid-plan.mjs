import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "entrenoapp.db");
const db = new DatabaseSync(dbPath);

const updates = [
  {
    date: "2026-10-17",
    discipline: "descanso",
    planned_code: "Descanso Activo + Rectas de Aceleración",
    distance_km: null,
    duration_min: 25,
    is_long_run: 0,
    notes: "DESCANSO ACTIVO & ACTIVACIÓN PRE-TIRADA (~25 min · RPE 2-3):\n- 15 min de movilidad articular lumbo-pélvica (cadera, glúteos, tobillos) y foam roller suave.\n- 6x60m progresiones suaves en llano con alta cadencia (180 ppm) sin fatiga, para despertar la reactividad neuromuscular de cara a la tirada dominical.\n- Hidratación constante con sales minerales y descanso temprano."
  },
  {
    date: "2026-10-18",
    discipline: "carrera",
    planned_code: "R5 (Tirada Larga 14 km · Cuestas Madrid +120m D+)",
    distance_km: 14,
    duration_min: 74,
    is_long_run: 1,
    notes: "RUNNING · Tirada Larga con Desnivel Específico Madrid (14 km · +120m D+ · RPE 5-6 · Carga: ~410 UA):\n- Ritmo objetivo VAM: 5:25 - 5:05 min/km (VAM: 3:59 min/km).\n- Calentamiento: 5 min trote muy suave (>5:30/km) + movilidad de tobillos.\n- Bloque Aeróbico Base (Km 0 a 10): 10 km continuos a ritmo R1 cómodo (5:20 - 5:10 min/km) manteniendo cadencia ágil (178 ppm) y zancada contenida en bajadas para proteger cuádriceps del impacto excéntrico.\n- Bloque Específico Simulación Cuestas (Km 10 a 14): 4 km buscando toboganes y repechos moderados (1-3% simulando Pirámides/Atocha) manteniendo el esfuerzo a ritmo maratón controlado (5:05 - 5:10 min/km).\n- Nutrición: Tomar agua o sales cada 20-25 min; 1 gel en el km 8.\n- Vuelta a la calma: 5 min andando a paso lento + estiramientos completos."
  },
  {
    date: "2026-10-20",
    discipline: "carrera",
    planned_code: "R1 + 8 Cuestas Cortas (7.5 km · Potencia Mecánica)",
    distance_km: 7.5,
    duration_min: 45,
    is_long_run: 0,
    notes: "RUNNING · Rodaje Base + Cuestas Cortas (7.5 km · Potencia Mecánica · RPE 6):\n- Calentamiento: 20 min rodaje suave en zona R1 (5:20 - 5:05 min/km) + técnica de carrera (skipping, tobillos, zarpazo reactivo).\n- Bloque de Cuestas: 8x70m en cuesta tendida (4-5% de pendiente) a ritmo vivo y potente (RPE 7-8), centrado en braceo, rodilla arriba y apoyo elástico de metatarso. Recuperación: bajada caminando despacio (cero impacto articular).\n- Vuelta a la calma: 10 min trote muy suave regenerativo (>5:30/km) + estiramientos completos de sóleos y gemelos."
  },
  {
    date: "2026-10-21",
    discipline: "natacion",
    planned_code: "NAT-C (Umbral Protegido & Pull · 1.900m)",
    distance_km: 1.9,
    duration_min: 45,
    is_long_run: 0,
    notes: "NATACIÓN · Ciclo C (Resistencia a la Fatiga & Protección Articular · ~1.900m · RPE 6):\n- Calentamiento: 350m suave alternando estilos.\n- Pre-activación: 4x50m cambios de ritmo (1º suave, 2º alegre, 3º firme, 4º suave) desc. 20s.\n- Bloque Umbral Protegido: 3x (300m a ritmo tempo medio RPE 6 con pull-buoy + 100m crol suave regenerativo sin material) desc. 30s tras cada bloque. *Objetivo biomecánico*: El pull-buoy neutraliza la fatiga de sóleos/isquios del running tras las cuestas del martes.\n- Vuelta a la calma: 200m espalda doble y braza relajada para estirar la cadena anterior y manguito rotador."
  },
  {
    date: "2026-10-23",
    discipline: "descanso",
    planned_code: "Descanso Total & Movilidad Lumbo-Pélvica",
    distance_km: null,
    duration_min: 20,
    is_long_run: 0,
    notes: "DESCANSO TOTAL & MOVILIDAD:\n- 15-20 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos) y estiramientos suaves.\n- Cero impacto articular para asimilar la semana y recargar glucógeno muscular de cara al fin de semana."
  },
  {
    date: "2026-10-24",
    discipline: "carrera",
    planned_code: "R1 Regenerativo Suave + Técnica (6 km)",
    distance_km: 6,
    duration_min: 32,
    is_long_run: 0,
    notes: "RUNNING · Regenerativo de Activación (6 km · RPE 3-4):\n- 6 km continuos muy cómodos a ritmo R1/R0 (>5:25 - 5:15 min/km).\n- 4 rectas de 80m progresivas para activar tono neuromuscular sin generar fatiga residual.\n- *Objetivo táctico*: Llevar las piernas frescas y los depósitos llenos a la tirada larga dominical de 16k."
  },
  {
    date: "2026-10-25",
    discipline: "carrera",
    planned_code: "R5 (Tirada Larga 16 km · Ondulada +150m D+)",
    distance_km: 16,
    duration_min: 84,
    is_long_run: 1,
    notes: "RUNNING · Tirada Larga de Construcción Específica Madrid (16 km · +150m D+ · RPE 5-6):\n- Base aeróbica (Km 0 a 12): 5:25 - 5:10 min/km sostenido con cadencia alta.\n- Progresión Táctica (Km 12 a 16): 4 km a Ritmo Maratón objetivo (5:00 - 5:05 min/km) en terreno ondulado con repechos.\n- Nutrición / Hidratación: 1 gel en km 8 y 1 gel en km 13 + sorbos de sales cada 20 min.\n- Vuelta a la calma: 5 min andando + estiramientos completos."
  },
  {
    date: "2026-10-27",
    discipline: "carrera",
    planned_code: "R3 (Intervalos Umbral: 4x1.200m a 4:18-4:20/km)",
    distance_km: 10,
    duration_min: 52,
    is_long_run: 0,
    notes: "RUNNING · Intervalos de Umbral Anaeróbico (R3 · VAM 3:59 min/km · ~10 km total):\n- Calentamiento: 2 km suave (5:20/km) + técnica de carrera dinámica + 4 progresiones de 60m.\n- Bloque Principal: 4x1.200m a ritmo umbral 4:18 - 4:20 min/km (recuperación activa: 90 segundos al trote muy suave a 6:00/km, no estática).\n- Vuelta a la calma: 1.5 km muy suave + estiramientos.\n- *Objetivo*: Desarrollar aclaramiento de lactato y economía de carrera a velocidades submáximas sin impacto lesivo."
  }
];

const stmtCheck = db.prepare("SELECT id FROM sessions WHERE date = ?");
const stmtUpdate = db.prepare("UPDATE sessions SET discipline = ?, planned_code = ?, distance_km = ?, duration_min = ?, is_long_run = ?, notes = ? WHERE date = ?");
const stmtInsert = db.prepare("INSERT INTO sessions (date, week_start, discipline, planned_code, distance_km, duration_min, is_long_run, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)");

for (const u of updates) {
  const existing = stmtCheck.get(u.date);
  if (existing) {
    stmtUpdate.run(u.discipline, u.planned_code, u.distance_km, u.duration_min, u.is_long_run, u.notes, u.date);
    console.log(`[ACTUALIZADO] ${u.date} -> ${u.planned_code}`);
  } else {
    const d = new Date(u.date + "T12:00:00Z");
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);
    stmtInsert.run(u.date, monday, u.discipline, u.planned_code, u.distance_km, u.duration_min, u.is_long_run, u.notes);
    console.log(`[INSERTADO] ${u.date} -> ${u.planned_code}`);
  }
}

// También actualizamos la meta del maratón en settings
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('goal_race_date', '2027-04-25')").run();
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('target_pace_scenario', '5:00 - 5:12 min/km (Sub-3h35 / 3h40)')").run();

// Asegurar que existe en goals
const existingGoal = db.prepare("SELECT id FROM goals WHERE title LIKE '%Maratón de Madrid%'").get();
if (!existingGoal) {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO goals (title, metric_type, target_value, target_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, 'activo', ?, ?, ?)").run(
    "Maratón de Madrid (Zurich R&R)",
    "tiempo_carrera",
    "Sub-3h35:00 (5:05/km)",
    "2027-04-25",
    "Objetivo A: 42.195 km con perfil ondulado de Madrid. Gestión táctica en subida final.",
    now,
    now
  );
  console.log("[OBJETIVO INSERTADO] Maratón de Madrid 2027-04-25");
}

// Ajuste de fecha del maratón exacto al Domingo 25 de Abril de 2027
db.prepare("UPDATE sessions SET discipline = 'carrera', planned_code = 'MARATÓN DE MADRID (42.195 km)', distance_km = 42.195, duration_min = 215, is_long_run = 1, notes = '¡DÍA DE LA MARATÓN DE MADRID! (42.195 km)\n- Objetivo de Ritmo: 5:00 - 5:12 min/km (Meta: Sub-3h35 / 3h40)\n- Estrategia Madrid:\n  1. Km 0-5 (Castellana): Salir cauto a 5:15-5:20/km.\n  2. Km 5-20 (Bajada centro): Rodar fluido a 5:00-5:05/km cuidando cuádriceps.\n  3. Km 20-30 (Casa de Campo): Ritmo crucero a 5:05/km.\n  4. Km 30-42 (Atocha / Alfonso XII / Retiro): La gran subida. Mantener cabeza y cadencia a 5:10-5:15/km con el corazón.\n- Nutrición: 1 gel cada 40 min + agua/sales en cada avituallamiento.\n- ¡A disfrutar de cada zancada!' WHERE date = '2027-04-25'").run();

db.prepare("UPDATE sessions SET discipline = 'descanso', planned_code = 'Recuperación Post-Maratón', distance_km = null, duration_min = 0, is_long_run = 0, notes = 'Descanso total, masaje suave, comida reconfortante y máxima hidratación. ¡Eres maratoniano de Madrid!' WHERE date = '2027-04-26'").run();

console.log("¡Planificación y fecha del Maratón de Madrid (25/04/2027) actualizadas en la base de datos con éxito!");
