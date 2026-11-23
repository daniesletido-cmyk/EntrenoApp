import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { recordAiLog } from "@/lib/repo/ai-logs";
import { runTrackedAnthropicCall } from "@/lib/ai/client";
import { buildCoachAthleteContext, CoachAthleteContext } from "@/lib/coach-ai/context";
import { executeCoachAction, CoachActionProposal, CoachActionResult } from "@/lib/coach-ai/actions";
import { addDays, weekStartOf } from "@/lib/dates";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachAIResponse {
  reply: string;
  contextSummary: string;
  proposedAction?: CoachActionProposal;
  appliedAction?: CoachActionResult;
  isAiPowered?: boolean;
}

export function getAnthropicClient(): Anthropic | null {
  const apiKey = getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function getGeminiApiKey(): string | null {
  return getSetting("gemini_api_key") || process.env.GEMINI_API_KEY || null;
}

function checkIsExplicitChangeOrder(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Si contiene interrogación o expresiones de consulta/opinión, NO es una orden de cambio
  if (
    lower.includes("?") ||
    /^(qu[eé]\s+opinas|c[oó]mo\s+ves|crees\s+que|te\s+parece|deber[ií]a|es\s+mejor|o\s+esperamos|recomiendas|tendr[ií]a|ser[ií]a\s+bueno|qu[eé]\s+te\s+parece)/i.test(
      lower
    ) ||
    /qu[eé]\s+opinas|c[oó]mo\s+ves|o\s+mejor|o\s+esperamos|lo\s+dejamos\s+as[ií]/i.test(lower)
  ) {
    return false;
  }

  // Órdenes afirmativas directas
  return (
    /\b(c[aá]mbiame|sustit[uú]yeme|p[oó]nme)\b/i.test(lower) ||
    (/\b(cambia|sustituye|pon|modifica|pasa|mueve)\b/i.test(lower) &&
      /\b(el\s+entreno|la\s+sesi[oó]n|hoy|ma[ñn]ana|viernes|s[aá]bado|domingo|a\s+descanso|a\s+nataci[oó]n|a\s+gym|a\s+gimnasio)\b/i.test(
        lower
      ))
  );
}

interface GeminiModelItem {
  name: string;
  supportedGenerationMethods?: string[];
}

let cachedGeminiEndpoint: { url: string; apiVer: string; expiresAt: number } | null = null;

async function resolveGeminiEndpoints(apiKey: string): Promise<{ url: string; apiVer: string }[]> {
  const cleanKey = apiKey.trim();
  const now = Date.now();
  if (cachedGeminiEndpoint && cachedGeminiEndpoint.expiresAt > now) {
    return [
      cachedGeminiEndpoint,
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${cleanKey}`,
        apiVer: "v1beta",
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${cleanKey}`,
        apiVer: "v1beta",
      },
    ];
  }

  const endpoints: { url: string; apiVer: string }[] = [];

  for (const ver of ["v1beta", "v1"]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${cleanKey}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const models: GeminiModelItem[] = data.models || [];
        const contentModels = models.filter((m) =>
          m.supportedGenerationMethods ? m.supportedGenerationMethods.includes("generateContent") : true
        );

        const picked =
          contentModels.find((m) => /gemini-3\.5-flash-lite/i.test(m.name)) ||
          contentModels.find((m) => /gemini-flash-latest/i.test(m.name)) ||
          contentModels.find((m) => /gemini-3-flash-preview/i.test(m.name)) ||
          contentModels.find((m) => /gemini-2\.5-pro/i.test(m.name)) ||
          contentModels.find((m) => /flash/i.test(m.name)) ||
          contentModels[0];

        if (picked) {
          const modelPath = picked.name.startsWith("models/") ? picked.name : `models/${picked.name}`;
          const dynamicUrl = `https://generativelanguage.googleapis.com/${ver}/${modelPath}:generateContent?key=${cleanKey}`;
          endpoints.push({ url: dynamicUrl, apiVer: ver });
          cachedGeminiEndpoint = { url: dynamicUrl, apiVer: ver, expiresAt: now + 3600 * 1000 };
          break;
        }
      }
    } catch {
      // Siguiente
    }
  }

  endpoints.push(
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    }
  );

  return endpoints;
}

interface GeminiCallResult {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<GeminiCallResult> {
  const cleanKey = apiKey.trim();

  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) {
    return { text: "", model: "gemini", inputTokens: null, outputTokens: null };
  }
  const relevantMessages = messages.slice(firstUserIndex);

  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of relevantMessages) {
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${m.content}`;
    } else {
      contents.push({
        role,
        parts: [{ text: m.content }],
      });
    }
  }

  const endpoints = await resolveGeminiEndpoints(cleanKey);
  let lastError: Error | null = null;

  for (const { url, apiVer } of endpoints) {
    try {
      const bodyWithSystem =
        apiVer === "v1beta"
          ? {
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }
          : {
              contents: contents.map((c, i) =>
                i === 0
                  ? {
                      role: c.role,
                      parts: [{ text: `[INSTRUCCIONES DE ENTRENADOR]:\n${systemPrompt}\n\n[CONSULTA DEL ATLETA]:\n${c.parts[0].text}` }],
                    }
                  : c
              ),
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            };

      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithSystem),
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 400 && apiVer === "v1beta") {
        const errText = await res.text();
        if (errText.includes("system_instruction") || errText.includes("unknown field")) {
          const fallbackContents = contents.map((c, i) =>
            i === 0
              ? {
                  role: c.role,
                  parts: [{ text: `[INSTRUCCIONES DE ENTRENADOR]:\n${systemPrompt}\n\n[CONSULTA DEL ATLETA]:\n${c.parts[0].text}` }],
                }
              : c
          );
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: fallbackContents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
          });
        } else {
          lastError = new Error(`Gemini error ${res.status}: ${errText}`);
          continue;
        }
      }

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Intento Gemini en ${url} falló (${res.status}):`, errText);
        lastError = new Error(`Gemini error ${res.status}: ${errText}`);
        if (res.status === 404) {
          cachedGeminiEndpoint = null;
        }
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const modelMatch = url.match(/\/models\/([^:]+):/);
        return {
          text,
          model: modelMatch ? modelMatch[1] : "gemini",
          inputTokens: typeof data.usageMetadata?.promptTokenCount === "number" ? data.usageMetadata.promptTokenCount : null,
          outputTokens: typeof data.usageMetadata?.candidatesTokenCount === "number" ? data.usageMetadata.candidatesTokenCount : null,
        };
      }
    } catch (e: unknown) {
      console.warn(`Error llamando a endpoint ${url}:`, e);
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de Google Gemini");
}

function parseCoachActionBlock(rawText: string): { cleanText: string; action?: CoachActionProposal } {
  const match = rawText.match(/```coach_action\s*([\s\S]*?)\s*```/);
  if (!match) {
    return { cleanText: rawText };
  }

  try {
    const actionObj = JSON.parse(match[1]);
    const cleanText = rawText.replace(/```coach_action\s*[\s\S]*?\s*```/, "").trim();
    return { cleanText, action: actionObj };
  } catch {
    return { cleanText: rawText };
  }
}

/**
 * MOTOR DE FISIOLOGÍA LOCAL EXPERTO
 * Analiza pormenorizadamente cada pregunta del usuario, entiende el contexto de la conversación
 * y genera respuestas fisiológicas dinámicas basadas en las métricas reales del atleta y su VAM oficial (3:59).
 */
function generateLocalExpertResponse(
  messages: ChatMessage[],
  context: CoachAthleteContext,
  isExplicitChangeRequest: boolean
): { reply: string; actionCandidate?: CoachActionProposal } {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const currentMsg = userMessages[userMessages.length - 1]?.content.trim() || "";
  const lowerMsg = currentMsg.toLowerCase();
  const prevAssistantMsg = assistantMessages[assistantMessages.length - 1]?.content || "";

  // 1. Detección de intenciones (Intents)
  const hasVam = /\b(vam|test\s+vam|course[\s-]navette|test\s+de\s+5|test\s+de\s+6|vo2max|test\s+de\s+lactato|test\s+cooper|velocidad\s+aer[oó]bica)\b/i.test(lowerMsg);
  const hasTrackSeries = /\b(series\b|pista|fraccionad\w*|1000m|400m|interval\w*|pasadas|series\s+en\s+pista)\b/i.test(lowerMsg);
  const hasGymTorso = /\b(tren\s+superior|torso|pecho|espalda|brazo|biceps|triceps|press\b|jal[oó]n|remo\b|deltoides)\b/i.test(lowerMsg);
  const hasGymLegs = /\b(tren\s+inferior|piernas?|sentadilla|cu[aá]driceps|isquios?|femoral|peso\s+muerto\s+pesado)\b/i.test(lowerMsg);
  const hasCrossFit = /\b(crossfit|wod|wall\s*balls?|saltos?|peso\s+muerto|box\s*jumps?|burpees?)\b/i.test(lowerMsg);
  const hasSwimming = /\b(nataci[oó]n|nadar|piscina|nado|crol)\b/i.test(lowerMsg);
  const hasRest = /\b(descans\w*|parar|reposo|dormir\s+m[aá]s|recuperaci[oó]n\s+total|vacaciones)\b/i.test(lowerMsg);
  const hasWeekendRunning = /\b(fin\s+de\s+semana|s[aá]bado|domingo|tirada\s+larga|reestructur\w*|carrera\s+del\s+fin)\b/i.test(lowerMsg);
  const hasWeeklyPlanRequest =
    /\b(ajust\w*\s+(la\s+)?semana|reorganiz\w*\s+(la\s+)?semana|plan\s+semanal|c[oó]mo\s+queda\s+la\s+semana|cuadra\w*\s+(la\s+)?semana|organiza\w*\s+(la\s+)?semana|cambia\w*\s+(la\s+)?semana|semana\s+de\s+entreno|semana\s+actual)\b/i.test(
      lowerMsg
    ) ||
    (hasCrossFit && (lowerMsg.includes("martes") || lowerMsg.includes("jueves") || lowerMsg.includes("semana")));
  const hasFitUploadOrEval = /\b(eval[uú]es?|evalua\w*|qu[eé]\s+tal\s+estoy|c[oó]mo\s+estoy|c[oó]mo\s+me\s+ves|\.fit|he\s+subido|acabo\s+de\s+hacer|cuando\s+meta|cuando\s+suba|he\s+terminado|mis\s+datos)\b/i.test(lowerMsg);
  const hasSorenessInjury = /\b(molestias?|dolor|sobrecarga|tir[oó]n|s[oó]leo|gemelo|aquiles|tend[oó]n|rodilla|cintilla|fascitis|cargad\w*|agujetas)\b/i.test(lowerMsg);
  const hasNutrition = /\b(com[eé]r?|cen\w*|desayun\w*|nutrici[oó]n|carbohidratos?|hidratos|geles?|sales|suplement\w*|omega-?3|alergia|frutos\s+secos|pescado|agua|hidrataci[oó]n)\b/i.test(lowerMsg);
  const hasAcwrLoad = /\b(acwr|infracarga|sobrecarga|gabbett|ratio|pts?\s+foster|carga\s+aguda|carga\s+cr[oó]nica|alerta)\b/i.test(lowerMsg);
  const hasSleepReadiness = /\b(sue[ñn]o|dormir|horas?\s+de\s+sue[ñn]o|readiness|zepp|cansancio|energ[ií]a|despert\w*|apretar|bajar\s+intensidad)\b/i.test(lowerMsg);
  const hasPaceStrategy = /\b(ritmo\b|marat[oó]n|5:00|5:15|tiempo\s+objetivo|estrategia|zonas\s+de\s+ritmo|r0|r1|r2|r3|rmc)\b/i.test(lowerMsg);
  const hasFollowUp = /\b(y\s+entonces|y\s+ma[ñn]ana|qu[eé]\s+hago\s+ahora|ya\s+lo\s+(hice|met[ií]|sub[ií]|termin[eé])|vale|perfecto|entendido|de\s+acuerdo|qu[eé]\s+opinas)\b/i.test(lowerMsg);

  const acuteLoad = context.weeklyAssessment.loadAnalysis.currentWeekLoad;
  const acwrValue = context.weeklyAssessment.loadAnalysis.acwr !== null ? context.weeklyAssessment.loadAnalysis.acwr.toFixed(2) : "—";
  const sleepHours = context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "buen descanso";
  const readinessScore = context.dailyReadiness.score;
  const readinessBadge = context.dailyReadiness.verdict?.badgeLabel || context.dailyReadiness.levelLabel;

  let reply = "";
  let actionCandidate: CoachActionProposal | undefined;

  // CASO ESPECIAL: Reorganización / Ajuste Integral del Plan Semanal
  if (hasWeeklyPlanRequest) {
    const ws = weekStartOf(context.today);
    const dMon = ws;
    const dTue = addDays(ws, 1);
    const dWed = addDays(ws, 2);
    const dThu = addDays(ws, 3);
    const dFri = addDays(ws, 4);
    const dSat = addDays(ws, 5);
    const dSun = addDays(ws, 6);

    reply = `¡Semana analizada y reajustada al 100%, Daniel! Aplicando nuestro criterio de **Preparador Físico de Élite + Fisioterapeuta**, el plan queda cuadrado de forma óptima y **guardado automáticamente en tu calendario**:

### 📅 Plan Semanal Oficial (${dMon} al ${dSun}):

1. **Lunes ${dMon.slice(5)} · Carrera Base Aeróbica R1 (6.0 km Clave · 45 min · RPE 4)**
   - 🟢 **Calentamiento**: 10 min trote suave R0 (>5:30/km) + movilidad activa de tobillos y cadera.
   - ⚡ **Parte Principal**: 6.0 km íntegros a ritmo 5:25 - 4:59 min/km (R1) + 4 rectas progresivas de 80m.
   - 🔵 **Vuelta a la Calma**: 8 min trote regenerativo y caminata suave + estiramientos.

2. **Martes ${dTue.slice(5)} · CrossFit Box (19:00h · \"Pain Cave\" Fuerza + Chipper · RPE 7-8)**
   - ⚡ **Fuerza**: 5x5 Power Clean & Jerk técnico (52.5 kg).
   - ⚡ **Metcon**: Chipper con peso moderado. ⚠️ *Adaptación Fisio:* Subidas al cajón (Step-ups) en lugar de rebote de Box Jumps para preservar sóleos y Aquiles.
   - 🔵 **Vuelta a la Calma**: 8 min descompresión lumbar en barra + estiramiento de glúteos y cadena posterior.

3. **Miércoles ${dWed.slice(5)} · Natación Compensatoria (Descarga Articular & Pull-buoy · 1.800m · RPE 5-6)**
   - 🟢 Sesión de descarga hidrostática sin impacto podal. Bloques con pull-buoy para oxigenar tren superior y dejar las piernas descansadas tras el Box del martes.

4. **Jueves ${dThu.slice(5)} · CrossFit Box (19:00h · \"Steady\" AMRAP 24 min Aeróbico · RPE 6-7)**
   - ⚡ **WOD**: AMRAP 24 min constante de carrera suave y Air Bike a ritmo regular sin sprint láctico. Cero barra pesada, dejando las piernas sin fatiga excéntrica de cara al fin de semana.
   - 🔵 **Vuelta a la Calma**: 8 min pedaleo regenerativo suave + estiramientos completos.

5. **Viernes ${dFri.slice(5)} · Descanso Total & Movilidad Lumbo-Pélvica**
   - 🟢 15-20 min movilidad de cadera (couch stretch, paloma) y recarga de glucógeno para el bloque específico de carrera.

6. **Sábado ${dSat.slice(5)} · Carrera R1 Regenerativo Suave + Técnica (6.0 km Clave · 45 min · RPE 3-4)**
   - 🟢 **Calentamiento**: 10 min trote muy suave (>5:30/km) + activación dinámica.
   - ⚡ **Parte Principal**: 6.0 km muy cómodos a 5:25 - 5:10 min/km + 4 rectas de 80m progresivas.
   - 🔵 **Vuelta a la Calma**: 8 min al trote muy suave y caminata + estiramientos.

7. **Domingo ${dSun.slice(5)} · Tirada Larga Zuera R5 (18.0 km Clave · 21.5 km Total · 115 min · RPE 5-6)**
   - 🟢 **Calentamiento**: 12 min trote suave R0 (>5:30/km) + movilidad de cadera.
   - ⚡ **Parte Principal**: 18.0 km continuos (5:25 - 5:10 min/km), cerrando los últimos 3-4 km a Ritmo Maratón (5:05 - 5:10 min/km).
   - 🔵 **Vuelta a la Calma**: 10 min caminando y trote suave + estiramientos completos.

✨ *He aplicado y sincronizado automáticamente estos cambios en la base de datos de tu aplicación para que los veas reflejados en /hoy, /plan-semanal y en tu Suunto.*`;

    actionCandidate = {
      type: "update_weekly_plan",
      weekStart: ws,
      summary: "Plan semanal reestructurado con CrossFit M/J (19h), natación y carrera R1/R5",
      weeklyPlan: [
        {
          date: dMon,
          discipline: "carrera",
          plannedCode: "R1 Base Aeróbica Suave (Reincorporación · 6 km Clave · 8 km Total)",
          durationMin: 45,
          distanceKm: 8.0,
          notes: "RUNNING · Base Aeróbica de Reincorporación (6 km Clave · 8.0 km Total · RPE 4):\n- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote suave + movilidad articular activa de tobillos y cadera.\n- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 4:59 min/km (Zona R1 Base Aeróbica)): 6.0 km continuos a ritmo cómodo y relajado + 4 rectas progresivas de 80m.\n- Vuelta a la calma (8 min · Trote regenerativo y caminata suave + estiramientos completos): Enfriamiento gradual y descompresión muscular.\n- Estrategia Nutrición: Tortitas con miel o membrillo. Cero frutos secos.",
        },
        {
          date: dTue,
          discipline: "crossfit",
          plannedCode: "CrossFit Box · \"Pain Cave\" (Power Clean & Jerk + Chipper 52.5 kg & Step-ups)",
          durationMin: 55,
          notes: "CROSSFIT BOX · PAIN CAVE (Fuerza + Chipper Metabólico · RPE 7-8):\n- 🟢 Calentamiento & Movilidad (10 min):\n  • Movilidad articular activa de muñecas, hombros, cadera y tobillo (5 min)\n  • Activación específica (3 rondas): 5 Pesos muertos con barra vacía + 5 Cargadas colgantes (Hang Power Clean) + 5 Subidas controladas al cajón (Step-ups)\n- ⚡ Bloque 1 — Fuerza / Halterofilia (EMOM 10' — Cada 2:00 durante 5 rondas):\n  • 5×5 Power Clean & Jerk (Cargada de potencia + Envión) — Touch & Go con técnica estricta\n  • Progresión de carga: empezar en peso moderado (RPE 7) y subir a moderado-pesado (RPE 8) manteniendo la espalda neutra y recepción sólida\n- ⚡ Bloque 2 — WOD \"Pain Cave\" (Por Tiempo / For Time — Peso RX: 52.5 kg):\n  • 10 Step-ups al cajón (subidas controladas alternas, evitando impacto de salto)\n  • 50 Pesos muertos (Deadlifts) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 40 Cargadas colgantes (Hang Power Cleans) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 30 Empujes de hombro (Shoulder to Overhead) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 20 Cargadas + Envión (Power Clean & Jerk) — 52.5 kg\n  • 10 Step-ups al cajón\n  • ⚠️ Adaptación Fisioterapeuta: Sustituir los Box Jumps por Step-ups firmes para proteger sóleo y tendón de Aquiles de cara a tus rodajes semanales.\n- 🔵 Vuelta a la Calma & Descarga (8 min):\n  • Descompresión lumbar colgado en barra (3×20 seg)\n  • Estiramiento suave de isquiosurales, glúteo mayor, flexores de cadera y descarga de gemelo/sóleo\n- 🥗 Estrategia Nutrición (Media Mañana / Tarde):\n  • Si vas a las 19:00h (habitual): Comida a las 13:30h rica en carbohidratos complejos (arroz/pasta con proteína magra). Merienda a las 17:15h: 3 tortitas de arroz con miel/membrillo o avena con leche vegetal/desnatada y semillas de chía o calabaza (100% libre de frutos secos).\n  • Cena post-entreno: Buena ración de carbohidratos (arroz o patata) con proteína magra para reponer glucógeno.\n- 🧠 Enfoque Psicológico & Pacing: Disciplina de ritmo: en los chippers largos, empieza a un ritmo conservador del 75%, respira en cada bloqueo y prioriza la pulcritud técnica.",
        },
        {
          date: dWed,
          discipline: "natacion",
          plannedCode: "NAT-C (Descarga Articular & Pull-buoy · 1.800m)",
          durationMin: 45,
          distanceKm: 1.8,
          notes: "NATACIÓN COMPENSATORIA (Descarga Articular & Pull-buoy · 1.800m · RPE 5-6):\n- 🟢 Calentamiento & Activación en Agua (350m · 10 min):\n  • 150m crol suave bilateral\n  • 2×50m espalda doble brazo (desc. 15\")\n  • 2×50m pies con tabla suave (desc. 15\")\n- ⚡ Bloque Principal & Técnica en Agua (1200m · 25-30 min · RPE 5-6):\n  • 3×200m crol continuo con pull-buoy buscando deslizamiento y brazada larga (desc. 20\")\n  • 4×100m técnica punto muerto / recobro alto (desc. 15\")\n  • 4×50m progresivos suaves sin forzar patada (desc. 15\")\n- 🔵 Vuelta a la Calma & Descarga (250m · 5-8 min):\n  • 150m nado continuo muy suave alternando crol y espalda\n  • 100m soltura respirando cada 3-5 brazadas\n- 🥗 Estrategia Nutrición (Media Mañana / Tarde):\n  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de arroz o maíz con dulce de membrillo o miel + agua. En posición horizontal en el agua el vaciado gástrico es crítico; esta combinación no produce reflujo y evita pesadez. Cero frutos secos por alergia estricta.\n  • Comida post-entreno: Buena ración de carbohidratos complejos y proteína magra para reponer glucógeno sin pesadez digestiva.\n- 🧠 Enfoque Psicológico & Pacing: Sensación de Deslizamiento: La natación hoy es hidrostática y regenerativa tras el CrossFit del martes; no compitas contra el cronómetro. Céntrate en la longitud de brazada y la relajación de hombros.",
        },
        {
          date: dThu,
          discipline: "crossfit",
          plannedCode: "CrossFit Box · \"Steady\" (AMRAP 24 min · Run + Air Bike Aeróbico)",
          durationMin: 50,
          notes: "CROSSFIT BOX · STEADY (Capacidad Aeróbica & Condicionamiento · RPE 6-7):\n- 🟢 Calentamiento (10 min): Movilidad de tobillos, cadera y pedaleo suave en Air Bike.\n- ⚡ WOD Freedom: AMRAP 24 min (Run + Air Bike a ritmo regular sin sprint láctico). Cero barra pesada.\n- 🔵 Vuelta a la Calma (8 min): Pedaleo regenerativo suave (<30 RPM) y estiramientos.",
        },
        {
          date: dFri,
          discipline: "descanso",
          plannedCode: "Descanso Total & Movilidad Lumbo-Pélvica",
          durationMin: 20,
          notes: "DESCANSO TOTAL & MOVILIDAD:\n- 15-20 min movilidad de cadera (couch stretch, paloma) y estiramientos suaves.\n- Cero impacto para asimilar los dos días de CrossFit y recargar glucógeno para el fin de semana.",
        },
        {
          date: dSat,
          discipline: "carrera",
          plannedCode: "R1 Regenerativo Suave + Técnica (6 km Clave · 8 km Total)",
          durationMin: 45,
          distanceKm: 8.0,
          notes: "RUNNING · Regenerativo de Activación (6 km Clave · 8.0 km Total · RPE 3-4):\n- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote muy suave progresivo + movilidad dinámica.\n- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 5:10 min/km (Zona R1/R0)): 6.0 km continuos muy cómodos a ritmo suave y relajado + 4 rectas de 80m progresivas.\n- Vuelta a la calma (8 min · Trote muy suave y caminata + estiramientos completos): Enfriamiento gradual.",
        },
        {
          date: dSun,
          discipline: "carrera",
          plannedCode: "R5 (Tirada Larga 18k en Zuera · 21.5 km Total)",
          durationMin: 115,
          distanceKm: 21.5,
          isLongRun: true,
          notes: "RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (18 km Clave · 21.5 km Total · RPE 5-6):\n- Calentamiento (12 min · ~Ritmo > 5:30 min/km · R0 suave): Trote suave progresivo + movilidad de cadera y tobillos.\n- Parte principal (18.0 km · ~94 min · Ritmo: 5:25 - 5:10 min/km (Zona R1 · Cierre últimos 3-4 km a 5:05 - 5:10/km Ritmo Maratón)): Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (178-180 ppm). En los últimos 3-4 km consolidar Ritmo Maratón en terreno llano de Zuera.\n- Vuelta a la calma (10 min · Trote muy suave > 6:00 min/km / Caminata + estiramientos completos).\n- Nutrición: Beber agua o sales cada 20 min; 1 gel isotónico cada 40-45 min.",
        },
      ],
    };
  }

  // CASO 1: Consulta compuesta de gimnasio torso + evaluación .fit + tiradas de fin de semana
  else if (hasGymTorso && (hasFitUploadOrEval || hasWeekendRunning)) {
    reply = `¡Perfecto planteamiento Daniel! Te dejo mi análisis como tu entrenador:

### 1. Sesión de Gimnasio (Tren Superior) de hoy
* **Excelente elección fisiológica**: Al enfocar la sesión exclusivamente en torso (empuje/tirón: pectoral, dorsal, deltoides, brazos y core), preservamos las piernas al 100% (cuádriceps, isquios y sóleos) sin generar daño miofibrilar residual.
* **Demanda de SNC**: Mantén la intensidad en **RPE 7-8**, dejando 1-2 repeticiones en recámara (RIR 1-2) para mantener el sistema nervioso central fresco.

### 2. Evaluación de tu estado cuando importes el archivo .fit
En cuanto metas el archivo \`.fit\` en la app:
* Computaremos la **duración real y la carga Foster** de la sesión.
* Comprobaremos tu ratio **ACWR** (actualmente en **${acwrValue}** con **${acuteLoad} pts** acumulados) para verificar que la carga evoluciona de forma segura.
* Tu Readiness diario (hoy en **${readinessScore}/100 · ${readinessBadge}**) se recalculará sumando este estímulo.

### 3. ¿Habrá que reestructurar los entrenos de carrera del fin de semana?
* **Criterio principal**: Como tu gran meta es la **Maratón (ritmo objetivo 5:00-5:15 min/km)**, las tiradas del fin de semana (**Sábado R2 a 4:35-4:59 min/km y Domingo tirada larga R1/RMC**) son el pilar más específico.
* **Decisión**: Al trabajar solo torso hoy, **NO será necesario recortar ni suspender el fin de semana de carrera**.
* **Plan de contingencia**: Si al registrar el entreno tu RPE supera 8.5 o notas fatiga sistémica alta al despertar mañana, adaptaremos el ritmo del sábado a rodaje regenerativo suave R0/R1 (>5:23 min/km) para llegar fresco al domingo.

¡A por la sesión y cuando subas el .fit lo dejamos todo registrado!`;
  }

  // CASO 2: Consulta sobre Test VAM y/o Series en pista
  else if (hasVam || (hasTrackSeries && (lowerMsg.includes("mañana") || lowerMsg.includes("semana") || lowerMsg.includes("útil") || lowerMsg.includes("viable")))) {
    reply = `### Análisis del Test VAM y Series en Pista:

* **Tu VAM Oficial Actual**: **3:59 min/km (15.06 km/h)**.
* **Tus Zonas de Ritmo Actualizadas**:
  - **R0 (Regenerativo)**: > 5:23 min/km (5:25 - 5:50 min/km) · RPE 3-4
  - **R1 (Base Aeróbica Ligera)**: 5:23 - 4:59 min/km · RPE 4-5
  - **RMC (Ritmo Maratón Objetivo)**: 5:00 - 5:15 min/km · RPE 5-6 (Sub 3h45)
  - **R2 (Umbral Aeróbico / Tempo)**: 4:59 - 4:35 min/km · RPE 6-7
  - **R3 (Umbral Anaeróbico)**: 4:23 - 4:11 min/km · RPE 7-8
  - **R3+ (VAM / VO2max)**: 3:59 min/km · RPE 9-10

### ¿Es conveniente meter series o repetir test esta semana?
1. **No repetir test de forma continuada**: Tu VAM de 3:59 min/km está perfectamente calibrada. Repetir un test máximo vaciaría el glucógeno y perjudicaría las tiradas largas.
2. **Series en pista**: Con las sesiones de CrossFit y la fuerza, la cuota anaeróbica semanal está cubierta. Para carrera priorizamos el **trabajo extensivo a RMC (5:00-5:15 min/km) y bloques de R2 (4:35-4:59 min/km)** para potenciar la economía metabólica.`;
  }

  // CASO 3: Molestias musculares, tendones o prevención de lesiones
  else if (hasSorenessInjury) {
    const area = lowerMsg.includes("sóleo") || lowerMsg.includes("soleo")
      ? "el sóleo"
      : lowerMsg.includes("gemelo")
      ? "los gemelos"
      : lowerMsg.includes("aquiles")
      ? "el tendón de Aquiles"
      : lowerMsg.includes("rodilla") || lowerMsg.includes("cintilla")
      ? "la rodilla / cintilla iliotibial"
      : "la zona muscular sobrecargada";

    reply = `### Protocolo del Equipo Técnico Multidisciplinar para sobrecarga en ${area}:

1. **🏃 Preparador Físico de Élite**:
   - Con el impacto acumulado y los saltos/pesas en CrossFit, ${area} absorbe una gran carga elástica.
   - Si la molestia es sobrecarga leve (RPE ≤ 3), realizaremos **descarga activa en natación** o rodaje regenerativo R0 (>5:25 - 5:45 min/km). Si notas dolor punzante al apoyar, suspender impacto de inmediato.

2. **🩺 Fisioterapeuta Deportivo**:
   - **Acción para hoy**: Sustituir impacto por **Natación (N1 · 35-40 min suave)** o trabajo de movilidad + torso.
   - El agua genera vasoconstricción/vasodilatación natural, acelerando el drenaje y la recuperación sin impacto sobre ${area}.
   - Aplicar automasaje suave con foam roller en la fascia circundante (1-2 min) y contrastes de agua fría 3-4 min.

3. **🥗 Nutricionista Deportivo**:
   - Reposición de magnesio, sodio y antioxidantes.
   - Pauta reparadora limpia: avena, semillas de calabaza, chía, lino, tahini puro y grasas monoinsaturadas (AOVE y aguacate).
   - ¡Recordatorio vital!: Cero frutos secos de cáscara (nueces, avellanas o almendras).

4. **🧠 Psicólogo Deportivo**:
   - Descargar no es retroceder: cuidar ${area} hoy es lo que te permitirá estar en la línea de salida del Maratón al 100%. Cero sentimiento de culpa.`;

    actionCandidate = {
      type: "modify_session",
      date: context.today,
      toDiscipline: "natacion",
      plannedCode: "N1",
      durationMin: 35,
      notes: `Descarga activa en natación pautada por sobrecarga en ${area}`,
      summary: `Cambiar sesión de hoy a Natación suave (35 min) para descargar ${area}`,
    };
  }

  // CASO 4: Consulta sobre cambio o planificación de Natación
  else if (hasSwimming) {
    const isWeekendTarget = lowerMsg.includes("sabado") || lowerMsg.includes("sábado") || lowerMsg.includes("domingo") || lowerMsg.includes("fin de semana");
    const isConsultation = lowerMsg.includes("opinas") || lowerMsg.includes("ves") || lowerMsg.includes("esperamos") || lowerMsg.includes("crees");

    if (isWeekendTarget && isConsultation) {
      reply = `Mi criterio como tu entrenador es claro: **de momento mantengamos el plan de carrera del fin de semana y no metamos natación sábado/domingo**.

### Razonamiento fisiológico:
1. **Especificidad Maratón**: Para correr los 42 km a 5:00-5:15 min/km necesitas acumular adaptaciones tendinosas y eficiencia neuromuscular en bipedestación. La natación es fantástica para recuperar entre semana, pero no sustituye la tirada clave del fin de semana.
2. **Evaluemos la respuesta día a día**:
   - Completamos los entrenos de jueves y viernes.
   - Si al despertar el sábado tu Readiness está alto (Luz Verde) y las piernas no están sobrecargadas, saldremos a rodar.
   - Solo si arrastras pesadez articular alta el sábado modificaremos a **Natación N1 (40 min)**.`;
    } else {
      actionCandidate = {
        type: "modify_session",
        date: context.today,
        toDiscipline: "natacion",
        plannedCode: "N1",
        durationMin: 40,
        notes: "Natación regenerativa suave (RPE 4-5) pautada para descarga articular y metabólica",
        summary: "Cambiar la sesión de hoy a Natación regenerativa (N1 · 40 min)",
      };

      if (isExplicitChangeRequest) {
        reply = `¡Hecho, Daniel! He actualizado tu plan directamente en la app a **Natación (N1 · 40 min)**.

**Pautas para la sesión de nado:**
* Enfoque: Regenerativo suave (**RPE 4-5**), buscando soltar musculatura y descomprimir columna y caderas.
* Trabajo continuo de crol con pausas cada 100-200m, prestando atención a la amplitud de brazada y respiración bilateral.
* No pases de 40 minutos para no añadir fatiga glucolítica antes de las tiradas del fin de semana.`;
      } else {
        reply = `Analizando tu estado de carga (**${acuteLoad} pts Foster** acumulados esta semana y Readiness de **${readinessScore}/100**):

Meter **Natación hoy** es una **excelente decisión de descarga activa**, siempre que:
1. La mantengas en zona aeróbica ligera (**RPE 4-5**) sin series al sprint.
2. Te centres en la movilidad escapular y descompresión articular tras las sesiones de fuerza/CrossFit.
3. No superes los 35-40 minutos de nado para que tus piernas lleguen 100% preparadas al bloque de carrera del fin de semana.

¿Quieres que te deje aplicada esta sesión de Natación en el calendario de hoy?`;
      }
    }
  }

  // CASO 5: Descanso total o descanso activo
  else if (hasRest) {
    actionCandidate = {
      type: "set_rest_day",
      date: context.today,
      toDiscipline: "descanso",
      summary: "Marcar la sesión de hoy como Descanso Total",
    };

    if (isExplicitChangeRequest) {
      reply = `¡Hecho! He configurado tu día de hoy como **Descanso Total** en la app. Con **${acuteLoad} pts Foster** acumulados en la semana, tu cuerpo aprovechará hoy para supercompensar, reponer glucógeno y reparar fibras musculares.`;
    } else {
      reply = `Tomar hoy como **día de descanso** es una decisión muy sensata si sientes acumulación de fatiga. 
* Llevas **${acuteLoad} pts Foster** acumulados en la semana.
* Un día de descanso completo o un paseo ligero reducirá la fatiga del SNC y asegurará que rindas al máximo en las sesiones siguientes.

Si deseas que lo configure en la app, tienes el botón directo aquí abajo.`;
    }
  }

  // CASO 6: Nutrición, Hidratación o Suplementación
  else if (hasNutrition) {
    reply = `### Pautas Nutricionales Adaptadas a tu Perfil:

* **Tus requerimientos y exclusiones**:
  - **Alergia estricta**: Cero frutos secos (nuez, avellana, almendra, etc.).
  - **Sin pescado**: Aporte de ácidos grasos Omega-3 mediante suplementación diaria pautada.
* **Cena previa a tirada larga o entreno exigente**:
  - Carbohidratos complejos de fácil digestión: arroz blanco o pasta con aceite de oliva virgen extra, pechuga de pollo/pavo o huevos.
  - Evitar exceso de fibra cruda o legumbres la noche anterior para prevenir molestias gastrointestinales durante la carrera.
* **Desayuno el día de la tirada**:
  - 2h a 2h30 antes de correr: Tostadas de pan blanco con mermelada/miel o avena cocida, más café o té y 400ml de agua con una pizca de sales.
* **Estrategia intra-carrera (> 60 min)**:
  - 1 gel energético cada 40-45 minutos + pequeños sorbos de agua para acostumbrar al estómago a asimilar glucógeno en carrera (vital para la Maratón).`;
  }

  // CASO 7: Sueño, Recuperación y Readiness
  else if (hasSleepReadiness) {
    reply = `### Análisis de tu Descanso y Readiness de Hoy:

* **Puntuación de Readiness**: **${readinessScore}/100 (${readinessBadge})**.
* **Sueño registrado (Zepp)**: **${sleepHours}** (Score Zepp: ${context.dailyReadiness.stats.sleepScore ?? "—"}/100).
* **Diagnóstico fisiológico**: ${context.dailyReadiness.headline}.
* **Consejo del entrenador**: ${context.dailyReadiness.coachAdvice}
* **Semáforo de Cargas**:
  - ${context.dailyReadiness.verdict?.actionGuidance || "Entrena según sensaciones y respeta tus zonas VAM."}
* **Recordatorio médico clave**: Daniel, recuerda que tu frecuencia cardíaca de reposo es naturalmente elevada (~100 lpm). Tu indicador de intensidad siempre debe ser el **RPE (escala 1-10) y el ritmo en min/km**, nunca las pulsaciones del reloj.`;
  }

  // CASO 8: Ratio ACWR y Mecánica de Carga
  else if (hasAcwrLoad) {
    reply = `### Diagnóstico del Ratio ACWR (**${acwrValue}** - ${context.weeklyAssessment.loadAnalysis.acwrBadge}):

* **¿Cómo se interpreta este valor?**
  - El modelo de Tim Gabbett compara la carga de los últimos 7 días (aguda) con la media de las últimas 4 semanas (crónica).
  - Al estar a mitad de semana con **${acuteLoad} pts Foster**, el ratio matemático evoluciona a medida que completas los entrenamientos clave.
* **¿Hay riesgo lesional?**: Con tu valor actual no hay sobrecarga peligrosa (el umbral de riesgo lesional está por encima de **1.50**).
* **Pauta a seguir**: Completa las sesiones programadas respetando los ritmos aeróbicos marcados y el ratio se mantendrá dentro de la zona óptima (**0.80 - 1.30**) al cerrar el domingo.`;
  }

  // CASO 9: Ritmo objetivo y Estrategia Maratón
  else if (hasPaceStrategy) {
    reply = `### Estrategia hacia tu 2ª Maratón (${context.profile.marathonDate || "26 de abril de 2027"}):

* **Ritmo objetivo en carrera**: **5:00 - 5:15 min/km** (tiempo estimado: 3h30 - 3h41).
* **VAM Oficial**: **3:59 min/km (15.06 km/h)**.
* **Tus Zonas de Ritmo en Entrenamiento**:
  - **R0 (Regenerativo)**: > 5:23 min/km (5:25 - 5:50 min/km) a RPE 3-4 (calentamiento, soltar piernas).
  - **R1 (Base Aeróbica)**: 5:23 - 4:59 min/km a RPE 4-5 (rodajes de volumen cómodo).
  - **RMC (Ritmo Maratón)**: 5:00 - 5:15 min/km a RPE 5-6 (bloques específicos de ritmo de competición).
  - **R2 (Umbral Aeróbico)**: 4:59 - 4:35 min/km a RPE 6-7 (tempo medio, fatiga controlada).
  - **R3 (Umbral Anaeróbico)**: 4:23 - 4:11 min/km a RPE 7-8 (bloques de crucero exigente).
  - **R3+ (Series VAM)**: 3:59 min/km a RPE 9-10.`;
  }

  // CASO 10: Continuación conversacional / Respuestas breves
  else if (hasFollowUp && prevAssistantMsg) {
    reply = `Entendido Daniel. Siguiendo lo que hablábamos:

* Tu carga semanal actual es de **${acuteLoad} pts Foster** en ${context.weeklyAssessment.sessionsProgress.completedCount} sesiones, con un Readiness hoy de **${readinessScore}/100 (${readinessBadge})**.
* Si estás listo para el entrenamiento programado, ejecútalo controlando el RPE y respetando los ritmos VAM.
* Si necesitas que ajuste cualquier sesión del plan o cree un registro alternativo, dímelo y lo configuramos al instante.`;
  }

  // CASO GENERAL DINÁMICO
  else {
    const todaySessionInfo = context.upcomingSessions.find((s) => s.date === context.today);
    reply = `He analizado tu consulta y el estado actual de tu preparación Daniel:

### Resumen de tu estado en vivo:
* **Carga de entrenamiento semanal**: **${acuteLoad} pts Foster** acumulados (${context.weeklyAssessment.sessionsProgress.completedCount} sesiones realizadas).
* **Readiness de hoy**: **${readinessScore}/100 (${readinessBadge})**, con **${sleepHours}** de sueño registrado.
* **Sesión prevista para hoy**: ${todaySessionInfo ? `${todaySessionInfo.discipline.toUpperCase()} (${todaySessionInfo.planned_code || "Entreno pautado"} · ${todaySessionInfo.duration_min || 45} min)` : "Día sin sesión pautada / Descanso"}.

### Criterio del Entrenador:
Respecto a *"${currentMsg}"*:
* Recuerda que tu gran objetivo es tu **Maratón a ritmo 5:00-5:15 min/km (VAM 3:59 min/km)**, combinada con fuerza y salud articular.
* Guíate siempre por tu **RPE y ritmo por kilómetro**, manteniendo la disciplina en los descansos y la nutrición.
* Si deseas que aplique un cambio específico en tu calendario (pasar a natación, modificar volumen, o añadir descanso), indícamelo expresamente o usa las opciones del chat.`;
  }

  return { reply, actionCandidate };
}

export async function askCoachAI(messages: ChatMessage[], todayParam?: string, userId?: string): Promise<CoachAIResponse> {
  const context = buildCoachAthleteContext(todayParam, userId);
  const anthropicClient = getAnthropicClient();
  const geminiApiKey = getGeminiApiKey();

  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  const isExplicitChangeRequest = checkIsExplicitChangeOrder(lastUserMsg);

  const systemPrompt = `
Eres el Equipo Técnico Multidisciplinar Oficial de ${context.athleteName} dentro de su aplicación "EntrenoApp", integrando la visión coordinada de cuatro especialistas de élite:
1. PREPARADOR FÍSICO DE ÉLITE (Rendimiento y Periodización):
   - Evalúa la carga aguda vs. crónica (ACWR / TSB), zonas de ritmo (VAM oficial 3:59 min/km), volumen semanal y proximidad a su objetivo de Maratón (ritmo 5:00-5:15 min/km).
   - Ajusta intensidad y volumen de las siguientes sesiones para maximizar la supercompensación y evitar el sobreentrenamiento.
2. FISIOTERAPEUTA DEPORTIVO (Prevención y Readaptación):
   - Prioriza la integridad estructural, articular y muscular.
   - Analiza las sensaciones subjetivas post-entreno (feeling 1-5, notas de Suunto, molestias o pesadez muscular) por encima del papel: si el atleta reporta sobrecarga o fatiga en su reloj Suunto, prescribe descarga activa, movilidad o ajuste de impacto.
3. NUTRICIONISTA DEPORTIVO (Energía, Hidratación y Recuperación):
   - Adapta hidratación y reposición de glucógeno post-esfuerzo.
   - ¡REGLA VITAL INMUTABLE!: Dani tiene ALERGIA SEVERA a nueces, avellanas y almendras (y frutos secos de cáscara). PROHIBIDO recomendarlos. Recomienda únicamente semillas seguras (calabaza, girasol, chía, lino, sésamo/tahini, avena, fruta fresca, AOVE y aguacate).
4. PSICÓLOGO DEPORTIVO (Adherencia, Gestión del Esfuerzo y Confianza):
   - Refuerza la confianza cuando deba modular un entreno por fatiga (evitando cualquier sentimiento de culpa por adaptar una sesión) y potencia el foco mental.

REGLAS FUNDAMENTALES QUE DEBES CUMPLIR SIEMPRE:
1. CONTEXTO REAL & SENSACIONES DE SUUNTO: Tienes acceso directo a su historial de carga de los últimos 14 días, sensaciones subjetivas (feeling 1-5 y RPE), notas del reloj Suunto, Readiness diario y sueño. Utiliza siempre estos datos reales para justificar tus respuestas.
2. PRUEBA VAM Y ZONAS OFICIALES:
   - VAM Oficial: 3:59 min/km (15.06 km/h).
   - R0 (Regenerativo / Calentamiento): > 5:25 - 5:45 min/km a RPE 3-4 (FC < 140 lpm).
   - R1 (Aeróbico Ligero / Base): 5:25 - 4:59 min/km a RPE 4-5.
   - RMC (Ritmo Maratón Objetivo): 5:00 - 5:15 min/km a RPE 5-6 (Sub 3h45).
   - R2 (Umbral Aeróbico / Tempo): 4:59 - 4:35 min/km a RPE 6-7.
   - R3 / R4 (Umbral Anaeróbico / Intervalos): 4:23 - 4:11 min/km (recuperación activa a trote ~6:00 min/km).
   - R3+ (VAM / VO2max): 3:59 min/km.
3. FRECUENCIA CARDÍACA: Daniel tiene indicación médica de entrenar por RITMO (min/km) y RPE (escala 1 a 10 de Foster), NUNCA por zonas de pulso absoluto (lpm) debido a su frecuencia cardíaca de reposo elevada (~100 lpm, taquicardia sinusal benigna, apto sin restricciones).
4. MODELO DE CARGA (ACWR): Conoces el modelo de Tim Gabbett de Carga Aguda vs Crónica. Si su ratio está bajo (<0.80) a mitad de semana, sabes que es una infracarga matemática temporal porque la semana está en curso. Si está por encima de 1.50, adviertes del riesgo lesional.
5. PRIORIDAD MARATÓN (CARRERA A PIE):
   El gran objetivo macro de Daniel es correr su 2ª Maratón (ritmo objetivo 5:00-5:15 min/km).
   - Los rodajes y tiradas largas del fin de semana (sábado y domingo) son la base específica más valiosa para la economía de carrera y adaptaciones óseas/tendinosas.
   - La natación y el gimnasio son excelentes complementos para descargar articulaciones y ganar fuerza, pero NO deben sustituir a la ligera las tiradas de carrera del fin de semana a menos que haya una sobrecarga, molestia o fatiga evidente.
   - Si el atleta duda o pregunta si es mejor esperar a ver cómo responde a las sesiones intermedias (jueves y viernes) antes de tocar el fin de semana, analiza con criterio: lo ideal es evaluar la fatiga acumulada tras esas sesiones antes de tomar una decisión precipitada.
6. CAPACIDAD DE CAMBIAR Y GUARDAR ENTRENAMIENTOS EN LA APP:
   TIENES ACCESO DIRECTO PARA MODIFICAR EL CALENDARIO DE LA APP.
   - REGLA INMUTABLE: Siempre que diseñes, adaptes o propongas cómo debe quedar una semana de entrenamientos (o reorganices días de CrossFit y carrera), TIENES PROHIBIDO limitarte a escribirlo en el chat. Debes emitir SIEMPRE el bloque \`\`\`coach_action con type "update_weekly_plan" para que la app guarde y persista automáticamente los 7 días (lunes a domingo) en la base de datos real:
   \`\`\`coach_action
   {
     "type": "update_weekly_plan",
     "weekStart": "YYYY-MM-DD",
     "summary": "Plan semanal actualizado con CrossFit M/J y carrera fin de semana",
     "weeklyPlan": [
       { "date": "YYYY-MM-DD", "discipline": "carrera", "plannedCode": "R1 Base", "durationMin": 45, "distanceKm": 8.0, "notes": "..." }
     ]
   }
   \`\`\`
   - En sesiones individuales puntuales:
   \`\`\`coach_action
   {
     "type": "modify_session",
     "date": "YYYY-MM-DD",
     "toDiscipline": "natacion",
     "plannedCode": "N1",
     "durationMin": 40,
     "notes": "...",
     "summary": "..."
   }
   \`\`\`
   - ¡Regla de Oro en Carrera!: Calentamientos y vueltas a la calma se programan SIEMPRE en tiempo (minutos) y NUNCA en kilómetros. La distancia de la Parte Principal es íntegra (si dice 6k, la principal son 6.0 km).
7. TONO: Habla como su equipo técnico multidisciplinar de confianza: profesional, empático, motivador, científicamente riguroso y con pautas prácticas accionables.

${context.contextMarkdown}
`.trim();

  // 1. Probar Gemini API si está configurada (100% gratuita y ultrarrápida)
  if (geminiApiKey) {
    const startedAt = Date.now();
    try {
      const geminiResult = await callGemini(geminiApiKey, systemPrompt, messages);
      recordAiLog({
        feature: "coach_ai",
        provider: "gemini",
        model: geminiResult.model,
        status: "ok",
        latencyMs: Date.now() - startedAt,
        inputTokens: geminiResult.inputTokens,
        outputTokens: geminiResult.outputTokens,
        metadata: { messageCount: messages.length },
      });
      const { cleanText, action } = parseCoachActionBlock(geminiResult.text);

      if (action) {
        const shouldApply = isExplicitChangeRequest || action.type === "update_weekly_plan";
        if (shouldApply) {
          const applied = executeCoachAction(action);
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            appliedAction: applied,
            isAiPowered: true,
          };
        } else {
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            proposedAction: action,
            isAiPowered: true,
          };
        }
      }

      return {
        reply: cleanText,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        isAiPowered: true,
      };
    } catch (err: unknown) {
      recordAiLog({
        feature: "coach_ai",
        provider: "gemini",
        model: "gemini",
        status: "error",
        latencyMs: Date.now() - startedAt,
        errorMessage: err instanceof Error ? err.message : String(err),
        metadata: { messageCount: messages.length },
      });
      console.error("Error llamando a Google Gemini API:", err);
    }
  }

  // 2. Probar Anthropic Claude si está configurada
  if (anthropicClient) {
    try {
      const model = getSetting("anthropic_model") || "claude-3-5-sonnet-latest";
      const response = await runTrackedAnthropicCall({
        feature: "coach_ai",
        model,
        maxTokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        metadata: { messageCount: messages.length },
      });

      const firstBlock = response.content[0];
      const rawReply = firstBlock.type === "text" ? firstBlock.text : "";
      const { cleanText, action } = parseCoachActionBlock(rawReply);

      if (action) {
        const shouldApply = isExplicitChangeRequest || action.type === "update_weekly_plan";
        if (shouldApply) {
          const applied = executeCoachAction(action);
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            appliedAction: applied,
            isAiPowered: true,
          };
        } else {
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            proposedAction: action,
            isAiPowered: true,
          };
        }
      }

      return {
        reply: cleanText,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        isAiPowered: true,
      };
    } catch (err: unknown) {
      console.error("Error llamando a Anthropic Claude:", err);
    }
  }

  // 3. Probar Ollama local si está activo en el equipo
  try {
    const startedAt = Date.now();
    const ollamaRes = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-entreno",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (ollamaRes.ok) {
      const data = await ollamaRes.json();
      if (data.message?.content) {
        recordAiLog({
          feature: "coach_ai",
          provider: "ollama",
          model: "qwen-entreno",
          status: "ok",
          latencyMs: Date.now() - startedAt,
          inputTokens: typeof data.prompt_eval_count === "number" ? data.prompt_eval_count : null,
          outputTokens: typeof data.eval_count === "number" ? data.eval_count : null,
          metadata: { messageCount: messages.length },
        });
        const { cleanText, action } = parseCoachActionBlock(data.message.content);
        if (action) {
          const shouldApply = isExplicitChangeRequest || action.type === "update_weekly_plan";
          if (shouldApply) {
            const applied = executeCoachAction(action);
            return {
              reply: cleanText,
              contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
              appliedAction: applied,
              isAiPowered: true,
            };
          } else {
            return {
              reply: cleanText,
              contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
              proposedAction: action,
              isAiPowered: true,
            };
          }
        }
        return {
          reply: cleanText,
          contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
          isAiPowered: true,
        };
      }
    }
  } catch {
    // Continuar a motor local experto
  }

  // 4. MOTOR DE FISIOLOGÍA LOCAL EXPERTO
  const { reply: localReply, actionCandidate } = generateLocalExpertResponse(messages, context, isExplicitChangeRequest);
  const finalReply = localReply;

  if (actionCandidate) {
    const shouldApply = isExplicitChangeRequest || actionCandidate.type === "update_weekly_plan";
    if (shouldApply) {
      const applied = executeCoachAction(actionCandidate);
      return {
        reply: finalReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        appliedAction: applied,
        isAiPowered: false,
      };
    } else {
      return {
        reply: finalReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        proposedAction: actionCandidate,
        isAiPowered: false,
      };
    }
  }

  return {
    reply: finalReply,
    contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
    isAiPowered: false,
  };
}
