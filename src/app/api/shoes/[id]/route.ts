import { NextRequest, NextResponse } from "next/server";
import {
  getShoeById,
  updateShoe,
  setPrimaryShoe,
  deleteShoe,
} from "@/lib/repo/shoes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shoeId = parseInt(id, 10);
    if (isNaN(shoeId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const shoe = getShoeById(shoeId);
    if (!shoe) {
      return NextResponse.json(
        { success: false, error: "Zapatilla no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, shoe });
  } catch (error) {
    console.error("Error al obtener zapatilla:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener zapatilla" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shoeId = parseInt(id, 10);
    if (isNaN(shoeId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (body.action === "set_primary" || body.is_primary === true) {
      const updated = setPrimaryShoe(shoeId);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Zapatilla no encontrada" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, shoe: updated });
    }

    const updated = updateShoe(shoeId, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      brand: body.brand !== undefined ? (body.brand ? String(body.brand).trim() : null) : undefined,
      model: body.model !== undefined ? (body.model ? String(body.model).trim() : null) : undefined,
      initial_km: body.initial_km !== undefined ? Number(body.initial_km) : undefined,
      max_km: body.max_km !== undefined ? Number(body.max_km) : undefined,
      is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : undefined,
      is_primary: body.is_primary !== undefined ? (body.is_primary ? 1 : 0) : undefined,
      notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Zapatilla no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, shoe: updated });
  } catch (error) {
    console.error("Error al actualizar zapatilla:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al actualizar zapatilla" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shoeId = parseInt(id, 10);
    if (isNaN(shoeId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const success = deleteShoe(shoeId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Zapatilla no encontrada o no se pudo eliminar" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Zapatilla eliminada" });
  } catch (error) {
    console.error("Error al eliminar zapatilla:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al eliminar zapatilla" },
      { status: 500 }
    );
  }
}
