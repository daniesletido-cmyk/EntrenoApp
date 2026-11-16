const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

const weekPlan = [
  {
    date: '2026-11-16',
    discipline: 'carrera',
    planned_code: 'R1 Base Aeróbica Suave (Reincorporación · 6 km Clave · 8 km Total)',
    duration_min: 45,
    distance_km: 8.0,
    is_long_run: 0,
    notes: `RUNNING · Base Aeróbica de Reincorporación (6 km Clave · 8.0 km Total · RPE 4):
- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote suave + movilidad articular activa de tobillos y cadera.
- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 4:59 min/km (Zona R1 Base Aeróbica)): 6.0 km continuos a ritmo cómodo y relajado para reactivar el sistema cardiovascular sin sobrecargar tras la medicación + 4 rectas progresivas de 80m para tono neuromuscular.
- Vuelta a la calma (8 min · Trote regenerativo y caminata suave + estiramientos completos): Enfriamiento gradual y descompresión muscular.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3-4 tortitas de maíz/arroz con lámina fina de membrillo o miel + agua. Cero plátano. Cero frutos secos. Digestión limpia.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Comida a las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Reincorporación Progresiva: Tras unos días de reposo por medicación, el objetivo no es recuperar el tiempo perdido, sino escuchar al cuerpo, recuperar sensaciones de fluidez y asimilar el rodaje con soltura.`
  },
  {
    date: '2026-11-17',
    discipline: 'crossfit',
    planned_code: 'CrossFit Box · "Pain Cave" (Power Clean & Jerk + Chipper 52.5 kg & Step-ups)',
    duration_min: 55,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT BOX · PAIN CAVE (Fuerza + Chipper Metabólico · RPE 7-8):
- 🟢 Calentamiento (10 min): Movilidad dinámica de cadera, tobillos y muñecas + series de aproximación con barra vacía hasta peso moderado.
- ⚡ Fuerza (Cada 2:00 min · 5 series):
  • 5 Power Clean & Jerk (Touch and Go con técnica estricta).
  • Intensidad: Moderado a Moderado-Pesado (RPE 8). Priorizar trayectoria vertical de barra y bloqueo sólido arriba.
- ⚡ WOD "Freedom" Rx (For Time):
  • 10 Box Step-ups (subidas al cajón) → ⚠️ ADAPTACIÓN FISIOTERAPIA: Realizar subidas al cajón sin rebote para proteger el tendón de Aquiles y sóleos de cara al fin de semana.
  • 50 Deadlifts (52.5 kg) → Fraccionar en series controladas (ej. 10x5 reps) manteniendo lordosis lumbar neutra.
  • 10 Box Step-ups
  • 40 Hang Power Cleans (52.5 kg)
  • 10 Box Step-ups
  • 30 Shoulder to Overhead (52.5 kg · Push Press / Push Jerk)
  • 10 Box Step-ups
  • 20 Power Clean & Jerk (52.5 kg)
  • 10 Box Step-ups
- 🔵 Vuelta a la Calma (8 min): Caminata suave y descompresión lumbar en barra (dead hang suave) + estiramiento de glúteos y cadena posterior.
- 🥗 Estrategia Nutrición (Media Mañana / Tarde):
  • Si vas a las 19:00h (habitual): Comida a las 13:30h rica en carbohidratos complejos (arroz/pasta con proteína magra). Merienda a las 17:15h: 3 tortitas de arroz con miel/membrillo o avena con leche vegetal/desnatada y semillas de chía o calabaza (100% libre de frutos secos).
  • Cena post-entreno: Buena ración de carbohidratos (arroz o patata) con proteína magra para reponer glucógeno.
- 🧠 Enfoque Psicológico & Tip Mental: Disciplina de Ritmo: En los chippers largos, empieza a un ritmo conservador del 75%, respira en cada bloqueo y prioriza la pulcritud técnica.`
  },
  {
    date: '2026-11-18',
    discipline: 'natacion',
    planned_code: 'NAT-C (Descarga Articular & Pull-buoy · 1.800m)',
    duration_min: 45,
    distance_km: 1.8,
    is_long_run: 0,
    notes: `NATACIÓN COMPENSATORIA (~1800m · RPE 5-6):
- 🟢 Calentamiento (10 min): 300m suaves variados.
- ⚡ Parte Principal (1300m): Bloque con pull-buoy para aislamiento pélvico y flotabilidad, neutralizando el impacto en gemelos, sóleos y fascia plantar tras la sesión de Box del martes.
- 🔵 Vuelta a la Calma (5 min · 200m): Nado largo, respiración bilateral y relajación de cintura escapular.
- 🥗 Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de arroz o maíz con dulce de membrillo o miel + agua. En posición horizontal en el agua el vaciado gástrico es crítico; esta combinación no produce reflujo y evita pesadez. Cero frutos secos.`
  },
  {
    date: '2026-11-19',
    discipline: 'crossfit',
    planned_code: 'CrossFit Box · "Steady" (AMRAP 24 min · Run + Air Bike Aeróbico)',
    duration_min: 50,
    distance_km: null,
    is_long_run: 0,
    notes: `CROSSFIT BOX · STEADY (Capacidad Aeróbica & Condicionamiento · RPE 6-7):
- 🟢 Calentamiento (10 min): Movilidad de tobillos, apertura de cadera y pedaleo suave en Air Bike.
- ⚡ WOD "Freedom" Rx (AMRAP 24:00 min):
  • 200 m Run suave
  • 20 Calorías Air Bike
  • 400 m Run suave
  • 20 Calorías Air Bike
  • 600 m Run suave
  • 20 Calorías Air Bike
- ⚠️ ADAPTACIÓN FISIOTERAPIA & PREPARADOR:
  • Trabajo enfocado en "Motor Aeróbico" (Steady State / Z2-Z3 controlada).
  • Mantén cadencia regular y respiración rítmica (RPE 6-7).
  • En la carrera, zancada fluida y económica. Cero impacto de barra pesada, lo que deja tus piernas libres de agujetas para el fin de semana.
- 🔵 Vuelta a la Calma (8 min): 5-8 min pedaleo regenerativo suave en Air Bike (<30 RPM) + estiramientos de cuádriceps, psoas y gemelos.
- 🥗 Estrategia Nutrición: Merienda a las 17:15h. Cena post-entreno con buena ración de carbohidratos (patata o arroz) + pescado o pollo. Cero frutos secos.
- 🧠 Enfoque Psicológico & Tip Mental: El Poder del Ritmo Crucero: Encuentra una velocidad en la bici y en la carrera que puedas sostener durante los 24 minutos exactos sin caídas de rendimiento.`
  },
  {
    date: '2026-11-20',
    discipline: 'descanso',
    planned_code: 'Descanso Total & Movilidad Lumbo-Pélvica',
    duration_min: 20,
    distance_km: null,
    is_long_run: 0,
    notes: `DESCANSO TOTAL & MOVILIDAD:
- 🟢 15-20 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos, tobillos) y estiramientos suaves.
- Cero impacto articular para asimilar los dos días de CrossFit y recargar glucógeno de cara al fin de semana.
- 🥗 Estrategia Nutrición: Hidratación constante durante el día. Comida y cena completas sin restricción calórica.
- 🧠 Enfoque Psicológico & Tip Mental: Visualización Guiada del Maratón: Dedica 5 minutos de hoy a cerrar los ojos y visualizarte con dorsal, corriendo cómodo y cruzando la meta del Maratón.`
  },
  {
    date: '2026-11-21',
    discipline: 'carrera',
    planned_code: 'R1 Regenerativo Suave + Técnica (6 km Clave · 8 km Total)',
    duration_min: 45,
    distance_km: 8.0,
    is_long_run: 0,
    notes: `RUNNING · Regenerativo de Activación (6 km Clave · 8.0 km Total · RPE 3-4):
- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote muy suave progresivo + movilidad articular activa de tobillos y rodillas.
- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 5:10 min/km (Zona R1/R0)): 6.0 km continuos muy cómodos a ritmo suave y relajado + 4 rectas de 80m progresivas para activar tono neuromuscular sin generar fatiga previa a la tirada larga dominical.
- Vuelta a la calma (8 min · Trote muy suave > 6:00 min/km y caminata + estiramientos completos): Enfriamiento gradual y descompresión muscular.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 12:00h): 3 tortitas de maíz con 2 lonchas de pechuga de pavo o toque de mermelada + agua. Digestión muy ligera, energía estable sin sobrecargar el estómago. Cero plátano. Cero frutos secos.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Reserva todo el apetito para la comida de las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Disciplina del Ego: Rodar despacio construye los capilares y la base mitocondrial para volar en la tirada larga del domingo.`
  },
  {
    date: '2026-11-22',
    discipline: 'carrera',
    planned_code: 'R5 (Tirada Larga 18k en Zuera · 21.5 km Total)',
    duration_min: 115,
    distance_km: 21.5,
    is_long_run: 1,
    notes: `RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (18 km Clave · 21.5 km Total · RPE 5-6):
- Calentamiento (12 min · ~Ritmo > 5:30 min/km · R0 suave): Trote muy suave progresivo + movilidad dinámica de tobillos y cadera.
- Parte principal (18.0 km · ~94 min · Ritmo: 5:25 - 5:10 min/km (Zona R1 · Cierre últimos 3-4 km a 5:05 - 5:10/km Ritmo Maratón)): Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (178-180 ppm) y contención de zancada en bajadas para mitigar el daño excéntrico en cuádriceps. En los últimos 3-4 km consolidar el Ritmo Maratón en terreno llano de Zuera, priorizando la economía de carrera y el control de pulso.
- Vuelta a la calma (10 min · Trote muy suave > 6:00 min/km / Caminata + estiramientos completos): Enfriamiento gradual y rutina de estiramientos.
- Nutrición/Hidratación: Beber agua o sales cada 20-25 min; 1 gel isotónico cada 40-45 min. Cero frutos secos.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 12:00h): 3 tortitas de maíz con 2 lonchas de pechuga de pavo o toque de mermelada + agua. Digestión muy ligera. Cero plátano. Cero frutos secos.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Comida a las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Estrategia de 'Chunking': No corras la distancia completa en tu cabeza; divídela en micro-bloques de 4 km para mantener la fluidez.`
  }
];

const now = new Date().toISOString();

for (const dbPath of dbs) {
  const fullPath = path.resolve(process.cwd(), dbPath);
  console.log(`Actualizando [${dbPath}]...`);
  const db = new DatabaseSync(fullPath);

  for (const session of weekPlan) {
    const existing = db.prepare('SELECT id, status, fit_data FROM sessions WHERE date = ?').get(session.date);
    if (existing) {
      if (existing.status === 'realizada' || existing.fit_data !== null) {
        console.log(`  - ${session.date}: Sesión ya realizada (${existing.id}), preservada.`);
        continue;
      }
      db.prepare(`
        UPDATE sessions SET
          discipline = ?,
          planned_code = ?,
          duration_min = ?,
          distance_km = ?,
          is_long_run = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        session.discipline,
        session.planned_code,
        session.duration_min,
        session.distance_km,
        session.is_long_run,
        session.notes,
        now,
        existing.id
      );
      console.log(`  - ${session.date}: Sesión ${existing.id} actualizada.`);
    } else {
      db.prepare(`
        INSERT INTO sessions (
          date, week_start, discipline, planned_code, duration_min, distance_km,
          is_long_run, is_extra, notes, status, created_at, updated_at
        ) VALUES (?, '2026-11-16', ?, ?, ?, ?, ?, 0, ?, 'pendiente', ?, ?)
      `).run(
        session.date,
        session.discipline,
        session.planned_code,
        session.duration_min,
        session.distance_km,
        session.is_long_run,
        session.notes,
        now,
        now
      );
      console.log(`  - ${session.date}: Nueva sesión creada.`);
    }
  }
}

console.log('✅ Plan semanal actualizado con éxito en ambas bases de datos.');
