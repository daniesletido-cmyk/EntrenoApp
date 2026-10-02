"use client";

import { useEffect, useState, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, X, Plus, Minus, Volume2, Bell } from "lucide-react";

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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

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
      <div
        className="animate-in"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          backgroundColor: "var(--color-surface)",
          border: "2px solid var(--color-brand)",
          borderRadius: 999,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          cursor: "pointer",
        }}
        onClick={() => setIsMinimized(false)}
      >
        <Timer size={16} className={isRunning ? "animate-spin text-brand" : "text-muted"} />
        <span className="font-bold text-sm" style={{ color: timeLeft === 0 ? "var(--color-success)" : "var(--color-text)" }}>
          {timeLeft === 0 ? "¡A entrenar!" : formattedTime}
        </span>
      </div>
    );
  }

  return (
    <div
      className="animate-in"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-strong)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "var(--space-3) var(--space-4)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        width: 290,
      }}
    >
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
          <Timer size={14} />
          <span>Tiempo de Descanso</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            style={{ padding: "2px 6px", height: "auto" }}
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
          >
            _
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            style={{ padding: "2px 6px", height: "auto" }}
            onClick={onClose}
            title="Cerrar"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Reloj central */}
      <div className="flex items-baseline justify-between" style={{ margin: "6px 0" }}>
        <span
          className="font-bold"
          style={{
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            color: timeLeft === 0 ? "var(--color-success)" : "var(--color-text)",
          }}
        >
          {formattedTime}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-secondary text-xs"
            style={{ height: 28, padding: "0 8px" }}
            onClick={() => {
              setTimeLeft((t) => t + 30);
              setTotalTime((t) => t + 30);
            }}
          >
            +30s
          </button>
          <button
            type="button"
            className="btn btn-secondary text-xs"
            style={{ height: 28, padding: "0 8px" }}
            onClick={() => setTimeLeft((t) => Math.max(0, t - 30))}
          >
            -30s
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          width: "100%",
          height: 6,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 999,
          overflow: "hidden",
          margin: "8px 0",
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            backgroundColor: timeLeft === 0 ? "var(--color-success)" : "var(--color-brand)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Presets rápidos */}
      <div className="flex items-center justify-between gap-1" style={{ marginTop: 8 }}>
        {[60, 90, 120, 180].map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => {
              setTimeLeft(sec);
              setTotalTime(sec);
              setIsRunning(true);
            }}
            className="btn btn-ghost text-xs"
            style={{ fontSize: "0.7rem", padding: "2px 6px" }}
          >
            {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsRunning((r) => !r)}
          className="btn btn-primary text-xs"
          style={{ height: 26, padding: "0 10px" }}
        >
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>
    </div>
  );
}
