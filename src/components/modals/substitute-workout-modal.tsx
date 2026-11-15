"use client";

import { useState } from "react";
import {
  Footprints,
  BedDouble,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface SubstituteWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sessionId?: number;
  currentDiscipline: string;
  currentTitle?: string | null;
  onSuccess: () => void;
}

export function SubstituteWorkoutModal({
  isOpen,
  onClose,
  date,
  sessionId,
  currentDiscipline,
  currentTitle,
  onSuccess,
}: SubstituteWorkoutModalProps) {
  const [selectedMode, setSelectedMode] = useState<"caminata" | "descanso" | "restaurar">("caminata");
  const [durationMin, setDurationMin] = useState(40);
  const [distanceKm, setDistanceKm] = useState(3.5);
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleApply = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sessionId,
          mode: selectedMode,
          durationMin: selectedMode === "caminata" ? durationMin : 0,
          distanceKm: selectedMode === "caminata" ? distanceKm : null,
          completed: markAsCompleted,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al sustituir el entrenamiento");
      }

      toast.push("success", data.message || "Entreno actualizado correctamente");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isWalking = selectedMode === "caminata";
  const isRest = selectedMode === "descanso";
  const isRestore = selectedMode === "restaurar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md surface p-5 sm:p-6 rounded-3xl border space-y-5 animate-in zoom-in-95"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>
              Cambiar Entreno
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Modo Enfermedad / Recuperación Activa para el {date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tarjetas de opciones */}
        <div className="space-y-2.5">
          {/* Opción 1: Caminata / Paseo Suave */}
          <button
            type="button"
            onClick={() => setSelectedMode("caminata")}
            className="w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3"
            style={{
              background: isWalking ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
              borderColor: isWalking ? "var(--color-brand)" : "var(--color-border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isWalking ? "var(--color-brand)" : "var(--color-surface)",
                color: isWalking ? "#ffffff" : "var(--color-brand)",
              }}
            >
              <Footprints size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                  Caminata / Paseo Suave
                </span>
                <span className="badge badge-brand text-[10px]">Recomendado</span>
              </div>
              <p className="text-xs text-muted mt-0.5 leading-snug">
                Oxigena y activa la circulación sin impacto articular ni fatiga cardiovascular mientras te recuperas.
              </p>
            </div>
          </button>

          {/* Opciones extras de caminata si está seleccionada */}
          {isWalking && (
            <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-3 animate-in">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="5"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border bg-surface text-center font-bold"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Distancia aprox. (km)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border bg-surface text-center font-bold"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={markAsCompleted}
                  onChange={(e) => setMarkAsCompleted(e.target.checked)}
                  className="rounded accent-brand w-4 h-4"
                />
                <span style={{ color: "var(--color-text)" }}>
                  ¿Ya la has realizado? (Marcar como completada hoy)
                </span>
              </label>
            </div>
          )}

          {/* Opción 2: Descanso Total por Enfermedad */}
          <button
            type="button"
            onClick={() => setSelectedMode("descanso")}
            className="w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3"
            style={{
              background: isRest ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
              borderColor: isRest ? "var(--color-brand)" : "var(--color-border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isRest ? "var(--color-brand)" : "var(--color-surface)",
                color: isRest ? "#ffffff" : "var(--color-text-muted)",
              }}
            >
              <BedDouble size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                Descanso Total por Enfermedad
              </span>
              <p className="text-xs text-muted mt-0.5 leading-snug">
                Pausa total del entrenamiento para dedicar toda la energía a la recuperación del sistema inmune.
              </p>
            </div>
          </button>

          {/* Opción 3: Restaurar al plan original */}
          <button
            type="button"
            onClick={() => setSelectedMode("restaurar")}
            className="w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 text-xs"
            style={{
              background: isRestore ? "var(--color-surface-raised)" : "transparent",
              borderColor: isRestore ? "var(--color-brand)" : "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <RotateCcw size={16} />
            <span>Restaurar sesión original del plan anual</span>
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2.5 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={handleApply}
            className="flex-1"
          >
            <span>Aplicar y Notificar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
