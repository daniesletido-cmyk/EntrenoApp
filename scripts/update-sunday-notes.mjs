import { DatabaseSync } from "node:sqlite";

const sundayNotes = `RUNNING · Tirada Larga Específica Maratón Madrid (16 km · ~84 min · RPE 5-6 · Carga estimada: 470 UA):
- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Ritmo aeróbico cómodo sostenido, VAM: 3:59 min/km).
- Justificación de carga: Es el bloque principal de volumen semanal y simulación del perfil de Madrid (+130m D+). Llegarás con las piernas descansadas tras el viernes sin impacto.
- Calentamiento: 5 min trote muy suave (>5:30/km) + movilidad de tobillos.
- Bloque de volumen: 16 km continuos manteniendo pulsaciones controladas y cadencia estable (175 ppm). En los últimos 4 km buscar cuestas tendidas y toboganes manteniendo el ritmo a Ritmo Maratón (5:10 - 5:05 min/km).
- Hidratación / Nutrición: Tomar agua o sales cada 20-25 minutos; 1 gel isotónico en el km 8 y en el km 13.
- Vuelta a la calma: 5 min andando a paso lento + estiramientos completos.`;

for (const p of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(p);
  db.prepare(`
    UPDATE sessions 
    SET notes = ?,
        duration_min = 84,
        distance_km = 16
    WHERE date = '2026-10-25'
  `).run(sundayNotes);
  console.log("Updated Sunday in", p);
}
