"use client";

import { useState } from "react";
import { Flag, ArrowRight, Zap, Droplets, Timer } from "lucide-react";
import { RaceStrategyModal } from "@/components/competition/race-strategy-modal";

export function RaceStrategyCardWidget() {
  const [modalOpen, setModalOpen] = useState(false);

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
        className="surface p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-red-300 dark:hover:border-red-900/50 transition-all cursor-pointer harbiz-press block text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
              <Flag size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                  Estrategia de Competición
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40 shrink-0">
                  42K · 21K · 10K
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Ritmo objetivo, bloques tácticos y pauta de geles, sales y agua
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-red-600 shrink-0">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      <RaceStrategyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
