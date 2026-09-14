import { NextRequest, NextResponse } from "next/server";
import { isValidSqliteFile, markRestorePending } from "@/lib/repo/backup";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo" }, { status: 400 });
  }
  const tmpPath = path.join(os.tmpdir(), `entrenoapp-restore-${Date.now()}.db`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  if (!isValidSqliteFile(tmpPath)) {
    fs.unlinkSync(tmpPath);
    return NextResponse.json(
      { error: "El archivo no es una copia de seguridad válida de EntrenoApp (no es un SQLite reconocible)." },
      { status: 400 }
    );
  }

  markRestorePending(tmpPath);
  fs.unlinkSync(tmpPath);
  return NextResponse.json({
    ok: true,
    message: "Copia marcada para restaurar. Cierra y vuelve a abrir EntrenoApp para completar el proceso.",
  });
}
