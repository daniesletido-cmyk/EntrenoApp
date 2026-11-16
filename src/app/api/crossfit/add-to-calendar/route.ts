import { NextRequest, NextResponse } from "next/server";
import { addCrossfitSessionsToCalendar } from "@/lib/crossfit-analyzer";
import { todayISO, weekStartOf } from "@/lib/dates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weekStart, selectedDays, dayDetails } = body;

    if (!selectedDays || !Array.isArray(selectedDays) || selectedDays.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debes seleccionar al menos un día" },
        { status: 400 }
      );
    }

    const effectiveWeekStart = weekStart || weekStartOf(todayISO());

    const result = addCrossfitSessionsToCalendar({
      weekStart: effectiveWeekStart,
      selectedDays,
      dayDetails: dayDetails || [],
    });

    return NextResponse.json({
      success: result.success,
      addedCount: result.addedCount,
      message: `${result.addedCount} sesiones de CrossFit añadidas al calendario`,
    });
  } catch (error) {
    console.error("Error al añadir sesiones de CrossFit al calendario:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al añadir sesiones al calendario" },
      { status: 500 }
    );
  }
}
