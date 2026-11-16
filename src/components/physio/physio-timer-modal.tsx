"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PhysioRoutine, PhysioExercise } from "@/lib/physio-routines";
import { Button } from "@/components/ui/button";

interface PhysioTimerModalProps {
  routine: PhysioRoutine | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PhysioTimerModal({
  routine,
  isOpen,
  onClose,
}: PhysioTimerModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar al abrir o cambiar de rutina
  useEffect(() => {
    if (routine && routine.exercises.length > 0) {
      setCurrentIdx(0);
      setTimeLeft(routine.exercises[0].durationSec);
      setIsRunning(false);
      setCompleted(false);
    }
  }, [routine, isOpen]);

  const currentExercise: PhysioExercise | undefined = routine?.exercises[currentIdx];

  // Beep auditivo usando Web Audio API sin dependencias externas
  const playBeep = (freq = 880, type: OscillatorType = "sine", duration = 0.15) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // Motor del temporizador
  useEffect(() => {
    if (isRunning && !completed) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Fin del ejercicio actual
            playBeep(1100, "triangle", 0.3);
            if (routine && currentIdx < routine.exercises.length - 1) {
              const nextIdx = currentIdx + 1;
              setCurrentIdx(nextIdx);
              return routine.exercises[nextIdx].durationSec;
            } else {
              setIsRunning(false);
              setCompleted(true);
              return 0;
            }
          }
          if (prev <= 4) {
            // Cuenta regresiva 3, 2, 1
            playBeep(600, "sine", 0.08);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, currentIdx, routine, completed, soundEnabled]);

  if (!isOpen || !routine || !currentExercise) return null;

  const totalExercises = routine.exercises.length;
  const progressPct = ((currentIdx + (1 - timeLeft / currentExercise.durationSec)) / totalExercises) * 100;
  const exerciseProgressPct = ((currentExercise.durationSec - timeLeft) / currentExercise.durationSec) * 100;

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleNext = () => {
    if (currentIdx < totalExercises - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setTimeLeft(routine.exercises[next].durationSec);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      setTimeLeft(routine.exercises[prev].durationSec);
    }
  };

  const handleResetExercise = () => {
    setTimeLeft(currentExercise.durationSec);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                10 MIN · {routine.badge}
              </span>
              <span className="text-xs text-zinc-400">
                Ejercicio {currentIdx + 1} de {totalExercises}
              </span>
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
              {routine.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={soundEnabled ? "Silenciar pitido" : "Activar pitido"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar temporizador"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de progreso global de la sesión */}
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-red-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Contenido Central */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-center flex-1 flex flex-col justify-between">
          {completed ? (
            <div className="py-8 space-y-4 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  ¡Rutina Completada con Éxito!
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Has completado los 10 minutos de descarga y movilidad guiada por nuestro Fisioterapeuta Deportivo. Tus tejidos están preparados y oxigenados.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 px-6 text-xs mx-auto"
              >
                Cerrar y volver
              </Button>
            </div>
          ) : (
            <>
              {/* Temporizador circular / numérico visual */}
              <div className="py-2">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className="text-zinc-100 dark:text-zinc-800"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className="text-red-600 transition-all duration-1000 ease-linear"
                      strokeWidth="8"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * exerciseProgressPct) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
                      {formatMinSec(timeLeft)}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-1">
                      {currentExercise.muscleGroup}
                    </span>
                  </div>
                </div>
              </div>

              {/* Título e instrucciones del ejercicio */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 leading-snug">
                  {currentExercise.name}
                </h4>

                {currentExercise.repsOrSets && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {currentExercise.repsOrSets}
                  </span>
                )}

                <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                  {currentExercise.instructions}
                </p>
              </div>

              {/* Consejo Clínico del Fisioterapeuta */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-left max-w-md mx-auto text-xs flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                    Criterio Fisioterapéutico:
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {currentExercise.physioTip}
                  </span>
                </div>
              </div>

              {/* Controles de reproducción */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Ejercicio anterior"
                  style={{ minWidth: 48, minHeight: 48 }}
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsRunning(!isRunning)}
                  className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all flex items-center justify-center"
                  aria-label={isRunning ? "Pausar temporizador" : "Iniciar temporizador"}
                  style={{ minWidth: 64, minHeight: 64 }}
                >
                  {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleResetExercise}
                  className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  title="Reiniciar ejercicio actual"
                  aria-label="Reiniciar"
                  style={{ minWidth: 48, minHeight: 48 }}
                >
                  <RotateCcw size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIdx === totalExercises - 1}
                  className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Siguiente ejercicio"
                  style={{ minWidth: 48, minHeight: 48 }}
                >
                  <SkipForward size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
