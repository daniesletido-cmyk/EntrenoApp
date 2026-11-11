import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export interface AiLogEntry {
  id: string;
  feature: string;
  provider: string;
  model: string;
  status: "ok" | "error";
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

export interface RecordAiLogInput {
  feature: string;
  provider: string;
  model: string;
  status: "ok" | "error";
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AiLogsSummary {
  windowDays: number;
  totalCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  byFeature: Array<{
    feature: string;
    calls: number;
    errors: number;
    avgLatencyMs: number;
    estimatedCostUsd: number;
  }>;
}

const MODEL_PRICING_PER_M: Array<{ match: RegExp; input: number; output: number }> = [
  { match: /haiku/i, input: 1.0, output: 5.0 },
  { match: /opus/i, input: 15.0, output: 75.0 },
  { match: /sonnet/i, input: 3.0, output: 15.0 },
  { match: /gemini.*flash-lite/i, input: 0.1, output: 0.4 },
  { match: /gemini.*flash/i, input: 0.3, output: 2.5 },
  { match: /gemini.*pro/i, input: 1.25, output: 10.0 },
  { match: /qwen|ollama|local/i, input: 0, output: 0 },
];

export function estimateAiCostUsd(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined
): number | null {
  if (inputTokens == null && outputTokens == null) return null;
  const pricing = MODEL_PRICING_PER_M.find((p) => p.match.test(model));
  if (!pricing) return null;
  const inCost = ((inputTokens ?? 0) / 1_000_000) * pricing.input;
  const outCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output;
  return Number((inCost + outCost).toFixed(6));
}

/** Persists an AI call trace without ever throwing into the caller's critical path. */
export function recordAiLog(input: RecordAiLogInput): void {
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const estimatedCost = estimateAiCostUsd(input.model, input.inputTokens, input.outputTokens);
    const serializedMeta = input.metadata ? JSON.stringify(input.metadata).slice(0, 2000) : null;
    const errorMessage = input.errorMessage ? input.errorMessage.slice(0, 1000) : null;

    db.prepare(
      `INSERT INTO ai_logs (
         id, feature, provider, model, status, latency_ms,
         input_tokens, output_tokens, estimated_cost_usd, error_message, metadata, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.feature,
      input.provider,
      input.model,
      input.status,
      Math.max(0, Math.round(input.latencyMs)),
      input.inputTokens ?? null,
      input.outputTokens ?? null,
      estimatedCost,
      errorMessage,
      serializedMeta,
      now
    );
  } catch (err) {
    console.warn("[ai_logs] No se pudo guardar el registro de observabilidad:", err);
  }
}

export function listAiLogs(limit = 50): AiLogEntry[] {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  return getDb()
    .prepare<AiLogEntry>(
      `SELECT id, feature, provider, model, status, latency_ms,
              input_tokens, output_tokens, estimated_cost_usd,
              error_message, metadata, created_at
       FROM ai_logs
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(safeLimit);
}

export function getAiLogsSummary(days = 30): AiLogsSummary {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const cutoffIso = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();

  const totals = db
    .prepare<{
      totalCalls: number;
      errorCalls: number;
      avgLatencyMs: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalEstimatedCostUsd: number;
    }>(
      `SELECT
         COUNT(*) AS totalCalls,
         COALESCE(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END), 0) AS errorCalls,
         COALESCE(AVG(latency_ms), 0) AS avgLatencyMs,
         COALESCE(SUM(input_tokens), 0) AS totalInputTokens,
         COALESCE(SUM(output_tokens), 0) AS totalOutputTokens,
         COALESCE(SUM(estimated_cost_usd), 0) AS totalEstimatedCostUsd
       FROM ai_logs
       WHERE created_at >= ?`
    )
    .get(cutoffIso);

  const byFeature = db
    .prepare<{
      feature: string;
      calls: number;
      errors: number;
      avgLatencyMs: number;
      estimatedCostUsd: number;
    }>(
      `SELECT
         feature,
         COUNT(*) AS calls,
         COALESCE(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END), 0) AS errors,
         COALESCE(AVG(latency_ms), 0) AS avgLatencyMs,
         COALESCE(SUM(estimated_cost_usd), 0) AS estimatedCostUsd
       FROM ai_logs
       WHERE created_at >= ?
       GROUP BY feature
       ORDER BY calls DESC`
    )
    .all(cutoffIso);

  return {
    windowDays: safeDays,
    totalCalls: Number(totals?.totalCalls ?? 0),
    errorCalls: Number(totals?.errorCalls ?? 0),
    avgLatencyMs: Math.round(Number(totals?.avgLatencyMs ?? 0)),
    totalInputTokens: Number(totals?.totalInputTokens ?? 0),
    totalOutputTokens: Number(totals?.totalOutputTokens ?? 0),
    totalEstimatedCostUsd: Number(Number(totals?.totalEstimatedCostUsd ?? 0).toFixed(6)),
    byFeature: byFeature.map((row) => ({
      feature: row.feature,
      calls: Number(row.calls),
      errors: Number(row.errors),
      avgLatencyMs: Math.round(Number(row.avgLatencyMs)),
      estimatedCostUsd: Number(Number(row.estimatedCostUsd).toFixed(6)),
    })),
  };
}
