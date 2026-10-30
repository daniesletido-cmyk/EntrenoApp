import { NextRequest, NextResponse } from "next/server";
import { calculateSessionLoad } from "@/lib/engine/load-calculator";
import { adaptTrainingPlan } from "@/lib/engine/adapt-plan";
import { upsertWorkout } from "@/lib/repo/workouts";
import { sendWorkoutLoadedPush } from "@/lib/push-notifications";
import { toLocalISODate } from "@/lib/dates";

/**
 * Endpoint del Webhook de Suunto Cloud API
 *
 * Flujo de ejecución:
 * 1. Responde inmediatamente al handshake / validación de suscripción de Suunto (GET o POST).
 * 2. Ingiere el evento de entreno (JSON estructurado o FIT parseado).
 * 3. Extrae métricas clave (tipo, duración, distancia, FC media, FC máx).
 * 4. Calcula la carga (TSS y Banister TRIMP) con el motor `load-calculator.ts`.
 * 5. Guarda en la base de datos (tablas `workouts` y `sessions`).
 * 6. Ejecuta el motor de adaptación de la semana (`adapt-plan.ts`) y actualiza `training_plan`.
 * 7. Lanza notificación Web Push inmediata a móvil y PC.
 */

// 1. Handshake para validación de suscripción por GET
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Comprobar posibles parámetros de desafío / handshake que envía Suunto o plataformas Cloud
  const challenge =
    searchParams.get("challenge") ||
    searchParams.get("hub.challenge") ||
    searchParams.get("token") ||
    searchParams.get("validationToken") ||
    searchParams.get("suunto_challenge") ||
    req.headers.get("x-challenge") ||
    req.headers.get("suunto-challenge");

  if (challenge) {
    // Si Suunto pide texto plano o JSON con el challenge
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
      return NextResponse.json({ challenge });
    }
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Comprobación de salud del webhook
  return NextResponse.json({
    status: "active",
    service: "Suunto Cloud Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
}

// 2. Ingesta de evento de entrenamiento por POST
export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    let body: any = {};

    try {
      body = JSON.parse(rawText);
    } catch {
      body = { raw: rawText };
    }

    // A) Handshake por POST si Suunto valida enviando un challenge en el body JSON
    if (body.challenge || body.validationToken) {
      const challengeToken = body.challenge || body.validationToken;
      return NextResponse.json({
        challenge: challengeToken,
        message: "Webhook verificado correctamente con Suunto Cloud API",
      });
    }

    // B) Procesamiento del entrenamiento
    const workoutData = await extractSuuntoWorkoutData(body);

    if (!workoutData) {
      return NextResponse.json(
        { message: "Payload recibido pero no contiene datos de entrenamiento procesables" },
        { status: 200 }
      );
    }

    // C) Calcular carga fisiológica (TSS y TRIMP)
    const loadResult = calculateSessionLoad({
      durationMin: workoutData.duracion,
      avgHr: workoutData.fc_media,
      maxHr: workoutData.fc_max,
      sportType: workoutData.tipo,
      rpe: workoutData.rpe,
    });

    // D) Guardar en BD (tabla `workouts` y sincronización con `sessions`)
    const savedWorkout = upsertWorkout({
      suunto_id: workoutData.suunto_id,
      fecha: workoutData.fecha,
      tipo: workoutData.tipo,
      duracion: workoutData.duracion,
      distancia: workoutData.distancia,
      fc_media: workoutData.fc_media,
      fc_max: workoutData.fc_max,
      carga_tss: loadResult.tss,
      rpe: workoutData.rpe ?? (loadResult.intensityFactor ? Math.round(loadResult.intensityFactor * 10) : 6),
      raw_data: JSON.stringify(body),
    });

    // E) Ejecutar motor de adaptación inteligente del plan semanal
    let adaptationResult = null;
    try {
      adaptationResult = await adaptTrainingPlan({
        id: savedWorkout.id,
        fecha: savedWorkout.fecha,
        tipo: savedWorkout.tipo,
        duracion: savedWorkout.duracion,
        distancia: savedWorkout.distancia,
        fc_media: savedWorkout.fc_media,
        fc_max: savedWorkout.fc_max,
        carga_tss: savedWorkout.carga_tss,
        rpe: savedWorkout.rpe,
      });
    } catch (adaptErr) {
      console.warn("[Suunto Webhook] Error adaptando el plan:", adaptErr);
    }

    // F) Disparar notificación push multiplataforma instantánea
    let pushResult = null;
    try {
      pushResult = await sendWorkoutLoadedPush({
        id: savedWorkout.id,
        tipo: savedWorkout.tipo,
        distancia: savedWorkout.distancia,
        duracion: savedWorkout.duracion,
        carga_tss: savedWorkout.carga_tss,
      });
    } catch (pushErr) {
      console.warn("[Suunto Webhook] Error enviando notificación push:", pushErr);
    }

    return NextResponse.json({
      success: true,
      workout: savedWorkout,
      load: loadResult,
      adaptation: adaptationResult,
      push: pushResult,
    });
  } catch (err: any) {
    console.error("[Suunto Webhook] Error al procesar:", err);
    return NextResponse.json(
      { error: "Error interno al procesar el webhook", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Normaliza los diferentes formatos de payload que entrega Suunto Cloud API
 */
async function extractSuuntoWorkoutData(body: any): Promise<{
  suunto_id: string;
  fecha: string;
  tipo: string;
  duracion: number;
  distancia: number | null;
  fc_media: number | null;
  fc_max: number | null;
  rpe: number | null;
} | null> {
  // 1. Si viene una notificación de evento con workoutId y tenemos Suunto API Subscription Key
  const workoutId = body.workoutId || body.id || (body.data && body.data.workoutId) || body.workout_id;
  const subscriptionKey = process.env.SUUNTO_SUBSCRIPTION_KEY || process.env.SUUNTO_SECRET;

  let details = body.data || body;

  // Si solo viene el workoutId y hay clave configurada, consultar los detalles completos
  if (workoutId && !body.totalDistance && !body.duration && subscriptionKey) {
    try {
      const res = await fetch(`https://cloud-api.suunto.com/v2/workouts/${workoutId}`, {
        headers: {
          "Ocp-Apim-Subscription-Key": subscriptionKey,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        details = await res.json();
      }
    } catch (fetchErr) {
      console.warn("[Suunto Webhook] Error descargando detalles de Suunto Cloud:", fetchErr);
    }
  }

  // 2. Extraer fecha
  let fecha = toLocalISODate();
  if (details.startTime) {
    const d = typeof details.startTime === "number" ? new Date(details.startTime) : new Date(details.startTime);
    if (!isNaN(d.getTime())) fecha = d.toISOString().split("T")[0];
  } else if (details.start_time) {
    fecha = String(details.start_time).split("T")[0];
  } else if (details.date) {
    fecha = String(details.date).split("T")[0];
  }

  // 3. Extraer tipo de deporte
  let tipo = "carrera";
  const rawSport = (
    details.activityName ||
    details.sport ||
    details.activityType ||
    details.activity ||
    details.tipo ||
    ""
  ).toLowerCase();

  if (rawSport.includes("run") || rawSport.includes("trail") || rawSport.includes("treadmill")) {
    tipo = "carrera";
  } else if (rawSport.includes("cycl") || rawSport.includes("bike") || rawSport.includes("bici")) {
    tipo = "ciclismo";
  } else if (rawSport.includes("swim") || rawSport.includes("natac")) {
    tipo = "natacion";
  } else if (rawSport.includes("gym") || rawSport.includes("weight") || rawSport.includes("fuerza")) {
    tipo = "gimnasio";
  } else if (rawSport.includes("crossfit") || rawSport.includes("wod") || rawSport.includes("hiit")) {
    tipo = "crossfit";
  } else if (rawSport.includes("walk") || rawSport.includes("camin")) {
    tipo = "caminata";
  } else if (rawSport) {
    tipo = rawSport;
  }

  // 4. Extraer duración en minutos
  let duracionMin = 0;
  if (typeof details.duration === "number") {
    // Si viene en segundos (común en Suunto) o minutos
    duracionMin = details.duration > 300 ? Math.round(details.duration / 60) : Math.round(details.duration);
  } else if (typeof details.totalTime === "number") {
    duracionMin = details.totalTime > 300 ? Math.round(details.totalTime / 60) : Math.round(details.totalTime);
  } else if (typeof details.duracion === "number") {
    duracionMin = details.duracion;
  }

  // Si no hay duración válida
  if (duracionMin <= 0) {
    duracionMin = 45; // Valor razonable por defecto
  }

  // 5. Extraer distancia en km
  let distanciaKm: number | null = null;
  if (typeof details.totalDistance === "number") {
    distanciaKm = details.totalDistance > 100 ? Math.round((details.totalDistance / 1000) * 100) / 100 : details.totalDistance;
  } else if (typeof details.distance === "number") {
    distanciaKm = details.distance > 100 ? Math.round((details.distance / 1000) * 100) / 100 : details.distance;
  } else if (typeof details.distancia === "number") {
    distanciaKm = details.distancia;
  }

  // 6. Extraer FC media y máxima
  const fc_media =
    details.avgHeartRate ||
    details.avgHr ||
    details.avg_hr ||
    details.heartRate?.avg ||
    details.fc_media ||
    null;

  const fc_max =
    details.maxHeartRate ||
    details.maxHr ||
    details.max_hr ||
    details.heartRate?.max ||
    details.fc_max ||
    null;

  // 7. RPE si el usuario lo introdujo en el reloj
  const rpe = details.feeling || details.rpe || null;

  return {
    suunto_id: workoutId ? String(workoutId) : `suunto-${Date.now()}`,
    fecha,
    tipo,
    duracion: duracionMin,
    distancia: distanciaKm != null ? Math.round(distanciaKm * 100) / 100 : null,
    fc_media: fc_media ? Math.round(Number(fc_media)) : null,
    fc_max: fc_max ? Math.round(Number(fc_max)) : null,
    rpe: rpe ? Number(rpe) : null,
  };
}
