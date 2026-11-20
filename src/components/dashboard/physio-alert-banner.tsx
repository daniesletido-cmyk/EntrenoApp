"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, Play, X, Sparkles, Clock, AlertTriangle } from "lucide-react";
import {
  PHYSIO_ROUTINES,
  PhysioRoutine,
  getRecommendedPhysioRoutine,
} from "@/lib/physio-routines";
import { PhysioTimerModal } from "@/components/physio/physio-timer-modal";

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
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Sugerencia del Fisioterapeuta Deportivo
              </span>
              <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                10 min Express
              </span>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">
              {reason} Rutina sugerida: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{routine.shortTitle}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer harbiz-press"
          >
            <Play size={13} className="fill-white" />
            <span>Iniciar (10 min)</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            title="Descartar sugerencia"
          >
            <X size={16} />
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
