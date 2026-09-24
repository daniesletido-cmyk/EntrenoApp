"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Activity,
  BedDouble,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Footprints,
  Dumbbell,
  Waves,
  Info,
  Calendar,
} from "lucide-react";
import type { WeeklyCoachAssessment } from "@/lib/coach-assessment";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const DISCIPLINE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

  const toneBorder =
    coachVerdict.tone === "success"
      ? "rgba(34, 197, 94, 0.35)"
      : coachVerdict.tone === "warning"
      ? "rgba(234, 179, 8, 0.35)"
      : coachVerdict.tone === "danger"
      ? "rgba(239, 68, 68, 0.35)"
      : "rgba(47, 111, 235, 0.35)";

  const toneBg =
    coachVerdict.tone === "success"
      ? "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)"
      : coachVerdict.tone === "warning"
      ? "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(234, 179, 8, 0.02) 100%)"
      : coachVerdict.tone === "danger"
      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)"
      : "linear-gradient(135deg, rgba(47, 111, 235, 0.08) 0%, rgba(47, 111, 235, 0.02) 100%)";

  return (
    <div
      className="surface animate-in"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        border: `1px solid ${toneBorder}`,
        background: toneBg,
        marginBottom: "var(--space-4)",
      }}
    >
      {/* 1. Header con Badge de Entrenador Personal */}
      <div className="flex items-start justify-between gap-3" style={{ flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-brand)",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-brand)",
                }}
              >
                Informe del Entrenador Personal
              </span>
              {assessment.isCurrentWeek && (
                <span className="badge badge-brand" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                  Semana en curso
                </span>
              )}
            </div>
            <div className="font-bold text-base" style={{ marginTop: 1 }}>
              {coachVerdict.title}
            </div>
          </div>
        </div>

        {/* Mini Pill de Readiness Hoy */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "var(--color-surface-raised)",
            padding: "0.3rem 0.75rem",
            borderRadius: 999,
            border: "1px solid var(--color-border)",
          }}
        >
          <Zap size={14} style={{ color: readinessToday.tone === "success" ? "var(--color-success)" : "var(--color-brand)" }} />
          <span className="text-xs text-muted">Estado hoy:</span>
          <span
            className="font-bold text-xs"
            style={{
              color:
                readinessToday.tone === "success"
                  ? "var(--color-success)"
                  : readinessToday.tone === "warning"
                  ? "var(--color-warning)"
                  : "var(--color-brand)",
            }}
          >
            {readinessToday.score}/100 ({readinessToday.levelLabel.split("·")[0].trim()})
          </span>
        </div>
      </div>

      {/* 2. Narrativa del Entrenador */}
      <p className="text-sm text-muted" style={{ lineHeight: 1.55, marginBottom: "var(--space-3)" }}>
        {coachVerdict.narrative}
      </p>

      {/* 3. Grid de Métricas Clave del Entrenador (Carga, Pico, Sueño y ACWR) */}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: "var(--space-3)",
        }}
      >
        {/* Card: Pico de Carga */}
        <div
          className="surface-raised"
          style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: peakSession ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid var(--color-border)",
            background: peakSession ? "rgba(249, 115, 22, 0.05)" : undefined,
          }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-muted" style={{ marginBottom: 4 }}>
            <span className="flex items-center gap-1.5" style={{ color: "var(--color-secondary)" }}>
              <Flame size={14} />
              Pico de más carga
            </span>
            {peakSession && (
              <span className="badge text-xs" style={{ background: "rgba(249, 115, 22, 0.15)", color: "var(--color-secondary)" }}>
                {peakSession.load} pts Foster
              </span>
            )}
          </div>
          {peakSession ? (
            <div>
              <div className="font-bold text-sm">
                {peakSession.dayName} · {peakSession.discipline.toUpperCase()}{" "}
                {peakSession.plannedCode ? `(${peakSession.plannedCode})` : ""}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                {peakSession.durationMin} min @ RPE {peakSession.rpe}/10 — Esfuerzo más exigente de la semana.
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted">Aún no se ha registrado ninguna sesión completada esta semana.</div>
          )}
        </div>

        {/* Card: Carga Semanal y Ratio ACWR con botón de "¿Por qué?" */}
        <div
          className="surface-raised"
          style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-muted" style={{ marginBottom: 4 }}>
            <span className="flex items-center gap-1.5" style={{ color: "var(--color-brand)" }}>
              <Activity size={14} />
              Carga y Ratio ACWR
            </span>
            <button
              onClick={() => setShowAcwrModal(true)}
              className="badge text-xs inline-flex items-center gap-1"
              style={{
                cursor: "pointer",
                background:
                  loadAnalysis.acwrStatus === "optimo"
                    ? "rgba(34, 197, 94, 0.15)"
                    : loadAnalysis.acwrStatus === "infracarga" || loadAnalysis.acwrStatus === "sobrecarga_moderada"
                    ? "rgba(234, 179, 8, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                color:
                  loadAnalysis.acwrStatus === "optimo"
                    ? "var(--color-success)"
                    : loadAnalysis.acwrStatus === "infracarga" || loadAnalysis.acwrStatus === "sobrecarga_moderada"
                    ? "var(--color-warning)"
                    : "var(--color-danger)",
              }}
              title="Haz clic para ver por qué sale este estado"
            >
              <span>{loadAnalysis.acwrBadge}</span>
              <Info size={11} />
            </button>
          </div>
          <div className="font-bold text-sm">
            {loadAnalysis.currentWeekLoad} pts Foster ({loadAnalysis.totalMinutes} min · {loadAnalysis.totalKm} km)
          </div>
          <div className="flex items-center justify-between text-xs text-muted" style={{ marginTop: 2 }}>
            <span>{loadAnalysis.acwr !== null ? `Ratio ACWR: ${loadAnalysis.acwr.toFixed(2)}` : "ACWR en cálculo"}</span>
            <button
              onClick={() => setShowAcwrModal(true)}
              className="text-xs"
              style={{ color: "var(--color-brand)", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              ¿Por qué sale alerta?
            </button>
          </div>
        </div>

        {/* Card: Sueño y Preparación Hoy */}
        <div
          className="surface-raised"
          style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-muted" style={{ marginBottom: 4 }}>
            <span className="flex items-center gap-1.5" style={{ color: "var(--color-primary)" }}>
              <BedDouble size={14} />
              Descanso y Sueño
            </span>
            <span className="badge badge-brand text-xs">
              {readinessToday.sleepLastNightText.split(" ")[0]}
            </span>
          </div>
          <div className="font-bold text-sm">
            {readinessToday.headline}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            {readinessToday.coachAdviceToday}
          </div>
        </div>
      </div>

      {/* 4. Estrategia y Puntos de Acción */}
      <div
        className="surface-raised"
        style={{
          padding: "var(--space-3)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          marginBottom: "var(--space-3)",
        }}
      >
        <div className="font-semibold text-xs uppercase" style={{ color: "var(--color-brand)", letterSpacing: "0.03em", marginBottom: 6 }}>
          Pautas clave de tu entrenador para lo que queda de semana:
        </div>
        <ul className="text-sm grid gap-1.5" style={{ paddingLeft: "1.2rem", margin: 0 }}>
          {coachVerdict.actionablePoints.map((point, i) => (
            <li key={i} style={{ lineHeight: 1.45 }}>
              {point}
            </li>
          ))}
        </ul>
        {coachVerdict.weekendStrategy && (
          <div
            className="text-xs"
            style={{
              marginTop: "var(--space-2)",
              paddingTop: "var(--space-2)",
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
              fontWeight: 500,
            }}
          >
            🏁 <strong>Estrategia del fin de semana:</strong> {coachVerdict.weekendStrategy}
          </div>
        )}
      </div>

      {/* 5. Desglose Día a Día (Acordeón desplegable) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDailyBreakdown((prev) => !prev)}
          className="btn btn-ghost inline-flex items-center gap-1.5"
          style={{ fontSize: "var(--text-xs)", padding: "0.3rem 0.6rem" }}
        >
          {showDailyBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDailyBreakdown
            ? "Ocultar seguimiento día a día"
            : `Ver cómo han ido los entrenos de la semana (${sessionsProgress.overviewText})`}
        </button>
      </div>

      {showDailyBreakdown && (
        <div
          className="grid gap-2 animate-in"
          style={{
            marginTop: "var(--space-3)",
            paddingTop: "var(--space-3)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {sessionsProgress.days.map((s) => {
            const Icon = DISCIPLINE_ICONS[s.discipline] ?? Activity;
            const isCompleted = s.status === "realizada" || s.status === "parcial";
            const isToday = s.date === assessment.today;

            return (
              <div
                key={s.id}
                className="surface-raised text-sm flex items-start justify-between gap-3"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: isToday
                    ? "3px solid var(--color-brand)"
                    : s.isPeak
                    ? "3px solid var(--color-secondary)"
                    : isCompleted
                    ? "3px solid var(--color-success)"
                    : "3px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div style={{ marginTop: 2, color: isCompleted ? "var(--color-brand)" : "var(--color-muted)" }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{s.dayName}</span>
                      <span className="text-xs text-muted">· {s.discipline}</span>
                      {s.plannedCode && <span className="text-xs text-faint">({s.plannedCode})</span>}
                      {s.isPeak && (
                        <span className="badge text-xs" style={{ background: "rgba(249, 115, 22, 0.15)", color: "var(--color-secondary)" }}>
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
                    {isCompleted ? "Completada" : s.status === "pendiente" ? "Pendiente" : s.status}
                  </span>
                  {isCompleted && s.load > 0 && (
                    <div className="text-xs text-muted font-semibold" style={{ marginTop: 2 }}>
                      {s.load} pts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Modal Explicativo del "Por qué" del ACWR */}
      {showAcwrModal && (
        <Modal
          title="Diagnóstico del Ratio ACWR (Carga Aguda : Crónica)"
          onClose={() => setShowAcwrModal(false)}
          footer={
            <Button variant="primary" onClick={() => setShowAcwrModal(false)} style={{ width: "100%" }}>
              Entendido
            </Button>
          }
        >
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between surface-raised" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div>
                <div className="text-xs text-muted">Tu ratio ACWR actual</div>
                <div className="text-2xl font-bold">
                  {loadAnalysis.acwr !== null ? loadAnalysis.acwr.toFixed(2) : "—"}
                </div>
              </div>
              <span
                className="badge text-sm font-semibold"
                style={{
                  background:
                    loadAnalysis.acwrStatus === "optimo"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(249, 115, 22, 0.15)",
                  color:
                    loadAnalysis.acwrStatus === "optimo"
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                }}
              >
                {loadAnalysis.acwrBadge}
              </span>
            </div>

            <div className="surface-raised" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div className="font-semibold text-sm" style={{ marginBottom: 4, color: "var(--color-foreground)" }}>
                ¿Por qué sale esta alerta?
              </div>
              <p className="text-sm text-muted" style={{ lineHeight: 1.5 }}>
                {loadAnalysis.acwrWhyExplanation}
              </p>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase text-muted" style={{ marginBottom: 6 }}>
                Escala de referencia del modelo de Gabbett:
              </div>
              <div className="grid gap-1.5 text-xs">
                <div className="flex items-center justify-between surface-raised" style={{ padding: "0.4rem 0.6rem" }}>
                  <span>&lt; 0.80 — <strong>Infracarga / Desentrenamiento</strong></span>
                  <span className="badge badge-warning text-xs">Precaución</span>
                </div>
                <div className="flex items-center justify-between surface-raised" style={{ padding: "0.4rem 0.6rem" }}>
                  <span>0.80 a 1.30 — <strong>Zona Óptima (&quot;Sweet Spot&quot;)</strong></span>
                  <span className="badge badge-success text-xs">Óptimo</span>
                </div>
                <div className="flex items-center justify-between surface-raised" style={{ padding: "0.4rem 0.6rem" }}>
                  <span>1.30 a 1.50 — <strong>Sobrecarga funcional</strong></span>
                  <span className="badge badge-warning text-xs">Atención</span>
                </div>
                <div className="flex items-center justify-between surface-raised" style={{ padding: "0.4rem 0.6rem" }}>
                  <span>&gt; 1.50 — <strong>Zona de Peligro (Riesgo lesión)</strong></span>
                  <span className="badge badge-danger text-xs">Peligro</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-faint" style={{ marginTop: 4 }}>
              *Nota del entrenador: Un valor por debajo de 0.8 a mitad de semana es totalmente normal. A medida que completes los entrenamientos del fin de semana, el ratio subirá hacia la zona verde.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
