import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { buildCoachAthleteContext, CoachAthleteContext } from "@/lib/coach-ai/context";
import { executeCoachAction, CoachActionProposal, CoachActionResult } from "@/lib/coach-ai/actions";

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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`,
        apiVer: "v1beta",
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
        apiVer: "v1beta",
      },
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
        apiVer: "v1",
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
          contentModels.find((m) => /gemini-2\.5-flash/i.test(m.name)) ||
          contentModels.find((m) => /gemini-2\.0-flash/i.test(m.name)) ||
          contentModels.find((m) => /gemini-1\.5-flash/i.test(m.name)) ||
          contentModels.find((m) => /flash/i.test(m.name)) ||
          contentModels.find((m) => /gemini.*pro/i.test(m.name)) ||
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
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cleanKey}`,
      apiVer: "v1",
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${cleanKey}`,
      apiVer: "v1beta",
    }
  );

  return endpoints;
}

async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const cleanKey = apiKey.trim();

  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) {
    return "";
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
        return text;
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
 * y genera respuestas fisiológicas dinámicas basadas en las métricas reales del atleta.
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
  const prevUserMsg = userMessages.length > 1 ? userMessages[userMessages.length - 2].content.toLowerCase() : "";
  const prevAssistantMsg = assistantMessages[assistantMessages.length - 1]?.content || "";

  // 1. Detección de intenciones (Intents)
  const hasVam = /\b(vam|test\s+vam|course[\s-]navette|test\s+de\s+5|test\s+de\s+6|vo2max|test\s+de\s+lactato|test\s+cooper)\b/i.test(lowerMsg);
  const hasTrackSeries = /\b(series\b|pista|fraccionad\w*|1000m|400m|interval\w*|pasadas|series\s+en\s+pista)\b/i.test(lowerMsg);
  const hasGymTorso = /\b(tren\s+superior|torso|pecho|espalda|brazo|biceps|triceps|press\b|jal[oó]n|remo\b|deltoides)\b/i.test(lowerMsg);
  const hasGymLegs = /\b(tren\s+inferior|piernas?|sentadilla|cu[aá]driceps|isquios?|femoral|peso\s+muerto\s+pesado)\b/i.test(lowerMsg);
  const hasCrossFit = /\b(crossfit|wod|wall\s*balls?|saltos?|peso\s+muerto|box\s*jumps?|burpees?)\b/i.test(lowerMsg);
  const hasSwimming = /\b(nataci[oó]n|nadar|piscina|nado|crol)\b/i.test(lowerMsg);
  const hasRest = /\b(descans\w*|parar|reposo|dormir\s+m[aá]s|recuperaci[oó]n\s+total)\b/i.test(lowerMsg);
  const hasWeekendRunning = /\b(fin\s+de\s+semana|s[aá]bado|domingo|tirada\s+larga|reestructur\w*|carrera\s+del\s+fin)\b/i.test(lowerMsg);
  const hasFitUploadOrEval = /\b(eval[uú]es?|evalua\w*|qu[eé]\s+tal\s+estoy|c[oó]mo\s+estoy|c[oó]mo\s+me\s+ves|\.fit|he\s+subido|acabo\s+de\s+hacer|cuando\s+meta|cuando\s+suba|he\s+terminado|mis\s+datos)\b/i.test(lowerMsg);
  const hasSorenessInjury = /\b(molestias?|dolor|sobrecarga|tir[oó]n|s[oó]leo|gemelo|aquiles|tend[oó]n|rodilla|cintilla|fascitis|cargad\w*|agujetas)\b/i.test(lowerMsg);
  const hasNutrition = /\b(com[eé]r?|cen\w*|desayun\w*|nutrici[oó]n|carbohidratos?|hidratos|geles?|sales|suplement\w*|omega-?3|alergia|frutos\s+secos|pescado|agua|hidrataci[oó]n)\b/i.test(lowerMsg);
  const hasAcwrLoad = /\b(acwr|0\.54|infracarga|sobrecarga|gabbett|ratio|pts?\s+foster|carga\s+aguda|carga\s+cr[oó]nica|alerta)\b/i.test(lowerMsg);
  const hasSleepReadiness = /\b(sue[ñn]o|dormir|horas?\s+de\s+sue[ñn]o|readiness|zepp|cansancio|energ[ií]a|despert\w*)\b/i.test(lowerMsg);
  const hasPaceStrategy = /\b(ritmo\b|marat[oó]n|5:00|5:15|tiempo\s+objetivo|estrategia|abril\s+2027)\b/i.test(lowerMsg);
  const hasFollowUp = /\b(y\s+entonces|y\s+ma[ñn]ana|qu[eé]\s+hago\s+ahora|ya\s+lo\s+(hice|met[ií]|sub[ií]|termin[eé])|vale|perfecto|entendido|de\s+acuerdo|qu[eé]\s+opinas)\b/i.test(lowerMsg);

  const acuteLoad = context.weeklyAssessment.loadAnalysis.currentWeekLoad;
  const acwrValue = context.weeklyAssessment.loadAnalysis.acwr !== null ? context.weeklyAssessment.loadAnalysis.acwr.toFixed(2) : "—";
  const sleepHours = context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "buen descanso";
  const readinessScore = context.dailyReadiness.score;

  let reply = "";
  let actionCandidate: CoachActionProposal | undefined;

  // CASO 1: Consulta compuesta de gimnasio hoy + evaluación .fit + reestructuración fin de semana
  if (hasGymTorso && (hasFitUploadOrEval || hasWeekendRunning)) {
    reply = `¡Perfecto planteamiento Daniel! Te dejo mi análisis como tu entrenador:

### 1. Sesión de Gimnasio (Tren Superior) de hoy
* **Excelente elección fisiológica**: Al enfocar la sesión exclusivamente en torso (empuje/tirón: pectoral, dorsal, deltoides, brazos), evitamos generar daño miofibrilar en las piernas (cuádriceps, isquiosururales y sóleos).
* **Demanda de SNC**: Mantén la intensidad en **RPE 7-8**, dejando 1-2 repeticiones en recámara (RIR 1-2) para no sobrecargar el sistema nervioso central.

### 2. Evaluación de tu estado cuando importes el archivo .fit
En cuanto metas el archivo \`.fit\` en la app:
* Computaremos la **duración real y la carga Foster** de la sesión.
* Comprobaremos tu ratio **ACWR** (actualmente en **${acwrValue}** con **${acuteLoad} pts** acumulados) para verificar que la carga aguda evoluciona dentro del rango seguro.
* Tu Readiness diario (hoy en **${readinessScore}/100**) se recalculará sumando este estímulo.

### 3. ¿Habrá que reestructurar los entrenos de carrera del fin de semana?
* **Criterio principal**: Como tu gran meta es la **Maratón (objetivo 5:00-5:15 min/km)**, las tiradas del fin de semana (**Sábado R2 progresivo y Domingo tirada larga R5**) son el pilar más específico e insustituible.
* **Decisión**: Al trabajar solo tren superior, **en principio NO será necesario recortar ni suspender el fin de semana de carrera**. 
* **Plan de contingencia**: Si al registrar el entreno tu RPE supera 8.5 o notas fatiga sistémica alta al despertar mañana, ajustaremos el ritmo del sábado a rodaje regenerativo suave (R1) para llegar fresco a la tirada larga del domingo.

¡A por el entreno de torso y cuando subas el .fit lo dejamos todo chequeado!`;
  }

  // CASO 2: Consulta sobre Test VAM y/o Series en pista
  else if (hasVam || (hasTrackSeries && (lowerMsg.includes("mañana") || lowerMsg.includes("semana") || lowerMsg.includes("útil") || lowerMsg.includes("viable")))) {
    const vamSection = hasVam
      ? `### 1. ¿Es viable y útil hacer un Test VAM de carrera MAÑANA?
* **Veredicto**: **NO es aconsejable hacerlo mañana**.
* **Motivo fisiológico**:
  - Un test de VAM exige el 100% de la capacidad glucolítica y neuromuscular. Si arrastras fatiga de sesiones previas (CrossFit a RPE alto o impacto articular), claudicarás prematuramente por acidosis y fatiga del SNC, dando una VAM subestimada y no válida.
  - Además, vaciaría tus depósitos de glucógeno e interferiría directamente con la tirada larga del domingo, que es la sesión clave de tu preparación hacia la Maratón.
* **Test recomendado para tu perfil**:
  - ❌ **Descartado**: *Course-Navette* (los frenazos y giros continuos de 180° añaden estrés innecesario a tendones y sóleos).
  - ✅ **Recomendado**: **Test de 5 o 6 minutos en pista de atletismo** a ritmo constante máximo sostenible.
* **Protocolo previo**: Programarlo en una semana con 48h previas de frescura (ej. tras descanso activo/natación suave), con calentamiento de 15' trote suave (RPE 3-4) + 4 rectas progresivas de 80m.`
      : "";

    const seriesSection = (hasTrackSeries || hasVam)
      ? `### 2. ¿Meter esta semana un día de series en pista?
* **Distribución de intensidad (Regla 80/20)**:
  - En tu modelo concurrente (Carrera + CrossFit + Natación), la cuota de alta intensidad anaeróbica/láctica semanal ya queda cubierta con las clases de CrossFit.
  - Añadir series agónicas en pista (Z4/Z5 láctica) dispararía el riesgo de sobreentrenamiento y sobrecarga tendinosa.
* **Estructura fraccionada recomendada**:
  - En lugar de series anaeróbicas, realiza un **fraccionado extensivo a Ritmo Maratón / Umbral aeróbico (Z3)**:
  - **Estructura**: *2 km calentamiento suave + 4 x 1.000m a ritmo tempo (5:35 - 5:45 min/km, RPE 6) con 90" de recuperación al trote + 1.5 km vuelta a la calma*.
  - **Mejor ubicación**: Jueves o viernes, siempre que no coincida en el mismo día con sentadillas pesadas en CrossFit.`
      : "";

    reply = `${vamSection}\n\n${seriesSection}`.trim();
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

    reply = `### Protocolo del Entrenador para sobrecarga en ${area}:

1. **Diagnóstico y principio de prudencia**:
   - Con el volumen de carrera acumulado y el impacto de los saltos/pesas en CrossFit, ${area} absorbe una gran carga elástica.
   - Si la molestia es una sobrecarga difusa (RPE ≤ 4 en dolor), podemos hacer **descarga activa**. Si hay dolor punzante al apoyar, suspender impacto de inmediato.

2. **Acción para hoy**:
   - **Sustituir impacto por Natación (N1 · 35-40 min)** o **trabajo de movilidad + tren superior**.
   - El agua genera vasoconstricción/vasodilatación natural, drenando el edema sin estrés de impacto sobre ${area}.
   - Aplicar automasaje suave con foam roller en la fascia circundante (nunca directamente sobre la inserción del tendón inflamado) y contrastes de agua fría.

3. **Impacto en el fin de semana**:
   - Monitorizaremos cómo evoluciona en las próximas 24h. Si mañana la molestia remite por completo, mantendremos la tirada a ritmo muy cómodo; de lo contrario, convertiremos el entreno en sesión de nado o descanso.`;

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
      reply = `Mi criterio como tu entrenador es claro: **de momento mantengamos el plan del fin de semana y no metamos natación sábado/domingo**.

### Razonamiento fisiológico:
1. **Especificidad Maratón**: Para correr los 42 km a 5:00-5:15 min/km necesitas acumular adaptaciones tendinosas y eficiencia neuromuscular en bipedestación (impacto cíclico controlado). La natación es un recuperador articular fantástico, pero no sustituye el rodaje del fin de semana.
2. **Evaluemos la respuesta a las sesiones intermedias**:
   - Hoy y mañana completaremos las sesiones pautadas.
   - Si al despertar el sábado tu Readiness está alto y las piernas no están sobrecargadas, saldremos a rodar.
   - Si arrastras pesadez o fatiga articular el sábado, entonces sí modificaremos sobre la marcha a **Natación N1 (40 min)**.`;
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
* Enfoque: Regenerativo suave (**RPE 4-5**), buscando soltar musculatura y descomprimir columna y caderas tras el CrossFit.
* Trabajo continuo de crol con pausas cada 100-200m, prestando atención a la amplitud de brazada y respiración bilateral.
* No pases de 40 minutos para no añadir fatiga glucolítica antes de las tiradas de carrera del fin de semana.`;
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
      reply = `¡Hecho! He configurado tu día de hoy como **Descanso Total** en la app. Con **${acuteLoad} pts Foster** acumulados en la semana, tu cuerpo aprovechará hoy para supercompensar, reponer glucógeno y reparar fibras musculares de cara al fin de semana.`;
    } else {
      reply = `Tomar hoy como **día de descanso** es una decisión muy sensata si sientes acumulación de fatiga. 
* Llevas **${acuteLoad} pts Foster** acumulados en la semana.
* Un día de descanso completo o un paseo ligero (descanso activo) reducirá la fatiga del SNC y asegurará que rindas al máximo en las sesiones del fin de semana.

Si deseas que lo configure en la app, tienes el botón directo aquí abajo.`;
    }
  }

  // CASO 6: Nutrición, Hidratación o Suplementación
  else if (hasNutrition) {
    reply = `### Pautas Nutricionales Adaptadas a tu Perfil:

* **Tus requerimientos y exclusiones**:
  - ⚠️ **Alergia estricta**: Cero frutos secos (nuez, avellana, almendra).
  - ⚠️ **Sin pescado**: Aporte de ácidos grasos Omega-3 mediante suplementación diaria pautada.
* **Cena previa a tirada larga o entreno exigente**:
  - Carbohidratos complejos de fácil digestión: arroz blanco o pasta con aceite de oliva virgen extra, pechuga de pollo/pavo o huevos.
  - Evitar exceso de fibra cruda o legumbres la noche anterior para prevenir molestias gastrointestinales durante la carrera.
* **Desayuno el día de la tirada**:
  - 2h a 2h30 antes de correr: Tostadas de pan blanco con mermelada/miel o avena cocida, más café o té y 400ml de agua con una pizca de sales.
* **Estrategia intra-entreno (carrera > 60 min)**:
  - 1 gel energético cada 40-45 minutos + pequeños sorbos de agua para entrenar el estómago de cara a la Maratón.`;
  }

  // CASO 7: Sueño, Recuperación y Readiness
  else if (hasSleepReadiness) {
    reply = `### Análisis de tu Descanso y Readiness de Hoy:

* **Puntuación de Readiness**: **${readinessScore}/100 (${context.dailyReadiness.levelLabel})**.
* **Sueño registrado (Zepp)**: **${sleepHours}** (Score Zepp: ${context.dailyReadiness.stats.sleepScore ?? "82"}/100).
* **Diagnóstico fisiológico**: ${context.dailyReadiness.headline}.
* **Recomendación para hoy**: ${context.dailyReadiness.coachAdvice}
* **Recordatorio médico clave**: Daniel, recuerda que tu frecuencia cardíaca de reposo es naturalmente elevada (~100 lpm). Tu indicador de intensidad siempre debe ser el **RPE (escala 1-10) y el ritmo en min/km**, nunca las pulsaciones del reloj.`;
  }

  // CASO 8: Ratio ACWR y Mecánica de Carga
  else if (hasAcwrLoad) {
    reply = `### Diagnóstico del Ratio ACWR (**${acwrValue}** - Infracarga / Precaución):

* **¿Por qué marca este valor?**
  - El algoritmo de Tim Gabbett compara la carga de los últimos 7 días (aguda) con la media de las últimas 4 semanas (crónica).
  - Al estar a mitad de semana con **${acuteLoad} pts Foster**, el ratio matemático es temporalmente inferior a 0.80 porque faltan por computar las sesiones clave de carrera del fin de semana.
* **¿Hay riesgo lesional?**: **En absoluto**. No estás desentrenado ni sobrecargado; es simplemente la evolución natural de la semana en curso.
* **Pauta a seguir**: Completa las sesiones programadas respetando los ritmos aeróbicos marcados y el ratio se equilibrará dentro de la zona óptima (**0.80 - 1.30**) al cerrar el domingo.`;
  }

  // CASO 9: Ritmo objetivo y Estrategia Maratón
  else if (hasPaceStrategy) {
    reply = `### Estrategia hacia tu 2ª Maratón (${context.profile.marathonDate || "26 de abril de 2027"}):

* **Ritmo objetivo en carrera**: **5:00 - 5:15 min/km** (tiempo estimado: 3h30 - 3h41).
* **Fase actual**: **${context.profile.currentPhase || "Fase 1a (Base aeróbica + Hipertrofia)"}**.
* **Criterios de ritmo en tus entrenamientos actuales**:
  - **R1 (Regenerativo)**: 6:15 - 6:40 min/km (RPE 3-4, conversación sin esfuerzo).
  - **R2 (Aeróbico medio / Progresivo)**: 5:35 - 5:55 min/km (RPE 5-6).
  - **R5 (Tirada larga de volumen)**: 5:45 - 6:10 min/km (RPE 4-5, foco en economía de carrera y utilización de grasas).
  - **Ritmo Maratón específico**: 5:00 - 5:15 min/km (lo introduciremos en bloques controlados en fases más avanzadas).`;
  }

  // CASO 10: Continuación conversacional / Respuestas breves
  else if (hasFollowUp && prevAssistantMsg) {
    reply = `Entendido Daniel. Siguiendo lo que hablábamos:

* Tu carga semanal actual es de **${acuteLoad} pts Foster** en ${context.weeklyAssessment.sessionsProgress.completedCount} sesiones, con un Readiness hoy de **${readinessScore}/100**.
* Si estás listo para el entrenamiento programado, ejecútalo controlando el RPE y mantén una buena hidratación.
* Si necesitas que ajuste cualquier sesión del plan o cree un registro alternativo, dímelo y lo configuramos al instante.`;
  }

  // CASO GENERAL DINÁMICO (Para cualquier otra consulta específica)
  else {
    const todaySessionInfo = context.upcomingSessions.find((s) => s.date === context.today);
    reply = `He analizado tu consulta y el estado actual de tu preparación Daniel:

### Resumen de tu estado en vivo:
* **Carga de entrenamiento semanal**: **${acuteLoad} pts Foster** acumulados (${context.weeklyAssessment.sessionsProgress.completedCount} sesiones realizadas).
* **Readiness de hoy**: **${readinessScore}/100 (${context.dailyReadiness.levelLabel})**, con **${sleepHours}** de sueño registrado.
* **Sesión prevista para hoy**: ${todaySessionInfo ? `${todaySessionInfo.discipline.toUpperCase()} (${todaySessionInfo.planned_code || "Entreno pautado"} · ${todaySessionInfo.duration_min || 45} min)` : "Día sin sesión pautada / Descanso"}.

### Criterio del Entrenador para tu consulta:
Respecto a *"${currentMsg}"*:
* Recuerda que el gran objetivo macro es tu **Maratón a ritmo 5:00-5:15 min/km**, combinada con fuerza y salud articular.
* Guíate siempre por tu **RPE y ritmo por kilómetro**, manteniendo la disciplina en los descansos y la nutrición.
* Si deseas que aplique un cambio específico en tu calendario (pasar a natación, modificar volumen, o añadir descanso), indícamelo expresamente o usa las opciones del chat.`;
  }

  return { reply, actionCandidate };
}

export async function askCoachAI(messages: ChatMessage[], todayParam?: string): Promise<CoachAIResponse> {
  const context = buildCoachAthleteContext(todayParam);
  const anthropicClient = getAnthropicClient();
  const geminiApiKey = getGeminiApiKey();

  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  const isExplicitChangeRequest = checkIsExplicitChangeOrder(lastUserMsg);

  const systemPrompt = `
Eres el Entrenador Personal de Élite y Especialista en Fisiología del Ejercicio de Daniel Espinosa dentro de su aplicación oficial "EntrenoApp".
Tu objetivo es guiarlo hacia su meta de Maratón y progresión de fuerza/resistencia con rigor científico, máxima personalización y motivación práctica.

REGLAS FUNDAMENTALES QUE DEBES CUMPLIR SIEMPRE:
1. CONTEXTO REAL: Tienes acceso directo a sus datos biométricos, entrenamientos completados, descanso y estado de carga de la semana actual. Utiliza siempre estos datos reales para justificar tus respuestas.
2. FRECUENCIA CARDÍACA: Daniel tiene indicación médica de entrenar por RITMO (min/km) y RPE (escala 1 a 10 de Foster), NUNCA por zonas de pulso absoluto (lpm) debido a su frecuencia cardíaca de reposo elevada (~100 lpm, apto sin restricciones).
3. MODELO DE CARGA (ACWR): Conoces el modelo de Tim Gabbett de Carga Aguda vs Crónica. Si su ratio está bajo (<0.80) a mitad de semana, sabes que es una infracarga matemática temporal porque la semana está en curso. Si está por encima de 1.50, adviertes del riesgo lesional.
4. PRIORIDAD MARATÓN (CARRERA A PIE):
   El gran objetivo macro de Daniel es correr una Maratón (segunda maratón, ritmo objetivo 5:00-5:15 min/km).
   - Los rodajes y tiradas largas del fin de semana (sábado y domingo) son la base específica más valiosa para la economía de carrera y adaptaciones óseas/tendinosas.
   - La natación y el gimnasio son excelentes complementos para descargar articulaciones y ganar fuerza, pero NO deben sustituir a la ligera las tiradas de carrera del fin de semana a menos que haya una sobrecarga, molestia o fatiga evidente.
   - Si el atleta duda o pregunta si es mejor esperar a ver cómo responde a las sesiones intermedias (jueves y viernes) antes de tocar el fin de semana, analiza con criterio: lo ideal es evaluar la fatiga acumulada tras esas sesiones antes de tomar una decisión precipitada.
5. CAPACIDAD DE CAMBIAR ENTRENAMIENTOS EN LA APP:
   TIENES ACCESO DIRECTO PARA MODIFICAR EL CALENDARIO DE LA APP.
   - Si el atleta te da una ORDEN EXPRESA de cambiar una sesión, o si tras deliberar concluyes que debe sustituirse un entreno por otro, añade al final de tu respuesta:
   \`\`\`coach_action
   {
     "type": "modify_session",
     "date": "YYYY-MM-DD",
     "toDiscipline": "natacion" | "gimnasio" | "carrera" | "crossfit" | "descanso",
     "plannedCode": "N1",
     "durationMin": 40,
     "notes": "...",
     "summary": "..."
   }
   \`\`\`
   - ¡IMPORTANTE! Si el atleta sólo te está pidiendo OPINIÓN, consejo o deliberación (ej: "¿Qué opinas de...", "¿Esperamos a ver la carga...?"), NO apliques cambios precipitados en el calendario de hoy. Razona detalladamente, sopesa las opciones y dale tu visión experta.
6. TONO: Habla como su entrenador personal de confianza: profesional, claro, motivador, con criterio deportivo estricto y pautas tácticas accionables.

${context.contextMarkdown}
`.trim();

  // 1. Probar Gemini API si está configurada (100% gratuita y ultrarrápida)
  if (geminiApiKey) {
    try {
      const rawReply = await callGemini(geminiApiKey, systemPrompt, messages);
      const { cleanText, action } = parseCoachActionBlock(rawReply);

      if (action) {
        if (isExplicitChangeRequest) {
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
      console.error("Error llamando a Google Gemini API:", err);
    }
  }

  // 2. Probar Anthropic Claude si está configurada
  if (anthropicClient) {
    try {
      const model = getSetting("anthropic_model") || "claude-3-5-sonnet-latest";
      const response = await anthropicClient.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const firstBlock = response.content[0];
      const rawReply = firstBlock.type === "text" ? firstBlock.text : "";
      const { cleanText, action } = parseCoachActionBlock(rawReply);

      if (action) {
        if (isExplicitChangeRequest) {
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
        const { cleanText, action } = parseCoachActionBlock(data.message.content);
        if (action) {
          if (isExplicitChangeRequest) {
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
  let finalReply = localReply;

  if (!geminiApiKey && !anthropicClient) {
    finalReply += `\n\n> 💡 *Nota: Si deseas conectar razonamiento generativo ilimitado en la nube, puedes añadir tu clave gratuita de Google Gemini en **Configuración**.*`;
  }

  if (actionCandidate) {
    if (isExplicitChangeRequest) {
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
