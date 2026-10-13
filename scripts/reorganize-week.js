const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPaths = [
  path.resolve('data/entrenoapp.db'),
  path.resolve('seed/entrenoapp.db')
];

const sessionsToUpdate = [
  {
    id: 461,
    date: '2026-10-12',
    discipline: 'descanso',
    planned_code: 'Descanso / Sin entrenamiento',
    status: 'no_realizada',
    duration_min: 0,
    distance_km: null,
    rpe: null,
    is_long_run: 0,
    notes: `DESCANSO (Día libre sin entrenamiento):\n- Ayer lunes no se entrenó (0 min de actividad).\n- Carga acumulada: 0 UA.`
  },
  {
    id: 462,
    date: '2026-10-13',
    discipline: 'natacion',
    planned_code: 'NAT (Base Aeróbica & Descompresión Articular)',
    status: 'pendiente',
    duration_min: 45,
    distance_km: 2.0,
    rpe: 5,
    is_long_run: 0,
    notes: `NATACIÓN · Base Aeróbica y Preparación Articular (~2.000m · 45 min · RPE 5 · Carga estimada: 225 UA):
- Justificación de carga: Ayer descansaste (0 UA); hoy realizas natación técnica aeróbica para preparar el sistema cardiovascular y proteger los hombros/gemelos antes del CrossFit del miércoles y viernes.
- Calentamiento: 350m suave y variado continuo (200m crol largo y relajado + 150m espalda suave para abrir la cintura escapular).
- Técnica y Eficiencia: 4x50m técnica con pull-buoy (foco en agarre alto y tracción dorsal fluida, descanso 20s). *Objetivo*: Alinear cadera y soltar piernas.
- Bloque Principal (Ritmo Crucero Aeróbico): 4x250m crol a ritmo constante y sostenido en zona aeróbica cómoda (descanso 30s entre bloques). *Recomendación*: Realizar las series 1 y 3 con pull-buoy para aislar gemelos y sóleos de cara a la carrera del miércoles.
- Descarga continua: 200m nado continuo suave a estilo libre.
- Vuelta a la calma: 150m espalda suave + respiración bilateral para equilibrar hombros y cuello. Cero fatiga acumulada.`
  },
  {
    id: 463,
    date: '2026-10-14',
    discipline: 'crossfit',
    planned_code: 'CrossFit WOD (Steady: Habilidad Pino + 5 Rondas Running & Wall Walks)',
    status: 'pendiente',
    duration_min: 50,
    distance_km: null,
    rpe: 7.5,
    is_long_run: 0,
    notes: `CROSSFIT · DÍA STEADY (Constante y sostenido · Duración ~50 min · RPE 7.5 · Carga estimada: 375 UA):

1. BLOQUE DE FUERZA Y TÉCNICA (10:00 minutos de práctica):
- Práctica de caminar haciendo el pino (Handstand Walk), mantenimiento de la vertical invertida estática (Handstand Hold) y estabilidad de hombros por encima de la cabeza (Overhead Stability).
- Enfoque: Trabajo de desarrollo de habilidad y control neuromuscular. Sin medición ni carga máxima; priorizar la técnica limpia.

2. WOD PRINCIPAL FREEDOM RX (Por Tiempo - 5 Rondas completas):
Completar en el menor tiempo posible:
- 400 metros de Carrera continua (Run)
- 50 Saltos dobles a la comba (Double Unders)
- 5 Caminatas a la pared / Escaladas de pared (Wall Walks)
*Puntuación: Tiempo total cronometrado.
*Ritmo objetivo: Ritmo "Steady" (controlado y sin paradas largas), gestionando la fatiga de hombros en los wall walks y el impacto en gemelos de la comba.

3. VUELTA A LA CALMA (5-10 min):
- Estiramientos suaves de hombros (manguito rotador, pectorales) y descarga de gemelos y fascia plantar.`
  },
  {
    id: 464,
    date: '2026-10-15',
    discipline: 'carrera',
    planned_code: 'R1 (Rodaje Regenerativo Suave VAM)',
    status: 'pendiente',
    duration_min: 38,
    distance_km: 6.5,
    rpe: 4.5,
    is_long_run: 0,
    notes: `RUNNING · Rodaje Regenerativo en Zona R1 (~6.5 km · ~38 min · RPE 4-5 · Carga estimada: 171 UA):
- Ritmo objetivo VAM: 5:25 - 4:59 min/km (Zona R1, 100% conversacional, VAM: 3:59 min/km).
- Justificación de carga: Recuperar activamente la musculatura tras la carrera y saltos de comba del miércoles, manteniendo las piernas frescas para el esfuerzo de sentadillas pesadas del viernes.
- Calentamiento: 5 min caminando a paso ligero y trote muy suave (>5:30/km).
- Cuerpo principal: 30 min continuo a ritmo R1 suave, pisada elástica y cadencia alta (175-180 ppm).
- Técnica final: 3x60m progresiones suaves soltando piernas (sin sprintar).
- Vuelta a la calma: 3-5 min andando + estiramientos de sóleos y cuádriceps.`
  },
  {
    id: 465,
    date: '2026-10-16',
    discipline: 'crossfit',
    planned_code: 'CrossFit WOD (Sprint: 8 Series Front Squat + Intervalos Box Step Overs)',
    status: 'pendiente',
    duration_min: 50,
    distance_km: null,
    rpe: 8.5,
    is_long_run: 0,
    notes: `CROSSFIT · DÍA SPRINT (Máxima potencia láctica · Duración ~50 min · RPE 8.5 · Carga estimada: 425 UA):

1. BLOQUE DE FUERZA (8 Series de 2 repeticiones):
- 8 Series de 2 Sentadillas Frontales (Front Squats).
- Descanso estricto de 1:00 minuto entre series.
- Objetivo: Construir peso progresivamente hacia carga pesada. El resultado es el peso más pesado completado con técnica perfecta.

2. WOD PRINCIPAL FREEDOM RX (Cada 3:30 min durante 5 Series):
En cada intervalo de 3:30 min, realizar a ritmo de SPRINT:
- 8 Sentadillas Frontales (Front Squats con 60 kg chicos / 42.5 kg chicas · 135/95 lbs)
- 16 Pasos por encima del cajón (Box Step Overs con cajón de 61 cm / 50 cm · pueden ser laterales o de frente)
- 8 Sentadillas Frontales (Front Squats con 60 kg chicos / 42.5 kg chicas · 135/95 lbs)
*Puntuación: Registrar el tiempo de cada serie individual. El tiempo restante hasta completar los 3:30 min es tu descanso antes de la siguiente serie.
*Estrategia: Salir fuerte en cada intervalo buscando mantener un tiempo consistente entre las 5 rondas.

3. VUELTA A LA CALMA (5-10 min):
- Movilidad y descompresión de flexores de cadera, cuádriceps y zona lumbar.`
  },
  {
    id: 466,
    date: '2026-10-17',
    discipline: 'descanso',
    planned_code: 'Descanso Activo & Movilidad Lumbo-Pélvica',
    status: 'pendiente',
    duration_min: 20,
    distance_km: null,
    rpe: 2,
    is_long_run: 0,
    notes: `DESCANSO ACTIVO · Recuperación Lumbo-Pélvica (~20 min · RPE 2 · Carga estimada: 0 UA):
- Justificación de carga: Tras el alto volumen e impacto excéntrico de sentadillas frontales pesadas y saltos del viernes (425 UA), el sábado se dedica a descompresión para asimilar la carga y llegar en óptimas condiciones a la tirada larga del domingo.
- 8-10 min de foam roller en cuádriceps, glúteos, banda iliotibial y gemelos.
- 10 min de movilidad articular de cadera (couch stretch para psoas, paloma para glúteos y rotación torácica).
- Cero impacto articular de cara a la tirada larga del domingo.`
  },
  {
    id: 467,
    date: '2026-10-18',
    discipline: 'carrera',
    planned_code: 'R5 (Tirada Larga de Volumen 14 km)',
    status: 'pendiente',
    duration_min: 74,
    distance_km: 14.0,
    rpe: 5.5,
    is_long_run: 1,
    notes: `RUNNING · Tirada Larga de Volumen Semanal (14 km · ~74 min · RPE 5-6 · Carga estimada: 407 UA):
- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Ritmo aeróbico cómodo sostenido, VAM: 3:59 min/km).
- Justificación de carga: Es el bloque principal de volumen aeróbico semanal. Llegarás con las piernas descansadas tras el sábado sin impacto.
- Calentamiento: 5 min trote muy suave (>5:30/km) + movilidad de tobillos.
- Bloque de volumen: 14 km continuos manteniendo pulsaciones controladas y cadencia estable (175 ppm).
- Hidratación / Nutrición: Tomar agua o sales cada 20-25 minutos; 1 gel isotónico en el km 8-9 si es necesario.
- Vuelta a la calma: 5 min andando a paso lento + estiramientos completos.`
  }
];

dbPaths.forEach(dbPath => {
  if (!fs.existsSync(dbPath)) return;
  console.log('Updating db at:', dbPath);
  const db = new DatabaseSync(dbPath);

  const stmt = db.prepare(`
    UPDATE sessions SET
      date = ?,
      discipline = ?,
      planned_code = ?,
      status = ?,
      duration_min = ?,
      distance_km = ?,
      rpe = ?,
      is_long_run = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();

  sessionsToUpdate.forEach(s => {
    stmt.run(
      s.date,
      s.discipline,
      s.planned_code,
      s.status,
      s.duration_min,
      s.distance_km,
      s.rpe,
      s.is_long_run,
      s.notes,
      now,
      s.id
    );
    console.log(`Updated session ${s.id} (${s.date} - ${s.discipline} - ${s.planned_code})`);
  });
});

console.log('Finished updating databases successfully!');
