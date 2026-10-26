"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  Activity,
  BedDouble,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Footprints,
  Dumbbell,
  Waves,
  Info,
  Zap,
  Flag,
} from "lucide-react";
import type { WeeklyCoachAssessment } from "@/lib/coach-assessment";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const DISCIPLINE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  carrera: Footprints,
  gimnasio: Dumbbell,
  natacion: Waves,
  crossfit: Flame,
  otro: Activity,
  descanso: BedDouble,
};

export function CoachSummaryCard({ assessment }: { assessment: WeeklyCoachAssessment }) {
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);
  const [showAcwrModal, setShowAcwrModal] = useState(false);

  const { loadAnalysis, readinessToday, sessionsProgress, peakSession, coachVerdict } = assessment;

  return (
    <div
      className="surface p-4 sm:p-5 mb-4 animate-in w-full overflow-hidden"
    >
      {/* 1. Header con Badge de Entrenador Personal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/30"
          >
            <Sparkles size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Informe del Entrenador
              </span>
              {assessment.isCurrentWeek && (
                <span className="badge badge-brand text-[10px] px-1.5 py-0.5">
                  En curso
                </span>
              )}
            </div>
            <h2 className="truncate text-base font-bold text-foreground mt-0.5 tracking-tight">
              {coachVerdict.title}
            </h2>
          </div>
        </div>

        {/* Readiness Pill */}
        <div
          className="flex items-center gap-1.5 self-start sm:self-auto surface-raised px-2.5 py-1 rounded-full border border-border"
        >
          <Zap size={13} className="text-emerald-400" />
          <span className="text-xs text-muted">Readiness:</span>
          <span className="font-bold text-xs font-mono tabular-nums text-emerald-400">
            {readinessToday.score}/100
          </span>
        </div>
      </div>

      {/* 2. Narrativa del Entrenador */}
      <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
        {coachVerdict.narrative}
      </p>

      {/* 3. Métricas clave en una cuadrícula limpia y minimalista */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
        {/* Métrica 1: Pico de Carga */}
        <div className="surface-raised p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              Pico de Carga
            </span>
            {peakSession && (
              <span className="badge text-xs font-mono tabular-nums bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {peakSession.load} pts
              </span>
            )}
          </div>
          {peakSession ? (
            <div>
              <div className="font-semibold text-sm text-foreground">
                {peakSession.dayName} · {peakSession.discipline.toUpperCase()}{" "}
                {peakSession.plannedCode ? `(${peakSession.plannedCode})` : ""}
              </div>
              <div className="text-xs text-muted mt-0.5 font-mono tabular-nums">
                {peakSession.durationMin} min @ RPE {peakSession.rpe}/10
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">Sin sesiones completadas aún</div>
          )}
        </div>

        {/* Métrica 2: Carga Semanal y ACWR */}
        <div className="surface-raised p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              Carga Semanal
            </span>
            <span className="badge badge-brand text-xs font-mono tabular-nums">
              {loadAnalysis.currentWeekLoad} pts
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-foreground font-mono tabular-nums">
                ACWR {loadAnalysis.acwr !== null ? loadAnalysis.acwr.toFixed(2) : "—"}
              </span>
              {loadAnalysis.acwr !== null && (
                <button
                  type="button"
                  onClick={() => setShowAcwrModal(true)}
                  className="badge text-[11px] font-semibold"
                  style={{
                    backgroundColor:
                      loadAnalysis.acwrStatus === "optimo"
                        ? "rgba(16, 185, 129, 0.15)"
                        : loadAnalysis.acwrStatus === "sobrecarga_alta"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                    color:
                      loadAnalysis.acwrStatus === "optimo"
                        ? "#10b981"
                        : loadAnalysis.acwrStatus === "sobrecarga_alta"
                        ? "#ef4444"
                        : "#f59e0b",
                    border: `1px solid ${
                      loadAnalysis.acwrStatus === "optimo"
                        ? "rgba(16, 185, 129, 0.3)"
                        : loadAnalysis.acwrStatus === "sobrecarga_alta"
                        ? "rgba(239, 68, 68, 0.3)"
                        : "rgba(245, 158, 11, 0.3)"
                    }`,
                    cursor: "pointer",
                  }}
                  title="Ver explicación del ACWR"
                >
                  {loadAnalysis.acwrBadge}
                </button>
              )}
            </div>
            <div className="text-xs text-muted mt-0.5">
              Zona óptima: 0.8 a 1.3
            </div>
          </div>
        </div>

        {/* Métrica 3: Cumplimiento de Sesiones */}
        <div className="surface-raised p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-400" />
              Cumplimiento
            </span>
            <span
              className="badge text-xs font-mono tabular-nums"
              style={{
                backgroundColor:
                  (sessionsProgress.compliancePct ?? 0) >= 80
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                color:
                  (sessionsProgress.compliancePct ?? 0) >= 80 ? "#10b981" : "#f59e0b",
                border: `1px solid ${(sessionsProgress.compliancePct ?? 0) >= 80 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              }}
            >
              {sessionsProgress.compliancePct !== null ? `${sessionsProgress.compliancePct}%` : "—"}
            </span>
          </div>
          <div>
            <div className="font-bold text-sm text-foreground font-mono tabular-nums">
              {sessionsProgress.completedCount} de {sessionsProgress.plannedCount} sesiones
            </div>
            <div className="text-xs text-muted mt-0.5">
              {sessionsProgress.pendingCount > 0
                ? `${sessionsProgress.pendingCount} pendiente${sessionsProgress.pendingCount > 1 ? "s" : ""}`
                : "Semana al día"}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Pautas Clave y Estrategia */}
      <div className="surface-raised p-4 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider text-emerald-400 mb-2">
          Pautas clave para tu semana:
        </div>
        <ul className="text-sm grid gap-1.5 pl-4 m-0 text-foreground">
          {coachVerdict.actionablePoints.map((point, i) => (
            <li key={i} className="leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
        {coachVerdict.weekendStrategy && (
          <div className="text-xs text-muted mt-2.5 pt-2.5 border-t border-border">
            <Flag size={12} className="inline mr-1 text-emerald-400" /> <strong className="text-foreground">Fin de semana:</strong> {coachVerdict.weekendStrategy}
          </div>
        )}
      </div>

      {/* 5. Acciones: Desglose y Chat con Entrenador */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowDailyBreakdown((prev) => !prev)}
          className="btn btn-ghost"
          style={{ fontSize: "var(--text-xs)", height: 38, minHeight: 38, padding: "0 0.75rem" }}
        >
          {showDailyBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showDailyBreakdown ? "Ocultar seguimiento día a día" : `Ver detalle semanal (${sessionsProgress.overviewText})`}</span>
        </button>

        <Link
          href="/entrenador"
          className="btn btn-primary"
          style={{ fontSize: "var(--text-xs)", height: 38, minHeight: 38, padding: "0 0.85rem" }}
        >
          <Sparkles size={14} />
          <span>Preguntar al Entrenador</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Desglose día a día */}
      {showDailyBreakdown && (
        <div
          className="grid gap-2 animate-in"
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {sessionsProgress.days.map((s) => {
            const Icon = DISCIPLINE_ICONS[s.discipline] ?? Activity;
            const isCompleted = s.status === "realizada" || s.status === "parcial";
            const isToday = s.date === assessment.today;

            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 text-sm"
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: isToday ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
                  border: isToday ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isCompleted ? "var(--color-success-bg)" : "var(--color-surface)",
                      color: isCompleted ? "var(--color-success)" : "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{s.dayName}</span>
                      <span className="text-xs text-muted">· {s.discipline}</span>
                      {s.plannedCode && <span className="text-xs text-faint">({s.plannedCode})</span>}
                      {s.isPeak && (
                        <span className="badge text-xs flex items-center gap-1" style={{ background: "rgba(249, 115, 22, 0.12)", color: "var(--color-accent)" }}>
                          <Zap size={10} />
                          <span>Pico</span>
                        </span>
                      )}
                      {isToday && <span className="badge badge-brand text-xs">Hoy</span>}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {s.coachComment}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`badge text-xs ${
                      isCompleted ? "badge-success" : s.status === "no_realizada" ? "badge-danger" : "badge-neutral"
                    }`}
                  >
                    {isCompleted ? "Completada" : s.status === "no_realizada" ? "No realizada" : "Pendiente"}
                  </span>
                  {s.load !== null && (
                    <div className="text-xs text-faint tabular-nums" style={{ marginTop: 2 }}>
                      {s.load} pts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal explicativo de Alerta ACWR */}
      {showAcwrModal && (
        <Modal title="Diagnóstico del Ratio ACWR (Carga Aguda vs Crónica)" onClose={() => setShowAcwrModal(false)}>
          <div className="grid gap-3 text-sm" style={{ padding: "var(--space-3) 0", lineHeight: 1.55 }}>
            <div
              style={{
                background: "var(--color-surface-raised)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="text-xs font-semibold text-muted" style={{ marginBottom: 4 }}>
                ESTADO ACTUAL
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">
                  Ratio: {loadAnalysis.acwr !== null ? loadAnalysis.acwr.toFixed(2) : "—"}
                </span>
                <span className="badge badge-warning">{loadAnalysis.acwrBadge}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm" style={{ marginBottom: 4 }}>
                ¿Por qué marca esta alerta?
              </h3>
              <p className="text-muted">{loadAnalysis.acwrWhyExplanation}</p>
            </div>

            <div>
              <h3 className="font-bold text-sm" style={{ marginBottom: 4 }}>
                ¿Qué significa el ACWR de Tim Gabbett?
              </h3>
              <p className="text-muted text-xs">
                El ratio de Carga Aguda vs Crónica compara el esfuerzo de los últimos 7 días con la media de las últimas
                4 semanas. La zona óptima se sitúa entre 0.80 y 1.30. A mitad de semana, es normal que marque
                temporalmente infracarga matemática si faltan las sesiones del fin de semana.
              </p>
            </div>

            <div style={{ marginTop: "var(--space-2)" }}>
              <Button variant="secondary" onClick={() => setShowAcwrModal(false)} style={{ width: "100%" }}>
                Entendido
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
