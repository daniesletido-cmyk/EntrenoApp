import { NextRequest, NextResponse } from "next/server";
import { analyzeCrossfitWeeklyImage } from "@/lib/crossfit-analyzer";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let imageBase64 = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No se proporcionó ningún archivo de imagen" },
          { status: 400 }
        );
      }
      mimeType = file.type || "image/jpeg";
      const bytes = await file.arrayBuffer();
      imageBase64 = Buffer.from(bytes).toString("base64");
    } else {
      const body = await req.json();
      if (!body.imageBase64) {
        return NextResponse.json(
          { success: false, error: "imageBase64 es obligatorio" },
          { status: 400 }
        );
      }
      imageBase64 = body.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      mimeType = body.mimeType || "image/jpeg";
    }

    const analysis = await analyzeCrossfitWeeklyImage({
      imageBase64,
      mimeType,
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error al analizar imagen de CrossFit:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al analizar la programación de CrossFit" },
      { status: 500 }
    );
  }
}
