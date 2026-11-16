"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  ShieldCheck,
  Stethoscope,
  Info,
  ChevronRight,
  Flame,
} from "lucide-react";
import type { AerobicEfficiencySummary } from "@/lib/aerobic-efficiency";

interface AerobicEfficiencyCardProps {
  initialData?: AerobicEfficiencySummary | null;
}

export function AerobicEfficiencyCard({ initialData }: AerobicEfficiencyCardProps) {
  const [data, setData] = useState<AerobicEfficiencySummary | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      fetch("/api/aerobic-efficiency")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setData(d);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialData]);

  if (loading) {
    return (
      <div className="surface p-5 rounded-2xl animate-pulse space-y-4">
        <div className="h-6 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-20 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const isImproving = data.trend === "improving";
  const isFatigued = data.trend === "fatigued";

  return (
    <section
      id="eficiencia-aerobica"
      className="surface p-4 sm:p-6 rounded-2xl space-y-5 border border-zinc-800 transition-all duration-200"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isImproving
                ? "rgba(22, 163, 74, 0.15)"
                : isFatigued
                ? "rgba(220, 38, 38, 0.15)"
                : "rgba(217, 119, 6, 0.15)",
              color: isImproving
                ? "var(--color-success)"
                : isFatigued
                ? "var(--color-danger)"
                : "var(--color-warning)",
            }}
          >
            <Heart size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-brand text-[11px] font-semibold uppercase tracking-wider">
                Métrica Suunto
              </span>
              <span
                className="badge text-[11px] font-medium"
                style={{
                  background: isImproving
                    ? "rgba(22, 163, 74, 0.15)"
                    : isFatigued
                    ? "rgba(220, 38, 38, 0.15)"
                    : "rgba(217, 119, 6, 0.15)",
                  color: isImproving
                    ? "#16a34a"
                    : isFatigued
                    ? "#dc2626"
                    : "#d97706",
                }}
              >
                {data.trendLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1 leading-snug">
              Eficiencia Aeróbica y Desacople Cardíaco
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Relación velocidad / pulso medio en rodajes continuos (Últimos {data.analyzedDays} días)
            </p>
          </div>
        </div>

        {/* Indicador de Desacople */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between bg-zinc-900/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-zinc-800/60 sm:border-0">
          <div className="text-right">
            <div className="text-2xl font-extrabold font-mono tabular-nums text-white">
              {data.avgDecouplingPct}%
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Desacople medio (Pa:HR)
            </div>
          </div>
          <span
            className="badge text-[10px] sm:mt-1 font-medium"
            style={{
              background:
                data.decouplingStatus === "optimo"
                  ? "rgba(22, 163, 74, 0.15)"
                  : "rgba(217, 119, 6, 0.15)",
              color:
                data.decouplingStatus === "optimo" ? "#16a34a" : "#d97706",
            }}
          >
            {data.decouplingStatus === "optimo" ? "Óptimo (< 5%)" : "Atención"}
          </span>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Métrica 1: Factor de Eficiencia (EF) */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>Factor de Eficiencia (EF)</span>
            <Activity size={15} className="text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {data.currentEF}{" "}
            <span className="text-xs font-normal text-zinc-400">m/min/lpm</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
            {isImproving ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingUp size={12} /> +{data.deltaPct}%
              </span>
            ) : isFatigued ? (
              <span className="text-red-400 flex items-center gap-0.5">
                <TrendingDown size={12} /> {data.deltaPct}%
              </span>
            ) : (
              <span className="text-amber-400">Estable</span>
            )}{" "}
            <span>vs 15 días previos ({data.previousEF})</span>
          </div>
        </div>

        {/* Métrica 2: Ritmo Medio Reciente */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>Ritmo Medio Aeróbico</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {data.avgPaceRecent}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Zona R1/R2 continua
          </div>
        </div>

        {/* Métrica 3: Frecuencia Cardíaca Media */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>Pulso Medio Reciente</span>
            <Heart size={15} className="text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {data.avgHeartRateRecent}{" "}
            <span className="text-xs font-normal text-zinc-400">lpm</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            {isImproving ? "Mismo ritmo con menor pulso" : "FC dentro de rango objetivo"}
          </div>
        </div>
      </div>

      {/* Sesiones Aeróbicas Analizadas */}
      {data.sessions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sesiones Analizadas ({data.sessions.length})</span>
            <span className="text-[11px] text-zinc-500 font-mono">
              EF = Velocidad (m/min) ÷ FC
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-zinc-200 truncate">
                    {s.plannedCode}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {s.date} · {s.distanceKm} km · {s.paceFormatted} · {s.avgHeartRate} lpm
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-white">
                    {s.efficiencyFactor} EF
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {s.decouplingPct}% desacople
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pautas del Equipo Multidisciplinar */}
      <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
          <ShieldCheck size={15} className="text-red-500" />
          <span>Criterio Técnico (Preparador & Fisioterapeuta)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
          {/* Preparador Físico */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/70 space-y-1">
            <div className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Activity size={13} className="text-red-500" />
              <span>Preparador Físico de Élite</span>
            </div>
            <p className="text-zinc-300 text-[11px]">
              {data.recommendations.preparador}
            </p>
          </div>

          {/* Fisioterapeuta Deportivo */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/70 space-y-1">
            <div className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Stethoscope size={13} className="text-emerald-500" />
              <span>Fisioterapeuta Deportivo</span>
            </div>
            <p className="text-zinc-300 text-[11px]">
              {data.recommendations.fisioterapeuta}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
