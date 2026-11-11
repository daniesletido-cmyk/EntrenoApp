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

  // Indicadores planos y atenuados (Cero neones)
  const statusMeta =
    clampedScore >= 75
      ? {
          label: "Óptimo · Recuperado",
          color: "#16a34a",
          bg: "rgba(22, 163, 74, 0.09)",
          border: "rgba(22, 163, 74, 0.25)",
        }
      : clampedScore >= 55
      ? {
          label: "Carga moderada",
          color: "#d97706",
          bg: "rgba(217, 119, 6, 0.09)",
          border: "rgba(217, 119, 6, 0.25)",
        }
      : {
          label: "Sobrecarga · Descanso",
          color: "#dc2626",
          bg: "rgba(220, 38, 38, 0.09)",
          border: "rgba(220, 38, 38, 0.25)",
        };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const acwrVal = acwr != null && Number.isFinite(acwr) ? Number(acwr.toFixed(2)) : 1.05;
  const acwrInfo =
    acwrVal > 1.5
      ? { label: "Sobrecarga", color: "#dc2626", pct: 95 }
      : acwrVal >= 1.3
      ? { label: "Carga alta", color: "#d97706", pct: 78 }
      : acwrVal >= 0.8
      ? { label: "En forma", color: "#16a34a", pct: 62 }
      : { label: "Descanso óptimo", color: "#71717a", pct: 35 };

  const kmDone = weeklyKm != null ? Number(weeklyKm.toFixed(1)) : 0;
  const targetKm = weeklyTargetKm && weeklyTargetKm > 0 ? weeklyTargetKm : 45;
  const loadProgressPct = Math.min(100, Math.max(6, Math.round((kmDone / targetKm) * 100)));

  const resolvedSleepH = sleepHours ?? readiness?.stats?.sleepHours ?? null;
  const resolvedSleepScore = sleepScore ?? readiness?.stats?.sleepScore ?? null;
  const resolvedSleepQ = sleepQuality ?? readiness?.stats?.sleepQuality ?? null;
  const sleepProgressPct =
    resolvedSleepScore != null
      ? Math.min(100, Math.max(10, resolvedSleepScore))
      : resolvedSleepH != null
      ? Math.min(100, Math.max(10, Math.round((resolvedSleepH / 8) * 100)))
      : 0;

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
      className="surface p-5 sm:p-6 animate-in"
    >
      {/* Cabecera limpia mate */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--color-surface-raised)",
              color: "var(--color-brand)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Activity size={19} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
              Estado Actual en Tiempo Real
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              ¿Cómo estoy ahora mismo para entrenar?
            </p>
          </div>
        </div>

        <span
          className="badge font-semibold"
          style={{
            background: statusMeta.bg,
            color: statusMeta.color,
            border: `1px solid ${statusMeta.border}`,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
          {statusMeta.label}
        </span>
      </div>

      {/* Cuerpo: Anillo Readiness + Cuadrícula 2x2 neutra */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-center">
        {/* Anillo Circular de Preparación (Cero glow) */}
        <div
          className="lg:col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl"
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
                strokeWidth="9"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={statusMeta.color}
                strokeWidth="9"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                className="text-3xl font-extrabold tabular-nums tracking-tight leading-none"
                style={{ color: "var(--color-text)" }}
              >
                {clampedScore}%
              </span>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider mt-1.5 flex items-center gap-1"
                style={{ color: "var(--color-brand)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-brand)" }} />
                Readiness
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {readiness?.levelLabel || "Preparación Física"}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Carga + Descanso 48h
            </div>
          </div>
        </div>

        {/* Cuadrícula 2x2 de Métricas Vitales */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Forma vs Fatiga */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-2.5"
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
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-surface)",
                  color: acwrInfo.color,
                  border: "1px solid var(--color-border)",
                }}
              >
                {acwrInfo.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                {acwrVal.toFixed(2)}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                ACWR (0.8–1.3 óptimo)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
              {[25, 50, 75, 100].map((step) => (
                <div
                  key={step}
                  className="rounded-full"
                  style={{
                    background: acwrInfo.pct >= step - 15 ? acwrInfo.color : "var(--color-border-strong)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Carga 7 días */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-2.5"
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
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                {plannedSessions > 0 ? `${completedSessions}/${plannedSessions} ses.` : `${loadProgressPct}%`}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                {kmDone} km
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                / {targetKm} km meta
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border-strong)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${loadProgressPct}%`, background: "var(--color-brand)" }}
              />
            </div>
          </div>

          {/* Recuperación & Sueño */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-2.5"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Moon size={14} style={{ color: "var(--color-text-muted)" }} />
                Último Sueño
              </span>
              {resolvedSleepScore != null && (
                <span className="text-xs font-bold tabular-nums" style={{ color: "#16a34a" }}>
                  {resolvedSleepScore}/100
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                {resolvedSleepH != null ? `${resolvedSleepH.toFixed(1)} h` : "Sin datos"}
              </span>
              {resolvedSleepQ != null && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  · Calidad {resolvedSleepQ}/5
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border-strong)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${sleepProgressPct}%`, background: "#16a34a" }}
              />
            </div>
          </div>

          {/* Feedback Operativo */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-1.5"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: statusMeta.color }}>
              <Sparkles size={14} />
              <span>Feedback operativo</span>
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
