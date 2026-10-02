import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

function getSwimmingWorkoutForWeek(semNum, phase) {
  const cycleIndex = (semNum - 1) % 4;

  if (phase === 1) {
    if (cycleIndex === 0) {
      return {
        planned_code: "NAT-A (Técnica & SWOLF)",
        distance_km: 1.7,
        duration_min: 42,
        rpe: 4,
        notes: "NATACIÓN · Ciclo A (Eficiencia & SWOLF · ~1.700m · RPE 4-5):\n- Calentamiento: 300m continuo suave (200m crol + 100m espalda suave para descomprimir hombros).\n- Técnica y drills: 4x50m ejercicios de punto muerto (catch-up) y recobro con pulgar rozando el costado desc. 20s.\n- Bloque SWOLF (Eficiencia): 6x100m crol aeróbico contando brazadas por largo; el objetivo es mantener el mismo ritmo reduciendo el número de brazadas (descanso 25s).\n- Activación suave: 4x50m progresivos (25m suave / 25m vivos con patada ágil) desc. 20s.\n- Vuelta a la calma: 200m suaves alternando estilos (espalda doble relajada). Cero impacto articular.",
      };
    } else if (cycleIndex === 1) {
      return {
        planned_code: "NAT-B (Base Aeróbica Fraccionada)",
        distance_km: 2.1,
        duration_min: 48,
        rpe: 5,
        notes: "NATACIÓN · Ciclo B (Base Aeróbica & Volumen · ~2.100m · RPE 5):\n- Calentamiento: 400m variado continuo suave.\n- Preparación técnica: 4x50m con pull-buoy focalizando en agarre alto y tracción dorsal sin sobrecargar hombros (desc. 15s).\n- Bloque Principal (Ritmo Crucero): 4x250m crol a ritmo constante y sostenido (R1 aeróbico cómodo, desc. 30s). *Recomendación*: Si vienes de CrossFit con hombros fatigados, realiza las 2 primeras con pull-buoy para flotabilidad pélvica.\n- Descarga de piernas: 200m nado continuo muy suave.\n- Vuelta a la calma: 150m espalda suave + respiración bilateral para equilibrar cintura escapular.",
      };
    } else if (cycleIndex === 2) {
      return {
        planned_code: "NAT-C (Umbral Fraccionado & Pull)",
        distance_km: 1.9,
        duration_min: 45,
        rpe: 6,
        notes: "NATACIÓN · Ciclo C (Resistencia a la Fatiga & Protección Articular · ~1.900m · RPE 6):\n- Calentamiento: 350m suave alternando estilos.\n- Pre-activación: 4x50m cambios de ritmo (1º suave, 2º alegre, 3º firme, 4º suave) desc. 20s.\n- Bloque Umbral Protegido: 3x (300m a ritmo tempo medio RPE 6 con pull-buoy + 100m crol suave regenerativo sin material) desc. 30s tras cada bloque. *Objetivo biomecánico*: El pull-buoy neutraliza la fatiga de sóleos/isquios del running y previene el hiperextendido lumbar.\n- Vuelta a la calma: 200m espalda doble y braza relajada para estirar la cadena anterior y manguito rotador.",
      };
    } else {
      return {
        planned_code: "NAT-D (Regeneración Activa & Aletas)",
        distance_km: 1.5,
        duration_min: 36,
        rpe: 3,
        notes: "NATACIÓN · Ciclo D (Regeneración Activa, Descompresión & Aletas · ~1.500m · RPE 3-4):\n- Calentamiento: 300m muy suave sin reloj.\n- Descompresión articular y fascia plantar: 6x75m con aletas cortas suaves (25m batido suave + 25m crol deslizante + 25m espalda). Las aletas descargan tendones de Aquiles y gemelos cargados por el asfalto.\n- Trabajo respiratorio y relajación: 4x50m respiración hipóxica suave 3-5-3-5 alternada desc. 25s.\n- Nado libre relajante: 250m crol largo y fluido con deslizamiento prolongado.\n- Vuelta a la calma: 100m nado muerto y estiramientos suaves de hombros en el bordillo.",
      };
    }
  }

  if (phase === 2) {
    if (cycleIndex === 0) {
      return {
        planned_code: "NAT-A (Técnica & Descarga)",
        distance_km: 1.5,
        duration_min: 35,
        rpe: 4,
        notes: "NATACIÓN FASE 2 · Técnica y Deslizamiento (~1.500m · RPE 4):\n- 300m suave calentamiento.\n- 6x50m técnica de rolido y recobro amplio sin tensión desc. 20s.\n- 5x100m aeróbico suave constante con pull-buoy desc. 20s.\n- 200m espalda y vuelta a la calma. Protege hombros y acelera la recuperación de piernas.",
      };
    } else if (cycleIndex === 1) {
      return {
        planned_code: "NAT-B (Crucero Ligero)",
        distance_km: 1.7,
        duration_min: 40,
        rpe: 5,
        notes: "NATACIÓN FASE 2 · Ritmo Crucero Ligero (~1.700m · RPE 5):\n- 300m suave variado.\n- 4x50m progresivos desc. 20s.\n- 3x300m ritmo constante con pull-buoy opcional desc. 30s.\n- 200m espalda doble y relajación. Excelente lavado de lactato sin impacto.",
      };
    } else if (cycleIndex === 2) {
      return {
        planned_code: "NAT-C (Aeróbico Controlado)",
        distance_km: 1.6,
        duration_min: 38,
        rpe: 5,
        notes: "NATACIÓN FASE 2 · Aeróbico Controlado (~1.600m · RPE 5):\n- 300m crol/espalda suave.\n- 4x100m con pull-buoy ritmo medio desc. 20s.\n- 6x50m buscando máxima distancia por brazada (DPS) desc. 20s.\n- 200m regenerativo. Enfoque en economía de esfuerzo.",
      };
    } else {
      return {
        planned_code: "NAT-D (Hidroterapia & Movilidad)",
        distance_km: 1.3,
        duration_min: 32,
        rpe: 3,
        notes: "NATACIÓN FASE 2 · Descarga Activa & Hidroterapia (~1.300m · RPE 3-4):\n- 250m suave.\n- 6x75m con aletas cortas suaves alternando estilos (25 crol / 25 espalda / 25 crol).\n- 200m nado suave continuo.\n- 150m espalda y movilidad de cintura escapular. Descanso articular total.",
      };
    }
  }

  return {
    planned_code: "NAT-R (Regenerativo Ligero)",
    distance_km: 1.2,
    duration_min: 30,
    rpe: 3,
    notes: "NATACIÓN · Nado regenerativo suave (~1.200m · RPE 3):\n- 300m crol suave.\n- 4x100m con pull-buoy muy relajado desc. 25s.\n- 200m espalda doble.\n- 100m soltar en flotación. Cero fatiga acumulada.",
  };
}

const dbPaths = ["./data/entrenoapp.db", "./seed/entrenoapp.db"];
for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) continue;
  const db = new DatabaseSync(dbPath);
  const rows = db.prepare("SELECT id, date, status, week_start FROM sessions WHERE discipline = 'natacion' AND status = 'pendiente' ORDER BY date ASC").all();
  console.log(`Updating ${rows.length} pending swimming sessions in ${dbPath}...`);
  
  const updateStmt = db.prepare("UPDATE sessions SET planned_code = ?, distance_km = ?, duration_min = ?, notes = ? WHERE id = ?");
  let updated = 0;
  for (const r of rows) {
    const d = new Date(r.date + "T12:00:00Z");
    const startDate = new Date("2026-09-07T12:00:00Z");
    const diffDays = Math.round((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const semNum = Math.max(1, Math.floor(diffDays / 7) + 1);
    const phase = semNum <= 16 ? 1 : semNum <= 24 ? 2 : semNum <= 34 ? 3 : 1;
    const w = getSwimmingWorkoutForWeek(semNum, phase);
    updateStmt.run(w.planned_code, w.distance_km, w.duration_min, w.notes, r.id);
    updated++;
  }
  console.log(`Successfully updated ${updated} sessions in ${dbPath}`);
}
