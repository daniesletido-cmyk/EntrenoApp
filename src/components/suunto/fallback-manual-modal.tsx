"use client";

import React, { useRef, useState } from "react";
import { Watch, Moon, Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";

interface FallbackManualModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FallbackManualModal({ open, onClose, onSuccess }: FallbackManualModalProps) {
  const suuntoInputRef = useRef<HTMLInputElement>(null);
  const zeppInputRef = useRef<HTMLInputElement>(null);

  const [busyType, setBusyType] = useState<"suunto" | "zepp" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneInfo, setDoneInfo] = useState<{
    title: string;
    detail: string;
    href?: string;
    hrefLabel?: string;
  } | null>(null);

  if (!open) return null;

  async function handleSuuntoFile(file: File) {
    setBusyType("suunto");
    setErrorMsg(null);
    setDoneInfo(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/sessions/import-fit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo procesar el archivo .FIT/.GPX");

      const { summary, matchedSessionId } = data;
      let finalId = matchedSessionId;

      if (matchedSessionId) {
        await fetch(`/api/sessions/${matchedSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "realizada",
            discipline: summary.sport,
            planned_code: summary.activityName,
            duration_min: summary.durationMin,
            distance_km: summary.distanceKm,
            fit_data: JSON.stringify(summary),
            fitImport: true,
          }),
        });
      } else {
        const createRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: summary.date,
            discipline: summary.sport || "otro",
            planned_code: summary.activityName || "Entrenamiento Suunto",
            status: "realizada",
            duration_min: summary.durationMin,
            distance_km: summary.distanceKm,
            is_extra: true,
            fit_data: JSON.stringify(summary),
          }),
        });
        const created = await createRes.json();
        if (created?.session?.id) finalId = created.session.id;
      }

      setDoneInfo({
        title: `Entreno importado: ${summary.activityName || "Sesión Suunto"}`,
        detail: `${summary.durationMin ? `${summary.durationMin} min` : ""}${
          summary.distanceKm ? ` · ${summary.distanceKm} km` : ""
        }${summary.avgHeartRate ? ` · ${summary.avgHeartRate} lpm` : ""}`,
        href: finalId ? `/detalle?id=${finalId}&date=${summary.date ?? ""}` : "/registro",
        hrefLabel: "Ver detalle",
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error importando el archivo de entrenamiento");
    } finally {
      setBusyType(null);
      if (suuntoInputRef.current) suuntoInputRef.current.value = "";
    }
  }

  async function handleZeppFile(file: File) {
    setBusyType("zepp");
    setErrorMsg(null);
    setDoneInfo(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/sleep/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el archivo CSV de Zepp");

      const rows = data.rows ?? [];
      const toSave = rows.filter((r: any) => r.isNecessary !== false);
      if (toSave.length > 0) {
        await fetch("/api/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: toSave.map((r: any) => ({ ...r, source: "zepp" })) }),
        });
      }

      const count = toSave.length > 0 ? toSave.length : rows.length;
      setDoneInfo({
        title: "Descanso Zepp actualizado",
        detail: `${count} registro(s) de sueño integrados en tus métricas.`,
        href: "/sueno",
        hrefLabel: "Ver sueño",
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error importando el archivo de sueño");
    } finally {
      setBusyType(null);
      if (zeppInputRef.current) zeppInputRef.current.value = "";
    }
  }

  return (
    <Modal title="Rescate Manual (Suunto & Zepp)" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Usa esta carga manual únicamente si falló la sincronización automática con la nube.
        </p>

        {/* Inputs ocultos */}
        <input
          ref={suuntoInputRef}
          type="file"
          accept=".fit,.gpx,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleSuuntoFile(f);
          }}
        />
        <input
          ref={zeppInputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleZeppFile(f);
          }}
        />

        {/* Opción 1: Importar entreno Suunto (.FIT / .GPX) */}
        <button
          type="button"
          disabled={busyType !== null}
          onClick={() => suuntoInputRef.current?.click()}
          className="w-full p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all harbiz-press cursor-pointer"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            minHeight: 68,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
            >
              {busyType === "suunto" ? <Loader2 size={20} className="animate-spin" /> : <Watch size={20} />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                1. Importar entreno Suunto
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Subida manual de archivo .FIT o .GPX
              </div>
            </div>
          </div>
          <span className="btn btn-secondary btn-sm shrink-0">
            <Upload size={14} />
            <span>Elegir</span>
          </span>
        </button>

        {/* Opción 2: Importar descanso Zepp (.CSV) */}
        <button
          type="button"
          disabled={busyType !== null}
          onClick={() => zeppInputRef.current?.click()}
          className="w-full p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all harbiz-press cursor-pointer"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            minHeight: 68,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
            >
              {busyType === "zepp" ? <Loader2 size={20} className="animate-spin" /> : <Moon size={20} />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                2. Importar descanso Zepp
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Subida manual de registro de sueño .CSV
              </div>
            </div>
          </div>
          <span className="btn btn-secondary btn-sm shrink-0">
            <Upload size={14} />
            <span>Elegir</span>
          </span>
        </button>

        {errorMsg && (
          <div
            className="p-3 rounded-xl text-xs flex items-center gap-2"
            style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
          >
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {doneInfo && (
          <div
            className="p-3.5 rounded-xl flex items-center justify-between gap-3 animate-in"
            style={{
              background: "var(--color-success-bg)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
              <div className="min-w-0">
                <div className="text-xs font-bold" style={{ color: "var(--color-success)" }}>
                  {doneInfo.title}
                </div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                  {doneInfo.detail}
                </div>
              </div>
            </div>
            {doneInfo.href && (
              <Link
                href={doneInfo.href}
                onClick={onClose}
                className="btn btn-primary btn-sm shrink-0 no-underline"
              >
                <span>{doneInfo.hrefLabel || "Ver"}</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
