"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, Play, X, Sparkles, Clock, AlertTriangle } from "lucide-react";
import {
  PHYSIO_ROUTINES,
  PhysioRoutine,
  getRecommendedPhysioRoutine,
} from "@/lib/physio-routines";
import { PhysioTimerModal } from "@/components/physio/physio-timer-modal";
import { Button } from "@/components/ui/button";

interface PhysioAlertBannerProps {
  readinessScore?: number | null;
  readinessLevel?: string | null;
  recentNotes?: string | null;
  lastSessionRpe?: number | null;
  lastSessionTitle?: string | null;
}

export function PhysioAlertBanner({
  readinessScore,
  readinessLevel,
  recentNotes,
  lastSessionRpe,
  lastSessionTitle,
}: PhysioAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Evaluar si debemos mostrar la sugerencia preventiva
  const { shouldShow, reason, routine } = useMemo(() => {
    const isLowReadiness = readinessScore != null && readinessScore < 75;
    const isFatigueLevel = readinessLevel === "Precaución" || readinessLevel === "Fatiga";
    const notesLower = (recentNotes || "").toLowerCase();

    const fatigueKeywords = [
      "sobrecarga", "sobrecargado", "molestia", "pesadez", "pesadas",
      "sóleo", "soleo", "gemelo", "aquiles", "cintilla", "rodilla",
      "isquio", "tirantez", "fatiga", "agotado"
    ];

    const foundKw = fatigueKeywords.find((kw) => notesLower.includes(kw));
    const hasHighRpe = lastSessionRpe != null && lastSessionRpe >= 7.5;

    if (!isLowReadiness && !isFatigueLevel && !foundKw && !hasHighRpe) {
      return { shouldShow: false, reason: "", routine: PHYSIO_ROUTINES[0] };
    }

    const recRoutine = getRecommendedPhysioRoutine({
      readinessScore,
      suuntoNotes: recentNotes,
      rpe: lastSessionRpe,
    });

    let detectedReason = "Readiness bajo o fatiga acumulada detectada.";
    if (foundKw) {
      detectedReason = `Reportaste '${foundKw}' en tu reloj Suunto tras la última sesión.`;
    } else if (isLowReadiness) {
      detectedReason = `Tu Readiness de hoy está en ${readinessScore}%. El Fisioterapeuta aconseja oxigenar los tejidos antes de cargar más impacto.`;
    } else if (hasHighRpe) {
      detectedReason = `Esfuerzo exigente (RPE ${lastSessionRpe}/10). Requiere drenaje muscular para evitar sobrecarga.`;
    }

    return {
      shouldShow: true,
      reason: detectedReason,
      routine: recRoutine,
    };
  }, [readinessScore, readinessLevel, recentNotes, lastSessionRpe]);

  if (!shouldShow || dismissed) return null;

  return (
    <>
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                Sugerencia del Fisioterapeuta Deportivo
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                10 min Express
              </span>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5 leading-snug">
              {reason} Rutina sugerida: <strong>{routine.shortTitle}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            className="text-xs py-1.5 px-3 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Play size={12} className="fill-white" />
            <span>Iniciar (10 min)</span>
          </Button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-xl text-amber-700/60 dark:text-amber-400/60 hover:text-amber-900 dark:hover:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
            title="Descartar sugerencia"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <PhysioTimerModal
        routine={routine}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
