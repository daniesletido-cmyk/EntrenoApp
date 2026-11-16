import { NextRequest, NextResponse } from "next/server";
import { upsertMeasurement, getLatestMeasurement } from "@/lib/repo/measurements";

function toMadridDateString(rawDate?: unknown): { dateISO: string; timeStr: string } {
  let d = new Date();
  if (typeof rawDate === "string" && rawDate.trim()) {
    const s = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return { dateISO: s, timeStr: "08:00" };
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    }
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;

  const dateISO = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${partMap.hour}:${partMap.minute}`;
  return { dateISO, timeStr };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Soporte flexible de claves (iOS Shortcuts, Apple Health o Mi Fitness)
    const rawWeight = body.peso ?? body.weight ?? body.weight_kg ?? body.valor;
    const rawDate = body.fecha ?? body.date ?? body.timestamp ?? body.created_at;
    const rawFat = body.grasa ?? body.fat ?? body.body_fat_pct ?? body.porcentajeGrasa;
    const rawMuscle = body.masaMuscular ?? body.muscle ?? body.muscle_mass_kg;
    const rawWater = body.agua ?? body.water ?? body.water_pct;

    if (rawWeight == null || isNaN(Number(rawWeight)) || Number(rawWeight) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El campo 'peso' numérico es obligatorio (ej. { \"peso\": 71.4 })",
        },
        { status: 400 }
      );
    }

    const weightKg = Number(parseFloat(String(rawWeight)).toFixed(2));
    const { dateISO, timeStr } = toMadridDateString(rawDate);

    const bodyFatPct = rawFat != null && !isNaN(Number(rawFat)) ? Number(parseFloat(String(rawFat)).toFixed(1)) : null;
    const muscleMassKg = rawMuscle != null && !isNaN(Number(rawMuscle)) ? Number(parseFloat(String(rawMuscle)).toFixed(1)) : null;
    const waterPct = rawWater != null && !isNaN(Number(rawWater)) ? Number(parseFloat(String(rawWater)).toFixed(1)) : null;

    // Preservar notas existentes de hidratación/energía si las hubiera
    const notesPayload = {
      source: "xiaomi_scale_s200",
      sync_via: "apple_health_shortcuts",
      time_madrid: timeStr,
      raw_payload: {
        fat: bodyFatPct,
        muscle: muscleMassKg,
        water: waterPct,
      },
    };

    const measurement = upsertMeasurement({
      date: dateISO,
      weight_kg: weightKg,
      body_fat_pct: bodyFatPct,
      muscle_mass_kg: muscleMassKg,
      water_pct: waterPct,
      source: "xiaomi_scale_s200",
      notes: JSON.stringify(notesPayload),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Peso registrado correctamente desde Xiaomi Smart Scale S200",
        data: {
          date: dateISO,
          time: timeStr,
          weight_kg: measurement.weight_kg,
          body_fat_pct: measurement.body_fat_pct,
          muscle_mass_kg: measurement.muscle_mass_kg,
          water_pct: measurement.water_pct,
          source: measurement.source,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en /api/peso/sync:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el peso" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const latest = getLatestMeasurement();
    return NextResponse.json({
      success: true,
      latest,
    });
  } catch (error) {
    console.error("Error al obtener último peso:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al consultar peso" },
      { status: 500 }
    );
  }
}
