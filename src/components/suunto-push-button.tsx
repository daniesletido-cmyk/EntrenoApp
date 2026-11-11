"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Watch, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";

export interface SuuntoSyncInfo {
  session_id?: number;
  provider?: string;
  external_id?: string | null;
  status?: "synced" | "error" | "pending" | string;
  steps_count?: number;
  last_error?: string | null;
  synced_at?: string;
}

interface SuuntoPushButtonProps {
  sessionId: number;
  discipline: string;
  status?: string;
  initialSync?: SuuntoSyncInfo | null;
  compact?: boolean;
  showFitDownload?: boolean;
  onSynced?: (result: { externalId?: string | null; stepsCount: number; message: string }) => void;
}

export function SuuntoPushButton({
  sessionId,
  discipline,
  initialSync = null,
  compact = false,
  showFitDownload = false,
  onSynced,
}: SuuntoPushButtonProps) {
  const [syncState, setSyncState] = useState<SuuntoSyncInfo | null>(initialSync);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSync) setSyncState(initialSync);
  }, [initialSync]);

  if (discipline === "descanso") return null;

  const isSynced = syncState?.status === "synced";

  async function handlePush(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsReauth(false);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/push-suunto`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.message || data.error || "No se pudo sincronizar con Suunto.";
        setErrorMsg(msg);
        setNeedsReauth(Boolean(data.needsReauth));
        setSyncState({
          session_id: sessionId,
          status: "error",
          last_error: msg,
        });
      } else {
        setSyncState(
          data.syncRecord ?? {
            session_id: sessionId,
            provider: data.provider,
            external_id: data.externalId,
            status: "synced",
            steps_count: data.stepsCount,
            synced_at: new Date().toISOString(),
          }
        );
        setSuccessMsg(data.message || "Enviado a Suunto");
        onSynced?.({
          externalId: data.externalId,
          stepsCount: data.stepsCount ?? 0,
          message: data.message,
        });
      }
    } catch {
      setErrorMsg("Error de red al conectar con el servidor de Suunto.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="inline-flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handlePush}
          disabled={loading}
          title={
            errorMsg
              ? errorMsg
              : isSynced
                ? `Sincronizado con Suunto (${syncState?.steps_count || 0} bloques). Pulsa para reenviar.`
                : "Enviar entrenamiento estructurado a tu reloj Suunto"
          }
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer"
          style={{
            background: errorMsg
              ? "rgba(239, 68, 68, 0.12)"
              : isSynced
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(59, 130, 246, 0.12)",
            color: errorMsg
              ? "#ef4444"
              : isSynced
                ? "#10b981"
                : "var(--color-brand, #3b82f6)",
            border: `1px solid ${
              errorMsg
                ? "rgba(239, 68, 68, 0.35)"
                : isSynced
                  ? "rgba(16, 185, 129, 0.35)"
                  : "rgba(59, 130, 246, 0.3)"
            }`,
          }}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : errorMsg ? (
            <AlertCircle size={12} />
          ) : isSynced ? (
            <CheckCircle2 size={12} />
          ) : (
            <Watch size={12} />
          )}
          <span>
            {loading
              ? "Enviando..."
              : errorMsg
                ? "Reintentar Suunto"
                : isSynced
                  ? "En Suunto ✓"
                  : "Enviar a Suunto"}
          </span>
        </button>

        {errorMsg && (
          <div className="text-[10px] text-right max-w-[200px]" style={{ color: "#ef4444" }}>
            {errorMsg}{" "}
            {needsReauth && (
              <Link href="/configuracion" className="underline font-semibold">
                Reautenticar
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePush}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
          style={{
            background: isSynced
              ? "rgba(16, 185, 129, 0.14)"
              : "var(--color-brand-subtle, rgba(59,130,246,0.14))",
            color: isSynced ? "#10b981" : "var(--color-brand, #2563eb)",
            border: `1px solid ${
              isSynced ? "rgba(16, 185, 129, 0.4)" : "rgba(59, 130, 246, 0.35)"
            }`,
          }}
          title="Sincronizar entrenamiento estructurado (Calentamiento + Parte Principal + Vuelta a la Calma) con Suunto"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isSynced ? (
            <CheckCircle2 size={14} />
          ) : (
            <Watch size={14} />
          )}
          <span>
            {loading
              ? "Sincronizando con reloj..."
              : isSynced
                ? `En tu Suunto ✓ (${syncState?.steps_count || 0} bloques)`
                : "Enviar a Suunto"}
          </span>
        </button>

        {showFitDownload && (
          <a
            href={`/api/sessions/${sessionId}/push-suunto?format=fit`}
            download
            className="btn btn-ghost text-xs inline-flex items-center gap-1"
            title="Descargar archivo binario .FIT estructurado para Suunto/Garmin"
          >
            <Download size={13} />
            <span>.FIT</span>
          </a>
        )}
      </div>

      {successMsg && !errorMsg && (
        <span className="text-[11px] font-medium" style={{ color: "#10b981" }}>
          {successMsg}
        </span>
      )}

      {errorMsg && (
        <div
          className="text-[11px] rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.28)",
          }}
        >
          <span>{errorMsg}</span>
          {needsReauth && (
            <Link href="/configuracion" className="underline font-bold shrink-0">
              Reautenticar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
