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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bloque 1: Plan Programado */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(0, 0, 0, 0.28)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted font-bold tracking-wider uppercase">
              <Calendar size={13} className="text-muted" />
              <span>ESTE ES EL PLAN PROGRAMADO</span>
            </div>
            <div
              className="font-semibold text-sm"
              style={{
                color: "var(--color-text)",
                textDecoration: isApplied ? "line-through" : "none",
                opacity: isApplied ? 0.75 : 1,
              }}
            >
              {info.originalPlan || "Sesión inicial planificada"}
            </div>
            <div className="text-[11px] text-faint">
              Sesión que tenías fijada inicialmente en tu calendario.
            </div>
          </div>

          {/* Bloque 2: Plan a Realizar para Adaptar la Carga */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1.5px solid rgba(16, 185, 129, 0.45)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-extrabold tracking-wider uppercase">
              <Zap size={13} className="text-emerald-400" />
              <span>ESTE ES EL QUE TIENES QUE HACER PARA ADAPTAR LA CARGA</span>
            </div>
            <div className="font-bold text-sm text-emerald-300">
              {info.adjustedPlan || "Descanso activo / regenerativo"}
            </div>
            {info.suggestedPace && (
              <div className="text-[11px] text-emerald-400 font-medium">
                Ritmo/Zona: {info.suggestedPace}
              </div>
            )}
            <div className="text-[11px] text-emerald-300/80">
              {isApplied
                ? "Entrenamiento activo ajustado a tu estado de fatiga y descanso actual."
                : "Ajuste aconsejado para evitar sobreentrenamiento y asimilar la carga."}
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
