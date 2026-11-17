"use client";

import { useEffect, useState, useRef } from "react";
import { X, Download, Share2, Sparkles, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { renderWorkoutCardCanvas, type WorkoutCardData } from "@/lib/workout-card-generator";

export interface WorkoutShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutCardData;
}

export function WorkoutShareCardModal({ isOpen, onClose, workout }: WorkoutShareCardModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    let isMounted = true;
    renderWorkoutCardCanvas(workout)
      .then((canvas) => {
        if (!isMounted) return;
        const url = canvas.toDataURL("image/png");
        setDataUrl(url);

        canvas.toBlob((b) => {
          if (isMounted) {
            setBlob(b);
            setLoading(false);
          }
        }, "image/png");
      })
      .catch((err) => {
        console.error("Error generando tarjeta de entrenamiento:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workout]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      panelRef.current?.focus();
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fileName = `entrenoapp-${workout.date || "sesion"}.png`;

  // Descarga directa a disco o dispositivo
  function handleDownloadDirect() {
    if (!dataUrl) return;

    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 2000);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Compartir nativo en iOS Safari / Móviles
  async function handleNativeShare() {
    setSharing(true);
    try {
      if (blob && navigator.share) {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `EntrenoApp — ${workout.title || "Entrenamiento"}`,
            text: `Entrenamiento completado en EntrenoApp (${workout.date}): ${workout.distanceKm ? workout.distanceKm + " km" : workout.durationMin + " min"}.`,
          });
          setSharing(false);
          return;
        }
      }
      // Fallback a descarga si share con ficheros no está disponible
      handleDownloadDirect();
    } catch (err: any) {
      // Si el usuario canceló el share sheet, no hacer nada
      if (err?.name !== "AbortError") {
        handleDownloadDirect();
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tarjeta Resumen 9:16 para compartir"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: "var(--space-3)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-in flex flex-col items-center max-w-[440px] w-full max-h-[96vh] overflow-y-auto p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200 shadow-2xl space-y-4"
      >
        {/* Cabecera modal */}
        <div className="w-full flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm bg-red-50 text-red-600 border border-red-100"
            >
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                Tarjeta Resumen 9:16
              </h3>
              <p className="text-[11px] text-zinc-600">
                Lista para compartir o guardar en Fotos
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon p-1 text-zinc-400 hover:text-zinc-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vista previa 9:16 */}
        <div className="relative w-full flex items-center justify-center py-1">
          {loading ? (
            <div className="w-[250px] sm:w-[280px] aspect-[9/16] rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-red-600" />
              <span className="text-xs text-zinc-600 font-medium">
                Generando tarjeta HD...
              </span>
            </div>
          ) : dataUrl ? (
            <div className="relative group max-w-[270px] sm:max-w-[300px] w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-xl border border-zinc-200 transition-transform duration-200">
              {/* Imagen real lista para long-press en Safari */}
              <img
                src={dataUrl}
                alt="Tarjeta Resumen de Entrenamiento"
                className="w-full h-full object-cover select-none pointer-events-auto"
                style={{
                  WebkitTouchCallout: "default", // Permitir guardar imagen en iOS Safari
                }}
              />
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-zinc-500">
              No se pudo renderizar la imagen
            </div>
          )}
        </div>

        {/* Botones de Acción optimizados para Safari iOS (iPhone 13) */}
        <div className="w-full space-y-2 pt-1">
          {/* Botón 1: Compartir / Guardar en Fotos nativo */}
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={loading || sharing}
            className="w-full btn btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm harbiz-press cursor-pointer"
            style={{
              minHeight: 48,
              background: "var(--color-brand)",
              color: "#ffffff",
              border: "none",
            }}
          >
            {copied ? (
              <>
                <Check size={18} />
                <span>¡Imagen Descargada!</span>
              </>
            ) : (
              <>
                <Share2 size={18} />
                <span>Guardar en Fotos / Compartir</span>
              </>
            )}
          </button>

          {/* Botón 2: Descargar archivo PNG directo */}
          <button
            type="button"
            onClick={handleDownloadDirect}
            disabled={loading}
            className="w-full btn btn-secondary flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs harbiz-press cursor-pointer"
            style={{ minHeight: 44 }}
          >
            <Download size={16} />
            <span>Descargar archivo PNG (1080×1920)</span>
          </button>

          {/* Ayuda táctil para Safari iPhone */}
          <p className="text-[11px] text-zinc-600 text-center pt-1 leading-tight">
            💡 En iPhone (Safari) también puedes <strong className="text-zinc-800">mantener pulsada la imagen</strong> y pulsar <em>"Guardar en Fotos"</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
