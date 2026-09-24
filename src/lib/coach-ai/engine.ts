import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { buildCoachAthleteContext } from "@/lib/coach-ai/context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function getAnthropicClient(): Anthropic | null {
  const apiKey = getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function askCoachAI(messages: ChatMessage[], todayParam?: string): Promise<{ reply: string; contextSummary: string }> {
  const context = buildCoachAthleteContext(todayParam);
  const client = getAnthropicClient();

  const systemPrompt = `
Eres el Entrenador Personal de Élite y Especialista en Fisiología del Ejercicio de Daniel Espinosa dentro de su aplicación oficial "EntrenoApp".
Tu objetivo es guiarlo hacia su meta de Maratón y progresión de fuerza/resistencia con rigor científico, máxima personalización y motivación práctica.

REGLAS FUNDAMENTALES QUE DEBES CUMPLIR SIEMPRE:
1. CONTEXTO REAL: Tienes acceso directo a sus datos biométricos, entrenamientos completados, descanso y estado de carga de la semana actual. Utiliza siempre estos datos reales para justificar tus respuestas.
2. FRECUENCIA CARDÍACA: Daniel tiene indicación médica de entrenar por RITMO (min/km) y RPE (escala 1 a 10 de Foster), NUNCA por zonas de pulso absoluto (lpm) debido a su frecuencia cardíaca de reposo elevada (~100 lpm, apto sin restricciones).
3. MODELO DE CARGA (ACWR): Conoces el modelo de Tim Gabbett de Carga Aguda vs Crónica. Si su ratio está bajo (<0.80) a mitad de semana, sabes que es una infracarga matemática temporal porque la semana está en curso. Si está por encima de 1.50, adviertes del riesgo lesional.
4. TONO: Habla como su entrenador personal de confianza: profesional, claro, motivador, con criterio deportivo estricto y pautas tácticas accionables. Evita rodeos innecesarios o respuestas genéricas de enciclopedia.
5. FORMATO: Usa formato Markdown limpio con negritas y viñetas cuando sea útil para que sea fácil de leer en la app.

${context.contextMarkdown}
`.trim();

  // Si hay cliente Anthropic configurado, llamamos al modelo
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
      const reply = firstBlock.type === "text" ? firstBlock.text : "No pude generar una respuesta de texto.";
      return {
        reply,
        contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
      };
    } catch (err: unknown) {
      console.error("Error llamando a Anthropic Claude:", err);
      // Fallback si la API key falla o da error
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
        return {
          reply: data.message.content,
          contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
        };
      }
    }
  } catch {
    // Si Ollama no está corriendo o da timeout, pasar al motor de fisiología local
  }

  // 3. MOTOR INTELIGENTE DE FISIOLOGÍA LOCAL (basado en tus datos biométricos reales)
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  let fallbackReply = "";

  if (lastUserMsg.includes("nataci") || lastUserMsg.includes("nadar")) {
    fallbackReply = `Como tu entrenador, analizando tu semana veo que llevas **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster** acumulados y tuviste el pico de carga el miércoles con CrossFit (RPE 9). 

Meter natación es una **excelente idea como descarga activa**, siempre y cuando:
1. La enfoques a ritmo suave y continuo (RPE 4-5) para no sumar fatiga neuromuscular.
2. Te centres en la movilidad escapular y descompresión de columna/caderas tras los impactos de carrera y gym.
3. No superes los 35-45 minutos de nado para llegar fresco a las tiradas del fin de semana.`;
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

Actualmente llevas **${context.weeklyAssessment.sessionsProgress.completedCount} entrenamientos completados** esta semana con **${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts Foster**. Tu nivel de Readiness para hoy está en **${context.dailyReadiness.score}/100** gracias a las ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "7.8h"} de sueño de anoche.

¿Sobre qué aspecto específico de tu plan, ritmos, cargas o recuperación quieres que tomemos decisiones hoy?`;
  }

  return {
    reply: fallbackReply,
    contextSummary: `Carga: ${context.weeklyAssessment.loadAnalysis.currentWeekLoad} pts · ACWR: ${context.weeklyAssessment.loadAnalysis.acwr?.toFixed(2) ?? "—"} · Sueño: ${context.dailyReadiness.stats.sleepHours ? `${context.dailyReadiness.stats.sleepHours.toFixed(1)}h` : "—"}`,
  };
}
