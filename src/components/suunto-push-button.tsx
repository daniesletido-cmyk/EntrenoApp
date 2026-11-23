"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Watch, CheckCircle2, AlertCircle, Loader2, Download, Navigation } from "lucide-react";

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
  sessionDate?: string;
  sessionCode?: string | null;
  initialSync?: SuuntoSyncInfo | null;
  compact?: boolean;
  primaryMode?: boolean;
  showFitDownload?: boolean;
  onSynced?: (result: { externalId?: string | null; stepsCount: number; message: string }) => void;
}

export function SuuntoPushButton({
  sessionId,
  discipline,
  sessionDate,
  sessionCode,
  initialSync = null,
  compact = false,
  primaryMode = false,
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
        const msg = data.message || data.error || "No se pudo exportar a Suunto.";
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
        setSuccessMsg(data.message || "Enviado a Suunto · Listo en tu reloj");
        onSynced?.({
          externalId: data.externalId,
          stepsCount: data.stepsCount ?? 0,
          message: data.message,
        });
      }
    } catch {
      setErrorMsg("Error de red al conectar con el servicio de Suunto.");
    } finally {
      setLoading(false);
    }
  }

  const cleanFilename = `${sessionDate || "entreno"}_${(sessionCode || discipline)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30)}.fit`;

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
              ? `Enviado a Suunto · Listo en tu reloj (${syncState?.steps_count || 0} bloques). Pulsa para reenviar.`
              : "Sincronizar sesión con reloj Suunto"
          }
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer harbiz-press"
          style={{
            minHeight: 36,
            background: errorMsg
              ? "var(--color-danger-bg)"
              : isSynced
              ? "var(--color-success-bg)"
              : "var(--color-brand-subtle)",
            color: errorMsg
              ? "var(--color-danger)"
              : isSynced
              ? "var(--color-success)"
              : "var(--color-brand)",
            border: `1px solid ${
              errorMsg
                ? "rgba(220, 38, 38, 0.3)"
                : isSynced
                ? "rgba(22, 163, 74, 0.25)"
                : "rgba(220, 38, 38, 0.25)"
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
              ? "Sincronizando..."
              : errorMsg
              ? "Reintentar"
              : isSynced
              ? "En Suunto ✓"
              : "A Suunto"}
          </span>
        </button>

        {errorMsg && (
          <div className="text-[10px] text-right max-w-[200px] text-red-600 font-medium">
            {errorMsg}{" "}
            {needsReauth && (
              <Link href="/configuracion" className="underline font-bold">
                Configurar en Ajustes →
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (primaryMode) {
    return (
      <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-stretch gap-2 w-full">
          <button
            type="button"
            onClick={handlePush}
            disabled={loading}
            className={`btn flex-1 rounded-xl font-bold text-sm harbiz-press transition-all ${
              isSynced
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "btn-primary"
            }`}
            style={{ minHeight: 48 }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isSynced ? (
              <CheckCircle2 size={18} />
            ) : (
              <Watch size={18} />
            )}
            <span>
              {loading
                ? "Sincronizando con Suunto..."
                : isSynced
                ? "Enviado a Suunto · Listo en tu reloj"
                : "Exportar a Suunto"}
            </span>
          </button>

          {showFitDownload && (
            <a
              href={`/api/sessions/${sessionId}/push-suunto?format=fit`}
              download={cleanFilename}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary rounded-xl px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 no-underline harbiz-press"
              style={{ minHeight: 48 }}
              title="Descargar archivo binario .FIT para Suunto App o reloj"
            >
              <Download size={16} />
              <span>.FIT</span>
            </a>
          )}
          {discipline === "carrera" && showFitDownload && (
            <a
              href={`/api/sessions/${sessionId}/gpx`}
              download={`${sessionDate || "sesion"}_nutricion.gpx`}
              className="btn btn-secondary rounded-xl px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 no-underline harbiz-press"
              style={{ minHeight: 48 }}
              title="Descargar ruta GPX con puntos de hidratación y geles para Suunto 9 Peak Pro"
            >
              <Navigation size={15} className="text-emerald-600" />
              <span>Ruta GPX</span>
            </a>
          )}
        </div>

        {(successMsg || isSynced) && !errorMsg && (
          <div className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{successMsg || "Enviado a Suunto · Listo en tu reloj"}</span>
          </div>
        )}

        {errorMsg && (
          <div
            className="text-xs rounded-xl px-3 py-2 flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            {needsReauth && (
              <Link href="/configuracion" className="underline font-bold shrink-0 text-red-800">
                Configurar en Ajustes →
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
          className={`btn btn-sm rounded-xl font-semibold harbiz-press transition-all ${
            isSynced ? "btn-secondary text-emerald-700 border-emerald-300 bg-emerald-50" : "btn-suunto"
          }`}
          style={{ minHeight: 44 }}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : isSynced ? (
            <CheckCircle2 size={15} className="text-emerald-600" />
          ) : (
            <Watch size={15} />
          )}
          <span>
            {loading
              ? "Sincronizando con Suunto..."
              : isSynced
              ? "Enviado a Suunto · Listo en tu reloj"
              : "Exportar a Suunto"}
          </span>
        </button>

        {showFitDownload && (
          <a
            href={`/api/sessions/${sessionId}/push-suunto?format=fit`}
            download={cleanFilename}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 no-underline harbiz-press"
            style={{ minHeight: 44 }}
            title="Descargar archivo binario .FIT estructurado para Suunto"
          >
            <Download size={14} />
            <span>.FIT</span>
          </a>
        )}

        {discipline === "carrera" && showFitDownload && (
          <a
            href={`/api/sessions/${sessionId}/gpx`}
            download={`${sessionDate || "sesion"}_nutricion.gpx`}
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 no-underline harbiz-press"
            style={{ minHeight: 44 }}
            title="Descargar ruta GPX con avisos de agua y geles para Suunto 9 Peak Pro"
          >
            <Navigation size={14} className="text-emerald-600" />
            <span>Ruta GPX</span>
          </a>
        )}
      </div>

      {(successMsg || isSynced) && !errorMsg && (
        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>{successMsg || "Enviado a Suunto · Listo en tu reloj"}</span>
        </span>
      )}

      {errorMsg && (
        <div
          className="text-xs rounded-xl px-3 py-2 flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          {needsReauth && (
            <Link href="/configuracion" className="underline font-bold shrink-0 text-red-800">
              Configurar en Ajustes →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
