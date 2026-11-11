import { NextRequest, NextResponse } from "next/server";
import { getAiLogsSummary, listAiLogs } from "@/lib/repo/ai-logs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? 30);
  const limitParam = Number(url.searchParams.get("limit") ?? 50);

  const days = Number.isFinite(daysParam) ? daysParam : 30;
  const limit = Number.isFinite(limitParam) ? limitParam : 50;

  return NextResponse.json({
    summary: getAiLogsSummary(days),
    logs: listAiLogs(limit),
  });
}
