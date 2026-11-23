import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createServerSupabase } from "@/lib/supabase/server";
import { askCoachAI, ChatMessage } from "@/lib/coach-ai/engine";
import { todayISO, weekStartOf } from "@/lib/dates";
import { buildCoachAthleteContext } from "@/lib/coach-ai/context";
import { actualizarPlanSemanal, WeeklyPlanDayInput } from "@/lib/coach-ai/weekly-plan-updater";
import { flushDbPersistence } from "@/lib/db";
import { upsertSessionToSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const userId = user?.id || body.userId || req.headers.get("x-user-id") || "default_user";

    // 1. Si el usuario solicita aplicar una acción al plan semanal
    if (body.applyAction && body.action) {
      const weekStart = body.action.weekStart || weekStartOf(todayISO());
      const days: WeeklyPlanDayInput[] = Array.isArray(body.action.days) ? body.action.days : [];

      if (days.length > 0) {
        const updateResult = actualizarPlanSemanal(weekStart, days, userId);

        if (isSupabaseConfigured() && user?.id) {
          const db = getDb();
          const saved = db.prepare<any>("SELECT * FROM sessions WHERE user_id = ? AND week_start = ?").all(userId, weekStart);
          for (const s of saved) {
            await upsertSessionToSupabase(s, userId).catch(() => {});
          }
        }

        await flushDbPersistence();

        return NextResponse.json({
          success: true,
          applied: true,
          message: "¡Plan semanal actualizado correctamente en tu base de datos!",
          updateResult,
        });
      }
    }

    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const imageBase64 = body.image as string | undefined;

    // 2. Si se adjunta una imagen (Pizarra de CrossFit / WOD / Pantallazo)
    if (imageBase64) {
      const apiKey = process.env.GEMINI_API_KEY || body.geminiApiKey;
      if (!apiKey) {
        return NextResponse.json({
          reply: "He recibido la imagen de tu pizarra, pero no hay una `GEMINI_API_KEY` configurada en las variables de entorno de Vercel para procesarla con visión artificial. Configúrala en Vercel -> Settings -> Environment Variables.",
          contextSummary: "Falta GEMINI_API_KEY en el servidor",
          isAiPowered: false,
        });
      }

      const athleteContext = buildCoachAthleteContext(todayISO(), userId);

      // Limpiar formato base64
      let cleanData = imageBase64;
      let mimeType = "image/jpeg";
      if (imageBase64.includes(";base64,")) {
        const parts = imageBase64.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        cleanData = parts[1];
      }

      const visionPrompt = `
Actúa como el Equipo Técnico Multidisciplinar (Preparador Físico de Élite + Fisioterapeuta Deportivo + Nutricionista + Psicólogo) para el atleta ${athleteContext.athleteName}.
Objetivo del atleta: ${athleteContext.profile.marathonDate ? "Maratón / Carrera" : "Rendimiento y Salud"}. VAM: ${athleteContext.profile.vamPace}.

INSTRUCCIONES PARA ANALIZAR ESTA PIZARRA DE CROSSFIT:
1. Transcribe y desglosa exhaustivamente línea por línea:
   - 🟢 Calentamiento & Movilidad articular (minutos y ejercicios).
   - ⚡ Bloque 1 — Fuerza / Halterofilia (ejercicio, series, repeticiones y cargas en kg).
   - ⚡ Bloque 2 — WOD / Metcon (formato AMRAP / For Time, repeticiones exactas y pesos en kg).
   - 🔵 Vuelta a la Calma & Descarga (descompresión lumbar y estiramientos).
2. Tarjeta "Qué se trabaja hoy": Grupos musculares principales, vía energética, pacing y advertencias articulares del fisioterapeuta.
3. Propón si este entrenamiento le viene bien hoy teniendo en cuenta sus carreras de la semana.
4. Genera al final un bloque JSON delimitado con \`\`\`json { "dayPlan": { "discipline": "crossfit", "plannedCode": "...", "durationMin": 60, "notes": "..." } } \`\`\` para que el atleta pueda agregarlo con un clic a su plan semanal.
`;

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mimeType, data: cleanData } },
                    { text: visionPrompt },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const replyText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "He analizado la imagen de tu pizarra de CrossFit.";

          // Extraer propuesta JSON si está presente
          let proposedDay: WeeklyPlanDayInput | null = null;
          const match = replyText.match(/```json\s*([\s\S]*?)\s*```/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              if (parsed.dayPlan) {
                proposedDay = {
                  date: todayISO(),
                  discipline: "crossfit",
                  plannedCode: parsed.dayPlan.plannedCode || "CrossFit Box WOD",
                  durationMin: parsed.dayPlan.durationMin || 60,
                  distanceKm: null,
                  notes: parsed.dayPlan.notes || "WOD analizado con Gemini Vision",
                };
              }
            } catch {}
          }

          return NextResponse.json({
            reply: replyText,
            contextSummary: `Pizarra analizada con Gemini 2.5 Flash para ${athleteContext.athleteName}`,
            isAiPowered: true,
            proposedDay,
            proposedAction: proposedDay ? {
              type: "update_plan",
              description: `Añadir WOD de CrossFit a hoy (${todayISO()})`,
              weekStart: weekStartOf(todayISO()),
              days: [proposedDay],
            } : undefined,
          });
        }
      } catch (err) {
        console.warn("[Gemini Vision] Error invocando modelo:", err);
      }
    }

    // 3. Consulta conversacional normal
    if (messages.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron mensajes" }, { status: 400 });
    }

    const { reply, contextSummary, appliedAction, proposedAction, isAiPowered } = await askCoachAI(
      messages,
      todayISO(),
      userId
    );

    return NextResponse.json({
      reply,
      contextSummary,
      appliedAction,
      proposedAction,
      isAiPowered,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en POST /api/ai-coach:", error);
    return NextResponse.json({ error: "Error en el Entrenador IA", details: String(error) }, { status: 500 });
  }
}
