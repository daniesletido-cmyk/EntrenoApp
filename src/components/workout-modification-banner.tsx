"use client";

import { AlertTriangle, Sparkles, Zap, RotateCcw, ArrowRight, ShieldAlert, Check } from "lucide-react";
import { WorkoutModificationInfo } from "@/lib/workout-modifications";
import { Button } from "@/components/ui/button";

interface WorkoutModificationBannerProps {
  info: WorkoutModificationInfo;
  onRevert?: () => void;
  reverting?: boolean;
  compact?: boolean;
}

export function WorkoutModificationBanner({
  info,
  onRevert,
  reverting = false,
  compact = false,
}: WorkoutModificationBannerProps) {
  const isWarning = info.badgeTone === "warning" || info.type === "carga" || info.type === "sueno";
  const isBrand = info.badgeTone === "brand" || info.type === "entrenador";

  const borderColor = isWarning
    ? "rgba(245, 158, 11, 0.5)"
    : isBrand
    ? "rgba(59, 130, 246, 0.5)"
    : "rgba(16, 185, 129, 0.5)";

  const bgColor = isWarning
    ? "rgba(245, 158, 11, 0.08)"
    : isBrand
    ? "rgba(59, 130, 246, 0.08)"
    : "rgba(16, 185, 129, 0.08)";

  const iconColor = isWarning
    ? "var(--color-warning, #f59e0b)"
    : isBrand
    ? "var(--color-brand, #3b82f6)"
    : "var(--color-success, #10b981)";

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
          color: iconColor,
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
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${iconColor}`,
        boxShadow: isWarning ? "0 4px 18px rgba(245, 158, 11, 0.12)" : "0 4px 18px rgba(59, 130, 246, 0.12)",
        marginBottom: "var(--space-3)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-3">
          <div
            style={{
              padding: 7,
              borderRadius: "var(--radius-md)",
              backgroundColor: isWarning ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
              color: iconColor,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {isWarning ? <Zap size={18} /> : <Sparkles size={18} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Cabecera con Insignia */}
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: isWarning ? "rgba(245, 158, 11, 0.25)" : "rgba(59, 130, 246, 0.25)",
                  color: iconColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <AlertTriangle size={11} />
                {info.badgeLabel}
              </span>

              <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                {info.headline}
              </span>
            </div>

            {/* Motivo de la modificación */}
            <p className="text-xs text-muted" style={{ lineHeight: 1.5, marginBottom: "var(--space-2)" }}>
              {info.reason}
            </p>

            {/* Bloque comparativo: Plan Original vs Adaptado */}
            {(info.originalPlan || info.adjustedPlan || info.suggestedPace) && (
              <div
                className="flex items-center gap-2 flex-wrap text-xs"
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                {info.originalPlan && (
                  <span className="flex items-center gap-1 text-faint">
                    <span>Plan inicial:</span>
                    <strong style={{ textDecoration: "line-through", color: "var(--color-text-muted)" }}>
                      {info.originalPlan}
                    </strong>
                  </span>
                )}

                {info.originalPlan && info.adjustedPlan && (
                  <ArrowRight size={13} style={{ opacity: 0.6, color: iconColor }} />
                )}

                {info.adjustedPlan && (
                  <span className="flex items-center gap-1">
                    <span className="text-muted">Nuevo objetivo:</span>
                    <strong style={{ color: iconColor }}>{info.adjustedPlan}</strong>
                  </span>
                )}

                {info.suggestedPace && (
                  <span
                    className="badge badge-neutral"
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginLeft: "auto",
                    }}
                  >
                    {info.suggestedPace}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botón de revertir si es aplicable */}
        {info.canRevert && onRevert && (
          <Button
            variant="ghost"
            onClick={onRevert}
            loading={reverting}
            className="text-xs flex-shrink-0"
            style={{
              height: 32,
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
  );
}
