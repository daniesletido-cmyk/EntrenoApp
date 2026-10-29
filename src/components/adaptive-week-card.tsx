"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Zap,
  Activity,
  Gauge,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Waves,
  Flame,
  Footprints,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addDays, weekStartOf, todayISO } from "@/lib/dates";

interface AdaptivePlanPreview {
  evaluation: {
    currentWeekStart: string;
    nextWeekStart: string;
    completedSessionsCount: number;
    totalPlannedCount: number;
    compliancePct: number;
    realLoadFoster: number;
    plannedLoadFoster: number;
    loadDeltaPct: number;
    avgRpe: number | null;
    avgSleepHours: number | null;
    avgSleepScore: number | null;
    acwr: number | null;
    sundaySessionCompleted: boolean;
    fatigueLevel: "baja" | "moderada" | "alta" | "critica";
    strategy: "progresion" | "asimilacion" | "reenganche";
    strategyTitle: string;
    strategyBadgeTone: "success" | "warning" | "brand";
    strategyExplanation: string;
  };
  nextWeekStart: string;
  plannedDays: Array<{
    dayIndex: number;
    date: string;
    dayName: string;
    discipline: string;
    plannedCode: string;
    durationMin: number;
    distanceKm: number | null;
    estimatedRpe: number;
    estimatedLoad: number;
    targetPaceGuidance?: string | null;
    structureNotes: string;
    changeReason: string;
  }>;
  totalNextWeekLoad: number;
  totalNextWeekDistanceKm: number;
}

interface AdaptiveWeekCardProps {
  currentViewWeekStart: string;
  onPlanApplied?: () => void;
}

export function AdaptiveWeekCard({ currentViewWeekStart, onPlanApplied }: AdaptiveWeekCardProps) {
  const [data, setData] = useState<AdaptivePlanPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      // Evaluamos la semana actual vista o la anterior según corresponda
      const res = await fetch(`/api/adaptive-plan?week=${currentViewWeekStart}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error cargando previsualización adaptativa:", e);
    } finally {
      setLoading(false);
    }
  }, [currentViewWeekStart]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  async function handleApplyAdaptation() {
    if (!data) return;
    setApplying(true);
    try {
      const res = await fetch("/api/adaptive-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: data.evaluation.currentWeekStart }),
      });
      if (res.ok) {
        toast.push(
          "success",
          `¡Semana adaptada con éxito! Estrategia: ${data.evaluation.strategyTitle}`
        );
        onPlanApplied?.();
        loadPreview();
      } else {
        toast.push("error", "No se pudo aplicar la adaptación");
      }
    } catch {
      toast.push("error", "Error de red al aplicar la adaptación");
    } finally {
      setApplying(false);
    }
  }

  if (loading && !data) return null;
  if (!data) return null;

  const { evaluation, plannedDays, totalNextWeekLoad, totalNextWeekDistanceKm } = data;

  const toneBg =
    evaluation.strategyBadgeTone === "success"
      ? "var(--color-success-bg)"
      : evaluation.strategyBadgeTone === "warning"
      ? "var(--color-warning-bg)"
      : "var(--color-brand-subtle)";

  const toneColor =
    evaluation.strategyBadgeTone === "success"
      ? "var(--color-success)"
      : evaluation.strategyBadgeTone === "warning"
      ? "var(--color-warning)"
      : "var(--color-brand)";

  return (
    <div
      className="surface animate-in w-full overflow-hidden"
      style={{
        padding: "var(--space-4)",
        marginBottom: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "linear-gradient(180deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)",
      }}
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 34,
              height: 34,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">Adaptación Semanal a Largo Plazo</span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: toneBg, color: toneColor }}
              >
                {evaluation.strategyTitle}
              </span>
            </div>
            <div className="text-xs text-muted mt-0.5">
              Evalúa tu carga real para adaptar la semana siguiente al completo (CrossFit Mié/Vie, Natación y Tirada Larga VAM).
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleApplyAdaptation}
            loading={applying}
            style={{
              height: 36,
              borderRadius: "var(--radius-full)",
              padding: "0 14px",
              fontSize: "0.8rem",
            }}
          >
            <Zap size={14} />
            <span>Adaptar semana siguiente</span>
          </Button>
          <button
            className="btn btn-ghost btn-icon-sm"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Ocultar desglose" : "Ver desglose"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Métricas clave de la evaluación previa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-3 w-full min-w-0">
        <div className="surface-raised rounded-md p-2 sm:p-2.5 min-w-0 overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
            <Activity size={12} className="flex-shrink-0" /> <span className="truncate">Carga Foster</span>
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">
            {evaluation.realLoadFoster} UA{" "}
            <span className="text-[10px] font-normal text-muted">
              ({evaluation.loadDeltaPct >= 0 ? `+${evaluation.loadDeltaPct}%` : `${evaluation.loadDeltaPct}%`})
            </span>
          </div>
        </div>

        <div className="surface-raised rounded-md p-2 sm:p-2.5 min-w-0 overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
            <CheckCircle2 size={12} className="flex-shrink-0" /> <span className="truncate">Cumplimiento</span>
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">
            {evaluation.compliancePct}%{" "}
            <span className="text-[10px] font-normal text-muted">
              ({evaluation.completedSessionsCount}/{evaluation.totalPlannedCount})
            </span>
          </div>
        </div>

        <div className="surface-raised rounded-md p-2 sm:p-2.5 min-w-0 overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
            <Gauge size={12} className="flex-shrink-0" /> <span className="truncate">Ratio ACWR</span>
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">
            {evaluation.acwr ?? "N/A"}{" "}
            <span className="text-[10px] font-normal text-muted capitalize">
              · Fatiga {evaluation.fatigueLevel}
            </span>
          </div>
        </div>

        <div className="surface-raised rounded-md p-2 sm:p-2.5 min-w-0 overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
            <Calendar size={12} className="flex-shrink-0" /> <span className="truncate">Próxima semana</span>
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">
            {totalNextWeekLoad} UA{" "}
            <span className="text-[10px] font-normal text-muted">
              ({totalNextWeekDistanceKm} km run)
            </span>
          </div>
        </div>
      </div>

      {/* Diagnóstico explicativo */}
      <div
        className="mt-3 p-2.5 rounded-md text-xs leading-relaxed"
        style={{
          backgroundColor: toneBg,
          color: "var(--color-text)",
          borderLeft: `3px solid ${toneColor}`,
        }}
      >
        <span className="font-semibold" style={{ color: toneColor }}>
          Criterio de adaptación:{" "}
        </span>
        {evaluation.strategyExplanation}
      </div>

      {/* Desglose ampliable día a día */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/40 animate-in">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
            <span>Propuesta adaptada para la semana del {data.nextWeekStart}</span>
            <span>Total: {plannedDays.length} días estructurados</span>
          </div>

          <div className="grid gap-2">
            {plannedDays.map((d) => (
              <div
                key={d.date}
                className="surface-raised rounded-md p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs min-w-0 w-full overflow-hidden"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
                  <span className="font-bold text-[11px] w-14 sm:w-18 text-muted flex-shrink-0">{d.dayName}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                    style={{
                      backgroundColor:
                        d.discipline === "carrera"
                          ? "var(--color-success-bg)"
                          : d.discipline === "crossfit"
                          ? "var(--color-warning-bg)"
                          : d.discipline === "natacion"
                          ? "var(--color-info-bg)"
                          : "var(--color-surface)",
                      color:
                        d.discipline === "carrera"
                          ? "var(--color-success)"
                          : d.discipline === "crossfit"
                          ? "var(--color-warning)"
                          : d.discipline === "natacion"
                          ? "var(--color-info)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {d.discipline}
                  </span>
                  <span className="font-medium break-words leading-tight" style={{ overflowWrap: "anywhere" }}>{d.plannedCode}</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-muted text-[11px] flex-shrink-0 self-end sm:self-auto">
                  {d.distanceKm && <span>{d.distanceKm} km</span>}
                  {d.durationMin > 0 && <span>{d.durationMin} min</span>}
                  {d.estimatedLoad > 0 && <span className="font-semibold text-text">{d.estimatedLoad} UA</span>}
                  <span className="text-[10px] italic hidden md:inline truncate max-w-xs">{d.changeReason}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-muted text-center mt-2.5">
            💡 Nota: La app también ejecuta esta adaptación automáticamente cada domingo al registrar tu último entreno.
          </div>
        </div>
      )}
    </div>
  );
}
