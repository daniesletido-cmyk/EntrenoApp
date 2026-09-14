import { NextResponse } from "next/server";
import { exportBackupSnapshot } from "@/lib/repo/backup";
import fs from "node:fs";

export async function GET() {
  const { filePath, fileName } = exportBackupSnapshot();
  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
