"use client";

import React from "react";
import { Activity, Moon, Route, Clock } from "lucide-react";
import type { DailyReadiness } from "@/lib/readiness";
import { todayISO } from "@/lib/dates";

export interface ReadinessRecentSession {
  id: number;
  date: string;
  discipline: string;
  status: string;
  duration_min: number | null;
  distance_km: number | null;
  rpe: number | null;
  suuntoMetrics?: {
    recoveryTimeHours?: number | null;
  } | null;
}

export interface ReadinessCardProps {
  readiness: DailyReadiness | null;
  acwr?: number | null;
  weeklyKm?: number | null;
  weeklyTargetKm?: number | null;
  weeklyDurationMin?: number | null;
  completedSessions?: number;
  plannedSessions?: number;
  sleepHours?: number | null;
  sleepScore?: number | null;
  sleepQuality?: number | null;
  recentSessions?: ReadinessRecentSession[];
}

function formatHoursMinutes(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return "Sin registro";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatDurationShort(min: number | null | undefined): string {
  if (!min || min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

export function ReadinessCard({
  readiness,
  acwr = 1.0,
  weeklyKm = null,
  weeklyTargetKm = 45,
  weeklyDurationMin = null,
  completedSessions = 0,
  plannedSessions = 0,
  sleepHours = null,
  sleepScore = null,
  sleepQuality = null,
  recentSessions = [],
}: ReadinessCardProps) {
  const score = readiness?.score ?? 80;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Estado y colores mate planos según nivel de Readiness
  const stateConfig =
    clampedScore >= 75
      ? {
          ringColor: "#16a34a",
          badgeBg: "var(--color-success-bg)",
          badgeText: "var(--color-success)",
          badgeBorder: "rgba(22, 163, 74, 0.25)",
          badgeLabel: "Óptimo · Listo para entrenar",
          fallbackTactic: "Recuperación completa tras 48h. Apto para sesión exigente o series.",
        }
      : clampedScore >= 55
      ? {
          ringColor: "#d97706",
          badgeBg: "var(--color-warning-bg)",
          badgeText: "var(--color-warning)",
          badgeBorder: "rgba(217, 119, 6, 0.25)",
          badgeLabel: "Moderado · Carga controlada",
          fallbackTactic: "Asimilación intermedia. Mantén volumen aeróbico cómodo sin exceder umbral.",
        }
      : {
          ringColor: "#dc2626",
          badgeBg: "var(--color-danger-bg)",
          badgeText: "var(--color-danger)",
          badgeBorder: "rgba(220, 38, 38, 0.25)",
          badgeLabel: "Sobrecarga · Prioriza descanso",
          fallbackTactic: "Fatiga elevada. Reduce intensidad a rodaje muy suave o descanso activo.",
        };

  const tacticalAdvice = readiness?.verdict?.description || stateConfig.fallbackTactic;

  // Dial circular elegante (stroke 9px, pista gris tenue)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  // 1. Carga Aguda vs Crónica (Ratio A/C)
  const acwrVal = acwr != null && Number.isFinite(acwr) ? Number(acwr.toFixed(2)) : 0.95;
  const acwrMeta =
    acwrVal > 1.5
      ? { text: "Sobrecarga (>1.5)", color: "#dc2626", pct: 95 }
      : acwrVal >= 1.3
      ? { text: "Carga elevada", color: "#d97706", pct: 78 }
      : acwrVal >= 0.8
      ? { text: "Zona óptima · Sin sobrecarga", color: "#16a34a", pct: 62 }
      : { text: "Carga baja / Fresco", color: "#71717a", pct: 35 };

  // 2. Sueño & Recuperación (Zepp)
  const resolvedSleepH = sleepHours ?? readiness?.stats?.sleepHours ?? null;
  const resolvedSleepScore = sleepScore ?? readiness?.stats?.sleepScore ?? null;
  const resolvedSleepQ = sleepQuality ?? readiness?.stats?.sleepQuality ?? null;
  const sleep3dAvg = readiness?.stats?.sleepTrend3dAvg ?? null;

  const sleepTrendText = (() => {
    if (resolvedSleepH != null && sleep3dAvg != null) {
      const diffMin = Math.round((resolvedSleepH - sleep3dAvg) * 60);
      if (Math.abs(diffMin) < 10) return "Estable vs. media 3d";
      return diffMin > 0 ? `+${diffMin}m vs. media` : `${diffMin}m vs. media`;
    }
    if (resolvedSleepScore != null) return `Score Zepp ${resolvedSleepScore}/100`;
    if (resolvedSleepQ != null) return `Calidad ${resolvedSleepQ}/5`;
    return "Sin comparativa previa";
  })();

  // 3. Volumen Semanal Acumulado
  const kmDone = weeklyKm != null ? Number(weeklyKm.toFixed(1)) : 0;
  const targetKm = weeklyTargetKm && weeklyTargetKm > 0 ? weeklyTargetKm : 45;
  const volPct = Math.min(100, Math.max(kmDone > 0 ? 6 : 0, Math.round((kmDone / targetKm) * 100)));

  // 4. Ventana de Recuperación real desde la última sesión realizada
  const recoveryWindow = (() => {
    const today = todayISO();
    const completed = recentSessions
      .filter((s) => s.status === "realizada" || s.status === "parcial")
      .sort((a, b) => b.date.localeCompare(a.date));

    const last = completed[0];
    if (last) {
      const daysDiff = Math.max(
        0,
        Math.round(
          (new Date(today + "T00:00:00Z").getTime() - new Date(last.date + "T00:00:00Z").getTime()) / 86400000
        )
      );
      const watchRecoveryH = last.suuntoMetrics?.recoveryTimeHours ?? null;
      if (daysDiff === 0) {
        return {
          headline: watchRecoveryH ? `${Math.round(watchRecoveryH)}h estimadas` : "Entrenado hoy",
          sub: `${last.discipline}${last.rpe ? ` · RPE ${last.rpe}` : ""}`,
        };
      }
      if (daysDiff === 1) {
        return {
          headline: watchRecoveryH && watchRecoveryH > 24 ? `${Math.round(watchRecoveryH - 24)}h restantes` : "Hace ~24h",
          sub: `Ayer: ${last.discipline}${last.rpe ? ` (RPE ${last.rpe})` : ""}`,
        };
      }
      return {
        headline: `Hace ${daysDiff} días`,
        sub: "Descanso completo disponible",
      };
    }

    if (readiness?.stats?.yesterdayTrained) {
      return {
        headline: "Hace ~24h",
        sub: `${readiness.stats.yesterdayDiscipline || "Sesión"}${
          readiness.stats.yesterdayRpe ? ` · RPE ${readiness.stats.yesterdayRpe}` : ""
        }`,
      };
    }

    return {
      headline: "Ventana limpia",
      sub: "Sin carga intensa en últimas 48h",
    };
  })();

  return (
    <section
      aria-label="Readiness y Estado Actual"
      className="surface rounded-2xl p-5 sm:p-6 animate-in"
    >
      {/* Encabezado + Dial + Estado y Diagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Dial circular pulido */}
        <div className="flex items-center justify-center sm:justify-start flex-shrink-0">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 124 124">
              <circle
                cx="62"
                cy="62"
                r={radius}
                stroke="var(--color-surface-raised)"
                strokeWidth="9"
                fill="none"
              />
              <circle
                cx="62"
                cy="62"
                r={radius}
                stroke={stateConfig.ringColor}
                strokeWidth="9"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                className="text-4xl font-extrabold tabular-nums tracking-tight leading-none"
                style={{ color: "var(--color-text)" }}
              >
                {clampedScore}
              </span>
              <span
                className="text-[11px] font-semibold tracking-wider uppercase mt-1"
                style={{ color: "var(--color-text-faint)" }}
              >
                READINESS
              </span>
            </div>
          </div>
        </div>

        {/* Diagnóstico y Recomendación táctica */}
        <div className="flex-1 min-w-0 space-y-2.5 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Estado Actual
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: stateConfig.badgeBg,
                color: stateConfig.badgeText,
                border: `1px solid ${stateConfig.badgeBorder}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stateConfig.ringColor }} />
              {stateConfig.badgeLabel}
            </span>
          </div>

          <h2
            className="text-base sm:text-lg font-bold tracking-tight leading-snug"
            style={{ color: "var(--color-text)" }}
          >
            {readiness?.verdict?.title || "Preparación física diaria"}
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {tacticalAdvice}
          </p>
        </div>
      </div>

      {/* Grid de 4 Parámetros Esenciales explicativos */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        {/* 1. Carga Aguda vs Crónica */}
        <div
          className="p-3.5 rounded-xl flex flex-col justify-between gap-2"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Activity size={14} style={{ color: acwrMeta.color }} />
              Ratio A/C
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
              {acwrVal.toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border-strong)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${acwrMeta.pct}%`, backgroundColor: acwrMeta.color }}
            />
          </div>
          <div className="text-[11px] font-medium truncate" style={{ color: acwrMeta.color }}>
            {acwrMeta.text}
          </div>
        </div>

        {/* 2. Sueño & Recuperación (Zepp) */}
        <div
          className="p-3.5 rounded-xl flex flex-col justify-between gap-2"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Moon size={14} style={{ color: "var(--color-text-muted)" }} />
              Sueño (Zepp)
            </span>
            {resolvedSleepScore != null && (
              <span className="text-xs font-bold tabular-nums" style={{ color: "#16a34a" }}>
                {resolvedSleepScore}%
              </span>
            )}
          </div>
          <div className="text-base font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
            {formatHoursMinutes(resolvedSleepH)}
          </div>
          <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
            {sleepTrendText}
          </div>
        </div>

        {/* 3. Volumen Semanal Acumulado */}
        <div
          className="p-3.5 rounded-xl flex flex-col justify-between gap-2"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Route size={14} style={{ color: "var(--color-brand)" }} />
              Volumen 7d
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              {plannedSessions > 0 ? `${completedSessions}/${plannedSessions} ses.` : `${volPct}%`}
            </span>
          </div>
          <div className="text-base font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
            {kmDone} km
            {weeklyDurationMin ? (
              <span className="text-xs font-medium ml-1.5" style={{ color: "var(--color-text-muted)" }}>
                · {formatDurationShort(weeklyDurationMin)}
              </span>
            ) : null}
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border-strong)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${volPct}%`, backgroundColor: "var(--color-brand)" }}
            />
          </div>
        </div>

        {/* 4. Ventana de Recuperación */}
        <div
          className="p-3.5 rounded-xl flex flex-col justify-between gap-2"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Clock size={14} style={{ color: "var(--color-text-muted)" }} />
              Recuperación
            </span>
          </div>
          <div className="text-base font-bold tabular-nums truncate" style={{ color: "var(--color-text)" }}>
            {recoveryWindow.headline}
          </div>
          <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
            {recoveryWindow.sub}
          </div>
        </div>
      </div>
    </section>
  );
}
