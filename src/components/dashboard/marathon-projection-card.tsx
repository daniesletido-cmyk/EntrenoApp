"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Flame,
  Award,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  HeartHandshake,
  Brain,
  Stethoscope,
  UtensilsCrossed,
  Info,
} from "lucide-react";
import type { MarathonProjectionData } from "@/lib/marathon-projection";

interface MarathonProjectionCardProps {
  initialData?: MarathonProjectionData | null;
}

export function MarathonProjectionCard({ initialData }: MarathonProjectionCardProps) {
  const [data, setData] = useState<MarathonProjectionData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"preparador" | "fisio" | "nutri" | "psico">("preparador");

  useEffect(() => {
    if (!initialData) {
      fetch("/api/marathon-projection")
        .then((res) => (res.ok ? res.json() : null))
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
        <div className="h-6 bg-zinc-800 rounded w-1/2"></div>
        <div className="h-20 bg-zinc-800 rounded"></div>
        <div className="h-10 bg-zinc-800 rounded w-3/4"></div>
      </div>
    );
  }

  if (!data) return null;

  const { targetRace, macrocycle, projection } = data;
  const currentPhase = macrocycle.currentPhase;

  return (
    <section className="surface p-4 sm:p-6 rounded-2xl space-y-5 border border-zinc-800 transition-all duration-200">
      {/* 1. Cabecera con Objetivo y Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: "var(--color-brand-subtle)",
              color: "var(--color-brand)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
            }}
          >
            <Target size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-brand text-[11px] font-semibold uppercase tracking-wider">
                Objetivo Maratón
              </span>
              <span className="badge badge-neutral text-[11px] font-mono tabular-nums">
                26/04/2027
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1 leading-snug">
              {targetRace.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              42.195 km · Perfil ondulado Madrid · Objetivo: {projection.targetGoalTime} ({projection.targetGoalPace})
            </p>
          </div>
        </div>

        {/* Contador de tiempo */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between bg-zinc-900/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-zinc-800/60 sm:border-0">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white leading-none">
              {targetRace.weeksRemaining}{" "}
              <span className="text-xs sm:text-sm font-normal text-zinc-400 uppercase tracking-wider">sem</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono tabular-nums mt-1">
              {targetRace.daysRemaining} días restantes
            </div>
          </div>
          <span className="badge badge-brand text-[11px] sm:mt-1.5 font-medium">
            {currentPhase.shortName}
          </span>
        </div>
      </div>

      {/* 2. Visualizador del Macrociclo (Fases de Periodización) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-red-500" />
            <span>Periodización del Macrociclo (28 Semanas)</span>
          </div>
          <span className="font-mono text-zinc-300">
            Semana {macrocycle.currentWeekNumber} / {macrocycle.totalWeeks}
          </span>
        </div>

        {/* Stepper visual horizontal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {macrocycle.allPhases.map((phase) => {
            const isActive = phase.isActive;
            const isCompleted = phase.isCompleted;

            return (
              <div
                key={phase.key}
                className="p-2.5 rounded-xl transition-all duration-150 flex flex-col justify-between min-h-[72px]"
                style={{
                  background: isActive
                    ? "rgba(220, 38, 38, 0.12)"
                    : isCompleted
                    ? "rgba(22, 163, 74, 0.10)"
                    : "var(--color-surface-raised)",
                  border: isActive
                    ? "1.5px solid var(--color-brand)"
                    : isCompleted
                    ? "1px solid rgba(22, 163, 74, 0.3)"
                    : "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: isActive
                        ? "var(--color-brand)"
                        : isCompleted
                        ? "var(--color-success)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {isCompleted ? "Completada" : isActive ? "Fase Activa" : `Semanas -${phase.weeksRemainingRange[0]}`}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isActive
                        ? "var(--color-brand)"
                        : isCompleted
                        ? "var(--color-success)"
                        : "rgba(255, 255, 255, 0.2)",
                    }}
                  />
                </div>
                <div className="mt-1">
                  <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {phase.shortName}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                    {phase.dateRangeLabel.split(" ")[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Descripción de la fase actual */}
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
          <span className="font-semibold text-white">{currentPhase.name}:</span>{" "}
          {currentPhase.description}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex-wrap">
            <span>Volumen objetivo: <strong className="text-zinc-200">{currentPhase.targetVolumeKm}</strong></span>
            <span>•</span>
            <span>Tirada larga: <strong className="text-zinc-200">{currentPhase.targetLongRunKm}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Estimación de Marca & Ritmo Medio Objetivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tarjeta 1: Tiempo Proyectado */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>Tiempo Proyectado</span>
            <Clock size={15} className="text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {projection.projectedTimeFormatted}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Rango: {projection.projectedRangeFormatted.split(" ")[0]}
          </div>
        </div>

        {/* Tarjeta 2: Ritmo Medio Proyectado */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>Ritmo Medio Objetivo</span>
            <Flame size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {projection.projectedPaceFormatted}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Objetivo plan: <strong className="text-zinc-200">{projection.targetGoalPace}</strong>
          </div>
        </div>

        {/* Tarjeta 3: VAM & Datos Suunto */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <span>VAM & Ritmos Suunto</span>
            <Activity size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
            {projection.vamPace}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Umbral: {projection.recentThresholdPace}
          </div>
        </div>
      </div>

      {/* 4. Barra de Progreso de Preparación hacia el Maratón */}
      <div className="space-y-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-red-500" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Índice de Preparación hacia el Objetivo
            </span>
          </div>
          <span className="text-lg font-extrabold font-mono tabular-nums text-red-500">
            {projection.preparationScorePct}%
          </span>
        </div>

        {/* Barra de progreso global */}
        <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${projection.preparationScorePct}%`,
              background: "linear-gradient(90deg, #b91c1c 0%, #dc2626 70%, #ef4444 100%)",
            }}
          />
        </div>

        {/* Desglose de los 4 factores fisiológicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          {projection.breakdown.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-zinc-200 truncate">{item.label}</div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {item.currentValue}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-mono font-bold text-zinc-200">
                  {item.score}%
                </span>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Peso {item.weightPct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Criterio Permanente del Equipo Técnico Multidisciplinar */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <HeartHandshake size={15} className="text-red-500" />
            <span>Pautas del Equipo Multidisciplinar (Fase Activa)</span>
          </div>
          <span className="badge badge-brand text-[10px]">
            Protocolo Élite
          </span>
        </div>

        {/* Pestañas de Especialistas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("preparador")}
            className="py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
            style={{
              background: activeTab === "preparador" ? "var(--color-brand)" : "var(--color-surface-raised)",
              color: activeTab === "preparador" ? "#ffffff" : "var(--color-text-muted)",
              border: activeTab === "preparador" ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <Activity size={14} />
            <span>Preparador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fisio")}
            className="py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
            style={{
              background: activeTab === "fisio" ? "var(--color-brand)" : "var(--color-surface-raised)",
              color: activeTab === "fisio" ? "#ffffff" : "var(--color-text-muted)",
              border: activeTab === "fisio" ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <Stethoscope size={14} />
            <span>Fisioterapeuta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("nutri")}
            className="py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
            style={{
              background: activeTab === "nutri" ? "var(--color-brand)" : "var(--color-surface-raised)",
              color: activeTab === "nutri" ? "#ffffff" : "var(--color-text-muted)",
              border: activeTab === "nutri" ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <UtensilsCrossed size={14} />
            <span>Nutricionista</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("psico")}
            className="py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
            style={{
              background: activeTab === "psico" ? "var(--color-brand)" : "var(--color-surface-raised)",
              color: activeTab === "psico" ? "#ffffff" : "var(--color-text-muted)",
              border: activeTab === "psico" ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <Brain size={14} />
            <span>Psicólogo</span>
          </button>
        </div>

        {/* Panel de contenido del especialista activo */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs leading-relaxed space-y-2">
          {activeTab === "preparador" && (
            <div>
              <div className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                <Activity size={15} className="text-red-500" />
                <span>Preparador Físico de Élite — Periodización y Ritmos</span>
              </div>
              <p className="text-zinc-300">{currentPhase.specialistFocus.preparador}</p>
              <div className="mt-2 text-[11px] text-zinc-400">
                Punto clave: La distancia marcada en las sesiones de running es siempre el kilometraje principal íntegro (calentamiento y vuelta a la calma no se descuentan).
              </div>
            </div>
          )}

          {activeTab === "fisio" && (
            <div>
              <div className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                <Stethoscope size={15} className="text-emerald-500" />
                <span>Fisioterapeuta Deportivo — Integridad Estructural y Suunto</span>
              </div>
              <p className="text-zinc-300">{currentPhase.specialistFocus.fisioterapeuta}</p>
              <div className="mt-2 text-[11px] text-zinc-400">
                Regla de Oro: Si tras sincronizar con el Suunto reportas molestias, fatiga severa o pesadez, se prescribe descarga inmediata o sustitución sin impacto.
              </div>
            </div>
          )}

          {activeTab === "nutri" && (
            <div>
              <div className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                <UtensilsCrossed size={15} className="text-amber-500" />
                <span>Nutricionista Deportivo — Energía y Alergia Vital</span>
              </div>
              <p className="text-zinc-300">{currentPhase.specialistFocus.nutricionista}</p>
              <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-[11px] flex items-center gap-2">
                <ShieldAlert size={14} className="flex-shrink-0 text-red-400" />
                <span>
                  <strong>Alergia Severa Vital:</strong> CERO frutos secos de cáscara (nueces, almendras, avellanas). Usar exclusivamente semillas seguras (calabaza, girasol, chía, lino, sésamo/tahini puro).
                </span>
              </div>
            </div>
          )}

          {activeTab === "psico" && (
            <div>
              <div className="font-bold text-white flex items-center gap-1.5 mb-1 text-sm">
                <Brain size={15} className="text-purple-400" />
                <span>Psicólogo Deportivo — Foco Competitivo y Adherencia</span>
              </div>
              <p className="text-zinc-300">{currentPhase.specialistFocus.psicologo}</p>
              <div className="mt-2 text-[11px] text-zinc-400">
                Mentalidad: Cero culpa por adaptar un entrenamiento si el cuerpo pide asimilación. La consistencia a largo plazo bate la intensidad aislada.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
