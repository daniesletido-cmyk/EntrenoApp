import { DatabaseSync } from "node:sqlite";

const newNotes = `RUNNING · Tirada Larga Específica Maratón Madrid (~84 min de carrera + 5 min calma · RPE 5-6 · Carga estimada: 470 UA):

1. CALENTAMIENTO / PUESTA EN MARCHA (11 min · Min 0' a 11'):
- 11 min de trote muy suave y progresivo a ritmo 5:30 - 5:25 min/km (Zona R0/R1).
- Objetivo: Despertar articulaciones, activar circulación y cadencia relajada con sensación de esfuerzo muy fácil.

2. BLOQUE PRINCIPAL (73 min · Min 11' a 84'):
- Tramo A · Crucero Aeróbico Base (53 min · Min 11' a 64'):
  * Ritmo objetivo: 5:20 - 5:15 min/km constante en tramos llanos (Zona R1).
  * Foco técnico: Cadencia estable (175-180 ppm), pisada fluida y respiración conversacional controlada.
  * Hito nutricional: Sorbos de agua/sales en min 25' y 1er Gel 226ERS (sin cafeína) con 150 ml de agua en min 42'.
- Tramo B · Específico Toboganes & Desnivel Madrid (20 min · Min 64' a 84'):
  * Ritmo objetivo: 5:10 - 5:05 min/km (Ritmo Maratón sobre perfil quebrado +130m D+).
  * Técnica en subidas: Acortar longitud de zancada, mantener cadencia alta (180 ppm) y braceo activo sin mirar el ritmo instantáneo.
  * Técnica en bajadas: Contener la amplitud de paso para proteger los cuádriceps del impacto excéntrico destructivo.
  * Hito nutricional: 2º Gel 226ERS (con cafeína suave) con agua en min 68' para rematar con chispa mental.

3. VUELTA A LA CALMA (5 min · Min 84' a 89'):
- 5 min caminando a paso suave para reducir pulsaciones y facilitar el retorno venoso.
- Hidratación temprana con sales/electrolitos (500 ml) y estiramientos suaves de sóleos, cuádriceps y glúteos.`;

for (const p of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(p);
  db.prepare(`
    UPDATE sessions 
    SET notes = ?,
        duration_min = 89
    WHERE date = '2026-10-25'
  `).run(newNotes);
  console.log("Updated Sunday notes in", p);
}
