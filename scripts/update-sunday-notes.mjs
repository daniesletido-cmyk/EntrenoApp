import { DatabaseSync } from "node:sqlite";

const sundayNotes = `RUNNING · Tirada Larga Específica Maratón Madrid (16 km · ~84 min · RPE 5-6 · Carga estimada: 470 UA):
- Ritmo objetivo VAM: 5:25 - 5:05 min/km (Ritmo aeróbico cómodo sostenido, VAM: 3:59 min/km).
- Justificación de carga: Es el bloque principal de volumen semanal y simulación del perfil exigente de Madrid (+130m D+). Llegarás con piernas descansadas tras el reposo del viernes y la activación corta del sábado.
- Calentamiento: 11 min trote muy suave (>5:25/km) + movilidad de tobillos y cadera.
- Bloque de volumen: 53 min a ritmo crucero constante (5:20 - 5:15/km, cadencia 175-180 ppm) + 20 min finales sobre toboganes a Ritmo Maratón (5:10 - 5:05/km, acortando zancada en subida y conteniendo impacto en bajada).
- Hidratación / Nutrición: Beber agua o sales en min 25' y 55'; 1 gel 226ERS sin cafeína con agua en min 42' y 1 gel 226ERS con cafeína en min 68'.
- Vuelta a la calma: 5 min andando a paso lento + estiramientos completos de sóleos, cuádriceps y glúteos.`;

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
