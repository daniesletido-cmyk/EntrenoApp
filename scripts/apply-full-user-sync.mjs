import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATHS = ["data/entrenoapp.db", "seed/entrenoapp.db"];

for (const dbPath of DB_PATHS) {
  if (!fs.existsSync(dbPath)) {
    console.error(`DB not found: ${dbPath}`);
    continue;
  }
  console.log(`\n=== Actualizando: ${dbPath} ===`);
  const db = new DatabaseSync(dbPath);

  // 1. Sesión Viernes 06/11/2026 (CrossFit / Fuerza FIT: 59.6 min, FC media 125, máx 161)
  const nov6 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-06' LIMIT 1").get();
  if (nov6) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'crossfit',
        planned_code = 'Fuerza Box & Condicionamiento',
        status = 'realizada',
        rpe = 8,
        duration_min = 60,
        distance_km = NULL,
        user_notes = 'Sesión completada en Box de CrossFit / Fuerza registrada por reloj: 59.6 min. FC media: 125 ppm, FC máx: 161 ppm (3.577 s totales). Buenas sensaciones generales.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov6.id);
    console.log(`[OK] Actualizada sesión 06/11/2026 (id ${nov6.id}) a realizada.`);
  }

  // 2. Sesión Sábado 07/11/2026 (Carrera FIT: 34.5 min, 6.53 km, FC media 177, máx 184)
  const nov7 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-07' LIMIT 1").get();
  if (nov7) {
    db.prepare(`
      UPDATE sessions SET
        status = 'realizada',
        rpe = 8,
        duration_min = 35,
        distance_km = 6.53,
        user_notes = 'Rodaje de carrera completado registrado por reloj: 6.53 km en 34.5 min (ritmo medio 5:17 min/km). FC media: 177 ppm, FC máx: 184 ppm. Buenas sensaciones de activación.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov7.id);
    console.log(`[OK] Actualizada sesión 07/11/2026 (id ${nov7.id}) a realizada.`);
  }

  // 3. Sesión Domingo 08/11/2026 (Carrera Tirada Larga FIT: 75.0 min, 14.02 km, FC media 182, máx 192)
  const nov8 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-08' LIMIT 1").get();
  if (nov8) {
    db.prepare(`
      UPDATE sessions SET
        status = 'realizada',
        rpe = 9,
        duration_min = 75,
        distance_km = 14.02,
        user_notes = 'Tirada Larga dominical completada registrada por reloj: 14.02 km en 75.0 min (ritmo medio 5:21 min/km). FC media: 182 ppm, FC máx: 192 ppm. Gran volumen y resistencia sostenida.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov8.id);
    console.log(`[OK] Actualizada sesión 08/11/2026 (id ${nov8.id}) a realizada.`);
  }

  // 4. Lunes 09/11/2026: Natación 13:30h (pendiente hasta que el usuario registre/suba su entreno real)
  const nov9 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-09' LIMIT 1").get();
  if (nov9) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'natacion',
        planned_code = 'Natación 13:30h (Técnica & Descarga Aeróbica · 1.900m)',
        duration_min = 45,
        distance_km = 1.9,
        status = 'pendiente',
        rpe = NULL,
        user_notes = NULL,
        notes = 'NATACIÓN EN PISCINA (13:30h · Descarga y Técnica · ~1.900m · RPE 6):
- 350m calentamiento suave combinado (crol/espalda).
- Bloque principal con pull-buoy para aislamiento de tren inferior y flotabilidad, permitiendo descarga miofascial tras la tirada larga del domingo (14 km).
- 4x100m técnica de punto muerto y recobro alto.
- Vuelta a la calma con nado continuo relajado.
- Estrategia Nutrición (Media Mañana 11:45h): 3 tortitas de maíz/arroz con lámina de membrillo o miel + agua. Cero plátano. Digestión ligera antes del agua para evitar reflujo.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov9.id);
    console.log(`[OK] Actualizado Lunes 09/11/2026 (id ${nov9.id}): Natación 13:30h (pendiente de registro por el usuario).`);
  }

  // 5. Martes 10/11/2026: CrossFit 19:00h (Tabatas + WOD 800m Run, 50 GHD, 800m Run, 50 T2B)
  const nov10 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-10' LIMIT 1").get();
  if (nov10) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'crossfit',
        planned_code = 'CrossFit Box 19:00h (Tabata Press/Remo + WOD 800m, 50 GHD, 800m, 50 T2B)',
        duration_min = 60,
        distance_km = NULL,
        status = 'pendiente',
        notes = 'CROSSFIT BOX (19:00h · STEADY · RPE 8):
- Calentamiento y movilidad articular dinámica (cadera, hombros, tobillos).
- FUERZA / ACCESORIOS (Post-Workout):
  • 2 Tabatas (4:00 min cada uno, descanso 2:00 min entre ambos).
  • Press Estricto de hombros (Strict Press) + Remo Inclinado con barra (Bent Over Row) con barra olímpica de 20 kg (45 lb).
  • Puntuación: Suma total de repeticiones acumuladas.
- WOD FREEDOM (RX) - Por Tiempo (For Time):
  • 800m Carrera (Run)
  • 50 GHD Sit-ups (Elevaciones de tronco en máquina GHD)
  • 800m Carrera (Run)
  • 50 Pies a la barra (Toes to Bar - T2B)
  • Puntuación: Tiempo total empleado.
- Estrategia Nutrición: Almuerzo completo a las 13:30h. Merienda energética a las 16:30h (yogur proteico + copos de avena con semillas de calabaza o tortitas de maíz con pavo). Cero frutos secos.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov10.id);
    console.log(`[OK] Planificado Martes 10/11/2026 (id ${nov10.id}): CrossFit Box 19:00h.`);
  }

  // 6. Miércoles 11/11/2026: Carrera R3 (Intervalos Umbral: 4x1.200m a 4:18-4:20/km · 12.5 km Total)
  const nov11 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-11' LIMIT 1").get();
  if (nov11) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'carrera',
        planned_code = 'R3 (Intervalos Umbral: 4x1.200m a 4:18-4:20/km · 12.5 km Total)',
        duration_min = 58,
        distance_km = 12.5,
        status = 'pendiente',
        notes = 'RUNNING · Intervalos de Umbral Anaeróbico (R3 · VAM 3:59 min/km · 12.5 km total):
- 🟢 Calentamiento (1.5 km · ~9 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote continuo muy cómodo + movilidad articular dinámica + 4 progresiones elásticas de 60m.
- ⚡ Parte principal (10.0 km · ~43 min · Ritmo: 4:18 - 4:20 min/km (Zona R3/R4 Umbral · Recup: 6:00/km trote)): 4x1.200m a ritmo exacto de 4:18 - 4:20 min/km con 90s de recuperación activa al trote muy suave (~6:00/km). Desarrollar aclaramiento de lactato y eficiencia a ritmo submáximo.
- 🔵 Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): Trote regenerativo muy suave + estiramientos completos sin rebotes.
- Nutrición: Hidratación previa y merienda con carbohidratos limpios 90 min antes de la sesión.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov11.id);
    console.log(`[OK] Planificado Miércoles 11/11/2026 (id ${nov11.id}): Carrera R3.`);
  }

  // 7. Jueves 12/11/2026: CrossFit 19:00h (Práctica Cuerda + AMRAP Bike, Trepa, Press Banca mancuernas)
  const nov12 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-12' LIMIT 1").get();
  if (nov12) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'crossfit',
        planned_code = 'CrossFit Box 19:00h (Práctica Trepa Cuerda + 3x AMRAP 4min Bike, Cuerda & Press Mancuernas)',
        duration_min = 60,
        distance_km = NULL,
        status = 'pendiente',
        notes = 'CROSSFIT BOX (19:00h · CHALLENGE · RPE 8):
- Calentamiento y activación articular específica de cintura escapular y agarre.
- FUERZA / TÉCNICA (En ventana de 8:00 min):
  • Práctica de subida a la cuerda (Rope Climb Practice).
  • Enfoque prioritario: Trabajo de progresiones de descenso controlado y seguro (RPE 5).
- WOD FREEDOM (RX) - 3 Rondas de 3-3-3-4:00 AMRAP (Descanso 1:00 min entre bloques):
  • 21 Calorías en Air Bike / Echo Bike (16 cal mujeres)
  • 3 Trepas de cuerda completas (Rope Climbs) [Escala: 15 Dominadas estrictas]
  • En el tiempo restante del intervalo de 4 min: Máximas repeticiones de Press de Banca con mancuernas de 22.5 kg por mano (50 lb).
  • Descanso: 1:00 min entre cada bloque.
  • Puntuación: Total acumulado de repeticiones en Press de Banca con mancuernas.
- Nutrición: Hidratación abundante durante el día y recarga de carbohidratos limpios tras el entreno.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov12.id);
    console.log(`[OK] Planificado Jueves 12/11/2026 (id ${nov12.id}): CrossFit Box 19:00h.`);
  }

  // 8. Viernes 13/11/2026: Descanso Total & Movilidad
  const nov13 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-13' LIMIT 1").get();
  if (nov13) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'descanso',
        planned_code = 'Descanso Total & Movilidad Lumbo-Pélvica',
        duration_min = 20,
        distance_km = NULL,
        status = 'pendiente',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov13.id);
    console.log(`[OK] Confirmado Viernes 13/11/2026 (id ${nov13.id}): Descanso & Movilidad.`);
  }

  // 9. Sábado 14/11/2026: Carrera R1 (Rodaje Regenerativo Suave 6 km + Técnica · 8.0 km Total)
  const nov14 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-14' LIMIT 1").get();
  if (nov14) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'carrera',
        planned_code = 'R1 Regenerativo Suave + Técnica (6 km Clave · 8 km Total)',
        duration_min = 45,
        distance_km = 8.0,
        status = 'pendiente',
        notes = 'RUNNING · Regenerativo de Activación (6 km Clave · 8.0 km Total · RPE 4):
- 🟢 Calentamiento (1.0 km · ~6 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote muy suave progresivo + movilidad articular activa de tobillos y cadera.
- ⚡ Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 4:59 min/km (Zona R1 Base Aeróbica)): 6.0 km continuos a ritmo cómodo y relajado + 4 rectas de 80m progresivas para tono neuromuscular.
- 🔵 Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): Caminata + estiramientos completos.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov14.id);
    console.log(`[OK] Confirmado Sábado 14/11/2026 (id ${nov14.id}): Carrera R1.`);
  }

  // 10. Domingo 15/11/2026: Carrera R5 (Tirada Larga 16 km Clave · 19.5 km Total)
  const nov15 = db.prepare("SELECT id FROM sessions WHERE date = '2026-11-15' LIMIT 1").get();
  if (nov15) {
    db.prepare(`
      UPDATE sessions SET
        discipline = 'carrera',
        planned_code = 'R5 (Tirada Larga 16 km en Zuera · 19.5 km Total)',
        duration_min = 105,
        distance_km = 19.5,
        status = 'pendiente',
        notes = 'RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (16 km Clave · 19.5 km Total · RPE 6):
- 🟢 Calentamiento (2.0 km · ~12 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): 10-12 min trote muy suave (>5:30/km) + movilidad dinámica.
- ⚡ Parte principal (16.0 km · ~83 min · Ritmo: 5:25 - 5:10 min/km (Zona R1/R5 · Cierre últimos 3-4 km a 5:05 - 5:10/km Ritmo Maratón)): 16.0 km en circuito llano de Zuera manteniendo cadencia ágil (178-180 ppm) y cerrando los últimos 3-4 km a ritmo específico de maratón.
- 🔵 Vuelta a la calma (1.5 km · ~9 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): Trote regenerativo / caminata + estiramientos completos.
- Nutrición: 1 gel isotónico cada 40-45 min y agua cada 20 min.',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nov15.id);
    console.log(`[OK] Confirmado Domingo 15/11/2026 (id ${nov15.id}): Carrera R5.`);
  }

  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    db.exec("PRAGMA journal_mode = DELETE;");
  } catch {}
  db.close();
}

console.log("\n>>> Sincronización completada con éxito en ambas bases de datos.");
