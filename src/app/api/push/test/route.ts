import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  try {
    let customTitle = "⚡ Entreno cargado y analizado";
    let customBody = "Carrera: 10.5 km (98 TSS). Carga calculada. Pulsa para ver el detalle y ajustes de la semana.";
    let customUrl = "/hoy";

    try {
      const body = await req.json();
      if (body.title) customTitle = body.title;
      if (body.body) customBody = body.body;
      if (body.url) customUrl = body.url;
    } catch {}

    const result = await sendPushToAll({
      title: customTitle,
      body: customBody,
      data: { url: customUrl },
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: result.totalSubscriptions === 0
        ? "No hay dispositivos suscritos todavía."
        : `Enviado a ${result.successCount} de ${result.totalSubscriptions} dispositivos registrados.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error enviando notificación push" }, { status: 500 });
  }
}
