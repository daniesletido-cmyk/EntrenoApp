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
      className="surface animate-in w-full overflow-hidden"
      style={{
        padding: "var(--space-3) var(--space-4)",
        marginBottom: "var(--space-4)",
      }}
    >
      {/* 1. Header con Badge de Entrenador Personal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5" style={{ marginBottom: "var(--space-3)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-brand-subtle)",
              color: "var(--color-brand)",
              flexShrink: 0,
            }}
          >
            <Sparkles size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-brand)",
                }}
              >
                Informe del Entrenador
              </span>
              {assessment.isCurrentWeek && (
                <span className="badge badge-brand" style={{ fontSize: "0.62rem", padding: "1px 5px" }}>
                  En curso
                </span>
              )}
            </div>
            <h2 className="truncate" style={{ fontSize: "var(--text-base)", fontWeight: 700, marginTop: 1, letterSpacing: "-0.015em" }}>
              {coachVerdict.title}
            </h2>
          </div>
        </div>

        {/* Readiness Pill */}
        <div
          className="flex items-center gap-1.5 self-start sm:self-auto"
          style={{
            background: "var(--color-surface-raised)",
            padding: "0.25rem 0.65rem",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Zap size={13} style={{ color: readinessToday.tone === "success" ? "var(--color-success)" : "var(--color-brand)" }} />
          <span className="text-xs text-muted">Readiness:</span>
          <span
            className="font-bold text-xs tabular-nums"
            style={{
              color:
                readinessToday.tone === "success"
                  ? "var(--color-success)"
                  : readinessToday.tone === "warning"
                  ? "var(--color-warning)"
                  : "var(--color-brand)",
            }}
          >
            {readinessToday.score}/100
          </span>
        </div>
      </div>

      {/* 2. Narrativa del Entrenador */}
      <p className="text-xs sm:text-sm text-muted" style={{ lineHeight: 1.55, marginBottom: "var(--space-3)" }}>
        {coachVerdict.narrative}
      </p>

      {/* 3. Métricas clave en una cuadrícula limpia y minimalista */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
        style={{
          marginBottom: "var(--space-3)",
        }}
      >
        {/* Métrica 1: Pico de Carga */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
            <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Flame size={14} style={{ color: "var(--color-accent)" }} />
              Pico de Carga
            </span>
            {peakSession && (
              <span className="badge text-xs" style={{ background: "rgba(249, 115, 22, 0.12)", color: "var(--color-accent)" }}>
                {peakSession.load} pts
              </span>
            )}
          </div>
          {peakSession ? (
            <div>
              <div className="font-semibold text-sm">
                {peakSession.dayName} · {peakSession.discipline.toUpperCase()}{" "}
                {peakSession.plannedCode ? `(${peakSession.plannedCode})` : ""}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                {peakSession.durationMin} min @ RPE {peakSession.rpe}/10
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">Sin sesiones completadas aún</div>
          )}
        </div>

        {/* Métrica 2: Carga Semanal y ACWR */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
            <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Activity size={14} style={{ color: "var(--color-brand)" }} />
              Carga Semanal
            </span>
            <span className="badge badge-brand text-xs">
              {loadAnalysis.currentWeekLoad} pts
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">
                {loadAnalysis.totalMinutes} min · {loadAnalysis.totalKm} km
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                {sessionsProgress.completedCount} de {sessionsProgress.plannedCount} sesiones
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowAcwrModal(true)}
                className="badge badge-neutral text-xs"
                style={{ cursor: "pointer" }}
                title="Ver diagnóstico ACWR"
              >
                <span>ACWR: {loadAnalysis.acwr !== null ? loadAnalysis.acwr.toFixed(2) : "—"}</span>
                <Info size={11} style={{ marginLeft: 3 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Métrica 3: Descanso y Sueño */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
            <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <BedDouble size={14} style={{ color: "var(--color-info)" }} />
              Descanso Anoche
            </span>
            <span className="badge badge-info text-xs">
              {readinessToday.sleepLastNightText.replace(" de sueño", "").replace(" de sueño anoche", "").replace(" dormidas anoche", "") || "7.8h"}
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm">
              {readinessToday.headline}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
              Puntuación de preparación {readinessToday.score} / 100
            </div>
          </div>
        </div>
      </div>

      {/* 4. Pautas Clave y Estrategia */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div className="font-semibold text-xs uppercase" style={{ color: "var(--color-brand)", letterSpacing: "0.04em", marginBottom: 6 }}>
          Pautas clave para tu semana:
        </div>
        <ul className="text-sm grid gap-1.5" style={{ paddingLeft: "1.2rem", margin: 0, color: "var(--color-text)" }}>
          {coachVerdict.actionablePoints.map((point, i) => (
            <li key={i} style={{ lineHeight: 1.5 }}>
              {point}
            </li>
          ))}
        </ul>
        {coachVerdict.weekendStrategy && (
          <div
            className="text-xs text-muted"
            style={{
              marginTop: "var(--space-2)",
              paddingTop: "var(--space-2)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            🏁 <strong style={{ color: "var(--color-text)" }}>Fin de semana:</strong> {coachVerdict.weekendStrategy}
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
                        <span className="badge text-xs" style={{ background: "rgba(249, 115, 22, 0.12)", color: "var(--color-accent)" }}>
                          ⚡ Pico
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
