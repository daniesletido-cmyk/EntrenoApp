import { DatabaseSync } from "node:sqlite";

console.log("=== LOADING COMPLETE WEEK 8 (OCT 26 - NOV 01) ===");

const week8Sessions = [
  {
    date: "2026-10-26",
    week_start: "2026-10-26",
    discipline: "natacion",
    planned_code: "NAT (Regenerativa Post-16km & Aletas · ~1.500m)",
    is_long_run: 0,
    duration_min: 45,
    distance_km: 1.5,
    notes: `NATACIÓN COMPENSATORIA & DESCARGA ARTICULAR (~1.500m · RPE 4):
- Calentamiento: 300m crol suave continuo + movilidad de cintura escapular.
- Bloque Principal con Pull-Buoy (cero impacto en piernas): 6x100m crol cómodo con pull-buoy (RPE 3-4, descanso 20s) para aislar tren superior y desmitificar la carga de la tirada de 16k de ayer.
- Bloque con Aletas (activación de retorno venoso): 4x50m nado fluido con aletas cortas a ritmo suave, focalizando en relajar sóleos, gemelos y tendones de Aquiles.
- Vuelta a la calma: 200m nado variado muy lento + 3 min flotación relajada.
- Enfoque Psicológico & Tip Mental: Aislamiento Sensorial y Calma Mental: El agua es tu cámara de descompresión. El sonido rítmico del agua y las burbujas actúa como un metrónomo meditativo; úsalo para vaciar la sobrecarga mental del día.`
  },
  {
    date: "2026-10-27",
    week_start: "2026-10-26",
    discipline: "carrera",
    planned_code: "R3 (Intervalos Umbral: 4x1.200m a 4:18-4:20/km)",
    is_long_run: 0,
    duration_min: 52,
    distance_km: 10,
    notes: `RUNNING · Intervalos de Umbral Anaeróbico (R3 · VAM 3:59 min/km · ~10 km total):
- Calentamiento: 2 km suave (5:20/km) + técnica dinámica de tobillos + 4 progresiones de 60m.
- Bloque Principal: 4x1.200m a ritmo umbral 4:18 - 4:20 min/km (recuperación activa: 90s al trote muy suave a 6:00/km, nunca estática).
- Vuelta a la calma: 1.5 km muy suave + estiramientos completos.
- Objetivo: Desarrollar aclaramiento de lactato y eficiencia a ritmo submáximo sin fatiga residual lesiva.
- Enfoque Psicológico & Tip Mental: Suspiro Fisiológico de Huberman: Durante la recuperación entre series, haz 2 inhalaciones rápidas por la nariz y una exhalación lenta y prolongada por la boca. Esto resetea el sistema nervioso parasimpático y baja las pulsaciones 10-15 lpm más rápido.`
  },
  {
    date: "2026-10-28",
    week_start: "2026-10-26",
    discipline: "gimnasio",
    planned_code: "Gimnasio Libre (Fuerza Compensatoria & Tren Superior Corredor)",
    is_long_run: 0,
    duration_min: 50,
    distance_km: null,
    notes: `GIMNASIO LIBRE · Fuerza Compensatoria & Tren Superior Corredor (RPE 7-8):
- Calentamiento: 5 min movilidad escapular con banda elástica + rotadores externos + 3 min comba muy suave.
- Bloque 1 - Fuerza Tren Superior (sin fatiga en piernas):
  1. Press Banca con Mancuernas: 4 series x 8-10 reps (RPE 7.5, bajada controlada en 2-3s).
  2. Dominadas Neutras o Jalón al Pecho: 4 series x 8 reps (pausa de 1s en contracción).
  3. Remo con Mancuerna en Banco o Remo Seal: 3 series x 10 reps (salud escapular y postura erguida).
- Bloque 2 - Fuerza Específica Preventiva de Carrera:
  4. Elevaciones de Sóleo sentado (con disco o máquina): 3 series x 15 reps (fortalecimiento del sóleo para soportar el impacto en maratón).
  5. Puente de Glúteo Unipodal Isométrico: 3 series x 25s por pierna (estabilidad de pelvis y rodilla).
- Bloque 3 - Core Anti-Rotación:
  6. Press Pallof en polea o goma: 3 series x 12 reps por lado.
  7. Plancha lateral con abducción: 3 series x 30s por lado.
- Vuelta a la calma: 5 min de estiramientos de tren superior y movilidad de tobillos.
- Enfoque Psicológico & Tip Mental: Foco Atencional Externo de Gabriele Wulf: Al empujar o traccionar, no pienses en tus músculos; piensa en empujar la barra lejos de ti o empujar el suelo con fuerza. El foco externo recluta más unidades motoras con menor fatiga neural.`
  },
  {
    date: "2026-10-29",
    week_start: "2026-10-26",
    discipline: "crossfit",
    planned_code: "CrossFit Box (Remo & Thrusters + Accesorio Hombro/Brazo)",
    is_long_run: 0,
    duration_min: 50,
    distance_km: null,
    notes: `CROSSFIT · Clase Guiada Box (Sprint & Potencia por Intervalos · Sem 8):
- Bloque Accesorio Post-Workout: 3-4 series (descanso 1:15 entre series):
  Strict Press (press de hombro estricto) + Hammer Curls (curl martillo bíceps) + Banded Tricep Extensions (tríceps con goma). Trabajo 100% de tren superior sin desgaste de piernas.
- WOD Freedom (RX): Every 3:00 (6 sets) · Intervalos cada 3 min (18 min total):
  - 15/12 Calorie Row (Remo Concept2 · cero impacto articular, tracción pura de dorsal y cadena posterior).
  - 12 Thrusters con barra de 42.5 kg (sentadilla frontal con empuje por encima de la cabeza).
  * Se puntúa el tiempo de cada serie. El tiempo que sobra de cada bloque de 3 minutos es descanso completo (aprox. 1:30 de descanso por serie).
- Enfoque Psicológico & Tip Mental: Modulación del Pánico Láctico: En los WODs asfixiantes, el cerebro interpreta el pulso alto como peligro. Mantén la mirada fija en un punto neutro, no mires al suelo con hombros caídos y respira con ritmo mecánico durante el descanso.`
  },
  {
    date: "2026-10-30",
    week_start: "2026-10-26",
    discipline: "descanso",
    planned_code: "Descanso Total & Movilidad Lumbo-Pélvica",
    is_long_run: 0,
    duration_min: 20,
    distance_km: null,
    notes: `DESCANSO TOTAL & MOVILIDAD:
- 15-20 min de movilidad articular suave: estiramiento de psoas (couch stretch), paloma para glúteos, movilidad de tobillo y descompresión lumbar.
- Cero impacto articular para asimilar el CrossFit del jueves y llegar fresco a los entrenamientos del fin de semana.
- Hidratación con sales y recarga de glucógeno para el fin de semana.
- Enfoque Psicológico & Tip Mental: Visualización Guiada del Maratón: Dedica 5 minutos de hoy a cerrar los ojos y visualizarte con dorsal, corriendo cómodo en Gran Vía y cruzando la meta del Maratón de Madrid. La mente no distingue entre experiencia vívida y realidad.`
  },
  {
    date: "2026-10-31",
    week_start: "2026-10-26",
    discipline: "carrera",
    planned_code: "R1 Regenerativo Suave + 4 Rectas (6 km)",
    is_long_run: 0,
    duration_min: 32,
    distance_km: 6,
    notes: `RUNNING · Regenerativo de Activación (6 km · RPE 3-4):
- 6 km continuos muy cómodos a ritmo R1/R0 (>5:25 - 5:15 min/km) en terreno llano de Zuera.
- 4 rectas de 80m progresivas técnicas para activar el tono neuromuscular y elasticidad de la fascia plantar sin generar fatiga previa a la tirada dominical.
- Vuelta a la calma: 3 min andando + hidratación y descanso temprano.
- Enfoque Psicológico & Tip Mental: Disciplina del Ego (Saber ir lento): Rodar despacio exige más madurez mental que rodar rápido. El atleta novato se deja llevar por el orgullo del ritmo; el profesional sabe que el rodaje regenerativo construye los capilares que le harán volar en competición.`
  },
  {
    date: "2026-11-01",
    week_start: "2026-10-26",
    discipline: "carrera",
    planned_code: "R5 (Tirada Larga 11 km · Terreno Llano Zuera)",
    is_long_run: 1,
    duration_min: 57,
    distance_km: 11,
    notes: `RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (11 km · Terreno Llano · RPE 5-6 · Carga estimada: 310 UA):
- Base aeróbica: Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (175 ppm) en terreno llano y estable de Zuera.
- Bloque específico de ritmo: En los últimos 3-4 km consolidar el Ritmo Maratón (5:05 - 5:10 min/km), priorizando la economía de carrera y el control de pulso.
- Nutrición/Hidratación: Beber agua o sales cada 20-25 min; 1 gel isotónico en el km 7 si es necesario.
- Vuelta a la calma: 5 min caminando + estiramientos completos.
- Enfoque Psicológico & Tip Mental: Estrategia de 'Chunking' (Fragmentación mental): No corras la distancia completa en tu cabeza; divídela en micro-bloques de 4 km. La mente se satura anticipando fatiga lejana, pero siempre tiene energía para completar los próximos 15 minutos.`
  }
];

for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);

  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET discipline = ?,
        planned_code = ?,
        is_long_run = ?,
        duration_min = ?,
        distance_km = ?,
        notes = ?,
        status = 'pendiente',
        updated_at = datetime('now')
    WHERE date = ?
  `);

  for (const s of week8Sessions) {
    const res = updateStmt.run(
      s.discipline,
      s.planned_code,
      s.is_long_run,
      s.duration_min,
      s.distance_km,
      s.notes,
      s.date
    );
    console.log(`[${dbPath}] Updated session for ${s.date}: changes=${res.changes}`);
  }

  db.close();
}

console.log("Week 8 successfully loaded into all databases!");
