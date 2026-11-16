"use client";

import { useState } from "react";
import { Flame, Camera, ArrowRight } from "lucide-react";
import { CrossfitAnalyzerModal } from "./crossfit-analyzer-modal";

interface CrossfitButtonWidgetProps {
  variant?: "button" | "card";
  onAddedToCalendar?: () => void;
}

export function CrossfitButtonWidget({
  variant = "card",
  onAddedToCalendar,
}: CrossfitButtonWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === "button") {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-secondary text-xs py-2 px-3.5 h-10 rounded-xl flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900/50 shadow-xs harbiz-press"
          style={{ minHeight: 40 }}
        >
          <Flame size={15} className="text-red-600" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Analizar Semana CrossFit (Foto)
          </span>
        </button>

        <CrossfitAnalyzerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAddedToCalendar={onAddedToCalendar}
        />
      </>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        className="surface p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-red-300 dark:hover:border-red-900/50 transition-all cursor-pointer harbiz-press block text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center shrink-0 shadow-xs">
              <Flame size={20} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  Analizar Semana CrossFit (Foto)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 shrink-0">
                  Visión IA
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Foto de pizarra · Traducción en kg y evaluación Martes/Jueves 19:00h
              </p>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <Camera size={14} className="text-zinc-600 dark:text-zinc-300" />
          </div>
        </div>
      </div>

      <CrossfitAnalyzerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddedToCalendar={onAddedToCalendar}
      />
    </>
  );
}
