import { DatabaseSync } from 'node:sqlite';

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];

for (const dbPath of dbs) {
  const sdb = new DatabaseSync(dbPath);

  // Sábado 31/10: Tirada Larga 11 km
  sdb.prepare(`
    UPDATE sessions 
    SET discipline = 'carrera',
        planned_code = 'R5 (Tirada Larga 11 km · Terreno Llano Zuera)',
        is_long_run = 1,
        duration_min = 57,
        distance_km = 11,
        notes = 'RUNNING · Tirada Larga de Volumen Aeróbico (11 km · Terreno Llano Zuera · RPE 5-6 · Adelantada al Sábado):\n- Base aeróbica: Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (175 ppm).\n- Bloque específico de ritmo: En los últimos 3-4 km consolidar el Ritmo Maratón (5:05 - 5:10 min/km), priorizando la economía de carrera y el control de pulso.\n- Clave estratégica: Ejecutar con calma el sábado para no agotar las reservas de glucógeno de cara a la ascensión del domingo.\n- Nutrición/Hidratación: Beber agua o sales cada 20 min; 1 gel en el km 7.\n- Vuelta a la calma: 5 min caminando + movilidad de tobillos.',
        updated_at = datetime('now')
    WHERE id = 480
  `).run();

  // Domingo 01/11: Trekking Pico de los Monjes
  sdb.prepare(`
    UPDATE sessions 
    SET discipline = 'caminata',
        planned_code = 'Trekking Montaña: Pico de los Monjes desde Astún (~8.5 km · +700m D+)',
        is_long_run = 0,
        duration_min = 240,
        distance_km = 8.5,
        notes = 'TREKKING MONTAÑA · PICO DE LOS MONJES DESDE ASTÚN (Pirineo Aragonés · ~8.5 km · +700m D+ / -700m D- · Cima 2.349m):\n- Ruta: Salida desde el parking de Astún (~1.700m) -> Ibón de Escalar (2.078m) -> Collado de los Monjes (2.168m) -> Cresta final y trepada sencilla a cima (2.349m).\n- Rol Fisiológico: Estímulo aeróbico Z1 puro con alto volumen de tiempo en movimiento (3.5 - 4.5h) y trabajo de fuerza específica en subida.\n- ¡PROTECCIÓN ARTICULAR EN LA BAJADA (-700m D-)!: La bajada genera una alta carga excéntrica en cuádriceps y tendones rotulianos. OBLIGATORIO usar bastones de trekking para descargar hasta un 25% el impacto en las rodillas.\n- Nutrición: 1.5L agua con sales/electrolitos, frutos secos, barritas y bocadillo para la cima.\n- Seguridad: Comprobar meteo en Astún, calzado técnico de montaña, cortavientos/capa térmica y guantes finos.',
        updated_at = datetime('now')
    WHERE id = 481
  `).run();

  // Lunes 02/11: Fuerza Tren Superior & Bici Flushing (Piscina Cerrada)
  sdb.prepare(`
    UPDATE sessions 
    SET discipline = 'crossfit',
        planned_code = 'Fuerza Box: Tren Superior & Flushing en Bici (Piscina Cerrada)',
        duration_min = 50,
        notes = 'FUERZA TREN SUPERIOR & DESCARGA ACTIVA (Piscina cerrada · Adaptación post-montaña Astún):\n- ATENCIÓN: Piscina cerrada. Tras la tirada de 11k del sábado y los -700m D- de bajada del Pico de los Monjes, tus cuádriceps y gemelos tendrán micro-roturas excéntricas.\n- Pauta de Fuerza en Box: CERO sentadillas pesadas, zancadas o multisaltos/carrera. Enfocar la sesión 100% en Tren Superior (Press banca/militar, dominadas, remo con mancuerna, tríceps/bíceps) y Core estático (planchas, pallof press).\n- Flushing / Drenaje de Piernas (sustituto de piscina): 15-20 min de Bici estática / Echo Bike muy suave a cadencia rápida (85-95 rpm) sin casi resistencia para oxigenar las piernas sin impacto.\n- Descarga Miofascial: 10 min de Foam roller en cuádriceps, glúteos y gemelos + estiramiento suave de psoas.',
        updated_at = datetime('now')
    WHERE id = 482
  `).run();

  console.log('Updated successfully:', dbPath);
}
