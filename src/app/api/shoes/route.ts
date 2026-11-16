import { NextRequest, NextResponse } from "next/server";
import { listShoes, getPrimaryShoe, createShoe } from "@/lib/repo/shoes";
import { flushDbPersistence } from "@/lib/db";

export async function GET() {
  try {
    const shoes = listShoes();
    const primaryShoe = getPrimaryShoe();
    return NextResponse.json({
      success: true,
      shoes,
      primaryShoe,
    });
  } catch (error) {
    console.error("Error al obtener zapatillas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener zapatillas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, brand, model, initial_km, max_km, is_primary, notes } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "El nombre de la zapatilla es obligatorio" },
        { status: 400 }
      );
    }

    const newShoe = createShoe({
      name: name.trim(),
      brand: brand ? String(brand).trim() : null,
      model: model ? String(model).trim() : null,
      initial_km: Number(initial_km) || 0,
      max_km: Number(max_km) || 700,
      is_primary: Boolean(is_primary),
      notes: notes ? String(notes).trim() : null,
    });

    await flushDbPersistence();

    return NextResponse.json({
      success: true,
      shoe: newShoe,
    });
  } catch (error) {
    console.error("Error al crear zapatilla:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al crear zapatilla" },
      { status: 500 }
    );
  }
}
