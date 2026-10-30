import { getDb } from "../src/lib/db.ts";
import { calculateSessionLoad } from "../src/lib/engine/load-calculator.ts";
import { adaptTrainingPlan } from "../src/lib/engine/adapt-plan.ts";
import { upsertWorkout, getWorkoutById } from "../src/lib/repo/workouts.ts";
import { upsertRecovery, getRecoveryByDate } from "../src/lib/repo/recovery.ts";
import { savePushSubscription, getAllPushSubscriptions } from "../src/lib/repo/push-subscriptions.ts";

async function runTest() {
  console.log("=== INICIANDO TEST COMPLETO DE EXTREMO A EXTREMO ===");

  // 1. Verificar Tablas en BD
  const db = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tablas detectadas en SQLite:", tables.map(t => t.name).join(", "));

  // 2. Probar Ingesta de Recuperación (Zepp)
  const rec = upsertRecovery({
    fecha: "2026-10-30",
    sleep_duration: 6.2,
    deep_sleep_min: 42,
    rem_min: 60,
    resting_hr: 52,
    recovery_score: 58,
    raw_data: JSON.stringify({ source: "Test Zepp" })
  });
  console.log("✔ Registro de recuperación Zepp guardado:", rec.fecha, "Score:", rec.recovery_score);

  // 3. Probar Cálculo de Carga (TSS / TRIMP)
  const load = calculateSessionLoad({
    durationMin: 65,
    avgHr: 162,
    maxHr: 178,
    sportType: "carrera",
    rpe: 8
  });
  console.log("✔ Cálculo de Carga:", load.formulaUsed, "TSS:", load.tss, "TRIMP:", load.trimp);

  // 4. Probar Guardado de Workout
  const workout = upsertWorkout({
    suunto_id: "suunto-test-001",
    fecha: "2026-10-30",
    tipo: "carrera",
    duracion: 65,
    distancia: 12.4,
    fc_media: 162,
    fc_max: 178,
    carga_tss: load.tss,
    rpe: 8,
    raw_data: JSON.stringify({ sample: "Suunto payload" })
  });
  console.log("✔ Workout guardado en BD:", workout.id, workout.tipo, workout.distancia, "km");

  // 5. Probar Motor de Adaptación de Plan
  const adaptation = await adaptTrainingPlan({
    id: workout.id,
    fecha: workout.fecha,
    tipo: workout.tipo,
    duracion: workout.duracion,
    distancia: workout.distancia,
    fc_media: workout.fc_media,
    fc_max: workout.fc_max,
    carga_tss: workout.carga_tss,
    rpe: workout.rpe
  });
  console.log("✔ Motor de Adaptación ejecutado:");
  console.log("  Necesita ajuste:", adaptation.needsAdjustment);
  console.log("  Fatiga calculada:", adaptation.fatigueScore);
  console.log("  Resumen:", adaptation.recommendationSummary);
  console.log("  Modificaciones aplicadas:", adaptation.appliedModifications.length);

  // 6. Probar Push Subscriptions
  const sub = savePushSubscription({
    endpoint: "https://fcm.googleapis.com/fcm/send/test-token-12345",
    p256dh: "BMm4y01zKx...test",
    auth: "authKey123",
    device_type: "mobile"
  });
  console.log("✔ Suscripción Push guardada:", sub.id, sub.device_type);
  const allSubs = getAllPushSubscriptions();
  console.log("  Total suscripciones activas:", allSubs.length);

  console.log("=== TEST DE FLUJO COMPLETADO SATISFACTORIAMENTE ===");
}

runTest().catch(console.error);
