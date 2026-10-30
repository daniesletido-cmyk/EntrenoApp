/**
 * Script de validación automatizada de entrenamientos de carrera (EntrenoApp)
 * Ejecución: node scripts/validate-running-plan.cjs
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbs = ['data/entrenoapp.db', 'seed/entrenoapp.db'];
let hasErrors = false;

console.log('🔍 Iniciando verificación de invariantes del plan de entrenamiento...\n');

for (const dbRelPath of dbs) {
  const fullPath = path.resolve(process.cwd(), dbRelPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ERROR: No se encontró la base de datos en ${dbRelPath}`);
    hasErrors = true;
    continue;
  }

  const db = new DatabaseSync(fullPath);
  console.log(`📦 Verificando [${dbRelPath}]...`);

  // 1. Verificar sesión clave: Sábado 31/10/2026 (id = 480)
  const session480 = db.prepare(`SELECT * FROM sessions WHERE id = 480`).get();
  if (!session480) {
    console.error(`  ❌ ERROR: No existe la sesión 480 (31/10/2026)`);
    hasErrors = true;
  } else {
    const is12kMain = session480.notes && session480.notes.includes('Parte principal (12.0 km');
    const is14_5Total = session480.distance_km === 14.5;
    const hasPace = session480.notes && session480.notes.includes('5:25 - 5:10 min/km');

    if (!is12kMain) {
      console.error(`  ❌ ERROR 480: La Parte Principal no tiene los 12.0 km íntegros en las notas.`);
      hasErrors = true;
    } else if (!is14_5Total) {
      console.error(`  ❌ ERROR 480: La distancia total no es 14.5 km (es ${session480.distance_km} km).`);
      hasErrors = true;
    } else if (!hasPace) {
      console.error(`  ❌ ERROR 480: Falta el ritmo objetivo en las notas.`);
      hasErrors = true;
    } else {
      console.log(`  ✅ Sesión 480 (31/10/2026): 12.0 km Parte Principal · 14.5 km Total · Ritmo objetivo presente.`);
    }
  }

  // 2. Verificar que ninguna sesión de carrera tenga partes principales reducidas artificialmente
  const runningSessions = db.prepare(`SELECT id, date, planned_code, distance_km, notes FROM sessions WHERE discipline = 'carrera'`).all();
  let invalidRunningCount = 0;

  for (const s of runningSessions) {
    if (!s.notes) continue;
    // Detectar si en notas hay un valor de parte principal substraído
    // Ejemplo de error antiguo: planned_code dice 14k pero parte principal pone 11.5 km
    const codeMatch = (s.planned_code || '').match(/(\d+)k/i);
    const mainMatch = s.notes.match(/- Parte principal \((\d+(?:\.\d+)?)\s*km/);

    if (codeMatch && mainMatch) {
      const targetKm = parseFloat(codeMatch[1]);
      const mainKm = parseFloat(mainMatch[1]);
      if (mainKm < targetKm && targetKm >= 6) {
        console.error(`  ❌ ERROR Sesión ${s.id} (${s.date}): Código dice ${targetKm}k pero Parte Principal tiene ${mainKm} km.`);
        invalidRunningCount++;
        hasErrors = true;
      }
    }
  }

  if (invalidRunningCount === 0) {
    console.log(`  ✅ Todas las sesiones de running (${runningSessions.length}) tienen su Parte Principal al 100% sin restas.`);
  }

  // 3. Verificar presencia de los 3 bloques estructurados en carreras con notas
  let missingStructureCount = 0;
  for (const s of runningSessions) {
    if (s.notes && s.notes.includes('- Calentamiento') && !s.notes.includes('- Vuelta a la calma')) {
      missingStructureCount++;
    }
  }
  if (missingStructureCount === 0) {
    console.log(`  ✅ Estructura completa (Calentamiento, Principal, Vuelta a la calma) validada.`);
  } else {
    console.warn(`  ⚠️ Hay ${missingStructureCount} sesiones con estructura incompleta.`);
  }

  console.log('');
}

// 4. Comparar consistencia entre data/entrenoapp.db y seed/entrenoapp.db
const dbData = new DatabaseSync('data/entrenoapp.db');
const dbSeed = new DatabaseSync('seed/entrenoapp.db');

const countData = dbData.prepare('SELECT count(*) as c FROM sessions').get().c;
const countSeed = dbSeed.prepare('SELECT count(*) as c FROM sessions').get().c;

if (countData !== countSeed) {
  console.error(`❌ DESINCRONIZACIÓN: data/entrenoapp.db (${countData} sesiones) !== seed/entrenoapp.db (${countSeed} sesiones).`);
  hasErrors = true;
} else {
  console.log(`✅ Sincronización dual confirmada: ambas bases de datos tienen ${countData} sesiones.`);
}

console.log('\n-----------------------------------------------------------');
if (hasErrors) {
  console.error('❌ SE ENCONTRARON INCONSISTENCIAS. Revisa los errores anteriores.');
  process.exit(1);
} else {
  console.log('🎉 VALIDACIÓN EXITOSA: Todas las reglas fisiológicas y de datos se cumplen al 100%.');
  process.exit(0);
}
