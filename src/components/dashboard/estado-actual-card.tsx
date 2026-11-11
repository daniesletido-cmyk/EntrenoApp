"use client";

import React from "react";
import { Activity, Flame, Moon, Sparkles, TrendingUp } from "lucide-react";
import type { DailyReadiness } from "@/lib/readiness";

interface EstadoActualCardProps {
  readiness: DailyReadiness | null;
  acwr?: number | null;
  weeklyKm?: number | null;
  weeklyTargetKm?: number | null;
  completedSessions?: number;
  plannedSessions?: number;
  sleepHours?: number | null;
  sleepScore?: number | null;
  sleepQuality?: number | null;
}

export function EstadoActualCard({
  readiness,
  acwr = 1.05,
  weeklyKm = null,
  weeklyTargetKm = 45,
  completedSessions = 0,
  plannedSessions = 0,
  sleepHours = null,
  sleepScore = null,
  sleepQuality = null,
}: EstadoActualCardProps) {
  const score = readiness?.score ?? 82;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color semántico del anillo circular según puntuación de preparación
  const statusMeta =
    clampedScore >= 75
      ? {
          label: "Listo para rendir",
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.14)",
          border: "rgba(16, 185, 129, 0.35)",
          glow: "rgba(16, 185, 129, 0.35)",
        }
      : clampedScore >= 55
      ? {
          label: "Mantener o suave",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.14)",
          border: "rgba(245, 158, 11, 0.35)",
          glow: "rgba(245, 158, 11, 0.3)",
        }
      : {
          label: "Descanso necesario",
          color: "#ef4444",
          bg: "rgba(239, 68, 68, 0.14)",
          border: "rgba(239, 68, 68, 0.35)",
          glow: "rgba(239, 68, 68, 0.32)",
        };

  // Geometría del anillo circular SVG
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // ACWR (Ratio Carga Aguda:Crónica)
  const acwrVal = acwr != null && Number.isFinite(acwr) ? Number(acwr.toFixed(2)) : 1.05;
  const acwrInfo =
    acwrVal > 1.5
      ? { label: "Sobrecarga", color: "#ef4444", pct: 95 }
      : acwrVal >= 1.3
      ? { label: "Carga alta", color: "#f59e0b", pct: 78 }
      : acwrVal >= 0.8
      ? { label: "En forma", color: "#10b981", pct: 62 }
      : { label: "Descanso óptimo", color: "#3b82f6", pct: 35 };

  // Carga 7 días
  const kmDone = weeklyKm != null ? Number(weeklyKm.toFixed(1)) : 0;
  const targetKm = weeklyTargetKm && weeklyTargetKm > 0 ? weeklyTargetKm : 45;
  const loadProgressPct = Math.min(100, Math.max(6, Math.round((kmDone / targetKm) * 100)));

  // Sueño y recuperación
  const resolvedSleepH = sleepHours ?? readiness?.stats?.sleepHours ?? null;
  const resolvedSleepScore = sleepScore ?? readiness?.stats?.sleepScore ?? null;
  const resolvedSleepQ = sleepQuality ?? readiness?.stats?.sleepQuality ?? null;
  const sleepProgressPct =
    resolvedSleepScore != null
      ? Math.min(100, Math.max(10, resolvedSleepScore))
      : resolvedSleepH != null
      ? Math.min(100, Math.max(10, Math.round((resolvedSleepH / 8) * 100)))
      : 0;

  // Recomendación contextual breve para hoy
  const shortRecommendation = (() => {
    if (readiness?.verdict?.description) {
      return readiness.verdict.description;
    }
    if (clampedScore >= 75) {
      return readiness?.stats?.yesterdayTrained === false
        ? "Nivel de fatiga bajo tras el descanso previo. Día ideal para series o carga de calidad."
        : "Recuperación óptima. Buenas condiciones para completar la sesión al ritmo objetivo.";
    }
    if (clampedScore >= 55) {
      return "Carga acumulada moderada. Mantén el trabajo aeróbico en zonas cómodas sin forzar.";
    }
    return "Fatiga elevada detectada. Prioriza rodaje regenerativo suave o descanso activo.";
  })();

  return (
    <section
      aria-label="Estado Actual en Tiempo Real"
      className="surface relative overflow-hidden p-4 sm:p-6 animate-in"
      style={{
        borderColor: "var(--color-border-strong)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Brillo superior deportivo sutil */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-20 blur-3xl"
        style={{ background: statusMeta.color }}
      />

      {/* Cabecera */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--color-brand-subtle)",
              color: "var(--color-brand)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <Activity size={18} strokeWidth={2.3} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
              Estado Actual en Tiempo Real
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              ¿Cómo estoy ahora mismo para entrenar?
            </p>
          </div>
        </div>

        <span
          className="badge font-bold"
          style={{
            background: statusMeta.bg,
            color: statusMeta.color,
            border: `1px solid ${statusMeta.border}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusMeta.color, boxShadow: `0 0 8px ${statusMeta.glow}` }}
          />
          {statusMeta.label}
        </span>
      </div>

      {/* Cuerpo principal: Anillo de Readiness + Cuadrícula 2x2 de indicadores */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-center">
        {/* 1. Anillo Circular de Preparación (0-100%) */}
        <div
          className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="var(--color-border-strong)"
                strokeWidth="10"
                fill="none"
                opacity={0.45}
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={statusMeta.color}
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  filter: `drop-shadow(0 0 6px ${statusMeta.glow})`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                className="text-3xl font-extrabold tabular-nums tracking-tight leading-none"
                style={{ color: statusMeta.color }}
              >
                {clampedScore}%
              </span>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider mt-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Readiness
              </span>
            </div>
          </div>

          <div className="mt-2.5 text-center">
            <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {readiness?.levelLabel || "Preparación Física"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Carga + Descanso 48h
            </div>
          </div>
        </div>

        {/* 2. Cuadrícula compacta 2x2 de Indicadores Clave */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Forma vs Fatiga (ACWR) */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between gap-2"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <TrendingUp size={14} style={{ color: acwrInfo.color }} />
                Forma vs. Fatiga
              </span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${acwrInfo.color}20`, color: acwrInfo.color }}
              >
                {acwrInfo.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {acwrVal.toFixed(2)}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                ACWR (0.8–1.3 óptimo)
              </span>
            </div>
            {/* Barra segmentada ACWR */}
            <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
              {[25, 50, 75, 100].map((step, i) => (
                <div
                  key={step}
                  className="rounded-full transition-all"
                  style={{
                    background:
                      acwrInfo.pct >= step - 15
                        ? i === 3 && acwrVal > 1.5
                          ? "#ef4444"
                          : acwrInfo.color
                        : "var(--color-border)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card 2: Carga Reciente 7 días */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between gap-2"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Flame size={14} style={{ color: "var(--color-brand)" }} />
                Carga 7 días
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--color-brand)" }}>
                {plannedSessions > 0 ? `${completedSessions}/${plannedSessions} ses.` : `${loadProgressPct}%`}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {kmDone} km
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                / {targetKm} km meta
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${loadProgressPct}%`, background: "var(--gradient-brand)" }}
              />
            </div>
          </div>

          {/* Card 3: Recuperación & Sueño */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between gap-2"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Moon size={14} style={{ color: "#0ea5e9" }} />
                Recuperación &amp; Sueño
              </span>
              {resolvedSleepScore != null && (
                <span className="text-xs font-bold tabular-nums" style={{ color: "#10b981" }}>
                  {resolvedSleepScore}/100
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {resolvedSleepH != null ? `${resolvedSleepH.toFixed(1)} h` : "Sin datos"}
              </span>
              {resolvedSleepQ != null && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  · Calidad {resolvedSleepQ}/5
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${sleepProgressPct}%`, background: "#0ea5e9" }}
              />
            </div>
          </div>

          {/* Card 4: Recomendación para hoy */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between gap-1.5"
            style={{
              background: `${statusMeta.color}10`,
              border: `1px solid ${statusMeta.border}`,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: statusMeta.color }}>
              <Sparkles size={14} />
              <span>Recomendación para hoy</span>
            </div>
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--color-text)" }}>
              {shortRecommendation}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
