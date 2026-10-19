import { DatabaseSync } from "node:sqlite";

for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);
  
  // 1. Marcar domingo 18 como completado (14 km)
  db.prepare(`
    UPDATE sessions 
    SET status = 'completada', rpe = 5.5, updated_at = datetime('now')
    WHERE date = '2026-10-18'
  `).run();

  // 2. Lunes 19: Natación regenerativa post 14 km
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'natacion',
        planned_code = 'NAT (Regenerativa Post-14km & Descarga Articular · ~1.900m)',
        duration_min = 45,
        distance_km = 1.9,
        notes = 'NATACIÓN REGENERATIVA TRAS LOS 14 KM DE AYER (~1.900m · 45 min · RPE 4-5 · Carga estimada: 200 UA):
- Fisiología y objetivo: La presión hidrostática del agua favorece el retorno venoso, alivia la pesadez muscular y desinflama las piernas tras la tirada de 14 km sin someter al tendón de Aquiles ni articulaciones a impacto.
- Estrategia: Sesión fluida y técnica con pull-buoy para descansar completamente el tren inferior y descomprimir la columna vertebral antes del reto de peso muerto de mañana.
- Calentamiento: 350m suave variado continuo (200m crol largo + 150m espalda doble para abrir el pecho).
- Bloque Central Descompresión: 4x50m técnica con pull-buoy (foco en deslizar y traccionar con dorsal, descanso 20s).
- Bloque de Nado Continuo: 3x (300m crol crucero suave con pull-buoy + 100m crol regenerativo sin material) con 30s descanso.
- Vuelta a la calma: 150m suave estilo espalda y estiramientos suaves.',
        updated_at = datetime('now')
    WHERE date = '2026-10-19'
  `).run();

  // 3. Miércoles 21: Rodaje suave R1 (8 km)
  db.prepare(`
    UPDATE sessions 
    SET discipline = 'carrera',
        planned_code = 'R1 (Base Aeróbica / Rodaje Regenerativo 8 km)',
        duration_min = 44,
        distance_km = 8,
        notes = 'RUNNING · Rodaje Suave en Zona R1 (8 km · ~44 min · RPE 4-5 · Carga estimada: 198 UA):
- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Zona R1, 100% conversacional, VAM: 3:59 min/km).
- Fisiología y justificación: Rodaje cómodo para oxigenar la musculatura y activar el aclaramiento tras el trabajo neuromuscular de peso muerto del martes.
- Calentamiento: 5 min caminando rápido y trote muy progresivo.
- Bloque principal: 35 min a ritmo R1 uniforme con alta cadencia (175-180 ppm), pisada fluida y sin forzar en ningún momento.
- Vuelta a la calma: 4 min andando + estiramientos suaves de sóleos y cuádriceps.',
        updated_at = datetime('now')
    WHERE date = '2026-10-21'
  `).run();
  
  console.log("Actualizado con éxito:", dbPath);
}
