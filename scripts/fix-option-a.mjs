import { DatabaseSync } from "node:sqlite";

console.log("=== FIXING OPTION A (RING ROWS) IN WEDNESDAY SESSION ===");

const wedNotes = `FUERZA LIBRE EN BOX CROSSFIT · Material Box (Barras, Mancuernas, Rig, Cajón) (RPE 7-8):
- Calentamiento: 5 min movilidad de cadera y hombro con banda elástica atada al rig + dislocaciones con pica de PVC + activación escapular (colgarse en barra y hacer 10 elevaciones/depresiones escapulares sin doblar codos).
- Bloque 1 - Fuerza Tren Superior en Box (cero fatiga en piernas para no interferir con las series ni el WOD):
  1. Press Banca con Mancuernas o Barra en Banco plano: 4 series x 8-10 reps (RPE 7.5, tempo 3-0-1, bajada controlada).
  2. Remo en Anillas Inclinado (Ring Rows Escalados a 45°-60°): 4 series x 8-10 reps (cuerpo en plancha rígida, inclinación cómoda de 45°-60°. Pausa de 1s arriba tocando el pecho a las anillas y bajada controlada en 3s. Si pesa mucho, da medio paso atrás para estar más vertical).
  3. Remo Unilateral con Mancuerna apoyado en Cajón: 3 series x 10 reps por lado (apoyo firme, retracción escapular y espalda recta).
- Bloque 2 - Fuerza Específica Preventiva & Cadena Posterior Isométrica:
  4. Elevaciones de Sóleo Sentado en Cajón con Discos Bumper sobre las Rodillas: 3 series x 15 reps con pausa de 2s arriba (fortalecimiento del sóleo, clave para absorber impacto en maratón).
  5. Hip Thrust o Puente de Glúteo en Banco con Disco Bumper / Mancuerna: 3 series x 12 reps con 1s de contracción isométrica arriba.
- Bloque 3 - Core & Anti-Rotación en Rig:
  6. Press Pallof con Banda Elástica anclada al Rig de CrossFit: 3 series x 12 reps lentas por lado.
  7. Planchas Laterales con Abducción de pierna o Hollow Rock controlado: 3 series x 30s.
- Vuelta a la calma: 5 min de estiramientos de pectoral, dorsal y foam roller suave en espalda.
- Enfoque Psicológico & Tip Mental: Foco Atencional Externo de Gabriele Wulf: Al empujar o traccionar, no pienses en tus músculos; piensa en empujar la barra lejos de ti o alejar el suelo con fuerza. El foco externo recluta más unidades motoras con menor fatiga neural.`;

for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);
  const res = db.prepare(`
    UPDATE sessions 
    SET planned_code = 'Fuerza Libre Box (Ring Rows & Tren Superior)',
        notes = ?,
        updated_at = datetime('now')
    WHERE date = '2026-10-28'
  `).run(wedNotes);
  console.log(`[${dbPath}] Updated 2026-10-28: changes=${res.changes}`);
  db.close();
}

console.log("Wednesday session updated with Option A!");
