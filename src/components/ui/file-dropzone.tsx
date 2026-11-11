"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Moon,
  Zap,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface ImportSuccessPayload {
  type: "workout" | "sleep";
  title: string;
  details: string;
  date: string;
  sessionId?: number | null;
  suuntoPte?: number | null;
  suuntoEpoc?: number | null;
  recoveryHours?: number | null;
}

interface FileDropzoneProps {
  onSuccess?: () => void;
  className?: string;
  compact?: boolean;
}

export function FileDropzone({ onSuccess, className = "", compact = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<ImportSuccessPayload | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setStatusMessage(`Analizando ${file.name}...`);

    const name = file.name.toLowerCase();

    // Sincronizar silenciosamente la suscripción push para que el aviso móvil llegue sin falta
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            const subJson = sub.toJSON();
            const rawP256dh = sub.getKey ? sub.getKey("p256dh") : null;
            const rawAuth = sub.getKey ? sub.getKey("auth") : null;
            const p256dh = (subJson.keys && subJson.keys.p256dh) || (rawP256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawP256dh)))) : "");
            const auth = (subJson.keys && subJson.keys.auth) || (rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : "");
            if (p256dh && auth) {
              fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth }, deviceType: "mobile" }),
              }).catch(() => {});
            }
          }
        }
      }).catch(() => {});
    }

    try {
      // 1. Archivo de Sueño (CSV o JSON con palabras de sleep/zepp)
      if (name.endsWith(".csv") || (name.endsWith(".json") && (name.includes("sleep") || name.includes("zepp")))) {
        setStatusMessage("Extrayendo métricas de sueño (fases, profundidad, puntuación Zepp)...");
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/sleep/import", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo importar el archivo de sueño");
        }

        const rows = data.rows ?? [];
        const toSave = rows.filter((r: any) => r.isNecessary !== false);
        if (toSave.length > 0) {
          setStatusMessage("Guardando datos de descanso en tu base de datos persistente...");
          const saveRes = await fetch("/api/sleep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              logs: toSave.map((r: any) => ({ ...r, source: "zepp" })),
            }),
          });
          if (!saveRes.ok) {
            console.error("Error persistiendo logs de sueño en SQLite");
          }
        }

        const latestDate = rows[0]?.date || new Date().toISOString().slice(0, 10);
        const count = toSave.length > 0 ? toSave.length : rows.length;

        setSuccessInfo({
          type: "sleep",
          title: "Sueño sincronizado con éxito",
          details: `${count} registro(s) de descanso procesados e integrados en tu base de datos persistente.`,
          date: latestDate,
        });

        if (onSuccess) onSuccess();
        return;
      }

      // 2. Archivo de Entrenamiento (.FIT, .GPX o JSON de sesión)
      if (name.endsWith(".fit") || name.endsWith(".gpx") || name.endsWith(".json")) {
        setStatusMessage("Procesando telemetría, pulso, zonas cardíacas y métricas Suunto...");
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/sessions/import-fit", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo procesar el archivo de entrenamiento");
        }

        const { summary, matchedSessionId } = data;
        let finalSessionId = matchedSessionId;

        // Si encontró sesión coincidente, aplicarla automáticamente
        if (matchedSessionId) {
          setStatusMessage("Asignando telemetría a la sesión del calendario...");
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
          // Si no había sesión planificada previa, registrarla automáticamente como sesión realizada
          setStatusMessage("Registrando entrenamiento importado en el calendario...");
          const createRes = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: summary.date,
              discipline: summary.sport || "otro",
              planned_code: summary.activityName || "Entrenamiento importado",
              status: "realizada",
              duration_min: summary.durationMin,
              distance_km: summary.distanceKm,
              is_extra: true,
              fit_data: JSON.stringify(summary),
            }),
          });
          const createData = await createRes.json();
          if (createData?.session?.id) {
            finalSessionId = createData.session.id;
          }
        }

        const suunto = summary.deepAnalysis?.suuntoMetrics;
        setSuccessInfo({
          type: "workout",
          title: `Entrenamiento importado: ${summary.activityName || "Sesión Suunto"}`,
          details: `${summary.durationMin ? `${summary.durationMin} min` : ""}${
            summary.distanceKm ? ` · ${summary.distanceKm} km` : ""
          }${summary.avgHeartRate ? ` · FC med ${summary.avgHeartRate} lpm` : ""}`,
          date: summary.date,
          sessionId: finalSessionId,
          suuntoPte: suunto?.pte ?? summary.pte,
          suuntoEpoc: suunto?.epoc ?? summary.epoc,
          recoveryHours: suunto?.recoveryTimeHours ?? summary.recoveryTimeHours,
        });

        if (onSuccess) onSuccess();
        return;
      }

      throw new Error("Formato no soportado. Arrastra archivos .fit, .gpx, .json (Suunto) o .csv (Zepp).");
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el archivo.");
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Zona Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
          compact ? "p-4" : "p-6"
        }`}
        style={{
          borderColor: isDragging ? "var(--color-brand)" : "var(--color-border-strong)",
          background: isDragging ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
          transform: isDragging ? "scale(1.01)" : undefined,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".fit,.gpx,.json,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{
                background: isDragging ? "var(--color-brand)" : "var(--color-brand-subtle)",
                color: isDragging ? "#ffffff" : "var(--color-brand)",
              }}
            >
              {isProcessing ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isDragging ? (
                <Zap size={24} className="animate-bounce" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <span className="font-semibold text-sm sm:text-base" style={{ color: "var(--color-text)" }}>
                  {isDragging
                    ? "¡Suelta el archivo aquí!"
                    : isProcessing
                    ? "Procesando telemetría deportiva..."
                    : "Importar entreno Suunto o sueño Zepp"}
                </span>
                <span className="badge badge-brand">.FIT · .GPX · .JSON · .CSV</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {statusMessage ||
                  "Arrastra el archivo aquí o selecciona desde tu reloj / móvil."}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="btn btn-primary text-xs shrink-0 harbiz-press"
            style={{ minHeight: 44 }}
          >
            {isProcessing ? "Procesando..." : "Elegir archivo"}
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div
          className="mt-3 p-3.5 rounded-xl flex items-start justify-between gap-3 text-xs animate-in"
          style={{
            background: "var(--color-danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "var(--color-danger)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Error en la importación</div>
              <div>{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1.5 rounded-lg harbiz-press"
            aria-label="Cerrar error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tarjeta de Confirmación de Éxito */}
      {successInfo && (
        <div
          className="mt-3 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in"
          style={{
            background: "var(--color-success-bg)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            color: "var(--color-text)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "var(--color-success)", color: "#ffffff" }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: "var(--color-success)" }}>
                  {successInfo.title}
                </span>
                {successInfo.suuntoPte != null && (
                  <span className="badge badge-success">
                    PTE {successInfo.suuntoPte.toFixed(1)}/5.0
                  </span>
                )}
                {successInfo.suuntoEpoc != null && (
                  <span className="badge badge-info">
                    EPOC {successInfo.suuntoEpoc} ml/kg
                  </span>
                )}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                {successInfo.details}
              </div>
              {successInfo.recoveryHours != null && (
                <div className="text-xs font-medium mt-0.5" style={{ color: "var(--color-success)" }}>
                  Recuperación estimada por el reloj: {successInfo.recoveryHours}h
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {successInfo.type === "sleep" ? (
              <Link
                href="/sueno"
                className="btn btn-primary btn-sm no-underline inline-flex items-center gap-1.5"
              >
                <span>Ver Sueño</span>
                <ArrowRight size={13} />
              </Link>
            ) : successInfo.sessionId ? (
              <Link
                href={`/detalle?id=${successInfo.sessionId}&date=${successInfo.date ?? ""}`}
                className="btn btn-primary btn-sm no-underline inline-flex items-center gap-1.5"
              >
                <span>Ver Análisis</span>
                <ArrowRight size={13} />
              </Link>
            ) : (
              <Link
                href={successInfo.date ? `/detalle?date=${successInfo.date}` : "/registro"}
                className="btn btn-secondary btn-sm no-underline inline-flex items-center gap-1.5"
              >
                <span>Ver Registro</span>
                <ArrowRight size={13} />
              </Link>
            )}
            <button
              onClick={() => setSuccessInfo(null)}
              className="btn-ghost p-2 rounded-lg harbiz-press"
              aria-label="Cerrar confirmación"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
