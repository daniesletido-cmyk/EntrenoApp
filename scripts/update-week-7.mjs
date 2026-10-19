import { DatabaseSync } from 'node:sqlite';

const paths = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

const weekSessions = [
  {
    date: '2026-10-19',
    week_start: '2026-10-19',
    discipline: 'carrera',
    planned_code: 'R1 (Base Aeróbica 8 km)',
    is_long_run: 0,
    duration_min: 44,
    distance_km: 8.0,
    status: 'pendiente',
    rpe: null,
    notes: 'RUNNING · Base Aeróbica en Zona R1 (8 km · ~44 min · RPE 4-5 · Carga estimada: 198 UA):\n- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Zona R1, 100% conversacional, VAM: 3:59 min/km).\n- Justificación fisiológica: Rodaje suave y fluido para sumar volumen aeróbico semanal sin fatigar la cadena posterior antes de la sesión pesada de peso muerto del martes.\n- Calentamiento: 5 min caminando a paso ligero y trote suave (>5:30/km).\n- Bloque continuo: 35 min a ritmo R1 constante con alta cadencia (175-180 ppm).\n- Vuelta a la calma: 4 min andando + estiramientos suaves de gemelos y cuádriceps.'
  },
  {
    date: '2026-10-20',
    week_start: '2026-10-19',
    discipline: 'crossfit',
    planned_code: 'CrossFit (Desafío: Fuerza Peso Muerto + WOD 3 RFT Running & Deadlifts)',
    is_long_run: 0,
    duration_min: 55,
    distance_km: 2.4,
    status: 'pendiente',
    rpe: null,
    notes: 'CROSSFIT · DÍA DE DESAFÍO (Challenge · Cadena Posterior y Potencia · ~55 min · RPE 8.5 · Carga estimada: 467 UA):\n\n1. BLOQUE DE FUERZA (Fuerza Máxima de Tracción):\n- 3 Series de 8 repeticiones de Peso Muerto (Deadlifts).\n- Progresión de carga: de moderada a pesada.\n- Puntuación: registrar el peso más alto completado con técnica impecable.\n- Enfoque biomecánico: Mantener columna neutra, activar dorsal ancho y empujar el suelo con talones y glúteos para blindar la espalda baja.\n\n2. WOD PRINCIPAL FREEDOM RX (3 Rondas por tiempo):\nCompletar en el menor tiempo posible:\n- 800 metros de Carrera (Run) a ritmo vivo.\n- 15 Pesos Muertos (Deadlifts) con barra a 102,5 kg (hombres) / 70 kg (mujeres).\n- 15 Pies a la barra (Toes to Bar).\n*Puntuación: Tiempo total empleado.\n*Estrategia táctica: En los 800m correr controlado (no sprintar) para no llegar con las pulsaciones disparadas a la barra de peso muerto; partir las series de 15 deadlifts en 8+7 o 5+5+5 para proteger la zona lumbar bajo fatiga.\n\n3. VUELTA A LA CALMA (5-10 min):\n- Descompresión espinal (colgarse relajado de la barra) y estiramientos suaves de isquiotibiales y glúteos.'
  },
  {
    date: '2026-10-21',
    week_start: '2026-10-19',
    discipline: 'natacion',
    planned_code: 'NAT (Compensatoria & Descompresión Lumbar · ~1.900m)',
    is_long_run: 0,
    duration_min: 45,
    distance_km: 1.9,
    status: 'pendiente',
    rpe: null,
    notes: 'NATACIÓN COMPENSATORIA & DESCARGA ARTICULAR (~1.900m · 45 min · RPE 5 · Carga estimada: 225 UA):\n- Justificación fisiológica: Tras el duro esfuerzo neuromuscular y de impacto en la cadena posterior del martes (peso muerto y carrera rápida), la natación con pull-buoy descomprime la columna lumbar, favorece el aclaramiento metabólico y descarga sóleos y gemelos.\n- Calentamiento: 350m suave y variado continuo (200m crol largo y relajado + 150m espalda doble para abrir la cintura escapular).\n- Bloque Técnico y Descompresión: 4x50m técnica con pull-buoy (foco en agarre alto y tracción dorsal sin batido de piernas, descanso 20s).\n- Bloque Principal (Ritmo Crucero Aeróbico): 3x (300m crol a ritmo constante y sostenido con pull-buoy + 100m crol suave regenerativo sin material) descanso 30s.\n- Vuelta a la calma: 150m espalda suave + respiración bilateral para equilibrar cuello y hombros.'
  },
  {
    date: '2026-10-22',
    week_start: '2026-10-19',
    discipline: 'crossfit',
    planned_code: 'CrossFit (Steady: WOD 5 RFT GHD Sit-ups & Burpees + Press Banca)',
    is_long_run: 0,
    duration_min: 50,
    distance_km: null,
    status: 'pendiente',
    rpe: null,
    notes: 'CROSSFIT · DÍA STEADY (Ritmo Constante · Core, Pectoral y Metabólico · ~50 min · RPE 7.5 · Carga estimada: 375 UA):\n\n1. WOD PRINCIPAL FREEDOM RX (Se realiza antes del trabajo accesorio - 5 Rondas por tiempo):\nCompletar a ritmo constante ("Steady"):\n- 20 Extensiones de tronco en GHD (GHD Sit-ups / GHDs).\n- 20 Burpees.\n*Puntuación: Tiempo total empleado.\n*Estrategia táctica: Mantener un ritmo crucero sin pausas largas. En los GHD buscar extensión controlada activando el core; en los burpees mantener respiración rítmica y cadencia constante.\n\n2. TRABAJO POST-ENTRENAMIENTO (Fuerza Accesoria de Empuje Tren Superior):\n- 5 Series de 10 repeticiones de Press de Banca (Bench Press).\n- Carga: de moderada a moderada-pesada.\n- Puntuación: Serie con el peso más alto completado.\n- Enfoque: Fortalecimiento del pectoral, tríceps y deltoides anterior, equilibrando el tren superior.\n\n3. VUELTA A LA CALMA (5-10 min):\n- Estiramiento de psoas y flexores de cadera (crucial tras los GHD) y apertura pectoral.'
  },
  {
    date: '2026-10-23',
    week_start: '2026-10-19',
    discipline: 'descanso',
    planned_code: 'Descanso Total & Asimilación Lumbo-Pélvica',
    is_long_run: 0,
    duration_min: 20,
    distance_km: null,
    status: 'pendiente',
    rpe: null,
    notes: 'DESCANSO TOTAL & ASIMILACIÓN MUSCULAR (~20 min · RPE 2 · Carga estimada: 0 UA):\n- Justificación fisiológica: Tras 100 GHD sit-ups y 100 burpees el jueves, el psoas ilíaco y la musculatura abdominal requieren reposo para recuperar longitud y evitar tirones en la cadera durante el running.\n- Rutina de movilidad: 8-10 min de foam roller suave en cuádriceps, glúteos y banda iliotibial.\n- 10 min de estiramientos específicos de psoas (couch stretch / posición de caballero) y apertura de cadera.\n- Hidratación óptima y recarga de glucógeno para el bloque de fin de semana.'
  },
  {
    date: '2026-10-24',
    week_start: '2026-10-19',
    discipline: 'carrera',
    planned_code: 'R1 (Regenerativo de Activación 6 km + 4 Rectas)',
    is_long_run: 0,
    duration_min: 32,
    distance_km: 6.0,
    status: 'pendiente',
    rpe: null,
    notes: 'RUNNING · Activación Neuromuscular (6 km · ~32 min · RPE 3-4 · Carga estimada: 112 UA):\n- Ritmo objetivo: 5:25 - 5:15 min/km (Zona R1/R0, trote muy suave regenerativo).\n- Calentamiento: 5 min trote suave.\n- Rodaje continuo: 20-25 min muy relajado.\n- Rectas de activación: 4 rectas de 80 metros en progresión técnica (80-85% de velocidad) recuperando caminando, para reactivar el arco plantar y la zancada elástica sin fatigarse.\n- Vuelta a la calma: 3 min caminando + hidratación temprana.'
  },
  {
    date: '2026-10-25',
    week_start: '2026-10-19',
    discipline: 'carrera',
    planned_code: 'R5 (Tirada Larga 16 km · Desnivel Madrid +130m D+)',
    is_long_run: 1,
    duration_min: 83,
    distance_km: 16.0,
    status: 'pendiente',
    rpe: null,
    notes: 'RUNNING · Tirada Larga Específica Maratón Madrid (16 km · +130m D+ · RPE 5-6 · Carga estimada: 473 UA):\n- Ritmo objetivo VAM: 5:25 - 5:10 min/km en tramos llanos (VAM: 3:59 min/km).\n- Bloque específico desnivel: En los últimos 4 km buscar cuestas tendidas y toboganes manteniendo el ritmo a Ritmo Maratón (5:05-5:10 min/km), simulando el perfil exigente de Madrid. Contener la amplitud de zancada en las bajadas para proteger los cuádriceps del daño excéntrico.\n- Ensayo Nutricional: Ingerir agua/sales cada 20-25 min y 1 gel isotónico en el km 8 y en el km 13.\n- Vuelta a la calma: 5 min caminando a paso lento + estiramientos completos.'
  }
];

for (const dbPath of paths) {
  const db = new DatabaseSync(dbPath);
  const selectStmt = db.prepare('SELECT id FROM sessions WHERE date = ? AND is_extra = 0 LIMIT 1');
  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET week_start = ?,
        discipline = ?,
        planned_code = ?,
        is_long_run = ?,
        duration_min = ?,
        distance_km = ?,
        status = ?,
        rpe = ?,
        notes = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO sessions (date, week_start, discipline, planned_code, is_long_run, is_extra, status, duration_min, distance_km, rpe, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const s of weekSessions) {
    const existing = selectStmt.get(s.date);
    if (existing) {
      updateStmt.run(
        s.week_start,
        s.discipline,
        s.planned_code,
        s.is_long_run,
        s.duration_min,
        s.distance_km,
        s.status,
        s.rpe,
        s.notes,
        existing.id
      );
    } else {
      insertStmt.run(
        s.date,
        s.week_start,
        s.discipline,
        s.planned_code,
        s.is_long_run,
        s.status,
        s.duration_min,
        s.distance_km,
        s.rpe,
        s.notes
      );
    }
  }
  console.log(`Semana 7 (19-25 Oct 2026) actualizada en: ${dbPath}`);
}
