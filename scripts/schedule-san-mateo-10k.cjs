const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

const session529 = {
  id: 529,
  date: '2026-12-19',
  discipline: 'carrera',
  planned_code: 'COMPETICIÓN 10K San Mateo de Gállego (Test Oficial Sub-45\' · 10 km Clave · 12.5 km Total)',
  distance_km: 12.5,
  duration_min: 60,
  is_long_run: 0,
  notes: `RUNNING · TEST OFICIAL 10K SAN MATEO DE GÁLLEGO (10.0 km Clave · Asfalto Urbano Plano · 10:30h):
- Calentamiento (1.5 km · ~9 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Trote muy suave y progresivo activando pulsaciones + movilidad articular dinámica de tobillos, rodillas y cadera + 4 rectas progresivas de 60m para activar el sistema neuromuscular sin acumular fatiga.
- Parte principal (10.0 km · ~44-45 min · Ritmo: 4:28 - 4:30 min/km (Zona R3/R4 Umbral · A FUEGO para Sub-45')):
  • Estrategia de carrera (Ritmo medio objetivo: 4:28 - 4:30 min/km · Marca objetivo: 44:30 - 44:59):
    - Km 1 al 3 (Cabeza fría): Salida controlada a 4:32 - 4:30 min/km. No dejarse arrastrar por los sprinters del 5K; fijar cadencia ágil (180 ppm).
    - Km 4 al 7 (Ritmo crucero): Mantener el pulso en umbral a 4:28 - 4:30 min/km constante. Respiración rítmica 2x2. Aprovechar el terreno llano y el asfalto rápido.
    - Km 8 al 10 (A fuego / Vaciar depósito): Sacar todo el trabajo acumulado. Exprimir las piernas y cerrar el último km por debajo de 4:25 min/km para cruzar la meta con marca personal Sub-45'.
- Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): Trote regenerativo muy suave para favorecer el aclaramiento de lactato + estiramientos completos de tren inferior e hidratación inmediata con sales minerales.
- Estrategia Nutricional & Hidratación:
  • Desayuno (08:00h, 2h30 antes de la salida): Avena con bebida vegetal de avena o tostadas de pan blanco con miel/mermelada y pechuga de pavo + café solo + 400 ml de agua o isotónico suave. CERO frutos secos (alergia estricta).
  • 15 min antes de la salida (10:15h): Pequeños sorbos de agua para humedecer la boca y medio gel hidro sin cafeína si se desea.
  • Post-meta: Fruta fresca (plátano o dátiles), 500 ml de bebida isotónica con proteína limpia, y semillas de calabaza o girasol para reponer electrolitos y magnesio.
- Enfoque Psicológico & Tip Mental: El test de la verdad para Madrid: En un 10K a fuego, la carrera de verdad comienza en el km 7. La fatiga apretará, pero recuerda que tus piernas tienen la solvencia de todo el volumen acumulado. Visualiza el crono marcando 44:XX en la recta final y corre con garra.`
};

const session530 = {
  id: 530,
  date: '2026-12-20',
  discipline: 'carrera',
  planned_code: 'R1 Regenerativo Post-Competición (8 km Clave · 10.0 km Total)',
  distance_km: 10.0,
  duration_min: 58,
  is_long_run: 0,
  notes: `RUNNING · Rodaje Regenerativo de Descarga Post-Competición (8.0 km Clave · RPE 3-4):
- Calentamiento (1.0 km · ~6 min · Ritmo: 5:45 - 5:30 min/km (Zona R0 suave)): Inicio al trote ultra suave conectando sensaciones corporales + movilidad articular suave sin forzar.
- Parte principal (8.0 km · ~46 min · Ritmo: 5:35 - 5:25 min/km (Zona R0/R1 Regenerativa)): Rodaje continuo regenerativo en terreno completamente llano. FC estricta < 140 lpm. El objetivo fisiológico no es entrenar el cardio, sino irrigar sangre limpia a los músculos, eliminar toxinas del 10K de ayer y acelerar la recuperación sin impacto agresivo.
- Vuelta a la calma (1.0 km · ~6 min · Ritmo: > 6:00 min/km (Trote muy suave / Caminata)): 5 min caminando relajadamente + sesión completa de estiramientos suaves y foam roller en gemelos, sóleos y cuádriceps.
- Nutrición & Recuperación Celular:
  • Comida post-entreno: Carbohidratos limpios (arroz o patata al horno), proteína de alto valor biológico (pollo, pescado o huevos), aceite de oliva virgen extra y semillas de chía o sésamo. Hidratación abundante a lo largo del día.
- Enfoque Psicológico & Tip Mental: Asimilación y Respeto al Cuerpo: El entrenamiento invisible es lo que consolida las marcas. Disfruta hoy de correr sin mirar ritmos de competición, sintiendo cómo el cuerpo repara y absorbe el gran esfuerzo del 10K para seguir construyendo la base hacia el Maratón de Madrid.`
};

for (const dbPath of dbs) {
  const fullPath = path.resolve(process.cwd(), dbPath);
  console.log(`Updating ${fullPath}...`);
  const db = new DatabaseSync(fullPath);

  const updateStmt = db.prepare(`
    UPDATE sessions
    SET planned_code = ?,
        distance_km = ?,
        duration_min = ?,
        is_long_run = ?,
        notes = ?
    WHERE id = ?
  `);

  updateStmt.run(
    session529.planned_code,
    session529.distance_km,
    session529.duration_min,
    session529.is_long_run,
    session529.notes,
    session529.id
  );

  updateStmt.run(
    session530.planned_code,
    session530.distance_km,
    session530.duration_min,
    session530.is_long_run,
    session530.notes,
    session530.id
  );

  console.log(`✅ Successfully updated session 529 and 530 in ${dbPath}`);
}
console.log('Finished updating dual databases.');
