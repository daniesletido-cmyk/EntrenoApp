"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  Moon,
  Zap,
  Heart,
  Target,
  TrendingUp,
  Activity,
  Mountain,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatSecondsDetailed } from "@/lib/fit-feedback";

function formatPace(minKm: number | null | undefined): string {
  if (minKm === null || minKm === undefined) return "—";
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

export interface WorkoutDetailModalProps {
  sessionId: number | null;
  onClose: () => void;
  onEdit?: (sessionId: number) => void;
}

const DISCIPLINE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  carrera: Footprints,
  gimnasio: Dumbbell,
  natacion: Waves,
  crossfit: Flame,
  otro: MoreHorizontal,
};

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera / Running",
  gimnasio: "Fuerza / Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit / Box WOD",
  otro: "Entrenamiento Funcional",
  descanso: "Descanso",
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  realizada: { label: "Completada", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  parcial: { label: "Parcial", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  pendiente: { label: "Pendiente", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  no_realizada: { label: "No realizada", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
};

function formatDurationDetailed(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "—";
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s > 0 ? `${s}s` : ""}`.trim();
  }
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}

function rpeDescription(rpe: number | null): string {
  if (rpe === null) return "Sin registrar";
  if (rpe <= 2) return "Muy suave · Regenerativo";
  if (rpe <= 4) return "Suave / Cómodo · Base aeróbica R1";
  if (rpe <= 6) return "Moderado / Duro · Tempo / Umbral R2";
  if (rpe <= 8) return "Muy duro · Sub-VAM / Umbral anaeróbico";
  return "Máximo esfuerzo · Series VAM / All-out";
}

export function WorkoutDetailModal({ sessionId, onClose, onEdit }: WorkoutDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "zones" | "charts" | "laps" | "gym" | "readiness">("general");
  const [activeChart, setActiveChart] = useState<"pace_hr" | "zones" | "cadence">("pace_hr");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!sessionId) return null;

  const session = data?.session;
  const fit = data?.fitSummary;
  const structuredFeedback = data?.structuredFeedback;
  const gym = data?.gymDetails ?? [];
  const sleep = data?.sleep;
  const readiness = data?.readiness;
  const load = data?.load;

  const IconComp = session?.discipline ? DISCIPLINE_ICON[session.discipline] ?? MoreHorizontal : Activity;
  const statusInfo = session ? STATUS_LABEL[session.status] ?? STATUS_LABEL.pendiente : STATUS_LABEL.pendiente;

  const laps = fit?.laps ?? [];
  const deep = fit?.deepAnalysis;
  const zoneDist = deep?.zoneDistribution;

  const zoneChartData = zoneDist
    ? [
        { name: "R0 Suave", timeMin: Number((zoneDist.r0TimeSec / 60).toFixed(1)), pct: zoneDist.r0Pct, color: "#64748b", rawTime: zoneDist.r0TimeSec },
        { name: "R1 Base", timeMin: Number((zoneDist.r1TimeSec / 60).toFixed(1)), pct: zoneDist.r1Pct, color: "#10b981", rawTime: zoneDist.r1TimeSec },
        { name: "R2 Tempo", timeMin: Number((zoneDist.r2TimeSec / 60).toFixed(1)), pct: zoneDist.r2Pct, color: "#f59e0b", rawTime: zoneDist.r2TimeSec },
        { name: "R4 Maratón", timeMin: Number((zoneDist.r3TimeSec / 60).toFixed(1)), pct: zoneDist.r3Pct, color: "#8b5cf6", rawTime: zoneDist.r3TimeSec },
        { name: "R5 Series", timeMin: Number((zoneDist.r5TimeSec / 60).toFixed(1)), pct: zoneDist.r5Pct, color: "#ef4444", rawTime: zoneDist.r5TimeSec },
      ]
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle exhaustivo del entrenamiento"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
        padding: "var(--space-3)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="surface animate-in"
        style={{
          width: "min(820px, 100%)",
          maxHeight: "min(760px, 94vh)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-strong)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera modal */}
        <div
          style={{
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-raised)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-3)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-brand-subtle)",
                color: "var(--color-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconComp size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                  {session?.planned_code || (session?.discipline ? DISCIPLINE_LABEL[session.discipline] : "Entrenamiento")}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: statusInfo.bg,
                    color: statusInfo.color,
                  }}
                >
                  {statusInfo.label}
                </span>
                {session?.is_long_run ? (
                  <span className="badge badge-brand" style={{ fontSize: "0.7rem" }}>
                    ⭐ Tirada Larga
                  </span>
                ) : null}
                {session?.is_extra ? (
                  <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                    Sesión Extra
                  </span>
                ) : null}
                {session?.fit_backup || session?.fit_data || fit ? (
                  <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                    ⌚ Archivo .FIT
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-muted flex items-center gap-2" style={{ marginTop: 3 }}>
                <Calendar size={13} />
                <span>
                  {session?.date
                    ? new Date(`${session.date}T12:00:00`).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </span>
                <span>•</span>
                <span>{session?.discipline ? DISCIPLINE_LABEL[session.discipline] : ""}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && session && (
              <button
                className="btn btn-secondary text-xs"
                style={{ padding: "0.3rem 0.6rem" }}
                onClick={() => {
                  onClose();
                  onEdit(session.id);
                }}
              >
                Editar
              </button>
            )}
            <button className="btn btn-ghost btn-icon" aria-label="Cerrar" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de pestañas */}
        <div
          className="flex items-center gap-1"
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            overflowX: "auto",
          }}
        >
          <button
            className={`btn ${activeTab === "general" ? "btn-primary" : "btn-ghost"} text-xs`}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
            onClick={() => setActiveTab("general")}
          >
            📊 Resumen & KPIs
          </button>
          {session?.discipline === "carrera" && (
            <button
              className={`btn ${activeTab === "zones" ? "btn-primary" : "btn-ghost"} text-xs`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("zones")}
            >
              🎯 Zonas VAM (3:59)
            </button>
          )}
          {laps.length > 0 && (
            <button
              className={`btn ${activeTab === "charts" ? "btn-primary" : "btn-ghost"} text-xs`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("charts")}
            >
              📈 Gráficos & Curvas
            </button>
          )}
          {laps.length > 0 && (
            <button
              className={`btn ${activeTab === "laps" ? "btn-primary" : "btn-ghost"} text-xs`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("laps")}
            >
              ⏱️ Parciales ({laps.length})
            </button>
          )}
          {gym.length > 0 && (
            <button
              className={`btn ${activeTab === "gym" ? "btn-primary" : "btn-ghost"} text-xs`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("gym")}
            >
              🏋️ Ejercicios ({gym.length})
            </button>
          )}
          <button
            className={`btn ${activeTab === "readiness" ? "btn-primary" : "btn-ghost"} text-xs`}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
            onClick={() => setActiveTab("readiness")}
          >
            🌙 Recuperación & Contexto
          </button>
        </div>

        {/* Contenido con scroll */}
        <div style={{ padding: "var(--space-4)", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 240 }}>
              <div className="text-sm text-muted animate-pulse">Cargando todas las métricas del entrenamiento...</div>
            </div>
          ) : !session ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
              No se encontraron datos para este entrenamiento.
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: RESUMEN Y FISIOLOGÍA */}
              {activeTab === "general" && (
                <div className="grid gap-4">
                  {/* Grid de KPIs principales */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                    <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                      <div className="text-xs text-muted font-medium flex items-center gap-1">
                        <Clock size={12} /> Duración Total
                      </div>
                      <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                        {formatDurationDetailed(session.duration_min)}
                      </div>
                      <div className="text-xs text-faint">{session.duration_min ? `${session.duration_min} min` : "—"}</div>
                    </div>

                    <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                      <div className="text-xs text-muted font-medium flex items-center gap-1">
                        <Footprints size={12} /> Distancia
                      </div>
                      <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                        {session.distance_km !== null ? `${session.distance_km} km` : "—"}
                      </div>
                      <div className="text-xs text-faint">
                        {session.distance_km ? `${Math.round(session.distance_km * 1000)} metros` : "Indoor / Sin GPS"}
                      </div>
                    </div>

                    {session.discipline === "carrera" && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Zap size={12} /> Ritmo Medio
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                          {formatPace(load?.avgPaceMinKm ?? fit?.avgPaceMinKm)}
                        </div>
                        <div className="text-xs text-faint">
                          {load?.avgSpeedKmh ? `${load.avgSpeedKmh.toFixed(1)} km/h` : "—"}
                        </div>
                      </div>
                    )}

                    <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                      <div className="text-xs text-muted font-medium flex items-center gap-1">
                        <Activity size={12} /> Esfuerzo (RPE)
                      </div>
                      <div className="text-lg font-bold" style={{ color: "var(--color-warning)", marginTop: 2 }}>
                        {session.rpe !== null ? `${session.rpe} / 10` : "—"}
                      </div>
                      <div className="text-xs text-faint">{rpeDescription(session.rpe)}</div>
                    </div>

                    <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                      <div className="text-xs text-muted font-medium flex items-center gap-1">
                        <Flame size={12} /> Carga Foster
                      </div>
                      <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                        {load?.fosterLoad ?? 0} pts
                      </div>
                      <div className="text-xs text-faint">
                        {session.duration_min && session.rpe ? `${session.duration_min}m × RPE ${session.rpe}` : "Fórmula Foster"}
                      </div>
                    </div>

                    {fit?.avgHeartRate != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Heart size={12} style={{ color: "var(--color-danger)" }} /> FC Media / Máx
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-danger)", marginTop: 2 }}>
                          {fit.avgHeartRate} lpm
                        </div>
                        <div className="text-xs text-faint">
                          {fit.maxHeartRate ? `Máxima: ${fit.maxHeartRate} lpm` : "FC monitorizada"}
                        </div>
                      </div>
                    )}

                    {fit?.avgCadence != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Activity size={12} /> Cadencia
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                          {fit.avgCadence} ppm
                        </div>
                        <div className="text-xs text-faint">
                          {fit.avgCadence >= 170 ? "Cadencia óptima" : "Mejorable (>170 ppm)"}
                        </div>
                      </div>
                    )}

                    {fit?.elevationGainM != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Mountain size={12} /> Desnivel +
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                          +{fit.elevationGainM} m
                        </div>
                        <div className="text-xs text-faint">Altimetría acumulada</div>
                      </div>
                    )}

                    {deep?.aerobicDecouplingPct != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <TrendingUp size={12} /> Desacoplamiento
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{
                            color: Math.abs(deep.aerobicDecouplingPct) < 5 ? "var(--color-success)" : "var(--color-warning)",
                            marginTop: 2,
                          }}
                        >
                          {deep.aerobicDecouplingPct > 0 ? "+" : ""}
                          {deep.aerobicDecouplingPct}%
                        </div>
                        <div className="text-xs text-faint">
                          {Math.abs(deep.aerobicDecouplingPct) < 5 ? "Eficiencia excelente" : "Deriva por fatiga/calor"}
                        </div>
                      </div>
                    )}

                    {deep?.pacingStabilityScore != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Award size={12} /> Estabilidad Ritmo
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                          {deep.pacingStabilityScore} / 100
                        </div>
                        <div className="text-xs text-faint">Consistencia de paso</div>
                      </div>
                    )}
                  </div>

                  {/* Diagnósticos del Entrenador IA */}
                  {structuredFeedback && (structuredFeedback.positives?.length > 0 || structuredFeedback.deviations?.length > 0) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {structuredFeedback.positives?.length > 0 && (
                        <div
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-success" style={{ marginBottom: "var(--space-2)" }}>
                            <CheckCircle2 size={15} />
                            <span>Aspectos Positivos de la Sesión</span>
                          </div>
                          <ul className="grid gap-1.5 text-xs">
                            {structuredFeedback.positives.map((pos: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-success font-bold">•</span>
                                <span dangerouslySetInnerHTML={{ __html: pos.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredFeedback.deviations?.length > 0 && (
                        <div
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-warning" style={{ marginBottom: "var(--space-2)" }}>
                            <AlertTriangle size={15} />
                            <span>Puntos a Cuidar / Desviaciones</span>
                          </div>
                          <ul className="grid gap-1.5 text-xs">
                            {structuredFeedback.deviations.map((dev: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-warning font-bold">•</span>
                                <span dangerouslySetInnerHTML={{ __html: dev.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notas y pauta del entrenamiento */}
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="text-xs font-semibold uppercase text-muted" style={{ marginBottom: "var(--space-2)" }}>
                      📝 Pauta Planificada y Notas de Ejecución
                    </div>
                    {session.notes ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: "var(--text-sm)",
                          lineHeight: 1.6,
                          color: "var(--color-text)",
                          backgroundColor: "rgba(0,0,0,0.25)",
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {session.notes}
                      </div>
                    ) : (
                      <div className="text-sm text-faint italic">No hay notas registradas para esta sesión.</div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: DISTRIBUCIÓN DE ZONAS VAM */}
              {activeTab === "zones" && (
                <div className="grid gap-4">
                  {/* Evaluación de Zona Objetivo */}
                  {structuredFeedback?.targetCompliance && (
                    <div
                      className="surface-raised"
                      style={{
                        padding: "var(--space-4)",
                        borderLeft: `4px solid ${structuredFeedback.targetCompliance.isCompliant ? "var(--color-success)" : "var(--color-warning)"}`,
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted uppercase font-semibold">Evaluación de Zona Objetivo</div>
                          <div className="font-bold text-base" style={{ marginTop: 2 }}>
                            {structuredFeedback.targetCompliance.plannedZone} ({structuredFeedback.targetCompliance.plannedRange})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted">Tiempo en Zona</div>
                          <div className="text-base font-bold text-brand">
                            {structuredFeedback.targetCompliance.timeInTargetFormatted} ({structuredFeedback.targetCompliance.compliancePct}%)
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: "var(--space-2)" }}>
                        {structuredFeedback.targetCompliance.verdict}
                      </div>
                    </div>
                  )}

                  {/* Diagnósticos Positivos / Desviaciones */}
                  {structuredFeedback && (structuredFeedback.positives?.length > 0 || structuredFeedback.deviations?.length > 0) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {structuredFeedback.positives?.length > 0 && (
                        <div
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                          }}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-success" style={{ marginBottom: "var(--space-2)" }}>
                            <CheckCircle2 size={14} />
                            <span>Aspectos Positivos</span>
                          </div>
                          <ul className="grid gap-1.5 text-xs">
                            {structuredFeedback.positives.map((p: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-success font-bold">•</span>
                                <span dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredFeedback.deviations?.length > 0 && (
                        <div
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                          }}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-warning" style={{ marginBottom: "var(--space-2)" }}>
                            <AlertTriangle size={14} />
                            <span>Desviaciones & Puntos a Cuidar</span>
                          </div>
                          <ul className="grid gap-1.5 text-xs">
                            {structuredFeedback.deviations.map((d: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-warning font-bold">•</span>
                                <span dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gráfico y Desglose de Zonas VAM */}
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Target size={16} style={{ color: "var(--color-brand)" }} />
                        Tiempo y Porcentaje por Zona VAM (Dani: 3:59 min/km · 15.06 km/h)
                      </div>
                    </div>

                    {/* Gráfico de Barras de Tiempo por Zona */}
                    {zoneDist && (
                      <div style={{ width: "100%", height: 170, marginBottom: "var(--space-4)" }}>
                        <ResponsiveContainer>
                          <BarChart data={zoneChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid stroke="#262c37" strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" stroke="#9aa3b2" fontSize={11} unit=" min" />
                            <YAxis type="category" dataKey="name" stroke="#9aa3b2" fontSize={11} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div
                                      style={{
                                        backgroundColor: "#171b24",
                                        border: "1px solid #262c37",
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        fontSize: 12,
                                      }}
                                    >
                                      <div className="font-bold" style={{ color: item.color }}>
                                        {item.name}
                                      </div>
                                      <div style={{ marginTop: 2 }}>
                                        Tiempo: <strong>{formatSecondsDetailed(item.rawTime)}</strong> ({item.pct}%)
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="timeMin" radius={[0, 4, 4, 0]}>
                              {zoneChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Barra Segmentada Visual */}
                    {zoneDist && (
                      <div
                        style={{
                          height: 18,
                          borderRadius: 9,
                          overflow: "hidden",
                          display: "flex",
                          backgroundColor: "#21262d",
                          marginBottom: "var(--space-4)",
                        }}
                      >
                        {zoneDist.r0Pct > 0 && (
                          <div
                            title={`R0 Regenerativo: ${zoneDist.r0Pct}% (${formatSecondsDetailed(zoneDist.r0TimeSec)})`}
                            style={{ width: `${zoneDist.r0Pct}%`, backgroundColor: "#64748b" }}
                          />
                        )}
                        {zoneDist.r1Pct > 0 && (
                          <div
                            title={`R1 Base Aeróbica: ${zoneDist.r1Pct}% (${formatSecondsDetailed(zoneDist.r1TimeSec)})`}
                            style={{ width: `${zoneDist.r1Pct}%`, backgroundColor: "#10b981" }}
                          />
                        )}
                        {zoneDist.r2Pct > 0 && (
                          <div
                            title={`R2 Tempo: ${zoneDist.r2Pct}% (${formatSecondsDetailed(zoneDist.r2TimeSec)})`}
                            style={{ width: `${zoneDist.r2Pct}%`, backgroundColor: "#f59e0b" }}
                          />
                        )}
                        {zoneDist.r3Pct > 0 && (
                          <div
                            title={`R4 Sub-VAM / Maratón: ${zoneDist.r3Pct}% (${formatSecondsDetailed(zoneDist.r3TimeSec)})`}
                            style={{ width: `${zoneDist.r3Pct}%`, backgroundColor: "#8b5cf6" }}
                          />
                        )}
                        {zoneDist.r5Pct > 0 && (
                          <div
                            title={`R5 Series / VAM: ${zoneDist.r5Pct}% (${formatSecondsDetailed(zoneDist.r5TimeSec)})`}
                            style={{ width: `${zoneDist.r5Pct}%`, backgroundColor: "#ef4444" }}
                          />
                        )}
                      </div>
                    )}

                    {/* Tabla de Zonas con Tiempo Exacto */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-muted)" }}>
                            <th style={{ padding: "8px 4px" }}>Zona VAM</th>
                            <th style={{ padding: "8px 4px" }}>Rango Ritmo</th>
                            <th style={{ padding: "8px 4px" }}>Tiempo Exacto</th>
                            <th style={{ padding: "8px 4px" }}>% Total</th>
                            <th style={{ padding: "8px 4px" }}>Enfoque Fisiológico</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "8px 4px" }}>
                              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#94a3b8" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#64748b" }} />
                                R0 Regenerativo
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px" }}>&gt; 5:25 min/km</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "var(--color-text)" }}>
                              {zoneDist ? formatSecondsDetailed(zoneDist.r0TimeSec) : "—"}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r0Pct}%` : "—"}</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Calentamiento, vuelta a la calma y descarga</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "8px 4px" }}>
                              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#10b981" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                                R1 Base Aeróbica
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px" }}>5:25 – 4:59 min/km</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "#10b981" }}>
                              {zoneDist ? formatSecondsDetailed(zoneDist.r1TimeSec) : "—"}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r1Pct}%` : "—"}</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Fondo aeróbico, capilarización, quema de grasas</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "8px 4px" }}>
                              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#f59e0b" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                                R2 Tempo / Umbral
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px" }}>4:59 – 4:35 min/km</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "#f59e0b" }}>
                              {zoneDist ? formatSecondsDetailed(zoneDist.r2TimeSec) : "—"}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r2Pct}%` : "—"}</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Resistencia aeróbica media, tolerancia lactato</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "8px 4px" }}>
                              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#8b5cf6" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                                R4 Sub-VAM / Maratón
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px" }}>4:35 – 4:10 min/km</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "#8b5cf6" }}>
                              {zoneDist ? formatSecondsDetailed(zoneDist.r3TimeSec) : "—"}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r3Pct}%` : "—"}</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Ritmo objetivo maratón y umbral anaeróbico</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "8px 4px" }}>
                              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#ef4444" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                                R5 Series / VAM
                              </span>
                            </td>
                            <td style={{ padding: "8px 4px" }}>&lt; 4:10 min/km</td>
                            <td style={{ padding: "8px 4px", fontWeight: 700, color: "#ef4444" }}>
                              {zoneDist ? formatSecondsDetailed(zoneDist.r5TimeSec) : "—"}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r5Pct}%` : "—"}</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Potencia aeróbica máxima (VO2max) y velocidad</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: GRÁFICOS & CURVAS */}
              {activeTab === "charts" && (
                <div className="grid gap-4">
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <BarChart3 size={16} style={{ color: "var(--color-brand)" }} />
                        Gráficos Interactivos de la Sesión
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className={`btn ${activeChart === "pace_hr" ? "btn-primary" : "btn-secondary"} text-xs`}
                          style={{ padding: "0.25rem 0.6rem" }}
                          onClick={() => setActiveChart("pace_hr")}
                        >
                          Ritmo & Pulso
                        </button>
                        {zoneDist && (
                          <button
                            className={`btn ${activeChart === "zones" ? "btn-primary" : "btn-secondary"} text-xs`}
                            style={{ padding: "0.25rem 0.6rem" }}
                            onClick={() => setActiveChart("zones")}
                          >
                            Zonas VAM
                          </button>
                        )}
                        {laps.some((l: any) => l.avgCadence) && (
                          <button
                            className={`btn ${activeChart === "cadence" ? "btn-primary" : "btn-secondary"} text-xs`}
                            style={{ padding: "0.25rem 0.6rem" }}
                            onClick={() => setActiveChart("cadence")}
                          >
                            Cadencia (ppm)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gráfico 1: Ritmo vs Pulso */}
                    {activeChart === "pace_hr" && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          Eje izquierdo: Ritmo (min/km, invertido) • Eje derecho: Pulso cardíaco (lpm).
                        </div>
                        <div style={{ width: "100%", height: 230 }}>
                          <ResponsiveContainer>
                            <LineChart data={laps.map((l: any) => ({ vuelta: `Km ${l.index}`, Ritmo: l.avgPaceMinKm, FC: l.avgHeartRate }))}>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="vuelta" stroke="#9aa3b2" fontSize={11} />
                              <YAxis yAxisId="left" stroke="#2f6feb" fontSize={11} reversed />
                              <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} domain={["dataMin - 10", "dataMax + 10"]} />
                              <Tooltip contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Line yAxisId="left" type="monotone" dataKey="Ritmo" stroke="#2f6feb" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                              <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Gráfico 2: Zonas VAM */}
                    {activeChart === "zones" && zoneDist && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          Minutos acumulados por zona de ritmo (VAM 3:59 min/km).
                        </div>
                        <div style={{ width: "100%", height: 230 }}>
                          <ResponsiveContainer>
                            <BarChart data={zoneChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="name" stroke="#9aa3b2" fontSize={11} />
                              <YAxis stroke="#9aa3b2" fontSize={11} unit=" m" />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                      <div
                                        style={{
                                          backgroundColor: "#171b24",
                                          border: "1px solid #262c37",
                                          padding: "6px 10px",
                                          borderRadius: 6,
                                          fontSize: 12,
                                        }}
                                      >
                                        <div className="font-bold" style={{ color: item.color }}>
                                          {item.name}
                                        </div>
                                        <div>
                                          Tiempo: <strong>{formatSecondsDetailed(item.rawTime)}</strong> ({item.pct}%)
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="timeMin" radius={[4, 4, 0, 0]}>
                                {zoneChartData.map((entry, index) => (
                                  <Cell key={`cell-chart-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Gráfico 3: Cadencia */}
                    {activeChart === "cadence" && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          Evolución de la cadencia de zancada (ppm) por kilómetro.
                        </div>
                        <div style={{ width: "100%", height: 230 }}>
                          <ResponsiveContainer>
                            <LineChart data={laps.map((l: any) => ({ vuelta: `Km ${l.index}`, Cadencia: l.avgCadence }))}>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="vuelta" stroke="#9aa3b2" fontSize={11} />
                              <YAxis stroke="#9aa3b2" fontSize={11} domain={[140, 200]} unit=" ppm" />
                              <Tooltip contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Line type="monotone" dataKey="Cadencia" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: PARCIALES Y VUELTAS (LAPS) */}
              {activeTab === "laps" && (
                <div className="grid gap-4">
                  <div className="surface-raised" style={{ padding: "var(--space-3)", overflowX: "auto" }}>
                    <div className="text-xs uppercase text-muted font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                      📋 Tabla de Parciales ({laps.length} vueltas registradas)
                    </div>
                    <table style={{ width: "100%", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-muted)" }}>
                          <th style={{ padding: "6px 8px" }}>Vuelta #</th>
                          <th style={{ padding: "6px 8px" }}>Distancia</th>
                          <th style={{ padding: "6px 8px" }}>Tiempo</th>
                          <th style={{ padding: "6px 8px" }}>Ritmo</th>
                          <th style={{ padding: "6px 8px" }}>FC Media</th>
                          <th style={{ padding: "6px 8px" }}>Cadencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laps.map((lap: any) => (
                          <tr key={lap.index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>Km {lap.index}</td>
                            <td style={{ padding: "6px 8px" }}>{lap.distanceKm !== null ? `${lap.distanceKm} km` : "—"}</td>
                            <td style={{ padding: "6px 8px" }}>{formatDurationDetailed(lap.durationMin)}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--color-brand)" }}>
                              {formatPace(lap.avgPaceMinKm)}
                            </td>
                            <td style={{ padding: "6px 8px", color: lap.avgHeartRate ? "var(--color-danger)" : "inherit" }}>
                              {lap.avgHeartRate ? `${lap.avgHeartRate} lpm` : "—"}
                            </td>
                            <td style={{ padding: "6px 8px" }}>{lap.avgCadence ? `${lap.avgCadence} ppm` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PESTAÑA 5: EJERCICIOS DE GIMNASIO / FUERZA */}
              {activeTab === "gym" && (
                <div className="grid gap-3">
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <Dumbbell size={16} style={{ color: "var(--color-brand)" }} />
                      Ejercicios y Cargas Realizadas en la Sesión ({gym.length} ejercicios)
                    </div>

                    <div className="grid gap-2">
                      {gym.map((g: any, idx: number) => (
                        <div
                          key={idx}
                          className="surface"
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--color-border)",
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "var(--space-2)",
                          }}
                        >
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {g.completed ? (
                                <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
                              ) : (
                                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--color-text-faint)" }} />
                              )}
                              <span>{g.exerciseName}</span>
                            </div>
                            {g.notes && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{g.notes}</div>}
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {g.weightKg != null && (
                              <span className="badge badge-neutral font-bold" style={{ fontSize: "0.75rem" }}>
                                {g.weightKg} kg
                              </span>
                            )}
                            {g.sets != null && g.reps != null && (
                              <span className="text-muted font-medium">
                                {g.sets} series × {g.reps} reps
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 6: RECUPERACIÓN & CONTEXTO */}
              {activeTab === "readiness" && (
                <div className="grid gap-3">
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <Moon size={16} style={{ color: "var(--color-brand)" }} />
                      Estado de Recuperación del Día ({session.date})
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="surface" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-sm)" }}>
                        <div className="text-xs text-muted">Descanso Noche Previa</div>
                        <div className="text-lg font-bold" style={{ marginTop: 2, color: "var(--color-text)" }}>
                          {sleep?.hours ? `${sleep.hours} horas` : "Sin registro de sueño"}
                        </div>
                        {sleep?.score != null && <div className="text-xs text-faint">Puntuación Zepp: {sleep.score} / 100</div>}
                        {sleep?.quality != null && <div className="text-xs text-faint">Calidad subjetiva: {sleep.quality} / 5</div>}
                      </div>

                      <div className="surface" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-sm)" }}>
                        <div className="text-xs text-muted">Puntuación de Readiness</div>
                        <div
                          className="text-lg font-bold"
                          style={{
                            marginTop: 2,
                            color:
                              readiness?.level === "optimo"
                            ? "var(--color-success)"
                            : readiness?.level === "moderado"
                            ? "var(--color-warning)"
                            : "var(--color-danger)",
                          }}
                        >
                          {readiness?.score ?? 80} / 100
                        </div>
                        <div className="text-xs text-faint">{readiness?.headline ?? "Estado de asimilación normal"}</div>
                      </div>
                    </div>

                    {readiness?.recommendation && (
                      <div
                        style={{
                          marginTop: "var(--space-3)",
                          padding: "var(--space-3)",
                          backgroundColor: "rgba(59, 130, 246, 0.08)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <strong style={{ color: "var(--color-brand)" }}>Consejo del Entrenador IA para ese día: </strong>
                        {readiness.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
