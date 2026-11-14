"use client";

import { Check, RotateCcw, Calendar, Zap, Info } from "lucide-react";
import { WorkoutModificationInfo, cleanPhasesText } from "@/lib/workout-modifications";

interface WorkoutModificationBannerProps {
  info: WorkoutModificationInfo;
  onRevert?: () => void;
  onApply?: () => void;
  reverting?: boolean;
  applying?: boolean;
  compact?: boolean;
}

export function WorkoutModificationBanner({
  info,
  onRevert,
  onApply,
  reverting = false,
  applying = false,
  compact = false,
}: WorkoutModificationBannerProps) {
  const isApplied = info.isModified;
  const isPending = !!info.isPendingProposal;
  const isOptimal = !!info.isOptimal;

  // 1. MODO COMPACTO (Para calendarios y listas reducidas)
  if (compact) {
    if (isOptimal) {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          title={`${info.headline}: ${info.reason}`}
        >
          <Check size={12} className="text-emerald-600" />
          <span>{info.badgeLabel}</span>
        </div>
      );
    }
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          isApplied
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
        title={`${info.headline}: ${info.reason}`}
      >
        <Zap size={12} className={isApplied ? "text-emerald-600" : "text-red-600"} />
        <span>{info.badgeLabel}</span>
      </div>
    );
  }

  // 2. BANNER DISCRETO DE ESTADO ÓPTIMO (LUZ VERDE)
  if (isOptimal) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-sm animate-in flex items-center justify-between gap-3 text-emerald-950">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 text-emerald-700">
            <Check size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                Luz Verde
              </span>
              <p className="text-xs sm:text-sm font-bold text-zinc-900">
                Estado óptimo (Luz Verde): Mantén el plan original programado
              </p>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-600 mt-0.5 truncate">
              Tu recuperación y biomarcadores son óptimos. Afronta la sesión planificada sin reducciones.
            </p>
          </div>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap hidden sm:inline-block">
          100% Planificado
        </span>
      </div>
    );
  }

  // 3. COMPARATIVA COMPLETA: PLAN ORIGINAL VS. SESIÓN ADAPTADA
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-5 shadow-sm mb-4 animate-in space-y-4">
      {/* Cabecera limpia y legible */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border ${
              isApplied
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {isApplied ? <Check size={13} className="text-emerald-600" /> : <Zap size={13} className="text-red-600" />}
            {isApplied ? "Adaptación de Carga Aplicada" : "Propuesta de Adaptación de Carga"}
          </span>

          <span className="font-bold text-sm sm:text-base text-zinc-900 truncate">
            {info.headline}
          </span>
        </div>

        {/* Acciones directas: Aplicar o Revertir */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPending && onApply && (
            <button
              onClick={onApply}
              disabled={applying}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 cursor-pointer"
              title="Aplicar esta adaptación de carga al plan"
            >
              <Check size={14} />
              <span>{applying ? "Aplicando..." : "Aplicar adaptación"}</span>
            </button>
          )}

          {info.canRevert && onRevert && (
            <button
              onClick={onRevert}
              disabled={reverting}
              className="bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 cursor-pointer"
              title="Revertir y volver a la planificación original"
            >
              <RotateCcw size={13} />
              <span>{reverting ? "Revirtiendo..." : "Revertir al plan original"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comparativa: 1 columna en móvil (<768px) y 2 columnas en tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {/* Tarjeta Izquierda: Plan Programado Original */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold tracking-wider uppercase">
              <Calendar size={14} className="text-zinc-500 shrink-0" />
              <span>📋 PLAN PROGRAMADO ORIGINAL</span>
            </div>
            <span className="text-[10px] text-zinc-600 uppercase font-bold px-2 py-0.5 rounded bg-zinc-200/60 border border-zinc-300/70">
              Original Fijado
            </span>
          </div>

          <div>
            <div
              className={`font-bold text-base text-zinc-900 ${
                isApplied ? "line-through opacity-70" : ""
              }`}
            >
              {info.originalPlan || "Sesión inicial planificada"}
            </div>

            {/* Métricas del plan programado */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-600 flex-wrap">
              {info.originalWorkout?.distanceKm && (
                <span className="font-bold text-zinc-800">{info.originalWorkout.distanceKm} km</span>
              )}
              {info.originalWorkout?.durationMin && (
                <span>· {info.originalWorkout.durationMin} min</span>
              )}
              {info.originalWorkout?.rpe && (
                <span>· RPE {info.originalWorkout.rpe}</span>
              )}
              {info.originalWorkout?.paceGuidance && (
                <span className="text-zinc-800 font-medium px-2 py-0.5 rounded bg-zinc-200/60 border border-zinc-300/60">
                  🎯 Ritmo: {info.originalWorkout.paceGuidance}
                </span>
              )}
            </div>
          </div>

          {/* Estructura detallada del entreno programado con fases exclusivamente en minutos */}
          <div className="mt-1 p-3 rounded-lg bg-white border border-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-sans text-zinc-700">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Estructura completa que estaba programada:
            </div>
            {cleanPhasesText(info.originalWorkout?.structure) || "Estructura estándar de la sesión en el calendario."}
          </div>
        </div>

        {/* Tarjeta Derecha: Sesión Adaptada Recomendada */}
        <div
          className={`bg-white border-2 rounded-xl p-4 flex flex-col gap-2.5 min-w-0 shadow-sm ${
            isApplied ? "border-emerald-500/40" : "border-red-600/30"
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div
              className={`flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase ${
                isApplied ? "text-emerald-700" : "text-red-700"
              }`}
            >
              <Zap size={14} className={isApplied ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"} />
              <span>{isApplied ? "⚡ SESIÓN ACTIVA ADAPTADA" : "⚡ SESIÓN ADAPTADA RECOMENDADA"}</span>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                isApplied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {isApplied ? "Activo en el Plan" : "Recomendado Hoy"}
            </span>
          </div>

          <div>
            <div className="font-bold text-base text-zinc-900">
              {info.adjustedPlan || "Descanso activo / regenerativo"}
            </div>

            {/* Pauta / Ritmo aconsejado destacado */}
            {info.suggestedPace && (
              <div className="mt-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 inline-block">
                Pauta / Ritmo: <strong className="font-bold text-zinc-900">{info.suggestedPace}</strong>
              </div>
            )}
          </div>

          {/* Estructura detallada del entreno adaptado con fases exclusivamente en minutos */}
          <div className="mt-1 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-sans text-zinc-700">
            <div
              className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                isApplied ? "text-emerald-700" : "text-red-700"
              }`}
            >
              Estructura completa adaptada a realizar hoy:
            </div>
            {cleanPhasesText(info.adjustedWorkout?.structure) || info.reason}
          </div>
        </div>
      </div>

      {/* Motivo de la adaptación al pie */}
      <div className="text-xs text-zinc-600 flex items-start gap-2 pt-2 border-t border-zinc-100 leading-relaxed">
        <Info size={14} className="text-zinc-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-900 font-semibold">Motivo del ajuste:</strong>{" "}
          {info.reason}
        </span>
      </div>
    </div>
  );
}
