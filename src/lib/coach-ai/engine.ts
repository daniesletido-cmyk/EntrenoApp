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
}

export function getAnthropicClient(): Anthropic | null {
  const apiKey = getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
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
  const client = getAnthropicClient();
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
   TIENES ACCESO DIRECTO PARA MODIFICAR EL CALENDARIO DE LA APP. Si el atleta te pide expresamente cambiar una sesión (o si recomiendas firmemente sustituir un entreno por otro, ej: cambiar carrera por natación o pasar a descanso), añade al final de tu respuesta un bloque especial con la acción a aplicar:
   \`\`\`coach_action
   {
     "type": "modify_session",
     "date": "${context.today}",
     "toDiscipline": "natacion",
     "plannedCode": "N1",
     "durationMin": 40,
     "notes": "Natación regenerativa suave (RPE 4-5) recomendada por el entrenador para descarga articular tras CrossFit",
     "summary": "Cambiar la sesión de hoy a Natación (N1 · 40 min)"
   }
   \`\`\`
   Valores válidos para "toDiscipline": "carrera", "gimnasio", "natacion", "crossfit", "descanso", "otro".
5. TONO: Habla como su entrenador personal de confianza: profesional, claro, motivador, con criterio deportivo estricto y pautas tácticas accionables. Evita rodeos innecesarios o respuestas genéricas de enciclopedia.

${context.contextMarkdown}
`.trim();

  // 1. Si hay cliente Anthropic configurado (Claude)
  if (client) {
    try {
      const model = getSetting("anthropic_model") || "claude-3-5-sonnet-latest";
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const firstBlock = response.content[0];
      const rawReply = firstBlock.type === "text" ? firstBlock.text : "No pude generar una respuesta de texto.";
      const { cleanText, action } = parseCoachActionBlock(rawReply);

      if (action) {
        if (isExplicitChangeRequest) {
          const applied = executeCoachAction(action);
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            appliedAction: applied,
          };
        } else {
          return {
            reply: cleanText,
            contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
            proposedAction: action,
          };
        }
      }

      return {
        reply: cleanText,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
      };
    } catch (err: unknown) {
      console.error("Error llamando a Anthropic Claude:", err);
    }
  }

  // 2. Probar Ollama local si está activo en el equipo
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
            };
          } else {
            return {
              reply: cleanText,
              contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
              proposedAction: action,
            };
          }
        }
        return {
          reply: cleanText,
          contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        };
      }
    }
  } catch {
    // Continuar a motor local
  }

  // 3. MOTOR INTELIGENTE DE FISIOLOGÍA LOCAL (con capacidad de aplicar acciones directas)
  let fallbackReply = "";
  let actionCandidate: CoachActionProposal | undefined;

  if (lastUserMsg.includes("nataci") || lastUserMsg.includes("nadar")) {
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
1. Ritmo continuo y suave (RPE 4-5) sin series agónicas para no sumar fatiga neuromuscular.
2. Céntrate en la movilidad escapular y descompresión de columna/caderas tras la carga de CrossFit de ayer.
3. No superes los 40 minutos para llegar fresco a las tiradas del fin de semana.`;
    } else {
      fallbackReply = `Como tu entrenador, analizando tu semana veo que llevas **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster** acumulados y tuviste el pico de carga el miércoles con CrossFit (RPE 9). 

Meter natación hoy es una **excelente idea como descarga activa**, siempre y cuando:
1. La enfoques a ritmo suave y continuo (RPE 4-5) para no sumar fatiga neuromuscular.
2. Te centres en la movilidad escapular y descompresión tras los impactos.
3. No superes los 35-40 minutos de nado para llegar fresco a las tiradas del fin de semana.`;
    }
  } else if (lastUserMsg.includes("descanso") || lastUserMsg.includes("descansar") || lastUserMsg.includes("parar")) {
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
  } else if (lastUserMsg.includes("acwr") || lastUserMsg.includes("alerta") || lastUserMsg.includes("0.54") || lastUserMsg.includes("precauci")) {
    fallbackReply = `Tu ratio ACWR actual marca **${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "0.54"} (Infracarga / Precaución)**.

**¿Por qué te sale esto?**
Porque estamos a mitad de semana y solo llevas computadas las sesiones de lunes a miércoles. El algoritmo compara estos 3-4 días con la media de una semana completa de 7 días (carga crónica). Al faltar los entrenamientos del fin de semana, matemáticamente da menos de 0.80.

**Veredicto**: No hay riesgo de fatiga ni sobrecarga. Simplemente cumple las sesiones pautadas para sábado y domingo a intensidades controladas y el ratio volverá a la zona óptima (0.80 - 1.30).`;
  } else if (lastUserMsg.includes("sueño") || lastUserMsg.includes("descanso") || lastUserMsg.includes("dormir") || lastUserMsg.includes("cansad")) {
    fallbackReply = `Tu estado de preparación (**Readiness**) para hoy es de **${context.dailyReadiness.score}/100 (${context.dailyReadiness.levelLabel})**.

Anoche registraste **${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)} horas de descanso` : "buen descanso"}** (Score Zepp: ${context.dailyReadiness.stats.sleepScore ?? "82"}/100).
Estás en un buen tono físico para asimilar la sesión de hoy. Recuerda Daniel: tu pulso no debe ser el baremo; guíate estrictamente por tus sensaciones y RPE.`;
  } else if (lastUserMsg.includes("fin de semana") || lastUserMsg.includes("sabado") || lastUserMsg.includes("domingo") || lastUserMsg.includes("tirada")) {
    fallbackReply = `**Estrategia para el fin de semana**:
- **Sábado**: Rodaje progresivo (R2) buscando ganar consistencia a ritmo alegre de maratón pero sin vaciar el tanque.
- **Domingo**: Tirada larga (R5) a ritmo completamente conversacional y cómodo (RPE 4-5).
El objetivo es sumar volumen aeróbico puro protegiendo las articulaciones y cerrando la semana en la franja ideal de carga.`;
  } else {
    fallbackReply = `¡Hola Daniel! Como tu entrenador personal, estoy monitoreando tu preparación para el maratón (${context.profile.marathonDate || "2027"}).

Actualmente llevas **${context.weeklyAssessment.sessionsProgress.completedCount} entrenamientos completados** esta semana con **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster**. Tu nivel de Readiness para hoy está en **${context.dailyReadiness.score}/100** gracias a las ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "7.8h"} de descanso de anoche.

¿Quieres que adaptemos o cambiemos alguna sesión de hoy o de los próximos días? Puedes pedírmelo directamente (ej: *"Cambia el entreno de hoy por natación"* o *"Pasa hoy a descanso"*).`;
  }

  if (actionCandidate) {
    if (isExplicitChangeRequest) {
      const applied = executeCoachAction(actionCandidate);
      return {
        reply: fallbackReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        appliedAction: applied,
      };
    } else {
      return {
        reply: fallbackReply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        proposedAction: actionCandidate,
      };
    }
  }

  return {
    reply: fallbackReply,
    contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
  };
}
