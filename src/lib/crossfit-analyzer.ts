import { getDb } from "@/lib/db";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { getSetting } from "@/lib/repo/settings";
import { getAnthropicClientFromSettings } from "@/lib/ai/client";
import { todayISO, weekStartOf, addDays, DAY_NAMES_ES } from "@/lib/dates";

export interface CrossfitDayAnalysis {
  dayName: string; // "Lunes", "Martes", etc.
  dayNumber: number; // 1 = Lunes, 7 = Domingo
  warmup?: string;
  strengthPart: string;
  metconPart: string;
  cooldown?: string;
  musclesWorked: string[];
  fatigueRisk: "baja" | "moderada" | "alta"; // Para piernas/lumbar
  coachComment: string;
}

export interface CrossfitWeekAnalysisResult {
  days: CrossfitDayAnalysis[];
  tuesdayThursdayVerdict: {
    tuesdayOk: boolean;
    thursdayOk: boolean;
    analysis: string;
  };
  recommendedDays: string[];
  recommendationVerdict: string;
  physioAdvice: string;
  rawText?: string;
}

const CROSSFIT_VISION_SYSTEM_PROMPT = `Eres el Preparador Físico de Élite y Fisioterapeuta Deportivo de Daniel Espinosa en EntrenoApp.
Daniel tiene como objetivo principal el Maratón del 26 de Abril de 2027 (su ritmo VAM es 3:59 min/km · 15.06 km/h).
Su prioridad habitual de CrossFit es asistir los MARTES y JUEVES a las 19:00h.
Además, Daniel entrena carrera estructurada (martes series de umbral R3/R4, jueves rodaje aeróbico R1 y sábado tirada larga en Zuera).
REGLA NUTRICIONAL VITAL: Daniel es alérgico estricto a las nueces, avellanas y almendras.

Debes analizar la imagen adjunta con la programación semanal de CrossFit (Lunes a Viernes/Sábado, bloques de Strength/Metcon/Freedom/Rx) siguiendo EXACTAMENTE este protocolo inmutable:

1. Desglose Exhaustivo y Completo Día por Día (PROHIBIDO RESUMIR O GENERALIZAR):
- Traduce al español de forma clara y precisa todos los ejercicios, repeticiones, tiempos y pesos (convierte libras a kg: ej. 115 lbs = 52.5 kg, 95 lbs = 42.5 kg, 75 lbs = 35 kg, 50 lbs = 22.5 kg).
- Calentamiento & Movilidad: minutos específicos y activación recomendada.
- Fuerza / Halterofilia: Formato exacto, series, repeticiones, porcentaje de carga/RPE y foco técnico.
- WOD / Metcon: Formato exacto (AMRAP, For Time, Chipper, etc.), desglose completo línea por línea de CADA ejercicio con repeticiones y kilos exactos, y adaptaciones del fisioterapeuta ante impacto o tensión articular (ej. step-ups en vez de saltos si hay sobrecarga de sóleo).
- Vuelta a la Calma: estiramientos específicos y descompresión.
- Grupos Musculares: Lista concisa de músculos principales trabajados (ej. ["Cadena Posterior / Lumbar", "Isquios y Glúteos", "Hombros y Trapecio", "Core"]).
- Impacto para piernas o lumbar: "baja", "moderada" o "alta".

2. Recomendación Personalizada de Días Óptimos (Según Carga y Horario 19:00h):
- Analiza específicamente Martes y Jueves a las 19:00h: si encajan bien o si generan interferencia severa con sus carreras.
- Veredicto de los mejores días de la semana: si le conviene mantener Martes y Jueves o si le conviene mucho más cambiar a otros días de esa semana, explicando el motivo biomecánico y de recuperación.

Devuelve SIEMPRE una respuesta en formato JSON válido con la siguiente estructura exacta:
{
  "days": [
    {
      "dayName": "Lunes",
      "dayNumber": 1,
      "warmup": "Calentamiento específico...",
      "strengthPart": "Traducción completa de fuerza con series, reps y kg...",
      "metconPart": "Traducción línea por línea del WOD con repeticiones, kg y adaptaciones...",
      "cooldown": "Estiramientos y descompresión...",
      "musclesWorked": ["Cuádriceps", "Hombros", "Core"],
      "fatigueRisk": "alta",
      "coachComment": "Comentario técnico de encaje y prevención articular..."
    }
  ],
  "tuesdayThursdayVerdict": {
    "tuesdayOk": true,
    "thursdayOk": false,
    "analysis": "Explicación detallada de Martes y Jueves a las 19:00h..."
  },
  "recommendedDays": ["Martes", "Viernes"],
  "recommendationVerdict": "Veredicto claro y directo del Preparador Físico...",
  "physioAdvice": "Consejo del Fisioterapeuta Deportivo para prevenir sobrecargas..."
}`;

/**
 * Llama al modelo de visión (Gemini o Anthropic) con la imagen de CrossFit
 */
export async function analyzeCrossfitWeeklyImage(params: {
  imageBase64: string;
  mimeType?: string;
}): Promise<CrossfitWeekAnalysisResult> {
  const mimeType = params.mimeType || "image/jpeg";
  const geminiKey = (getSetting("gemini_api_key") || process.env.GEMINI_API_KEY || "").trim();
  const anthropicClient = getAnthropicClientFromSettings();

  // 1. Intentar con Google Gemini Vision si hay clave
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${CROSSFIT_VISION_SYSTEM_PROMPT}\n\nAnaliza la siguiente imagen de la programación semanal de CrossFit:` },
              {
                inlineData: {
                  mimeType,
                  data: params.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            ...parsed,
            rawText,
          };
        }
      }
    } catch (err) {
      console.warn("[CrossfitVision] Gemini call failed, falling back to Anthropic or clinical fallback:", err);
    }
  }

  // 2. Intentar con Anthropic Claude Vision
  if (anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        system: CROSSFIT_VISION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType as any,
                  data: params.imageBase64,
                },
              },
              {
                type: "text",
                text: "Analiza la programación semanal de CrossFit según el protocolo inmutable y devuelve el JSON.",
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b: any) => b.type === "text") as any;
      if (textBlock?.text) {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (err) {
      console.warn("[CrossfitVision] Anthropic call failed:", err);
    }
  }

  // 3. Fallback clínico experto si no hay conexión o claves
  return getClinicalCrossfitFallback();
}

/**
 * Fallback fisiológico de programación estándar de box de CrossFit cuando no hay API configurada
 */
function getClinicalCrossfitFallback(): CrossfitWeekAnalysisResult {
  return {
    days: [
      {
        dayName: "Lunes",
        dayNumber: 1,
        strengthPart: "Sentadilla Trasera (Back Squat): 5 series de 5 repeticiones progresivas al 75-80% 1RM (~85-90 kg).",
        metconPart: "AMRAP 12 min: 10 Thrusters con barra (42.5/30 kg) + 12 Saltos al Cajón (60 cm) + 14 V-Ups abdominales.",
        musclesWorked: ["Cuádriceps", "Glúteos", "Hombros", "Core"],
        fatigueRisk: "alta",
        coachComment: "Alta demanda de tren inferior; genera interferencia directa con las series de carrera si no se descansa el martes.",
      },
      {
        dayName: "Martes",
        dayNumber: 2,
        strengthPart: "Press Militar Estricto (Strict Press): 4 series de 6 repeticiones al 70-75% (~45 kg).",
        metconPart: "Por Tiempo (For Time, Cap 15 min): 500m Remo + 21-15-9 Dominadas (Pull-ups) y Flexiones en Pino (HSPU).",
        musclesWorked: ["Dorsales", "Pectoral", "Hombros", "Tríceps"],
        fatigueRisk: "baja",
        coachComment: "Día ideal de tren superior. Piernas completamente libres para las series de umbral R3 de carrera.",
      },
      {
        dayName: "Miércoles",
        dayNumber: 3,
        strengthPart: "Peso Muerto Rumano (RDL): 4 series de 8 repeticiones controladas con tempo 3010 (~70 kg).",
        metconPart: "3 Rondas Por Tiempo: 400m Carrera en cinta/asfalto + 15 Balanceos de Pesa Rusa (24 kg) + 15 Burpees.",
        musclesWorked: ["Cadena Posterior", "Isquiotibiales", "Glúteo", "Lumbar"],
        fatigueRisk: "alta",
        coachComment: "Carga lumbar e isquiotibial considerable. No recomendable la víspera de la tirada larga.",
      },
      {
        dayName: "Jueves",
        dayNumber: 4,
        strengthPart: "Dominadas Lastradas & Fondos en Anillas: 4 series de 5 repeticiones (+10 kg).",
        metconPart: "EMOM 16 min (Min 1: 15 Calorías Echo Bike; Min 2: 12 Toes-to-Bar; Min 3: 15 Flexiones; Min 4: Descanso).",
        musclesWorked: ["Core", "Espalda", "Pectoral", "Cardio Metabólico"],
        fatigueRisk: "baja",
        coachComment: "Sesión predominantemente gimnástica y aeróbica sin fatiga en sóleo o gemelos; excelente encaje a las 19:00h.",
      },
      {
        dayName: "Viernes",
        dayNumber: 5,
        strengthPart: "Arrancada de Potencia (Power Snatch): 6 series de 2 repeticiones técnicas al 70% (~45 kg).",
        metconPart: "Chipper: 50 Wall Balls (9 kg) + 40 Dobles de Comba (D.U.) + 30 Sentadillas Frontales (50 kg) + 20 Saltos.",
        musclesWorked: ["Potencia Glútea", "Cuádriceps", "Gemelos", "Hombros"],
        fatigueRisk: "alta",
        coachComment: "Mucho impacto y fatiga excéntrica en cuádriceps; comprometería gravemente la tirada de Zuera del sábado.",
      },
    ],
    tuesdayThursdayVerdict: {
      tuesdayOk: true,
      thursdayOk: true,
      analysis: "¡Excelente semana para tus horarios habituales! Tanto el Martes como el Jueves a las 19:00h están focalizados en tren superior, gimnasia y tirón dorsal, dejando tus piernas descansadas para tus sesiones clave de carrera y la tirada larga del sábado.",
    },
    recommendedDays: ["Martes", "Jueves"],
    recommendationVerdict: "Mantén tus días prioritarios: Martes (19:00h) y Jueves (19:00h). Esta semana el estímulo en el box no compite con la biomecánica de carrera ni fatiga el sóleo.",
    physioAdvice: "Fisioterapeuta Deportivo: El Martes realiza 5 min de calentamiento específico de hombro con goma (rotadores externos) y el Jueves estira bien flexores de cadera tras la Echo Bike.",
  };
}

/**
 * Añade las sesiones seleccionadas de CrossFit al calendario de EntrenoApp en ambas bases de datos
 */
export function addCrossfitSessionsToCalendar(params: {
  weekStart: string;
  selectedDays: string[]; // ["Martes", "Jueves"]
  dayDetails: CrossfitDayAnalysis[];
}): { success: boolean; addedCount: number } {
  const dbs = ["data/entrenoapp.db", "seed/entrenoapp.db"];
  let addedCount = 0;

  const dayOffsets: Record<string, number> = {
    lunes: 0,
    martes: 1,
    miercoles: 2,
    miércoles: 2,
    jueves: 3,
    viernes: 4,
    sabado: 5,
    sábado: 5,
    domingo: 6,
  };

  for (const dayName of params.selectedDays) {
    const cleanDay = dayName.toLowerCase().trim();
    const offset = dayOffsets[cleanDay];
    if (offset === undefined) continue;

    const targetDate = addDays(params.weekStart, offset);
    const detail = params.dayDetails.find(
      (d) => d.dayName.toLowerCase() === cleanDay || d.dayNumber === offset + 1
    );

    const sessionTitle = `CrossFit WOD (19:00h)`;
    const notesContent = [
      `🔥 Sesión de CrossFit en Box (19:00h):`,
      detail?.warmup
        ? `🟢 Calentamiento & Movilidad (10-12 min):\n${detail.warmup}`
        : `🟢 Calentamiento & Movilidad (10 min):\n• Movilidad articular dinámica de cadera, tobillo y hombro\n• Activación de core y aproximaciones de carga progresivas`,
      `⚡ Bloque 1 — Fuerza / Halterofilia:\n${detail?.strengthPart || "Trabajo de fuerza técnica"}`,
      `⚡ Bloque 2 — WOD / Metcon:\n${detail?.metconPart || "Acondicionamiento metabólico"}`,
      detail?.cooldown
        ? `🔵 Vuelta a la Calma & Descarga (5-8 min):\n${detail.cooldown}`
        : `🔵 Vuelta a la Calma & Descarga (5-8 min):\n• Descompresión espinal colgado en barra (dead hang 2x30s)\n• Estiramientos pasivos de cadena posterior, isquios y flexores de cadera`,
      detail?.musclesWorked && detail.musclesWorked.length > 0
        ? `\n🎯 Músculos principales: ${detail.musclesWorked.join(", ")}`
        : null,
      detail?.coachComment
        ? `\n🛡️ Criterio Coach & Fisio: ${detail.coachComment}`
        : null,
    ].filter(Boolean).join("\n\n");

    const now = new Date().toISOString();

    for (const relPath of dbs) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) continue;

      const db = new DatabaseSync(fullPath);
      // Comprobar si ya existe una sesión en esa fecha
      const existing = db.prepare("SELECT * FROM sessions WHERE date = ?").get(targetDate) as any;

      if (existing) {
        // Si es descanso, sustituir por CrossFit; si ya es entreno, añadir nota de doble sesión o actualizar
        if (existing.discipline === "descanso") {
          db.prepare(`
            UPDATE sessions 
            SET discipline = 'crossfit', planned_code = ?, distance_km = NULL, duration_min = 60, notes = ?, updated_at = ?
            WHERE id = ?
          `).run(sessionTitle, notesContent, now, existing.id);
        } else {
          // Añadir el bloque de CrossFit a las notas del día para doble sesión
          const updatedNotes = `${existing.notes || ""}\n\n${notesContent}`;
          db.prepare(`
            UPDATE sessions 
            SET notes = ?, updated_at = ?
            WHERE id = ?
          `).run(updatedNotes, now, existing.id);
        }
      } else {
        // Insertar nueva sesión
        db.prepare(`
          INSERT INTO sessions (date, discipline, planned_code, distance_km, duration_min, is_long_run, status, notes, created_at, updated_at)
          VALUES (?, 'crossfit', ?, NULL, 60, 0, 'pendiente', ?, ?, ?)
        `).run(targetDate, sessionTitle, notesContent, now, now);
      }
    }

    addedCount++;
  }

  return { success: addedCount > 0, addedCount };
}
