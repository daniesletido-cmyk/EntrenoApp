import { DatabaseSync } from "node:sqlite";

console.log("=== UPDATING MONDAY & WEDNESDAY TO REFLECT EQUIPMENT ===");

const updates = [
  {
    date: "2026-10-26",
    planned_code: "NAT (Regenerativa Post-16km & Descarga Articular · ~1.500m)",
    notes: `NATACIÓN COMPENSATORIA & DESCARGA ARTICULAR (~1.500m · RPE 4 · Sin aletas):
- Calentamiento: 300m nado suave continuo (crol + braza suave) + movilidad articular de hombros.
- Bloque Principal con Pull-Buoy (cero impacto en piernas): 6x100m crol cómodo con pull-buoy (RPE 3-4, descanso 20s) para aislar tren superior, alinear la columna y desmitificar la carga excéntrica de la tirada de 16k de ayer.
- Bloque de Descarga & Espalda (sin aletas): 4x50m nado a espalda suave o crol muy relajado, buscando máxima extensión corporal, batido de piernas suave y fluido desde la cadera (sin tensar gemelos ni sóleos).
- Vuelta a la calma: 200m nado variado muy lento (estilo libre / braza suave) + 3 min flotación relajada y respiración profunda.
- Enfoque Psicológico & Tip Mental: Aislamiento Sensorial y Calma Mental: El agua es tu cámara de descompresión. El sonido rítmico del agua y las burbujas actúa como un metrónomo meditativo; úsalo para vaciar la sobrecarga mental del día.`
  },
  {
    date: "2026-10-28",
    planned_code: "Fuerza Libre Box CrossFit (Tren Superior & Compensatorio Corredor)",
    notes: `FUERZA LIBRE EN BOX CROSSFIT · Material Box (Barras, Mancuernas, Rig, Banco) (RPE 7-8):
- Calentamiento: 5 min movilidad de cadera y hombro con banda elástica atada al rig + dislocaciones con pica de PVC + 3 min comba muy suave.
- Bloque 1 - Fuerza Tren Superior en Box (cero fatiga en piernas para no interferir con las series ni el WOD):
  1. Press Banca con Mancuernas o Barra en Banco plano: 4 series x 8-10 reps (RPE 7.5, tempo 3-0-1, bajada controlada).
  2. Dominadas Estrictas en Rig (agarre neutro o prono, o con goma si es necesario): 4 series x 6-8 reps estrictas sin kipping.
  3. Remo Unilateral con Mancuerna apoyado en Cajón/Banco o Remo en Anillas (Ring Rows): 3 series x 10 reps por lado (estabilidad escapular y postura del corredor).
- Bloque 2 - Fuerza Específica Preventiva & Cadena Posterior Isométrica:
  4. Elevaciones de Sóleo Sentado en Cajón con Discos Bumper sobre las Rodillas: 3 series x 15 reps con pausa de 2s arriba (fortalecimiento del sóleo, clave para absorber impacto en maratón).
  5. Hip Thrust o Puente de Glúteo en Banco con Disco Bumper / Mancuerna: 3 series x 12 reps con 1s de contracción isométrica arriba.
- Bloque 3 - Core & Anti-Rotación en Rig:
  6. Press Pallof con Banda Elástica anclada al Rig de CrossFit: 3 series x 12 reps lentas por lado.
  7. Planchas Laterales con Abducción de pierna o Hollow Rock controlado: 3 series x 30s.
- Vuelta a la calma: 5 min de estiramientos de pectoral, dorsal y foam roller suave en espalda.
- Enfoque Psicológico & Tip Mental: Foco Atencional Externo de Gabriele Wulf: Al empujar o traccionar, no pienses en tus músculos; piensa en empujar la barra lejos de ti o alejar el suelo con fuerza. El foco externo recluta más unidades motoras con menor fatiga neural.`
  }
];

for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);
  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET planned_code = ?,
        notes = ?,
        updated_at = datetime('now')
    WHERE date = ?
  `);

  for (const u of updates) {
    const res = updateStmt.run(u.planned_code, u.notes, u.date);
    console.log(`[${dbPath}] Updated ${u.date}: changes=${res.changes}`);
  }
  db.close();
}
console.log("Updated Monday and Wednesday successfully!");
