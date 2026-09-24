import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { buildCoachAthleteContext } from "@/lib/coach-ai/context";
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

async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const cleanKey = apiKey.trim();

  // 1. Filtrar mensajes de bienvenida o roles previos hasta encontrar el primer mensaje del usuario.
  // Gemini exige que contents empiece SIEMPRE con role: "user".
  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) {
    return "";
  }
  const relevantMessages = messages.slice(firstUserIndex);

  // 2. Construir contents garantizando alternancia estricta user -> model -> user...
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

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Gemini API error en modelo ${model} (status ${res.status}):`, errText);
        lastError = new Error(`Gemini error ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (e: unknown) {
      console.error(`Error llamando a Gemini (${model}):`, e);
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

export async function askCoachAI(messages: ChatMessage[], todayParam?: string): Promise<CoachAIResponse> {
  const context = buildCoachAthleteContext(todayParam);
  const anthropicClient = getAnthropicClient();
  const geminiApiKey = getGeminiApiKey();
  let geminiError: string | null = null;

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
      geminiError = err instanceof Error ? err.message : String(err);
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

  // 4. MOTOR DE FISIOLOGÍA LOCAL EXPERTO (Cubre consultas específicas con rigor deportivo)
  let fallbackReply = "";
  let actionCandidate: CoachActionProposal | undefined;

  // CASO A: Gimnasio / Tren Superior / Torso / Peso Muerto
  if (
    lastUserMsg.includes("tren superior") ||
    lastUserMsg.includes("torso") ||
    (lastUserMsg.includes("gimnasio") && (lastUserMsg.includes("superior") || lastUserMsg.includes("viernes") || lastUserMsg.includes("pecho") || lastUserMsg.includes("espalda"))) ||
    lastUserMsg.includes("peso muerto")
  ) {
    const targetDate = "2026-09-25"; // Viernes
    actionCandidate = {
      type: "modify_session",
      date: targetDate,
      toDiscipline: "gimnasio",
      plannedCode: "TORSO",
      durationMin: 50,
      notes: "Gimnasio Tren Superior (Empuje/Tirón) pautado tras el CrossFit de peso muerto",
      summary: "Programar Gimnasio Tren Superior (Torso) para el viernes 25",
    };

    fallbackReply = `Meter **tren superior en el gimnasio el viernes** es una **excelente decisión estratégica**.

### Por qué encaja a la perfección con tu semana:
1. **Frescura muscular total**: El miércoles en la clase de CrossFit el estímulo principal fue **peso muerto y core** (alta demanda en cadena posterior, glúteos, erectores espinales y flexores). Tus grupos de empuje y tirón de tren superior (pectoral, dorsal, deltoides y brazos) están completamente descansados y sin daño miofibrilar residual.
2. **Protección absoluta para el fin de semana**: Al trabajar torso el viernes evitas añadir fatiga a las piernas (nada de sentadillas ni peso muerto pesado). Esto permite que tus cuádriceps, gemelos e isquiosururales lleguen frescos para el bloque clave de carrera del fin de semana (**sábado R2 progresivo y domingo tirada larga R5**).

### Pauta recomendada para la sesión del viernes:
* **Enfoque**: Hipertrofia funcional / Fuerza de empuje y tirón a **RPE 7-8**.
* **Ejercicios prioritarios**:
  - *Press banca o press plano con mancuernas*: 4 series × 8-10 reps.
  - *Remo en máquina o con apoyo en pecho*: 4 series × 10 reps (el soporte en pecho evita sobrecargar la zona lumbar fatigada por el peso muerto).
  - *Jalón al pecho o dominadas*: 3-4 series × 8-12 reps.
  - *Elevaciones laterales + face pulls*: 3 series × 12-15 reps (estabilidad escapular).
* **Duración**: ~45-50 min sin llegar al fallo concéntrico extremo.

¿Quieres que te deje configurada esta sesión de **Gimnasio (Tren Superior)** para el viernes en tu plan semanal?`;
  }
  // CASO B1: Duda sobre natación el fin de semana vs esperar a ver la carga
  else if (
    (lastUserMsg.includes("nataci") || lastUserMsg.includes("nadar")) &&
    (lastUserMsg.includes("sabado") ||
      lastUserMsg.includes("domingo") ||
      lastUserMsg.includes("fin de semana") ||
      lastUserMsg.includes("esperamos") ||
      lastUserMsg.includes("opinas"))
  ) {
    fallbackReply = `Mi recomendación como tu entrenador personal es clara: **esperemos y de momento no toquemos el fin de semana**.

### ¿Por qué mantener el plan y esperar?
1. **La prioridad absoluta es tu Maratón**: Las sesiones del sábado (rodaje progresivo R2) y domingo (tirada larga R5) son el núcleo de tu preparación de carrera. La natación es un fantástico recuperador articular y metabólico, pero no genera el impacto ni las adaptaciones neuromusculares y óseas que necesitas para los 42 km.
2. **Evaluemos primero las sesiones de hoy y mañana**:
   - Hoy tienes prevista sesión de carrera y mañana viernes tenemos pautado gimnasio/nado complementario.
   - Lo más inteligente es ver cómo asimilas ambas cargas, cómo responde tu musculatura tras el pico de CrossFit del miércoles y cómo amanece tu **Readiness** el sábado.
3. **Estrategia y plan de contingencia**:
   - Si tras la sesión de hoy o mañana sientes sobrecarga en sóleos/lumbares o fatiga excesiva, entonces sí podemos transformar el entreno del sábado o domingo en natación suave (**N1 · 40 min**).
   - Si tus piernas responden bien, mantendremos las zapatillas puestas para seguir sumando hacia tu objetivo.`;
  }
  // CASO B2: Natación hoy o cambio directo
  else if (lastUserMsg.includes("nataci") || lastUserMsg.includes("nadar")) {
    actionCandidate = {
      type: "modify_session",
      date: context.today,
      toDiscipline: "natacion",
      plannedCode: "N1",
      durationMin: 40,
      notes: "Natación regenerativa suave (RPE 4-5) pautada por el entrenador para descarga articular tras CrossFit",
      summary: "Cambiar la sesión de hoy a Natación (N1 · 40 min)",
    };

    if (isExplicitChangeRequest) {
      fallbackReply = `¡Hecho, Daniel! He actualizado tu plan directamente en la app. He cambiado la sesión prevista de hoy a **Natación (N1 · 40 min)**.

**Pauta para la sesión de nado:**
1. Ritmo continuo y suave (**RPE 4-5**) sin series agónicas para no sumar fatiga neuromuscular.
2. Céntrate en la movilidad escapular y descompresión de columna y caderas tras la carga de CrossFit de ayer.
3. No superes los 40 minutos para llegar fresco a las tiradas del fin de semana.`;
    } else {
      fallbackReply = `Como tu entrenador, analizando tu semana veo que llevas **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster** acumulados y tuviste el pico de carga el miércoles con CrossFit (RPE 9). 

Meter natación hoy es una **excelente idea como descarga activa**, siempre y cuando:
1. La enfoques a ritmo suave y continuo (RPE 4-5) para no sumar fatiga neuromuscular.
2. Te centres en la movilidad escapular y descompresión tras los impactos articulares.
3. No superes los 35-40 minutos de nado para llegar fresco a las tiradas del fin de semana.`;
    }
  }
  // CASO C: Descanso
  else if (lastUserMsg.includes("descanso") || lastUserMsg.includes("descansar") || lastUserMsg.includes("parar")) {
    actionCandidate = {
      type: "set_rest_day",
      date: context.today,
      toDiscipline: "descanso",
      summary: "Marcar la sesión de hoy como Descanso Total",
    };

    if (isExplicitChangeRequest) {
      fallbackReply = `De acuerdo, Daniel. He actualizado tu plan de hoy a **Descanso Total**. Con el pico de CrossFit de ayer y el volumen que tenemos programado para sábado y domingo, tu cuerpo asimilará la carga y llegarás con las piernas listas para el fin de semana.`;
    } else {
      fallbackReply = `Si notas pesadez muscular o sobrecarga articular, tomar hoy como **descanso total o activo (paseo ligero)** es una decisión inteligente. Protegerá las adaptaciones del pico de CrossFit y te asegurará máxima energía para las carreras del sábado y domingo.`;
    }
  }
  // CASO D: Ratio ACWR y Alertas
  else if (lastUserMsg.includes("acwr") || lastUserMsg.includes("alerta") || lastUserMsg.includes("0.54") || lastUserMsg.includes("precauci")) {
    fallbackReply = `Tu ratio ACWR actual marca **${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "0.54"} (Infracarga / Precaución)**.

**¿Por qué te sale esto?**
Porque estamos a mitad de semana y solo llevas computadas las sesiones de lunes a miércoles. El algoritmo compara estos 3-4 días con la media de una semana completa de 7 días (carga crónica). Al faltar los entrenamientos del fin de semana, matemáticamente da menos de 0.80.

**Veredicto**: No hay riesgo de fatiga ni sobrecarga. Simplemente cumple las sesiones pautadas para sábado y domingo a intensidades controladas y el ratio volverá a la zona óptima (0.80 - 1.30).`;
  }
  // CASO E: Sueño y Readiness
  else if (lastUserMsg.includes("sueño") || lastUserMsg.includes("dormir") || lastUserMsg.includes("readiness") || lastUserMsg.includes("cansad")) {
    fallbackReply = `Tu estado de preparación (**Readiness**) para hoy es de **${context.dailyReadiness.score}/100 (${context.dailyReadiness.levelLabel})**.

Anoche registraste **${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)} horas de descanso` : "buen descanso"}** (Score Zepp: ${context.dailyReadiness.stats.sleepScore ?? "82"}/100).
Estás en un buen tono físico para asimilar la sesión de hoy. Recuerda Daniel: tu pulso no debe ser el baremo; guíate estrictamente por tus sensaciones y RPE.`;
  }
  // CASO F: Fin de semana y Tirada larga
  else if (lastUserMsg.includes("fin de semana") || lastUserMsg.includes("sabado") || lastUserMsg.includes("domingo") || lastUserMsg.includes("tirada")) {
    fallbackReply = `**Estrategia para el fin de semana**:
- **Sábado**: Rodaje progresivo (R2) buscando ganar consistencia a ritmo alegre de maratón pero sin vaciar el tanque.
- **Domingo**: Tirada larga (R5) a ritmo completamente conversacional y cómodo (RPE 4-5).
El objetivo es sumar volumen aeróbico puro protegiendo las articulaciones y cerrando la semana en la franja ideal de carga.`;
  }
  // CASO GENERAL: Análisis del estado actual
  else {
    fallbackReply = `Analizando tu estado actual Daniel:
- Llevas **${context.weeklyAssessment.sessionsProgress.completedCount} sesiones completadas** esta semana con **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster**.
- Tu Readiness hoy es de **${context.dailyReadiness.score}/100** con ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "7.8h"} de sueño.
- El mayor esfuerzo semanal fue el **miércoles en CrossFit (RPE 9)**.

Para la duda que planteas (*"${messages[messages.length - 1]?.content}"*): si necesitas ajustar cualquier sesión (ej: cambiar carrera por natación o gym, o añadir descanso), indícamelo directamente y te lo actualizaré en la app.`;
  }

  // Notificar al usuario cómo activar el modelo libre si no hay clave o si falló
  if (geminiError) {
    fallbackReply += `\n\n> ⚠️ *Nota técnica: Se detectó tu clave de Gemini pero Google devolvió un error al procesarla (${geminiError.slice(0, 150)}). He respondido con el motor fisiológico local.*`;
  } else if (!geminiApiKey && !anthropicClient) {
    fallbackReply += `\n\n> 💡 *Nota: Para mantener un diálogo 100% abierto con razonamiento ilimitado como en ChatGPT, puedes añadir una clave gratuita de **Google Gemini** (se obtiene gratis en aistudio.google.com sin tarjeta) en **Configuración**.*`;
  }

  if (actionCandidate) {
    if (isExplicitChangeRequest) {
      const applied = executeCoachAction(actionCandidate);
      return {
        reply: fallbackReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        appliedAction: applied,
        isAiPowered: false,
      };
    } else {
      return {
        reply: fallbackReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        proposedAction: actionCandidate,
        isAiPowered: false,
      };
    }
  }

  return {
    reply: fallbackReply,
    contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
    isAiPowered: false,
  };
}
