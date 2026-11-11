"use client";

import { useEffect, useState } from "react";
import { Timer, Play, Pause, X, Minimize2 } from "lucide-react";

interface SmartRestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function playTimerCompletionSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {}
}

export function SmartRestTimer({ initialSeconds = 90, isOpen, onClose }: SmartRestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setTotalTime(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds, isOpen]);

  useEffect(() => {
    if (!isOpen || !isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          playTimerCompletionSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const progressPct = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 100;

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="animate-in harbiz-press fixed z-[90] right-4 bottom-[calc(80px+env(safe-area-inset-bottom,16px))] md:bottom-6 md:right-6 flex items-center gap-2 rounded-full px-4 cursor-pointer"
        style={{
          minHeight: 46,
          background: "var(--color-surface)",
          border: `2px solid ${timeLeft === 0 ? "var(--color-success)" : "var(--color-warning)"}`,
          boxShadow: "var(--shadow-md)",
          color: "var(--color-text)",
        }}
      >
        <Timer
          size={17}
          className={isRunning ? "animate-spin" : ""}
          style={{ color: timeLeft === 0 ? "var(--color-success)" : "var(--color-warning)" }}
        />
        <span
          className="font-bold text-sm tabular-nums"
          style={{ color: timeLeft === 0 ? "var(--color-success)" : "var(--color-text)" }}
        >
          {timeLeft === 0 ? "¡Siguiente serie!" : formattedTime}
        </span>
      </button>
    );
  }

  return (
    <div
      className="animate-in fixed z-[90] right-4 bottom-[calc(80px+env(safe-area-inset-bottom,16px))] md:bottom-6 md:right-6 w-[min(310px,calc(100vw-32px))] rounded-2xl p-4"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "var(--shadow-md)",
        color: "var(--color-text)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--color-warning)" }}>
          <Timer size={15} />
          <span>Descanso Activo</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center rounded-xl harbiz-press cursor-pointer"
            style={{ width: 38, height: 38, color: "var(--color-text-muted)" }}
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
            aria-label="Minimizar temporizador"
          >
            <Minimize2 size={15} />
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-xl harbiz-press cursor-pointer"
            style={{ width: 38, height: 38, color: "var(--color-text-muted)" }}
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar temporizador"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 my-1">
        <span
          className="font-extrabold text-3xl tabular-nums tracking-tight"
          style={{ color: timeLeft === 0 ? "var(--color-success)" : "var(--color-text)" }}
        >
          {formattedTime}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-secondary btn-sm harbiz-press"
            style={{ minHeight: 40, padding: "0 10px" }}
            onClick={() => {
              setTimeLeft((t) => t + 30);
              setTotalTime((t) => t + 30);
            }}
          >
            +30s
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm harbiz-press"
            style={{ minHeight: 40, padding: "0 10px" }}
            onClick={() => setTimeLeft((t) => Math.max(0, t - 30))}
          >
            -30s
          </button>
        </div>
      </div>

      <div
        className="w-full h-2 rounded-full overflow-hidden my-3"
        style={{ background: "var(--color-surface-raised)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: timeLeft === 0 ? "var(--color-success)" : "var(--color-warning)",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-1.5">
        {[60, 90, 120, 180].map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => {
              setTimeLeft(sec);
              setTotalTime(sec);
              setIsRunning(true);
            }}
            className="btn btn-ghost btn-sm flex-1 harbiz-press"
            style={{ minHeight: 40, fontSize: "0.75rem" }}
          >
            {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsRunning((r) => !r)}
          className="btn btn-primary btn-sm harbiz-press"
          style={{ minHeight: 40, minWidth: 44 }}
          aria-label={isRunning ? "Pausar" : "Reanudar"}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  );
}
