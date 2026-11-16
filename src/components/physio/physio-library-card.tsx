"use client";

import { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Play,
  Clock,
  Activity,
  Flame,
  ArrowRight,
} from "lucide-react";
import { PHYSIO_ROUTINES, PhysioRoutine } from "@/lib/physio-routines";
import { PhysioTimerModal } from "./physio-timer-modal";
import { Button } from "@/components/ui/button";

export function PhysioLibraryCard() {
  const [selectedRoutine, setSelectedRoutine] = useState<PhysioRoutine | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const startRoutine = (routine: PhysioRoutine) => {
    setSelectedRoutine(routine);
    setModalOpen(true);
  };

  return (
    <>
      <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        {/* Cabecera del módulo */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                  Sesiones Express de Fisioterapia & Movilidad (10 min)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  Temporizador Activo
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Rutinas clínicas con temporizador por ejercicio guiadas por el Fisioterapeuta Deportivo.
              </p>
            </div>
          </div>
        </div>

        {/* Listado de las 3 Rutinas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {PHYSIO_ROUTINES.map((routine) => (
            <div
              key={routine.id}
              className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-red-300 dark:hover:border-red-900/60 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {routine.badge}
                  </span>
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Clock size={11} />
                    10 min
                  </span>
                </div>

                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {routine.title}
                </h4>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {routine.description}
                </p>

                <div className="text-[10px] text-zinc-400 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                  <strong>Zona:</strong> {routine.targetArea}
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => startRoutine(routine)}
                className="w-full text-xs py-2 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play size={13} className="fill-white" />
                <span>Iniciar Rutina (10 min)</span>
              </Button>
            </div>
          ))}
        </div>
      </div>

      <PhysioTimerModal
        routine={selectedRoutine}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
