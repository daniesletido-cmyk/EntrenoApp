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
          notes: "CROSSFIT BOX · PAIN CAVE (Fuerza + Chipper Metabólico · RPE 7-8):\n- 🟢 Calentamiento (10 min): Movilidad dinámica de cadera, tobillos y muñecas + series de aproximación con barra vacía.\n- ⚡ Fuerza: 5x5 Power Clean & Jerk (Touch and Go con técnica estricta).\n- ⚡ WOD Freedom: Chipper 52.5 kg. ⚠️ ADAPTACIÓN FISIO: Step-ups en lugar de rebote en cajón para proteger sóleo y Aquiles.\n- 🔵 Vuelta a la Calma (8 min): Descompresión lumbar en barra y estiramientos.\n- Nutrición: Merienda 17:15h y cena rica en carbohidratos (arroz/patata con proteína). Cero frutos secos.",
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
