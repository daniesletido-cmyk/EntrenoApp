import { DatabaseSync } from 'node:sqlite';

const paths = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

for (const dbPath of paths) {
  const db = new DatabaseSync(dbPath);

  // 12 Octubre (Lunes - Descanso)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'descanso',
        planned_code = 'Descanso / Sin entrenamiento',
        status = 'no_realizada',
        duration_min = 0,
        distance_km = NULL,
        rpe = NULL,
        notes = 'DESCANSO (Día libre sin entrenamiento):\n- Lunes no se entrenó (0 min de actividad).\n- Carga acumulada: 0 UA.',
        updated_at = datetime('now')
    WHERE date = '2026-10-12'
  `).run();

  // 13 Octubre (Martes - Natación Realizada)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'natacion',
        planned_code = 'NAT (Base Aeróbica & Descompresión Articular)',
        status = 'realizada',
        duration_min = 45,
        distance_km = 2,
        rpe = 5,
        notes = 'NATACIÓN · Base Aeróbica y Preparación Articular (~2.000m · 45 min · RPE 5 · Carga estimada: 225 UA):\n- Justificación de carga: Ayer descansaste (0 UA); hoy realizas natación técnica aeróbica para preparar el sistema cardiovascular y proteger los hombros/gemelos antes del CrossFit del miércoles y viernes.\n- Calentamiento: 350m suave y variado continuo (200m crol largo y relajado + 150m espalda suave para abrir la cintura escapular).\n- Técnica y Eficiencia: 4x50m técnica con pull-buoy (foco en agarre alto y tracción dorsal fluida, descanso 20s).\n- Bloque Principal: 4x250m crol a ritmo constante y sostenido en zona aeróbica cómoda (descanso 30s).\n- Descarga continua: 200m nado continuo suave.\n- Vuelta a la calma: 150m espalda suave + respiración bilateral.',
        updated_at = datetime('now')
    WHERE date = '2026-10-13'
  `).run();

  // 14 Octubre (Miércoles - CrossFit Realizado)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'crossfit',
        planned_code = 'CrossFit WOD (Steady: Habilidad Pino + 5 Rondas Running & Wall Walks)',
        status = 'realizada',
        duration_min = 50,
        distance_km = NULL,
        rpe = 7.5,
        notes = 'CROSSFIT · DÍA STEADY (Constante y sostenido · Duración ~50 min · RPE 7.5 · Carga estimada: 375 UA):\n\n1. BLOQUE DE FUERZA Y TÉCNICA (10:00 min de práctica):\n- Handstand Walk, Handstand Hold y estabilidad de hombros.\n\n2. WOD PRINCIPAL FREEDOM RX (5 Rondas por tiempo):\n- 400m Carrera continua (Run)\n- 50 Saltos dobles comba (Double Unders)\n- 5 Caminatas a la pared (Wall Walks)\n\n3. VUELTA A LA CALMA (5-10 min):\n- Estiramientos suaves de hombros y descarga de gemelos.',
        updated_at = datetime('now')
    WHERE date = '2026-10-14'
  `).run();

  // 15 Octubre (Jueves - Carrera R1 Realizada)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'carrera',
        planned_code = 'R1 (Rodaje Regenerativo Suave VAM)',
        status = 'realizada',
        duration_min = 38,
        distance_km = 6.5,
        rpe = 4.5,
        notes = 'RUNNING · Rodaje Regenerativo en Zona R1 (~6.5 km · ~38 min · RPE 4-5 · Carga estimada: 171 UA):\n- Ritmo objetivo VAM: 5:25 - 4:59 min/km (Zona R1, 100% conversacional, VAM: 3:59 min/km).\n- Calentamiento: 5 min trote suave.\n- 30 min continuo a ritmo R1 suave.\n- 3x60m progresiones suaves soltando piernas.\n- Vuelta a la calma: 5 min andando + estiramientos.',
        updated_at = datetime('now')
    WHERE date = '2026-10-15'
  `).run();

  // 16 Octubre (Viernes - CrossFit Realizado)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'crossfit',
        planned_code = 'CrossFit WOD (Sprint: 8 Series Front Squat + Intervalos Box Step Overs)',
        status = 'realizada',
        duration_min = 50,
        distance_km = NULL,
        rpe = 8.5,
        notes = 'CROSSFIT · DÍA SPRINT (Máxima potencia láctica · Duración ~50 min · RPE 8.5 · Carga estimada: 425 UA):\n\n1. BLOQUE DE FUERZA (8 Series de 2 reps):\n- 8 Series de 2 Sentadillas Frontales (Front Squats) con descanso estricto de 1 min.\n\n2. WOD PRINCIPAL FREEDOM RX (Cada 3:30 min durante 5 Series):\n- 8 Sentadillas Frontales (60 kg)\n- 16 Pasos cajón (Box Step Overs)\n- 8 Sentadillas Frontales (60 kg)\n\n3. VUELTA A LA CALMA (5-10 min):\n- Movilidad flexores cadera y descarga lumbar.',
        updated_at = datetime('now')
    WHERE date = '2026-10-16'
  `).run();

  // 17 Octubre (Sábado - Descanso Activo Realizado)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'descanso',
        planned_code = 'Descanso Activo & Movilidad Lumbo-Pélvica',
        status = 'realizada',
        duration_min = 20,
        distance_km = NULL,
        rpe = 2,
        notes = 'DESCANSO ACTIVO · Recuperación Lumbo-Pélvica (~20 min · RPE 2 · Carga estimada: 0 UA):\n- 8-10 min foam roller en cuádriceps, glúteos y gemelos.\n- 10 min movilidad de cadera (couch stretch, paloma, rotación torácica).\n- Cero impacto articular.',
        updated_at = datetime('now')
    WHERE date = '2026-10-17'
  `).run();

  // 18 Octubre (Domingo - Tirada Larga PENDIENTE para hoy)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'carrera',
        planned_code = 'R5 (Tirada Larga de Volumen 14 km)',
        status = 'pendiente',
        duration_min = 74,
        distance_km = 14,
        rpe = NULL,
        notes = 'RUNNING · Tirada Larga de Volumen Semanal (14 km · ~74 min · RPE 5-6 · Carga estimada: 407 UA):\n- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Ritmo aeróbico cómodo sostenido, VAM: 3:59 min/km).\n- Calentamiento: 5 min trote suave + movilidad tobillos.\n- Bloque volumen: 14 km continuos a cadencia estable (175 ppm).\n- Hidratación: Agua/sales cada 20 min; 1 gel en km 8-9.\n- Vuelta a la calma: 5 min caminando + estiramientos.',
        updated_at = datetime('now')
    WHERE date = '2026-10-18'
  `).run();

  console.log(`Base de datos actualizada con éxito: ${dbPath}`);
}
