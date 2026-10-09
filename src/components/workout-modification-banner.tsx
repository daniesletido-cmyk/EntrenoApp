"use client";

import { AlertTriangle, Sparkles, Zap, RotateCcw, Calendar, Check, Info } from "lucide-react";
import { WorkoutModificationInfo } from "@/lib/workout-modifications";
import { Button } from "@/components/ui/button";

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

  const isWarning = info.badgeTone === "warning" || info.type === "carga" || info.type === "sueno";

  const borderColor = isApplied
    ? isWarning
      ? "rgba(245, 158, 11, 0.45)"
      : "rgba(16, 185, 129, 0.45)"
    : "rgba(59, 130, 246, 0.55)";

  const bgColor = isApplied
    ? isWarning
      ? "rgba(245, 158, 11, 0.08)"
      : "rgba(16, 185, 129, 0.08)"
    : "rgba(59, 130, 246, 0.09)";

  const accentColor = isApplied
    ? isWarning
      ? "var(--color-warning, #f59e0b)"
      : "var(--color-success, #10b981)"
    : "var(--color-brand, #38bdf8)";

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 animate-in"
        style={{
          display: "inline-flex",
          padding: "3px 8px",
          borderRadius: "var(--radius-full)",
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: accentColor,
          fontSize: "0.72rem",
          fontWeight: 700,
        }}
        title={`${info.headline}: ${info.reason}`}
      >
        <Zap size={12} />
        <span>{info.badgeLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="surface animate-in"
      style={{
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        backgroundColor: bgColor,
        border: `1.5px solid ${borderColor}`,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.12)",
        marginBottom: "var(--space-3)",
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Cabecera superior: Estado de la adaptación y acciones */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "3px 9px",
                borderRadius: 999,
                backgroundColor: isApplied ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)",
                color: isApplied ? "var(--color-success, #10b981)" : "var(--color-brand, #38bdf8)",
                border: `1px solid ${borderColor}`,
              }}
            >
              <Zap size={12} />
              {isApplied ? "Adaptación de Carga Aplicada" : "Propuesta de Adaptación de Carga"}
            </span>

            <span className="font-bold text-sm text-foreground">
              {info.headline}
            </span>
          </div>

          {/* Botones de acción (Aplicar o Revertir) */}
          <div className="flex items-center gap-2">
            {isPending && onApply && (
              <Button
                variant="primary"
                onClick={onApply}
                loading={applying}
                className="text-xs flex-shrink-0"
                style={{ height: 30, padding: "0 10px" }}
                title="Aplicar esta adaptación de carga al plan"
              >
                <Check size={13} />
                <span>Aplicar adaptación</span>
              </Button>
            )}
            {info.canRevert && onRevert && (
              <Button
                variant="ghost"
                onClick={onRevert}
                loading={reverting}
                className="text-xs flex-shrink-0"
                style={{
                  height: 30,
                  padding: "0 10px",
                  color: "var(--color-text-muted)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
                title="Revertir y volver a la planificación original"
              >
                <RotateCcw size={12} />
                <span>Revertir al plan original</span>
              </Button>
            )}
          </div>
        </div>

        {/* COMPARATIVA CLARA Y DIRECTA SOLICITADA POR EL USUARIO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Bloque 1: Plan Programado Completo */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              border: "1.5px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-extrabold tracking-wider uppercase">
                <Calendar size={14} className="text-slate-400" />
                <span>📋 ESTE ES EL PLAN PROGRAMADO</span>
              </div>
              <span className="text-[10px] text-muted uppercase font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10">
                Original Fijado
              </span>
            </div>

            <div>
              <div
                className="font-bold text-base"
                style={{
                  color: "var(--color-text)",
                  textDecoration: isApplied ? "line-through" : "none",
                  opacity: isApplied ? 0.75 : 1,
                }}
              >
                {info.originalPlan || "Sesión inicial planificada"}
              </div>

              {/* Métricas del plan programado */}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                {info.originalWorkout?.distanceKm && (
                  <span className="font-semibold text-slate-300">{info.originalWorkout.distanceKm} km</span>
                )}
                {info.originalWorkout?.durationMin && (
                  <span>· {info.originalWorkout.durationMin} min</span>
                )}
                {info.originalWorkout?.rpe && (
                  <span>· RPE {info.originalWorkout.rpe}</span>
                )}
                {info.originalWorkout?.paceGuidance && (
                  <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">
                    🎯 Ritmo: {info.originalWorkout.paceGuidance}
                  </span>
                )}
              </div>
            </div>

            {/* Estructura detallada del entreno programado */}
            <div
              className="mt-1 p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap font-sans"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.35)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "var(--color-text-muted)",
              }}
            >
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
                Estructura completa que estaba programada:
              </div>
              {info.originalWorkout?.structure || "Estructura estándar de la sesión en el calendario."}
            </div>
          </div>

          {/* Bloque 2: Plan Adaptado Completo a Realizar Hoy */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: isWarning ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
              border: `2px solid ${isWarning ? "rgba(245, 158, 11, 0.65)" : "rgba(16, 185, 129, 0.65)"}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div
                className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase"
                style={{ color: isWarning ? "#fbbf24" : "#34d399" }}
              >
                <Zap size={14} />
                <span>⚡ ESTE ES EL QUE TIENES QUE HACER PARA ADAPTAR LA CARGA</span>
              </div>
              <span
                className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: isWarning ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)",
                  color: isWarning ? "#fde68a" : "#a7f3d0",
                  border: `1px solid ${isWarning ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                }}
              >
                Activo Hoy
              </span>
            </div>

            <div>
              <div
                className="font-extrabold text-base"
                style={{ color: isWarning ? "#fde68a" : "#a7f3d0" }}
              >
                {info.adjustedPlan || "Descanso activo / regenerativo"}
              </div>

              {/* Pauta / Ritmo aconsejado destacado */}
              {info.suggestedPace && (
                <div
                  className="mt-1.5 text-xs font-semibold px-2.5 py-1 rounded inline-block"
                  style={{
                    backgroundColor: isWarning ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    color: isWarning ? "#fef3c7" : "#ecfdf5",
                    border: `1px solid ${isWarning ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)"}`,
                  }}
                >
                  Pauta / Ritmo: <strong>{info.suggestedPace}</strong>
                </div>
              )}
            </div>

            {/* Estructura detallada del entreno adaptado */}
            <div
              className="mt-1 p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap font-sans"
              style={{
                backgroundColor: isWarning ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
                borderColor: isWarning ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)",
                color: isWarning ? "#fef3c7" : "#ecfdf5",
              }}
            >
              <div
                className="text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
                style={{ color: isWarning ? "#fbbf24" : "#34d399" }}
              >
                Estructura completa adaptada a realizar hoy:
              </div>
              {info.adjustedWorkout?.structure || info.reason}
            </div>
          </div>
        </div>

        {/* Motivo de la adaptación */}
        <div className="text-xs text-muted flex items-start gap-1.5" style={{ lineHeight: 1.5 }}>
          <Info size={14} className="text-muted shrink-0 mt-0.5" />
          <span>
            <strong>Motivo del ajuste:</strong> {info.reason}
          </span>
        </div>
      </div>
    </div>
  );
}
