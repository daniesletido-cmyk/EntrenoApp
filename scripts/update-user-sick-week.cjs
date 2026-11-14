/**
 * Script de actualización de sesiones para recuperación de Dani y semana con CrossFit Mar/Jue
 * Actualiza simultáneamente data/entrenoapp.db y seed/entrenoapp.db
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

const updates = [
  {
    id: 494,
    date: '2026-11-14',
    discipline: 'caminata',
    planned_code: 'Paseo Suave Regenerativo (~30-40 min)',
    duration_min: 35,
    distance_km: 3.0,
    is_long_run: 0,
    status: 'pendiente',
    notes: `CAMINATA · Paseo Suave Regenerativo (Recuperación Activa · 30-40 min · RPE 2-3):
- Objetivo: Oxigenar musculatura y activar la circulación sin fatiga ni impacto articular, favoreciendo la recuperación del organismo tras la semana de medicación (paracetamol e ibuprofeno).
- Pauta: Caminar relajado al aire libre, respiración nasal cómoda y constante. Cero pulsaciones elevadas.
- Hidratación: Beber agua a pequeños sorbos a lo largo del paseo y del día.
- Estrategia Nutrición: Alimentos ligeros de fácil digestión, fruta fresca, avena y semillas seguras (calabaza o chía). Cero frutos secos.`
  },
  {
    id: 495,
    date: '2026-11-15',
    discipline: 'caminata',
    planned_code: 'Paseo Suave Regenerativo (~35-45 min · Sustituye Tirada Larga)',
    duration_min: 40,
    distance_km: 3.5,
    is_long_run: 0,
    status: 'pendiente',
    notes: `CAMINATA · Paseo Suave Regenerativo (Sustituye Tirada Larga · RPE 2-3):
- Objetivo: Proteger la salud general y la función renal. Con la pauta de paracetamol e ibuprofeno alternados, someter al cuerpo a 16-19 km de impacto y deshidratación hubiera sido una imprudencia médica.
- Pauta: Paseo continuo y tranquilo de 35-45 min en terreno llano. Ritmo de conversación suave.
- Hidratación y Descanso: Continuar con abundante agua para limpiar metabolitos de la medicación. Tarde de sofá, descanso y siesta reparadora.
- Enfoque Psicológico: Madurez deportiva. Suspender la tirada larga en estas circunstancias es la decisión correcta para no hipotecar las siguientes semanas de preparación del maratón.`
  },
  {
    id: 496,
    date: '2026-11-16',
    discipline: 'carrera',
    planned_code: 'R1 Base Aeróbica Suave (Reincorporación · 6 km Clave · 8 km Total)',
    duration_min: 45,
    distance_km: 8.0,
    is_long_run: 0,
    status: 'pendiente',
    notes: `RUNNING · Base Aeróbica de Reincorporación (6 km Clave · 8.0 km Total · RPE 4):
- Calentamiento (1.0 km · ~6 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): 10 min trote suave + movilidad articular activa de tobillos y cadera.
- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 4:59 min/km (Zona R1 Base Aeróbica)): 6.0 km continuos a ritmo cómodo y relajado para reactivar el sistema cardiovascular sin sobrecargar tras la medicación + 4 rectas progresivas de 80m para tono neuromuscular.
- Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): 5-6 min caminata y estiramientos suaves.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3-4 tortitas de maíz/arroz con lámina fina de membrillo o miel + agua. Cero plátano. Digestión limpia.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Comida a las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Reincorporación Progresiva: Tras unos días de reposo por medicación, el objetivo no es recuperar el tiempo perdido, sino escuchar al cuerpo, recuperar sensaciones de fluidez y asimilar el rodaje con soltura.`
  },
  {
    id: 497,
    date: '2026-11-17',
    discipline: 'crossfit',
    planned_code: 'Fuerza Box (Sem 11 · Sentadilla y Fuerza Básica)',
    duration_min: 50,
    distance_km: null,
    is_long_run: 0,
    status: 'pendiente',
    notes: `CROSSFIT (Fuerza y Potencia · Sem 11):
- Enfoque en progresión de sentadilla trasera/frontal, peso muerto y estabilidad escapular.
- Trabajo accesorio de glúteos e isquiotibiales para blindar la rodilla de cara al impacto en carrera.
- Clase dirigida en Box, RPE 7-8.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de maíz con 35g de pechuga de pavo (o 1 yogur proteico bajo en grasa del Día + 2 tortitas). Sin plátano. Aporte proteico y glucosa limpia para no tener fatiga neuromuscular ni sensación de pesadez en saltos/cargas.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana para no restar hambre a la comida de las 13:30h. Merienda proteica a las 16:15h.
- Enfoque Psicológico & Tip Mental: Ritual Pre-Levantamiento: Diseña una rutina fija de 5 segundos antes de tocar la barra (tiza, 2 respiraciones diafragmáticas, fijar la mirada al frente). La rutina da seguridad y silencia las dudas previas al esfuerzo.`
  },
  {
    id: 498,
    date: '2026-11-18',
    discipline: 'natacion',
    planned_code: 'NAT-C (Umbral Protegido & Pull · 1.900m)',
    duration_min: 45,
    distance_km: 1.9,
    is_long_run: 0,
    status: 'pendiente',
    notes: `NATACIÓN COMPENSATORIA (~1900m · RPE 6):
- 350m calentamiento suave variado.
- Bloque con pull-buoy para aislamiento pélvico y flotabilidad, neutralizando el impacto en gemelos, sóleos y fascia plantar tras la sesión de Box del martes.
- Vuelta a la calma con nado largo y relajación de cintura escapular.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de arroz o maíz con dulce de membrillo o miel + un par de sorbos de agua. En posición horizontal en el agua el vaciado gástrico es crítico; esta combinación no produce reflujo y evita pesadez.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo, té o agua a media mañana. Almuerzas a las 13:30h y merienda suave a las 16:15h.
- Enfoque Psicológico & Tip Mental: Aislamiento Sensorial y Calma Mental: El agua es tu cámara de descompresión. El sonido rítmico del agua y las burbujas actúa como un metrónomo meditativo; úsalo para vaciar la sobrecarga mental del día.`
  },
  {
    id: 499,
    date: '2026-11-19',
    discipline: 'crossfit',
    planned_code: 'WOD Box (Sem 11 · Condicionamiento)',
    duration_min: 50,
    distance_km: null,
    is_long_run: 0,
    status: 'pendiente',
    notes: `CROSSFIT (WOD y Condicionamiento · Sem 11):
- Clase dirigida en Box, RPE 7-8.
- Dosificar impacto excéntrico repetitivo en gemelos y tendones de cara al rodaje y tirada del fin de semana.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de maíz con 35g de pechuga de pavo (o 1 yogur proteico bajo en grasa del Día + 2 tortitas). Sin plátano. Aporte proteico y glucosa limpia para no tener fatiga neuromuscular ni sensación de pesadez en saltos/cargas.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana para no restar hambre a la comida de las 13:30h. Merienda proteica a las 16:15h.
- Enfoque Psicológico & Tip Mental: Modulación del Pánico Láctico: En los WODs asfixiantes, el cerebro interpreta el pulso alto como peligro. Mantén la mirada fija en un punto neutro, no mires al suelo con hombros caídos y respira con ritmo mecánico.`
  },
  {
    id: 500,
    date: '2026-11-20',
    discipline: 'descanso',
    planned_code: 'Descanso Total & Movilidad Lumbo-Pélvica',
    duration_min: 20,
    distance_km: null,
    is_long_run: 0,
    status: 'pendiente',
    notes: `DESCANSO TOTAL & MOVILIDAD:
- 15-20 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos, tobillos) y estiramientos suaves.
- Cero impacto articular para asimilar los dos días de CrossFit y recargar glucógeno de cara al fin de semana.
- Estrategia Nutrición (Media Mañana):
  • Media mañana (11:30h – 12:00h): Café solo, infusión o agua. No hay gasto de glucógeno previo, por lo que reservas todo el apetito para disfrutar de la comida completa de las 13:30h.
- Enfoque Psicológico & Tip Mental: Visualización Guiada del Maratón: Dedica 5 minutos de hoy a cerrar los ojos y visualizarte con dorsal, corriendo cómodo en Gran Vía y cruzando la meta del Maratón de Madrid. La mente no distingue entre experiencia vívida y realidad.`
  },
  {
    id: 501,
    date: '2026-11-21',
    discipline: 'carrera',
    planned_code: 'R1 Regenerativo Suave + Técnica (6 km Clave · 8 km Total)',
    duration_min: 45,
    distance_km: 8.0,
    is_long_run: 0,
    status: 'pendiente',
    notes: `RUNNING · Regenerativo de Activación (6 km Clave · 8.0 km Total · RPE 3-4):
- Calentamiento (1.0 km · ~6 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): 5-10 min trote muy suave progresivo (>5:30/km) + movilidad articular activa de tobillos y rodillas.
- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 5:10 min/km (Zona R1/R0)): 6.0 km continuos muy cómodos a ritmo suave y relajado + 4 rectas de 80m progresivas para activar tono neuromuscular sin generar fatiga previa a la tirada larga dominical.
- Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): 5 min caminando o trote regenerativo muy suave + estiramientos completos.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 12:00h): 3 tortitas de maíz con 2 lonchas de pechuga de pavo o toque de mermelada + agua. Digestión muy ligera, energía estable sin sobrecargar el estómago. Cero plátano.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Reserva todo el apetito para la comida de las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Disciplina del Ego (Saber ir lento): Rodar despacio exige más madurez mental que rodar rápido. El atleta novato se deja llevar por el orgullo del ritmo; el profesional sabe que el rodaje regenerativo construye los capilares que le harán volar en competición.`
  },
  {
    id: 502,
    date: '2026-11-22',
    discipline: 'carrera',
    planned_code: 'R5 (Tirada Larga 18k en Zuera · 21.5 km Total)',
    duration_min: 115,
    distance_km: 21.5,
    is_long_run: 1,
    status: 'pendiente',
    notes: `RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (18 km Clave · 21.5 km Total · RPE 5-6):
- Calentamiento (2.0 km · ~12 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): 10-12 min trote muy suave (>5:30/km) + movilidad dinámica de tobillos y cadera.
- Parte principal (18.0 km · ~94 min · Ritmo: 5:25 - 5:10 min/km (Zona R1 · Cierre últimos 3-4 km a 5:05 - 5:10/km Ritmo Maratón)): Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (178-180 ppm) y contención de zancada en bajadas para mitigar el daño excéntrico en cuádriceps. En los últimos 3-4 km consolidar el Ritmo Maratón en terreno llano de Zuera, priorizando la economía de carrera y el control de pulso.
- Vuelta a la calma (1.5 km · ~9 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): 5-8 min caminando + estiramientos completos.
- Nutrición/Hidratación: Beber agua o sales cada 20-25 min; 1 gel isotónico cada 40-45 min.
- Estrategia Nutrición (Media Mañana):
  • Si entrenas a las 13:30h (tomar 12:00h): 3 tortitas de maíz con 2 lonchas de pechuga de pavo o toque de mermelada + agua. Digestión muy ligera. Cero plátano.
  • Si entrenas por la tarde (comes a las 13:30h): Café solo o infusión a media mañana. Comida a las 13:30h y merienda a las 16:15h.
- Enfoque Psicológico & Tip Mental: Estrategia de 'Chunking' (Fragmentación mental): No corras la distancia completa en tu cabeza; divídela en micro-bloques de 4 km. La mente se satura anticipando fatiga lejana, pero siempre tiene energía para completar los próximos 15 minutos.`
  }
];

for (const dbPath of dbs) {
  const fullPath = path.resolve(process.cwd(), dbPath);
  const db = new DatabaseSync(fullPath);
  console.log(`Aplicando actualización en [${dbPath}]...`);

  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET discipline = ?,
        planned_code = ?,
        duration_min = ?,
        distance_km = ?,
        is_long_run = ?,
        notes = ?,
        updated_at = datetime('now')
    WHERE id = ? AND date = ?
  `);

  for (const u of updates) {
    updateStmt.run(
      u.discipline,
      u.planned_code,
      u.duration_min,
      u.distance_km,
      u.is_long_run,
      u.notes,
      u.id,
      u.date
    );
  }
  console.log(`✅ [${dbPath}] actualizado con éxito.`);
}
console.log('🎉 Sincronización dual de sesiones completada.');
