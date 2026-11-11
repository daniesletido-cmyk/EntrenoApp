"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiLogsSummary {
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

interface AiLogEntry {
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
  created_at: string;
}

const FEATURE_LABELS: Record<string, string> = {
  coach_ai: "Coach AI",
  import_plan: "Importar plan",
  import_menu: "Importar menú",
  import_gym: "Importar gimnasio",
};

function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function AiObservabilityPanel() {
  const [summary, setSummary] = useState<AiLogsSummary | null>(null);
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/ai-logs?days=30&limit=12", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudieron cargar las métricas de IA");
    return (await res.json()) as { summary?: AiLogsSummary; logs?: AiLogEntry[] };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs();
      setSummary(data.summary ?? null);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando trazas");
    } finally {
      setLoading(false);
    }
  }, [fetchLogs]);

  useEffect(() => {
    let cancelled = false;
    fetchLogs()
      .then((data) => {
        if (cancelled) return;
        setSummary(data.summary ?? null);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error cargando trazas");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLogs]);

  return (
    <div className="surface" style={{ padding: "var(--space-4)" }}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Activity size={16} className="text-brand" />
          <span>Observabilidad y Consumo de IA (30 días)</span>
        </div>
        <Button variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </Button>
      </div>
      <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
        Trazas locales del Coach AI e importaciones estructuradas (latencia, tokens, proveedor y errores).
      </p>

      {error && (
        <div
          className="text-xs"
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-danger, #ef4444)",
            color: "var(--color-danger, #ef4444)",
            marginBottom: "var(--space-3)",
          }}
        >
          {error}
        </div>
      )}

      {summary && (
        <>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              marginBottom: "var(--space-3)",
            }}
          >
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="text-xs text-muted">Llamadas</div>
              <div className="font-semibold text-sm">{summary.totalCalls}</div>
            </div>
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="text-xs text-muted">Errores</div>
              <div
                className="font-semibold text-sm"
                style={{ color: summary.errorCalls > 0 ? "var(--color-danger, #ef4444)" : undefined }}
              >
                {summary.errorCalls}
              </div>
            </div>
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="text-xs text-muted">Latencia media</div>
              <div className="font-semibold text-sm">{summary.avgLatencyMs} ms</div>
            </div>
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="text-xs text-muted">Coste est. · Tokens</div>
              <div className="font-semibold text-sm">{formatCost(summary.totalEstimatedCostUsd)}</div>
              <div className="text-xs text-faint">
                {formatTokens(summary.totalInputTokens)} in · {formatTokens(summary.totalOutputTokens)} out
              </div>
            </div>
          </div>

          {summary.byFeature.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: "var(--space-3)" }}>
              {summary.byFeature.map((f) => (
                <span key={f.feature} className="badge badge-neutral">
                  {FEATURE_LABELS[f.feature] ?? f.feature}: {f.calls}x · {f.avgLatencyMs}ms
                  {f.errors > 0 ? ` · ${f.errors} err` : ""}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {logs.length === 0 && !loading ? (
        <div
          className="text-xs text-muted"
          style={{
            border: "1px dashed var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            textAlign: "center",
          }}
        >
          Todavía no hay llamadas registradas. Aparecerán aquí en cuanto hables con el Coach AI o importes un plan/menú.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {logs.map((log, idx) => (
            <div
              key={log.id}
              className="text-xs"
              style={{
                padding: "8px 12px",
                background: "var(--color-bg-subtle)",
                borderTop: idx > 0 ? "1px solid var(--color-border)" : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {log.status === "ok" ? (
                    <CheckCircle2 size={13} style={{ color: "var(--color-success, #16a34a)", flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={13} style={{ color: "var(--color-danger, #ef4444)", flexShrink: 0 }} />
                  )}
                  <span className="font-semibold">{FEATURE_LABELS[log.feature] ?? log.feature}</span>
                  <span className="text-muted">
                    {log.provider} · {log.model}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted" style={{ flexShrink: 0 }}>
                  <span>{log.latency_ms} ms</span>
                  {(log.input_tokens != null || log.output_tokens != null) && (
                    <span>
                      {log.input_tokens ?? 0}/{log.output_tokens ?? 0} tok
                    </span>
                  )}
                  {log.estimated_cost_usd != null && <span>{formatCost(log.estimated_cost_usd)}</span>}
                </div>
              </div>
              {log.error_message && (
                <div style={{ color: "var(--color-danger, #ef4444)", marginTop: 3, paddingLeft: 20 }}>
                  {log.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
