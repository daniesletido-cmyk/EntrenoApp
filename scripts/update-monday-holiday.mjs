import { DatabaseSync } from 'node:sqlite';

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

for (const dbPath of dbs) {
  const sdb = new DatabaseSync(dbPath);

  // Lunes 02/11: Descanso Activo & Protocolo Regenerativo en Casa (Festivo)
  sdb.prepare(`
    UPDATE sessions 
    SET discipline = 'descanso',
        planned_code = 'Descanso Activo & Drenaje Miofascial en Casa (Festivo)',
        duration_min = 35,
        distance_km = null,
        notes = 'DESCANSO ACTIVO & DRENAJE POST-PIRINEOS (Festivo · Box y Piscina cerrados):\n- Contexto Fisiológico: Tras la tirada de 11k del sábado y los 700m de desnivel del Pico de los Monjes el domingo, que todo esté cerrado es una ventaja biológica: tu cuerpo necesita asimilar el impacto excéntrico de la bajada sin nuevas cargas mecánicas.\n- Protocolo de Descarga Activa en Casa:\n  1. Paseo Suave al Aire Libre (opcional): 25-30 min caminando a paso muy tranquilo por terreno 100% llano en Zuera. Activa la bomba muscular del sóleo para drenar piernas sin impacto.\n  2. Retorno Venoso: 10-15 min con piernas elevadas en pared a 90º (facilita el drenaje linfático y desinflama tobillos/rodillas).\n  3. Automasaje / Foam Roller: 10 min rodando muy suave en cuádriceps, fascia lata y gemelos (presión media, sin dolor agudo).\n  4. Ducha de contraste: Alternar agua templada y fría en las piernas para provocar vasoconstricción y vasodilatación.\n- Nutrición: Buena hidratación con agua, infusión digestiva y comida limpia para recargar glucógeno.',
        updated_at = datetime('now')
    WHERE id = 482
  `).run();

  console.log('Updated session 482 in:', dbPath);
}
