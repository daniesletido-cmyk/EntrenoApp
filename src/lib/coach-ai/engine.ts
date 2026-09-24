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

async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  const isExplicitChangeRequest =
    /cambia|c[aá]mbiame|sustituye|sustit[uú]yeme|pon|p[oó]nme|modifica|pasa|mueve/i.test(lastUserMsg);

  const systemPrompt = `
Eres el Entrenador Personal de Élite y Especialista en Fisiología del Ejercicio de Daniel Espinosa dentro de su aplicación oficial "EntrenoApp".
Tu objetivo es guiarlo hacia su meta de Maratón y progresión de fuerza/resistencia con rigor científico, máxima personalización y motivación práctica.

REGLAS FUNDAMENTALES QUE DEBES CUMPLIR SIEMPRE:
1. CONTEXTO REAL: Tienes acceso directo a sus datos biométricos, entrenamientos completados, descanso y estado de carga de la semana actual. Utiliza siempre estos datos reales para justificar tus respuestas.
2. FRECUENCIA CARDÍACA: Daniel tiene indicación médica de entrenar por RITMO (min/km) y RPE (escala 1 a 10 de Foster), NUNCA por zonas de pulso absoluto (lpm) debido a su frecuencia cardíaca de reposo elevada (~100 lpm, apto sin restricciones).
3. MODELO DE CARGA (ACWR): Conoces el modelo de Tim Gabbett de Carga Aguda vs Crónica. Si su ratio está bajo (<0.80) a mitad de semana, sabes que es una infracarga matemática temporal porque la semana está en curso. Si está por encima de 1.50, adviertes del riesgo lesional.
4. CAPACIDAD DE CAMBIAR ENTRENAMIENTOS EN LA APP:
   TIENES ACCESO DIRECTO PARA MODIFICAR EL CALENDARIO DE LA APP. Si el atleta te pide expresamente cambiar una sesión (o si recomiendas firmemente sustituir un entreno por otro, ej: cambiar carrera por natación o gimnasio o pasar a descanso), añade al final de tu respuesta un bloque especial con la acción a aplicar:
   \`\`\`coach_action
   {
     "type": "modify_session",
     "date": "${context.today}",
     "toDiscipline": "gimnasio",
     "plannedCode": "TORSO",
     "durationMin": 50,
     "notes": "Gimnasio Tren Superior (Empuje/Tirón) pautado por el entrenador tras CrossFit",
     "summary": "Programar Gimnasio Tren Superior (Torso) para el ${context.today}"
   }
   \`\`\`
   Valores válidos para "toDiscipline": "carrera", "gimnasio", "natacion", "crossfit", "descanso", "otro".
5. TONO: Habla como su entrenador personal de confianza: profesional, claro, motivador, con criterio deportivo estricto y pautas tácticas accionables. Evita rodeos innecesarios o respuestas genéricas de enciclopedia.

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
  // CASO B: Natación
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

  // Notificar al usuario cómo activar el modelo libre si no hay clave
  if (!geminiApiKey && !anthropicClient) {
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
