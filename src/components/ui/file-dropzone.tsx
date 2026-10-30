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
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01] shadow-lg shadow-emerald-500/10"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80"
        } ${compact ? "p-4" : "p-6"}`}
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
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isDragging
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isProcessing ? (
                <Loader2 size={24} className="animate-spin text-emerald-400" />
              ) : isDragging ? (
                <Zap size={24} className="animate-bounce" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-semibold text-slate-100 text-sm sm:text-base">
                  {isDragging
                    ? "¡Suelta el archivo aquí!"
                    : isProcessing
                    ? "Procesando telemetría deportiva..."
                    : "Importar sesión o sueño (Drag & Drop)"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Suunto & Zepp
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {statusMessage ||
                  "Arrastra tu archivo .FIT, .GPX o .JSON de Suunto, o exportación de sueño Zepp (.CSV)."}
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
            className="btn btn-secondary text-xs shrink-0 px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 font-semibold"
          >
            {isProcessing ? "Procesando..." : "Explorar archivo"}
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-rose-300 text-xs animate-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <div>
              <div className="font-semibold text-rose-200">Error en la importación</div>
              <div>{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-500/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tarjeta de Confirmación de Éxito */}
      {successInfo && (
        <div className="mt-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-200 animate-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-emerald-300">{successInfo.title}</span>
                {successInfo.suuntoPte != null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    PTE {successInfo.suuntoPte.toFixed(1)}/5.0
                  </span>
                )}
                {successInfo.suuntoEpoc != null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    EPOC {successInfo.suuntoEpoc} ml/kg
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1">{successInfo.details}</div>
              {successInfo.recoveryHours != null && (
                <div className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                  ⏱️ Tiempo de recuperación estimado por el reloj: {successInfo.recoveryHours}h
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {successInfo.type === "sleep" ? (
              <Link
                href="/progreso?tab=sueno"
                className="btn btn-primary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
              >
                <span>Ver Análisis</span>
                <ArrowRight size={13} />
              </Link>
            ) : successInfo.sessionId ? (
              <Link
                href={`/detalle?id=${successInfo.sessionId}&date=${successInfo.date ?? ""}`}
                className="btn btn-primary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
              >
                <span>Ver Análisis</span>
                <ArrowRight size={13} />
              </Link>
            ) : (
              <Link
                href={successInfo.date ? `/detalle?date=${successInfo.date}` : "/registro"}
                className="btn btn-secondary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
              >
                <span>Ver en Registro</span>
                <ArrowRight size={13} />
              </Link>
            )}
            <button
              onClick={() => setSuccessInfo(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
