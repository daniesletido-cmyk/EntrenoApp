import { NextRequest, NextResponse } from "next/server";
import { getDb, flushDbPersistence } from "@/lib/db";
import { todayISO, weekStartOf, addDays } from "@/lib/dates";
import { actualizarPlanSemanal, WeeklyPlanDayInput } from "@/lib/coach-ai/weekly-plan-updater";
import { SessionRow } from "@/lib/repo/sessions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get("week") || weekStartOf(todayISO());
    const weekEnd = addDays(week, 6);

    const db = getDb();
    const sessions = db
      .prepare<SessionRow>("SELECT * FROM sessions WHERE date BETWEEN ? AND ? ORDER BY date ASC, id ASC")
      .all(week, weekEnd);

    return NextResponse.json({
      success: true,
      weekStart: week,
      weekEnd,
      sessions,
    });
  } catch (error) {
    console.error("Error en GET /api/plan-semanal:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const weekStart = body.weekStart || weekStartOf(todayISO());

    // Si el payload contiene los días directamente, aplicarlos
    if (Array.isArray(body.days) && body.days.length > 0) {
      const result = actualizarPlanSemanal(weekStart, body.days);
      await flushDbPersistence();
      return NextResponse.json({
        success: result.success,
        message: result.message,
        updatedCount: result.updatedCount,
        days: result.days,
      });
    }

    // Si se pide sincronizar la semana actual recomendada del 16/11 al 22/11
    if (body.syncCurrentWeek || weekStart === "2026-11-16") {
      const defaultDays: WeeklyPlanDayInput[] = [
        {
          date: "2026-11-16",
          discipline: "carrera",
          plannedCode: "R1 Base Aeróbica Suave (Reincorporación · 6 km Clave · 8 km Total)",
          durationMin: 45,
          distanceKm: 8.0,
          notes: "RUNNING · Base Aeróbica de Reincorporación (6 km Clave · 8.0 km Total · RPE 4):\n- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote suave + movilidad articular activa de tobillos y cadera.\n- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 4:59 min/km (Zona R1 Base Aeróbica)): 6.0 km continuos a ritmo cómodo y relajado + 4 rectas progresivas de 80m para tono neuromuscular.\n- Vuelta a la calma (8 min · Trote regenerativo y caminata suave + estiramientos completos): Enfriamiento gradual y descompresión muscular.\n- Estrategia Nutrición: Tortitas con membrillo o miel + agua. Cero frutos secos.",
        },
        {
          date: "2026-11-17",
          discipline: "crossfit",
          plannedCode: "CrossFit Box · \"Pain Cave\" (Power Clean & Jerk + Chipper 52.5 kg & Step-ups)",
          durationMin: 55,
          notes: "CROSSFIT BOX · PAIN CAVE (Fuerza + Chipper Metabólico · RPE 7-8):\n- 🟢 Calentamiento & Movilidad (10 min):\n  • Movilidad articular activa de muñecas, hombros, cadera y tobillo (5 min)\n  • Activación específica (3 rondas): 5 Pesos muertos con barra vacía + 5 Cargadas colgantes (Hang Power Clean) + 5 Subidas controladas al cajón (Step-ups)\n- ⚡ Bloque 1 — Fuerza / Halterofilia (EMOM 10' — Cada 2:00 durante 5 rondas):\n  • 5×5 Power Clean & Jerk (Cargada de potencia + Envión) — Touch & Go con técnica estricta\n  • Progresión de carga: empezar en peso moderado (RPE 7) y subir a moderado-pesado (RPE 8) manteniendo la espalda neutra y recepción sólida\n- ⚡ Bloque 2 — WOD \"Pain Cave\" (Por Tiempo / For Time — Peso RX: 52.5 kg):\n  • 10 Step-ups al cajón (subidas controladas alternas, evitando impacto de salto)\n  • 50 Pesos muertos (Deadlifts) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 40 Cargadas colgantes (Hang Power Cleans) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 30 Empujes de hombro (Shoulder to Overhead) — 52.5 kg\n  • 10 Step-ups al cajón\n  • 20 Cargadas + Envión (Power Clean & Jerk) — 52.5 kg\n  • 10 Step-ups al cajón\n  • ⚠️ Adaptación Fisioterapeuta: Sustituir los Box Jumps por Step-ups firmes para proteger sóleo y tendón de Aquiles de cara a tus rodajes semanales.\n- 🔵 Vuelta a la Calma & Descarga (8 min):\n  • Descompresión lumbar colgado en barra (3×20 seg)\n  • Estiramiento suave de isquiosurales, glúteo mayor, flexores de cadera y descarga de gemelo/sóleo\n- 🥗 Estrategia Nutrición (Media Mañana / Tarde):\n  • Si vas a las 19:00h (habitual): Comida a las 13:30h rica en carbohidratos complejos (arroz/pasta con proteína magra). Merienda a las 17:15h: 3 tortitas de arroz con miel/membrillo o avena con leche vegetal/desnatada y semillas de chía o calabaza (100% libre de frutos secos).\n  • Cena post-entreno: Buena ración de carbohidratos (arroz o patata) con proteína magra para reponer glucógeno.\n- 🧠 Enfoque Psicológico & Pacing: Disciplina de ritmo: en los chippers largos, empieza a un ritmo conservador del 75%, respira en cada bloqueo y prioriza la pulcritud técnica.",
        },
        {
          date: "2026-11-18",
          discipline: "natacion",
          plannedCode: "NAT-C (Descarga Articular & Pull-buoy · 1.800m)",
          durationMin: 45,
          distanceKm: 1.8,
          notes: "NATACIÓN COMPENSATORIA (~1800m · RPE 5-6):\n- 🟢 Calentamiento (10 min): 300m suaves variados.\n- ⚡ Parte Principal (1300m): Bloque con pull-buoy para aislamiento pélvico y flotabilidad, neutralizando el impacto en sóleos tras el Box del martes.\n- 🔵 Vuelta a la Calma (5 min · 200m): Nado suave y relajación escapular.\n- Nutrición: Tortitas con miel antes del nado. Cero frutos secos.",
        },
        {
          date: "2026-11-19",
          discipline: "crossfit",
          plannedCode: "CrossFit Box · \"Steady\" (AMRAP 24 min · Run + Air Bike Aeróbico)",
          durationMin: 50,
          notes: "CROSSFIT BOX · STEADY (Capacidad Aeróbica & Condicionamiento · RPE 6-7):\n- 🟢 Calentamiento (10 min): Movilidad de tobillos, apertura de cadera y pedaleo suave en Air Bike.\n- ⚡ WOD Freedom: AMRAP 24 min (Run + Air Bike a ritmo regular sin sprint láctico). Cero barra pesada.\n- 🔵 Vuelta a la Calma (8 min): Pedaleo regenerativo suave (<30 RPM) y estiramientos.\n- Nutrición: Merienda 17:15h. Cena post-entreno con buena ración de carbohidratos complejos.",
        },
        {
          date: "2026-11-20",
          discipline: "descanso",
          plannedCode: "Descanso Total & Movilidad Lumbo-Pélvica",
          durationMin: 20,
          notes: "DESCANSO TOTAL & MOVILIDAD:\n- 🟢 15-20 min movilidad de cadera (couch stretch, paloma) y estiramientos suaves.\n- Cero impacto articular para asimilar los dos días de CrossFit y recargar glucógeno para el fin de semana.",
        },
        {
          date: "2026-11-21",
          discipline: "carrera",
          plannedCode: "R1 Regenerativo Suave + Técnica (6 km Clave · 8 km Total)",
          durationMin: 45,
          distanceKm: 8.0,
          notes: "RUNNING · Regenerativo de Activación (6 km Clave · 8.0 km Total · RPE 3-4):\n- Calentamiento (10 min · ~Ritmo > 5:30 min/km · R0 suave): Trote muy suave y progresivo + movilidad articular activa.\n- Parte principal (6.0 km · ~31 min · Ritmo: 5:25 - 5:10 min/km (Zona R1/R0)): 6.0 km continuos muy cómodos a ritmo suave y relajado + 4 rectas de 80m progresivas.\n- Vuelta a la calma (8 min · Trote muy suave y caminata + estiramientos completos): Enfriamiento gradual.",
        },
        {
          date: "2026-11-22",
          discipline: "carrera",
          plannedCode: "R5 (Tirada Larga 18k en Zuera · 21.5 km Total)",
          durationMin: 115,
          distanceKm: 21.5,
          isLongRun: true,
          notes: "RUNNING · Tirada Larga de Volumen Aeróbico en Zuera (18 km Clave · 21.5 km Total · RPE 5-6):\n- Calentamiento (12 min · ~Ritmo > 5:30 min/km · R0 suave): Trote suave progresivo + movilidad de cadera y tobillos.\n- Parte principal (18.0 km · ~94 min · Ritmo: 5:25 - 5:10 min/km (Zona R1 · Cierre últimos 3-4 km a 5:05 - 5:10/km Ritmo Maratón)): Ritmo cómodo (5:25 - 5:10 min/km) manteniendo cadencia ágil (178-180 ppm). En los últimos 3-4 km consolidar Ritmo Maratón en terreno llano de Zuera.\n- Vuelta a la calma (10 min · Trote muy suave > 6:00 min/km / Caminata + estiramientos completos): Enfriamiento gradual y rutina de estiramientos.\n- Nutrición: Beber agua o sales cada 20-25 min; 1 gel isotónico cada 40-45 min. Cero frutos secos.",
        },
      ];

      const result = actualizarPlanSemanal("2026-11-16", defaultDays);
      await flushDbPersistence();
      return NextResponse.json({
        success: result.success,
        message: "Plan semanal de la semana actual sincronizado y guardado con éxito",
        updatedCount: result.updatedCount,
        days: result.days,
      });
    }

    return NextResponse.json({ success: false, error: "Datos del plan no proporcionados" }, { status: 400 });
  } catch (error) {
    console.error("Error en POST /api/plan-semanal:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
