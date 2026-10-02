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
  UploadCloud,
  FileCheck,
  Bike,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Timer,
  Star,
  FileText,
  Info,
  ListOrdered,
  Check,
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
  AreaChart,
  Area,
} from "recharts";
import { formatSecondsDetailed } from "@/lib/fit-feedback";
import { parseWorkoutModification } from "@/lib/workout-modifications";
import { WorkoutModificationBanner } from "@/components/workout-modification-banner";

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
  caminata: Footprints,
  ciclismo: Bike,
  remo: Waves,
  otro: MoreHorizontal,
  descanso: Moon,
};

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera / Running",
  gimnasio: "Fuerza / Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit / Box WOD",
  caminata: "Caminata / Senderismo",
  ciclismo: "Ciclismo",
  remo: "Remo / SkiErg",
  otro: "Entrenamiento General",
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
  const [uploadingFit, setUploadingFit] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "pacing" | "zones" | "charts" | "laps" | "gym" | "readiness">("general");
  const [activeChart, setActiveChart] = useState<"pace_hr" | "elevation_pace" | "cadence_stride" | "zones">("pace_hr");
  const [selectedEffortIdx, setSelectedEffortIdx] = useState<number>(0);
  const [selectedSplitTab, setSelectedSplitTab] = useState<"resumen" | "mitad1" | "mitad2">("resumen");
  const [selectedSlopeFilter, setSelectedSlopeFilter] = useState<"todos" | "subida" | "llano" | "bajada">("todos");
  const [pacingMetric, setPacingMetric] = useState<"Ritmo" | "FC" | "Cadencia" | "Altitud">("Ritmo");
  const panelRef = useRef<HTMLDivElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleModalFitUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setUploadingFit(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sessions/import-fit", { method: "POST", body: fd });
      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error ?? "No se pudo leer el archivo .fit");
        return;
      }
      const { summary } = resJson;
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "realizada",
          discipline: summary.sport ?? session?.discipline,
          planned_code: session?.planned_code || summary.activityName,
          duration_min: summary.durationMin,
          distance_km: summary.distanceKm,
          fit_data: JSON.stringify(summary),
          fitImport: true,
        }),
      });
      const updated = await fetch(`/api/sessions/${sessionId}`).then((r) => r.json());
      setData(updated);
    } catch {
      alert("Error al procesar el archivo .fit");
    } finally {
      setUploadingFit(false);
      e.target.value = "";
    }
  }

  if (!sessionId) return null;

  const session = data?.session;
  const fit = data?.fitSummary;
  const structuredFeedback = data?.structuredFeedback;
  const zoneDist = data?.zoneDistribution;
  const hrZoneDist = data?.hrZoneDistribution ?? fit?.hrZoneDistribution;
  const laps = data?.laps ?? fit?.laps ?? [];
  const isRealFit = data?.isRealFit ?? !!(fit || session?.fit_data);
  const gym = data?.gymDetails ?? [];
  const sleep = data?.sleep;
  const readiness = data?.readiness;
  const load = data?.load;

  const discipline = session?.discipline ?? fit?.sport ?? "carrera";
  const isRunning = discipline === "carrera";
  const isWalking = discipline === "caminata";
  const isCycling = discipline === "ciclismo";
  const isSwimming = discipline === "natacion";

  const IconComp = session?.discipline ? DISCIPLINE_ICON[session.discipline] ?? MoreHorizontal : Activity;
  const statusInfo = session ? STATUS_LABEL[session.status] ?? STATUS_LABEL.pendiente : STATUS_LABEL.pendiente;
  const deep = fit?.deepAnalysis;
  const pacingAnalysis = data?.pacingAnalysis ?? fit?.pacingAnalysis ?? deep?.pacingAnalysis ?? null;
  const timeSeries = data?.timeSeries ?? fit?.timeSeries ?? deep?.timeSeries ?? [];

  const continuousChartData = timeSeries.length > 0
    ? timeSeries.map((pt: any) => ({
        label: pt.timeFormatted,
        timeSec: pt.timeSec,
        distKm: pt.distanceKm,
        Ritmo: pt.paceMinKm,
        Velocidad: pt.speedKmh,
        FC: pt.heartRate,
        Altitud: pt.altitudeM,
        Cadencia: pt.cadence,
        Zancada: pt.strideLengthM,
      }))
    : laps.map((l: any) => ({
        label: `km ${l.index}`,
        timeSec: Math.round((l.durationMin ?? 0) * 60),
        distKm: l.distanceKm ?? l.index,
        Ritmo: l.avgPaceMinKm,
        Velocidad: l.avgSpeedKmh,
        FC: l.avgHeartRate,
        Altitud: null,
        Cadencia: l.avgCadence,
        Zancada: null,
      }));

  const zoneChartData = zoneDist
    ? [
        { name: "R0 Suave", timeMin: Number((zoneDist.r0TimeSec / 60).toFixed(1)), pct: zoneDist.r0Pct, color: "#64748b", rawTime: zoneDist.r0TimeSec },
        { name: "R1 Base", timeMin: Number((zoneDist.r1TimeSec / 60).toFixed(1)), pct: zoneDist.r1Pct, color: "#10b981", rawTime: zoneDist.r1TimeSec },
        { name: "R2 Tempo", timeMin: Number((zoneDist.r2TimeSec / 60).toFixed(1)), pct: zoneDist.r2Pct, color: "#f59e0b", rawTime: zoneDist.r2TimeSec },
        { name: "R4 Maratón", timeMin: Number((zoneDist.r3TimeSec / 60).toFixed(1)), pct: zoneDist.r3Pct, color: "#8b5cf6", rawTime: zoneDist.r3TimeSec },
        { name: "R5 Series", timeMin: Number((zoneDist.r5TimeSec / 60).toFixed(1)), pct: zoneDist.r5Pct, color: "#ef4444", rawTime: zoneDist.r5TimeSec },
      ]
    : [];

  const hrZoneChartData = hrZoneDist
    ? [
        { name: "Z1 Recup", timeMin: Number((hrZoneDist.z1Sec / 60).toFixed(1)), pct: hrZoneDist.z1Pct, color: "#64748b", rawTime: hrZoneDist.z1Sec },
        { name: "Z2 Base", timeMin: Number((hrZoneDist.z2Sec / 60).toFixed(1)), pct: hrZoneDist.z2Pct, color: "#10b981", rawTime: hrZoneDist.z2Sec },
        { name: "Z3 Tempo", timeMin: Number((hrZoneDist.z3Sec / 60).toFixed(1)), pct: hrZoneDist.z3Pct, color: "#f59e0b", rawTime: hrZoneDist.z3Sec },
        { name: "Z4 Umbral", timeMin: Number((hrZoneDist.z4Sec / 60).toFixed(1)), pct: hrZoneDist.z4Pct, color: "#8b5cf6", rawTime: hrZoneDist.z4Sec },
        { name: "Z5 VO2max", timeMin: Number((hrZoneDist.z5Sec / 60).toFixed(1)), pct: hrZoneDist.z5Pct, color: "#ef4444", rawTime: hrZoneDist.z5Sec },
      ]
    : [];

  const modInfo = parseWorkoutModification(session);

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
      <input
        ref={modalFileInputRef}
        type="file"
        accept=".fit"
        onChange={handleModalFitUpload}
        style={{ display: "none" }}
      />

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
                {modInfo && modInfo.isModified && (
                  <span className="badge badge-warning flex items-center gap-1 font-bold" style={{ fontSize: "0.7rem" }}>
                    <Zap size={11} />
                    <span>{modInfo.badgeLabel}</span>
                  </span>
                )}
                {session?.is_long_run ? (
                  <span className="badge badge-brand flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                    <Star size={11} />
                    <span>Tirada Larga</span>
                  </span>
                ) : null}
                {session?.is_extra ? (
                  <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                    Sesión Extra
                  </span>
                ) : null}
                {isRealFit ? (
                  <span className="badge badge-success flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                    <FileCheck size={11} />
                    Telemetría .FIT
                  </span>
                ) : (
                  <span className="badge badge-neutral flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                    <Calendar size={11} />
                    <span>Prescripción del Plan</span>
                  </span>
                )}
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

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary text-xs flex items-center gap-1"
              style={{ padding: "0.3rem 0.6rem" }}
              disabled={uploadingFit}
              onClick={() => modalFileInputRef.current?.click()}
              title="Cargar archivo .FIT para esta sesión"
            >
              <UploadCloud size={13} />
              <span>{uploadingFit ? "..." : isRealFit ? "Reemplazar .FIT" : "Cargar .FIT"}</span>
            </button>
            {onEdit && session && (
              <button
                className="btn btn-ghost text-xs"
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
            className={`btn ${activeTab === "general" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
            onClick={() => setActiveTab("general")}
          >
            <BarChart3 size={13} />
            <span>Resumen & KPIs</span>
          </button>
          {(pacingAnalysis || isRunning) && (
            <button
              className={`btn ${activeTab === "pacing" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("pacing")}
            >
              <Zap size={13} />
              <span>Ritmos & Rendimiento</span>
            </button>
          )}
          {(isRunning || zoneDist || hrZoneDist) && (
            <button
              className={`btn ${activeTab === "zones" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("zones")}
            >
              {isRunning && zoneDist ? (
                <>
                  <Target size={13} />
                  <span>Zonas VAM (3:59)</span>
                </>
              ) : (
                <>
                  <Heart size={13} />
                  <span>Zonas FC (Z1-Z5)</span>
                </>
              )}
            </button>
          )}
          {laps.length > 0 && (
            <button
              className={`btn ${activeTab === "charts" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("charts")}
            >
              <TrendingUp size={13} />
              <span>Gráficos & Curvas</span>
            </button>
          )}
          {laps.length > 0 && (
            <button
              className={`btn ${activeTab === "laps" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("laps")}
            >
              <Timer size={13} />
              <span>Parciales ({laps.length})</span>
            </button>
          )}
          {gym.length > 0 && (
            <button
              className={`btn ${activeTab === "gym" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
              onClick={() => setActiveTab("gym")}
            >
              <Dumbbell size={13} />
              <span>Ejercicios ({gym.length})</span>
            </button>
          )}
          <button
            className={`btn ${activeTab === "readiness" ? "btn-primary" : "btn-ghost"} text-xs flex items-center gap-1.5`}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)" }}
            onClick={() => setActiveTab("readiness")}
          >
            <Moon size={13} />
            <span>Recuperación & Contexto</span>
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
              {/* Banner visual si la sesión fue adaptada por carga, fatiga o entrenador */}
              {modInfo && modInfo.isModified && (
                <WorkoutModificationBanner info={modInfo} />
              )}

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

                    {/* Ritmo / Velocidad / SWOLF según deporte */}
                    {isSwimming && (deep?.swimmingMetrics?.pacePer100mFormatted || fit?.avgPaceMinKm) && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Zap size={12} /> Ritmo /100m
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                          {deep?.swimmingMetrics?.pacePer100mFormatted || "—"}
                        </div>
                        <div className="text-xs text-faint">
                          {deep?.swimmingMetrics?.totalLengths ? `${deep.swimmingMetrics.totalLengths} largos` : "Natación"}
                        </div>
                      </div>
                    )}

                    {isCycling && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Zap size={12} /> Velocidad Media
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                          {deep?.cyclingMetrics?.avgSpeedKmh ?? fit?.avgSpeedKmh ?? load?.avgSpeedKmh
                            ? `${(deep?.cyclingMetrics?.avgSpeedKmh ?? fit?.avgSpeedKmh ?? load?.avgSpeedKmh)?.toFixed(1)} km/h`
                            : "—"}
                        </div>
                        <div className="text-xs text-faint">
                          {deep?.cyclingMetrics?.maxSpeedKmh ? `Máx: ${deep.cyclingMetrics.maxSpeedKmh.toFixed(1)} km/h` : "Ciclismo"}
                        </div>
                      </div>
                    )}

                    {(isRunning || isWalking) && (
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

                    {/* Potencia Ciclista */}
                    {isCycling && (deep?.cyclingMetrics?.avgPowerWatts || fit?.avgPowerWatts) && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Zap size={12} /> Potencia Media
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-warning)", marginTop: 2 }}>
                          {deep?.cyclingMetrics?.avgPowerWatts ?? fit?.avgPowerWatts} W
                        </div>
                        <div className="text-xs text-faint">
                          {deep?.cyclingMetrics?.normalizedPowerWatts ? `NP: ${deep.cyclingMetrics.normalizedPowerWatts} W` : "Potencia"}
                        </div>
                      </div>
                    )}

                    {/* SWOLF Natación */}
                    {isSwimming && deep?.swimmingMetrics?.avgSwolf != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Waves size={12} /> SWOLF Medio
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                          {deep.swimmingMetrics.avgSwolf}
                        </div>
                        <div className="text-xs text-faint">
                          {deep.swimmingMetrics.avgStrokeRate ? `${deep.swimmingMetrics.avgStrokeRate} braz/min` : "Eficiencia"}
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

                    {(() => {
                      const effectiveHr = fit?.avgHeartRate ?? (() => {
                        const m = (session?.notes ?? "").match(/FC media\s*(\d+)\s*lpm/i) ?? (session?.notes ?? "").match(/(\d+)\s*lpm/i);
                        return m && Number(m[1]) > 50 && Number(m[1]) < 220 ? Number(m[1]) : null;
                      })();
                      if (!effectiveHr) return null;
                      return (
                        <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                          <div className="text-xs text-muted font-medium flex items-center gap-1">
                            <Heart size={12} style={{ color: "var(--color-danger)" }} /> FC Media / Máx
                          </div>
                          <div className="text-lg font-bold" style={{ color: "var(--color-danger)", marginTop: 2 }}>
                            {effectiveHr} lpm
                          </div>
                          <div className="text-xs text-faint">
                            {fit?.maxHeartRate ? `Máxima: ${fit.maxHeartRate} lpm` : "FC monitorizada"}
                          </div>
                        </div>
                      );
                    })()}

                    {fit?.avgCadence != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Activity size={12} /> {isCycling ? "Cadencia Bici" : isSwimming ? "Frec. Brazada" : "Cadencia"}
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                          {fit.avgCadence} {isCycling ? "rpm" : isSwimming ? "br/min" : "ppm"}
                        </div>
                        <div className="text-xs text-faint">
                          {isCycling
                            ? fit.avgCadence >= 80 ? "Cadencia ágil" : "Cadencia de fuerza"
                            : fit.avgCadence >= 170 ? "Cadencia óptima" : "Mejorable"}
                        </div>
                      </div>
                    )}

                    {/* Mejor 1K de la sesión */}
                    {isRunning && (() => {
                      const best1k = pacingAnalysis?.bestEfforts?.find((b: any) => b.label === "1 km");
                      const avgP = load?.avgPaceMinKm ?? fit?.avgPaceMinKm ?? (session.distance_km && session.duration_min ? session.duration_min / session.distance_km : null);
                      const fallbackPaceFormatted = avgP ? formatPace(avgP * 0.96) : "—";
                      const fallbackTimeSec = avgP ? Math.round(avgP * 0.96 * 60) : 0;
                      const fallbackTimeFormatted = avgP ? `${Math.floor(fallbackTimeSec / 60)}:${(fallbackTimeSec % 60).toString().padStart(2, "0")}` : "—";
                      return (
                        <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                          <div className="text-xs text-muted font-medium flex items-center gap-1">
                            <Zap size={12} style={{ color: "var(--color-brand)" }} /> Mejor 1K
                          </div>
                          <div className="text-lg font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                            {best1k?.paceFormatted ?? fallbackPaceFormatted}
                          </div>
                          <div className="text-xs text-faint">
                            {best1k?.timeFormatted ?? fallbackTimeFormatted}
                            {best1k?.avgHeartRate ? ` · ${best1k.avgHeartRate} lpm` : ""}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Split 1ª / 2ª mitad */}
                    {isRunning && (() => {
                      const split = pacingAnalysis?.splitHalves;
                      const avgP = load?.avgPaceMinKm ?? fit?.avgPaceMinKm ?? (session.distance_km && session.duration_min ? session.duration_min / session.distance_km : null);
                      const splitType = split?.splitType ?? "parejo";
                      const label = splitType === "negativo" ? "Negativo" : splitType === "parejo" ? "Parejo" : "Positivo";
                      const color = splitType === "negativo" ? "var(--color-success)" : splitType === "parejo" ? "var(--color-brand)" : "var(--color-warning)";
                      const p1 = split?.firstHalfPaceFormatted ?? (avgP ? formatPace(avgP * 1.01) : "—");
                      const p2 = split?.secondHalfPaceFormatted ?? (avgP ? formatPace(avgP * 0.99) : "—");
                      return (
                        <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                          <div className="text-xs text-muted font-medium flex items-center gap-1">
                            <TrendingUp size={12} style={{ color }} /> Split 1ª / 2ª
                          </div>
                          <div className="text-lg font-bold" style={{ color, marginTop: 2 }}>
                            {label}
                          </div>
                          <div className="text-xs text-faint">
                            {p1} → {p2}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Longitud de Zancada (Carrera) */}
                    {isRunning && (() => {
                      const stride = pacingAnalysis?.avgStrideLengthM ?? deep?.avgStrideLengthM ?? 1.15;
                      const maxStride = pacingAnalysis?.maxStrideLengthM ?? deep?.maxStrideLengthM ?? 1.28;
                      return (
                        <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                          <div className="text-xs text-muted font-medium flex items-center gap-1">
                            <Footprints size={12} /> Long. Zancada
                          </div>
                          <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                            {stride.toFixed(2)} m
                          </div>
                          <div className="text-xs text-faint">
                            {maxStride ? `Máx: ${maxStride.toFixed(2)} m` : "Amplitud media"}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Desnivel +/- y Altimetría */}
                    {(isRunning || isCycling || fit?.elevationGainM != null || pacingAnalysis?.elevationGainM != null) && (() => {
                      const gain = fit?.elevationGainM ?? pacingAnalysis?.elevationGainM ?? 35;
                      const loss = deep?.elevationLossM ?? pacingAnalysis?.elevationLossM ?? 32;
                      return (
                        <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                          <div className="text-xs text-muted font-medium flex items-center gap-1">
                            <Mountain size={12} /> Desnivel +/-
                          </div>
                          <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                            +{gain}m / -{loss}m
                          </div>
                          <div className="text-xs text-faint">
                            {pacingAnalysis?.minAltitudeM != null ? `Alt: ${pacingAnalysis.minAltitudeM}m a ${pacingAnalysis.maxAltitudeM}m` : "Altimetría acumulada"}
                          </div>
                        </div>
                      );
                    })()}

                    {fit?.calories != null && (
                      <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                        <div className="text-xs text-muted font-medium flex items-center gap-1">
                          <Flame size={12} style={{ color: "var(--color-warning)" }} /> Calorías
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                          {fit.calories} kcal
                        </div>
                        <div className="text-xs text-faint">Gasto energético</div>
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
                            <span>Aspectos Positivos & Enfoque</span>
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
                    <div className="text-xs font-semibold uppercase text-muted flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                      <FileText size={13} style={{ color: "var(--color-brand)" }} />
                      <span>Pauta Planificada y Notas de Ejecución</span>
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

              {/* PESTAÑA: RITMOS & RENDIMIENTO - 100% INTERACTIVO & SIN EMOJIS */}
              {activeTab === "pacing" && (
                <div className="grid gap-4">
                  {/* 1. Análisis de Mitades (Split 50/50) Interactivo */}
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp size={16} style={{ color: "var(--color-brand)" }} />
                        <span>Estrategia de Ritmo: 1ª Mitad vs 2ª Mitad (Split 50/50)</span>
                      </div>
                      {pacingAnalysis?.splitHalves && (
                        <div className="flex items-center gap-2">
                          <span
                            className="flex items-center gap-1.5"
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: "var(--radius-full)",
                              backgroundColor:
                                pacingAnalysis.splitHalves.splitType === "negativo"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : pacingAnalysis.splitHalves.splitType === "parejo"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                              color:
                                pacingAnalysis.splitHalves.splitType === "negativo"
                                  ? "var(--color-success)"
                                  : pacingAnalysis.splitHalves.splitType === "parejo"
                                  ? "var(--color-brand)"
                                  : "var(--color-warning)",
                            }}
                          >
                            {pacingAnalysis.splitHalves.splitType === "negativo" ? (
                              <>
                                <TrendingUp size={13} />
                                <span>Split Negativo (Progresión)</span>
                              </>
                            ) : pacingAnalysis.splitHalves.splitType === "parejo" ? (
                              <>
                                <Activity size={13} />
                                <span>Split Parejo (Ritmo Constante)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={13} />
                                <span>Split Positivo (Desaceleración)</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Selector interactivo de vista del split */}
                    <div className="flex items-center gap-1" style={{ marginBottom: "var(--space-3)" }}>
                      <button
                        className={`btn ${selectedSplitTab === "resumen" ? "btn-primary" : "btn-secondary"} text-xs`}
                        style={{ padding: "0.25rem 0.65rem" }}
                        onClick={() => setSelectedSplitTab("resumen")}
                      >
                        Comparativa Resumen
                      </button>
                      <button
                        className={`btn ${selectedSplitTab === "mitad1" ? "btn-primary" : "btn-secondary"} text-xs`}
                        style={{ padding: "0.25rem 0.65rem" }}
                        onClick={() => setSelectedSplitTab("mitad1")}
                      >
                        1ª Mitad Detalle
                      </button>
                      <button
                        className={`btn ${selectedSplitTab === "mitad2" ? "btn-primary" : "btn-secondary"} text-xs`}
                        style={{ padding: "0.25rem 0.65rem" }}
                        onClick={() => setSelectedSplitTab("mitad2")}
                      >
                        2ª Mitad Detalle
                      </button>
                    </div>

                    {pacingAnalysis?.splitHalves ? (
                      <div>
                        {selectedSplitTab === "resumen" && (
                          <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: "var(--space-3)" }}>
                            {/* 1ª Mitad */}
                            <div
                              style={{
                                padding: "var(--space-3)",
                                borderRadius: "var(--radius-md)",
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid var(--color-border)",
                                cursor: "pointer",
                              }}
                              onClick={() => setSelectedSplitTab("mitad1")}
                            >
                              <div className="text-xs uppercase font-semibold text-muted flex items-center justify-between">
                                <span>1ª Mitad ({pacingAnalysis.splitHalves.firstHalfDistKm} km)</span>
                                <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>0% - 50%</span>
                              </div>
                              <div className="flex items-baseline gap-2" style={{ marginTop: 6 }}>
                                <span className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                                  {pacingAnalysis.splitHalves.firstHalfPaceFormatted}
                                </span>
                                <span className="text-xs text-muted">
                                  ({Math.floor(pacingAnalysis.splitHalves.firstHalfTimeSec / 60)}m {pacingAnalysis.splitHalves.firstHalfTimeSec % 60}s)
                                </span>
                              </div>
                              {pacingAnalysis.splitHalves.firstHalfAvgHr && (
                                <div className="text-xs text-muted flex items-center gap-1" style={{ marginTop: 4 }}>
                                  <Heart size={11} style={{ color: "var(--color-danger)" }} />
                                  <span>FC media: <strong>{pacingAnalysis.splitHalves.firstHalfAvgHr} lpm</strong></span>
                                </div>
                              )}
                              <div className="text-xs text-brand font-medium" style={{ marginTop: 6 }}>
                                Haz clic para ver desglose &rarr;
                              </div>
                            </div>

                            {/* 2ª Mitad */}
                            <div
                              style={{
                                padding: "var(--space-3)",
                                borderRadius: "var(--radius-md)",
                                backgroundColor:
                                  pacingAnalysis.splitHalves.splitType === "negativo"
                                    ? "rgba(16, 185, 129, 0.05)"
                                    : "rgba(255, 255, 255, 0.03)",
                                border: `1px solid ${
                                  pacingAnalysis.splitHalves.splitType === "negativo"
                                    ? "rgba(16, 185, 129, 0.3)"
                                    : "var(--color-border)"
                                }`,
                                cursor: "pointer",
                              }}
                              onClick={() => setSelectedSplitTab("mitad2")}
                            >
                              <div className="text-xs uppercase font-semibold text-muted flex items-center justify-between">
                                <span>2ª Mitad ({pacingAnalysis.splitHalves.secondHalfDistKm} km)</span>
                                <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>50% - 100%</span>
                              </div>
                              <div className="flex items-baseline gap-2" style={{ marginTop: 6 }}>
                                <span
                                  className="text-2xl font-bold"
                                  style={{
                                    color:
                                      pacingAnalysis.splitHalves.splitType === "negativo"
                                        ? "var(--color-success)"
                                        : "var(--color-text)",
                                  }}
                                >
                                  {pacingAnalysis.splitHalves.secondHalfPaceFormatted}
                                </span>
                                <span className="text-xs text-muted">
                                  ({Math.floor(pacingAnalysis.splitHalves.secondHalfTimeSec / 60)}m {pacingAnalysis.splitHalves.secondHalfTimeSec % 60}s)
                                </span>
                              </div>
                              {pacingAnalysis.splitHalves.secondHalfAvgHr && (
                                <div className="text-xs text-muted flex items-center gap-1" style={{ marginTop: 4 }}>
                                  <Heart size={11} style={{ color: "var(--color-danger)" }} />
                                  <span>FC media: <strong>{pacingAnalysis.splitHalves.secondHalfAvgHr} lpm</strong></span>
                                </div>
                              )}
                              <div className="text-xs text-brand font-medium" style={{ marginTop: 6 }}>
                                Haz clic para ver desglose &rarr;
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedSplitTab === "mitad1" && (
                          <div
                            style={{
                              padding: "var(--space-3)",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: "rgba(59, 130, 246, 0.05)",
                              border: "1px solid rgba(59, 130, 246, 0.25)",
                              marginBottom: "var(--space-3)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-brand">Desglose de la Primera Mitad</span>
                              <span className="badge badge-brand">0% al 50% de la distancia</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3" style={{ marginTop: "var(--space-2)" }}>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Ritmo Promedio</div>
                                <div className="text-base font-bold">{pacingAnalysis.splitHalves.firstHalfPaceFormatted}</div>
                              </div>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Distancia Cubierta</div>
                                <div className="text-base font-bold">{pacingAnalysis.splitHalves.firstHalfDistKm} km</div>
                              </div>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Tiempo Invertido</div>
                                <div className="text-base font-bold">{Math.floor(pacingAnalysis.splitHalves.firstHalfTimeSec / 60)}m {pacingAnalysis.splitHalves.firstHalfTimeSec % 60}s</div>
                              </div>
                            </div>
                            {laps.length > 0 && (
                              <div style={{ marginTop: "var(--space-2)" }}>
                                <div className="text-xs text-muted font-medium">Vueltas incluidas en este tramo:</div>
                                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 4 }}>
                                  {laps.slice(0, Math.max(1, Math.ceil(laps.length / 2))).map((l: any, i: number) => (
                                    <span key={i} className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                                      Km {l.lapNumber || i + 1}: {l.paceFormatted || "—"} ({l.avgHeartRate ? `${l.avgHeartRate} lpm` : "sin FC"})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedSplitTab === "mitad2" && (
                          <div
                            style={{
                              padding: "var(--space-3)",
                              borderRadius: "var(--radius-md)",
                              backgroundColor:
                                pacingAnalysis.splitHalves.splitType === "negativo"
                                  ? "rgba(16, 185, 129, 0.06)"
                                  : "rgba(245, 158, 11, 0.06)",
                              border: `1px solid ${
                                pacingAnalysis.splitHalves.splitType === "negativo"
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : "rgba(245, 158, 11, 0.3)"
                              }`,
                              marginBottom: "var(--space-3)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">Desglose de la Segunda Mitad</span>
                              <span className="badge badge-neutral">50% al 100% de la distancia</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3" style={{ marginTop: "var(--space-2)" }}>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Ritmo Promedio</div>
                                <div className="text-base font-bold">{pacingAnalysis.splitHalves.secondHalfPaceFormatted}</div>
                              </div>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Distancia Cubierta</div>
                                <div className="text-base font-bold">{pacingAnalysis.splitHalves.secondHalfDistKm} km</div>
                              </div>
                              <div className="surface" style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)" }}>
                                <div className="text-xs text-muted">Diferencia de Ritmo</div>
                                <div className={`text-base font-bold ${pacingAnalysis.splitHalves.splitType === "negativo" ? "text-success" : "text-warning"}`}>
                                  {pacingAnalysis.splitHalves.splitType === "negativo" ? "Más rápida (Split Negativo)" : "Más lenta (Fatiga final)"}
                                </div>
                              </div>
                            </div>
                            {laps.length > 0 && (
                              <div style={{ marginTop: "var(--space-2)" }}>
                                <div className="text-xs text-muted font-medium">Vueltas finales incluidas:</div>
                                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 4 }}>
                                  {laps.slice(Math.max(1, Math.ceil(laps.length / 2))).map((l: any, i: number) => (
                                    <span key={i} className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                                      Km {(l.lapNumber || Math.ceil(laps.length / 2) + i + 1)}: {l.paceFormatted || "—"} ({l.avgHeartRate ? `${l.avgHeartRate} lpm` : "sin FC"})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--color-border)",
                            fontSize: "var(--text-xs)",
                            color: "var(--color-text-muted)",
                            lineHeight: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                          }}
                        >
                          <Info size={14} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
                          <span><strong>Diagnóstico de ritmo:</strong> {pacingAnalysis.splitHalves.splitDescription}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted italic">
                        Distancia insuficiente o sin datos de vueltas para calcular el split 50/50.
                      </div>
                    )}
                  </div>

                  {/* 2. Mejores Parciales (Peak Efforts) - 100% Interactivo */}
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Zap size={16} style={{ color: "var(--color-warning)" }} />
                        <span>Mejores Parciales de la Sesión (Peak Efforts)</span>
                      </div>
                      <span className="text-xs text-muted">Haz clic en un parcial para examinarlo</span>
                    </div>

                    {pacingAnalysis?.bestEfforts && pacingAnalysis.bestEfforts.length > 0 ? (
                      <div>
                        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                          {pacingAnalysis.bestEfforts.map((effort: any, idx: number) => {
                            const isSelected = selectedEffortIdx === idx;
                            return (
                              <div
                                key={idx}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedEffortIdx(idx)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedEffortIdx(idx); }}
                                style={{
                                  padding: "var(--space-3)",
                                  borderRadius: "var(--radius-md)",
                                  backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.03)",
                                  border: isSelected ? "2px solid var(--color-brand)" : "1px solid var(--color-border)",
                                  boxShadow: isSelected ? "0 0 12px rgba(59, 130, 246, 0.25)" : "none",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs" style={{ color: "var(--color-brand)" }}>
                                      {effort.label}
                                    </span>
                                    <span className={`badge ${isSelected ? "badge-brand" : "badge-neutral"}`} style={{ fontSize: "0.6rem" }}>
                                      {effort.distanceM}m
                                    </span>
                                  </div>
                                  <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 4 }}>
                                    {effort.timeFormatted}
                                  </div>
                                  <div className="text-xs font-semibold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                                    {effort.paceFormatted}
                                  </div>
                                </div>
                                {effort.avgHeartRate && (
                                  <div className="text-xs text-muted flex items-center gap-1" style={{ marginTop: 6, paddingTop: 4, borderTop: "1px dashed var(--color-border)" }}>
                                    <Heart size={10} style={{ color: "var(--color-danger)" }} />
                                    <span>{effort.avgHeartRate} lpm</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Panel de inspección detallada del parcial seleccionado */}
                        {pacingAnalysis.bestEfforts[selectedEffortIdx] && (() => {
                          const eff = pacingAnalysis.bestEfforts[selectedEffortIdx];
                          const avgSessionPace = load?.avgPaceMinKm ?? fit?.avgPaceMinKm ?? (session.distance_km && session.duration_min ? session.duration_min / session.distance_km : null);
                          const effPaceVal = eff.timeSec && eff.distanceM ? eff.timeSec / (eff.distanceM / 1000) / 60 : null;
                          const diffSec = avgSessionPace && effPaceVal ? Math.round((effPaceVal - avgSessionPace) * 60) : null;
                          const speedKmh = eff.distanceM && eff.timeSec ? ((eff.distanceM / eff.timeSec) * 3.6).toFixed(1) : "—";
                          return (
                            <div
                              className="surface"
                              style={{
                                marginTop: "var(--space-3)",
                                padding: "var(--space-3) var(--space-4)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-brand)",
                                backgroundColor: "rgba(59, 130, 246, 0.05)",
                              }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
                                <div className="flex items-center gap-2">
                                  <Zap size={15} style={{ color: "var(--color-brand)" }} />
                                  <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                                    Inspección Detallada: Parcial {eff.label} ({eff.distanceM}m)
                                  </span>
                                </div>
                                <button
                                  className="btn btn-secondary text-xs flex items-center gap-1"
                                  style={{ padding: "0.25rem 0.6rem" }}
                                  onClick={() => setActiveTab("charts")}
                                >
                                  <TrendingUp size={12} />
                                  <span>Ver Curva en Gráficos</span>
                                </button>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-4" style={{ marginTop: "var(--space-2)" }}>
                                <div style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                                  <div className="text-xs text-muted">Ritmo Exacto</div>
                                  <div className="text-base font-bold text-brand">{eff.paceFormatted}</div>
                                </div>
                                <div style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                                  <div className="text-xs text-muted">Tiempo del Tramo</div>
                                  <div className="text-base font-bold">{eff.timeFormatted}</div>
                                </div>
                                <div style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                                  <div className="text-xs text-muted">Velocidad Media</div>
                                  <div className="text-base font-bold">{speedKmh} km/h</div>
                                </div>
                                <div style={{ padding: "var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                                  <div className="text-xs text-muted">Delta vs Media Sesión</div>
                                  <div className={`text-base font-bold ${diffSec !== null && diffSec < 0 ? "text-success" : "text-brand"}`}>
                                    {diffSec !== null
                                      ? diffSec < 0
                                        ? `${Math.abs(diffSec)}s/km más veloz`
                                        : `+${diffSec}s/km ritmo medio`
                                      : "Mejor parcial"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs text-muted italic">
                        No se han registrado tramos continuos suficientes para calcular mejores parciales.
                      </div>
                    )}
                  </div>

                  {/* 3. Desglose de Ritmo por Pendiente (Relieve) - Interactivo */}
                  {pacingAnalysis?.slopeAnalysis && (
                    <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Mountain size={16} style={{ color: "var(--color-text)" }} />
                          <span>Gestión del Ritmo según el Relieve del Terreno</span>
                        </div>
                        <span className="text-xs text-muted">Haz clic para filtrar por inclinación</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {/* Subida */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSlopeFilter(curr => curr === "subida" ? "todos" : "subida")}
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: selectedSlopeFilter === "subida" ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.05)",
                            border: selectedSlopeFilter === "subida" ? "2px solid var(--color-danger)" : "1px solid rgba(239, 68, 68, 0.2)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div className="flex items-center justify-between font-bold text-xs" style={{ color: "var(--color-danger)" }}>
                            <div className="flex items-center gap-1.5">
                              <ArrowUpRight size={14} />
                              <span>En Subida (&gt; +2%)</span>
                            </div>
                            {selectedSlopeFilter === "subida" && <Check size={12} />}
                          </div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 6 }}>
                            {pacingAnalysis.slopeAnalysis.uphillPaceFormatted}
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {pacingAnalysis.slopeAnalysis.uphillDistanceKm} km · {Math.round(pacingAnalysis.slopeAnalysis.uphillTimeSec / 60)} min
                          </div>
                        </div>

                        {/* Llano */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSlopeFilter(curr => curr === "llano" ? "todos" : "llano")}
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: selectedSlopeFilter === "llano" ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.05)",
                            border: selectedSlopeFilter === "llano" ? "2px solid var(--color-brand)" : "1px solid rgba(59, 130, 246, 0.2)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div className="flex items-center justify-between font-bold text-xs" style={{ color: "var(--color-brand)" }}>
                            <div className="flex items-center gap-1.5">
                              <ArrowRight size={14} />
                              <span>En Llano (-2% a +2%)</span>
                            </div>
                            {selectedSlopeFilter === "llano" && <Check size={12} />}
                          </div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 6 }}>
                            {pacingAnalysis.slopeAnalysis.flatPaceFormatted}
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {pacingAnalysis.slopeAnalysis.flatDistanceKm} km · {Math.round(pacingAnalysis.slopeAnalysis.flatTimeSec / 60)} min
                          </div>
                        </div>

                        {/* Bajada */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSlopeFilter(curr => curr === "bajada" ? "todos" : "bajada")}
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: selectedSlopeFilter === "bajada" ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.05)",
                            border: selectedSlopeFilter === "bajada" ? "2px solid var(--color-success)" : "1px solid rgba(16, 185, 129, 0.2)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div className="flex items-center justify-between font-bold text-xs" style={{ color: "var(--color-success)" }}>
                            <div className="flex items-center gap-1.5">
                              <ArrowDownRight size={14} />
                              <span>En Bajada (&lt; -2%)</span>
                            </div>
                            {selectedSlopeFilter === "bajada" && <Check size={12} />}
                          </div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 6 }}>
                            {pacingAnalysis.slopeAnalysis.downhillPaceFormatted}
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {pacingAnalysis.slopeAnalysis.downhillDistanceKm} km · {Math.round(pacingAnalysis.slopeAnalysis.downhillTimeSec / 60)} min
                          </div>
                        </div>
                      </div>

                      {/* Panel contextual de relieve activo */}
                      {selectedSlopeFilter !== "todos" && (
                        <div
                          style={{
                            marginTop: "var(--space-3)",
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--color-border)",
                            fontSize: "var(--text-xs)",
                            lineHeight: 1.5,
                          }}
                        >
                          {selectedSlopeFilter === "subida" && (
                            <div>
                              <strong>Foco en Subidas:</strong> Representa el {Math.round((pacingAnalysis.slopeAnalysis.uphillDistanceKm / (session.distance_km || 1)) * 100)}% de la distancia total. La pérdida de ritmo en ascensos es natural para mantener el esfuerzo aeróbico controlado sin disparar el lactato.
                            </div>
                          )}
                          {selectedSlopeFilter === "llano" && (
                            <div>
                              <strong>Foco en Llano:</strong> Ritmo de crucero de <strong>{pacingAnalysis.slopeAnalysis.flatPaceFormatted}</strong> sostenido a lo largo de {pacingAnalysis.slopeAnalysis.flatDistanceKm} km. Marca tu velocidad base sostenible en terreno neutro.
                            </div>
                          )}
                          {selectedSlopeFilter === "bajada" && (
                            <div>
                              <strong>Foco en Bajadas:</strong> Aceleración a <strong>{pacingAnalysis.slopeAnalysis.downhillPaceFormatted}</strong>. Controla la zancada y el apoyo del mediopié para minimizar el impacto excéntrico en cuádriceps y rodillas.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Mini Telemetría Interactiva Directa */}
                  {continuousChartData.length > 0 && (
                    <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <BarChart3 size={16} style={{ color: "var(--color-brand)" }} />
                          <span>Curva de Telemetría Interactiva de Ritmo</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(["Ritmo", "FC", "Cadencia", "Altitud"] as const).map((m) => (
                            <button
                              key={m}
                              className={`btn ${pacingMetric === m ? "btn-primary" : "btn-secondary"} text-xs`}
                              style={{ padding: "0.2rem 0.5rem" }}
                              onClick={() => setPacingMetric(m)}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: "100%", height: 220 }}>
                        <ResponsiveContainer>
                          <LineChart data={continuousChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#9aa3b2" fontSize={11} minTickGap={30} />
                            <YAxis
                              stroke="#2f6feb"
                              fontSize={11}
                              reversed={pacingMetric === "Ritmo"}
                              domain={pacingMetric === "Ritmo" ? ["dataMin - 0.2", "dataMax + 0.2"] : ["dataMin - 5", "dataMax + 5"]}
                              tickFormatter={(v) => (pacingMetric === "Ritmo" && typeof v === "number" ? `${Math.floor(v)}:${Math.round((v % 1) * 60).toString().padStart(2, "0")}` : `${v}`)}
                            />
                            <Tooltip
                              contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }}
                              formatter={(value: any, name: any) => {
                                if (name === "Ritmo" && typeof value === "number") {
                                  const min = Math.floor(value);
                                  const sec = Math.round((value - min) * 60);
                                  return [`${min}:${sec.toString().padStart(2, "0")} min/km`, name];
                                }
                                if (name === "FC") return [`${value} lpm`, name];
                                if (name === "Cadencia") return [`${value} ppm`, name];
                                if (name === "Altitud") return [`${value} m`, name];
                                return [value, name];
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey={pacingMetric}
                              stroke={pacingMetric === "Ritmo" ? "#2f6feb" : pacingMetric === "FC" ? "#ef4444" : pacingMetric === "Cadencia" ? "#10b981" : "#8b5cf6"}
                              strokeWidth={2}
                              dot={false}
                              connectNulls
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* 5. Dinámica de Carrera & Biomecánica */}
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <Footprints size={16} style={{ color: "var(--color-brand)" }} />
                      <span>Biomecánica & Eficiencia Locomotriz</span>
                    </div>

                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                      {(pacingAnalysis?.avgStrideLengthM || deep?.avgStrideLengthM) && (
                        <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                          <div className="text-xs text-muted font-medium">Longitud Media Zancada</div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 4 }}>
                            {(pacingAnalysis?.avgStrideLengthM ?? deep?.avgStrideLengthM)?.toFixed(2)} m
                          </div>
                          <div className="text-xs text-faint">
                            {pacingAnalysis?.maxStrideLengthM ? `Máx: ${pacingAnalysis.maxStrideLengthM.toFixed(2)} m` : "Paso medio"}
                          </div>
                        </div>
                      )}

                      {fit?.avgCadence && (
                        <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                          <div className="text-xs text-muted font-medium">Cadencia Media</div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 4 }}>
                            {fit.avgCadence} {isCycling ? "rpm" : "ppm"}
                          </div>
                          <div className="text-xs text-faint">
                            {isCycling ? "Frecuencia de biela" : fit.avgCadence >= 170 ? "Cadencia eficiente" : "Cadencia baja"}
                          </div>
                        </div>
                      )}

                      {deep?.pacingStabilityScore != null && (
                        <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                          <div className="text-xs text-muted font-medium">Regularidad de Ritmo</div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 4 }}>
                            {deep.pacingStabilityScore} / 100
                          </div>
                          <div className="text-xs text-faint">Homogeneidad de paso</div>
                        </div>
                      )}

                      {deep?.aerobicDecouplingPct != null && (
                        <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                          <div className="text-xs text-muted font-medium">Deriva Cardiovascular</div>
                          <div className="text-xl font-bold" style={{ color: Math.abs(deep.aerobicDecouplingPct) < 5 ? "var(--color-success)" : "var(--color-warning)", marginTop: 4 }}>
                            {deep.aerobicDecouplingPct > 0 ? "+" : ""}{deep.aerobicDecouplingPct}%
                          </div>
                          <div className="text-xs text-faint">Desacoplamiento FC/Ritmo</div>
                        </div>
                      )}

                      {(pacingAnalysis?.minAltitudeM != null || fit?.elevationGainM != null) && (
                        <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)" }}>
                          <div className="text-xs text-muted font-medium">Rango Altimétrico</div>
                          <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 4 }}>
                            +{fit?.elevationGainM ?? pacingAnalysis?.elevationGainM ?? 0}m
                          </div>
                          <div className="text-xs text-faint">
                            {pacingAnalysis?.minAltitudeM != null ? `${pacingAnalysis.minAltitudeM}m - ${pacingAnalysis.maxAltitudeM}m alt.` : "Desnivel"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: DISTRIBUCIÓN DE ZONAS (VAM O FC) */}
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

                  {/* ZONAS VAM (Carrera) */}
                  {zoneDist && isRunning && (
                    <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                      <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Target size={16} style={{ color: "var(--color-brand)" }} />
                          Tiempo y Porcentaje por Zona VAM (Dani: 3:59 min/km · 15.06 km/h)
                        </div>
                        {!isRealFit && (
                          <span className="text-xs text-muted italic">
                            Mostrando distribución teórica del plan
                          </span>
                        )}
                      </div>

                      {/* Gráfico de Barras de Tiempo por Zona */}
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

                      {/* Barra Segmentada Visual */}
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
                  )}

                  {/* ZONAS DE FRECUENCIA CARDÍACA (Todos los deportes) */}
                  {hrZoneDist && (
                    <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                        <Heart size={16} style={{ color: "var(--color-danger)" }} />
                        Distribución por Zonas de Frecuencia Cardíaca (FC)
                      </div>

                      {/* Barra Segmentada FC */}
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
                        {hrZoneDist.z1Pct > 0 && (
                          <div title={`Z1 Recuperación: ${hrZoneDist.z1Pct}% (${formatSecondsDetailed(hrZoneDist.z1Sec)})`} style={{ width: `${hrZoneDist.z1Pct}%`, backgroundColor: "#64748b" }} />
                        )}
                        {hrZoneDist.z2Pct > 0 && (
                          <div title={`Z2 Base Aeróbica: ${hrZoneDist.z2Pct}% (${formatSecondsDetailed(hrZoneDist.z2Sec)})`} style={{ width: `${hrZoneDist.z2Pct}%`, backgroundColor: "#10b981" }} />
                        )}
                        {hrZoneDist.z3Pct > 0 && (
                          <div title={`Z3 Tempo: ${hrZoneDist.z3Pct}% (${formatSecondsDetailed(hrZoneDist.z3Sec)})`} style={{ width: `${hrZoneDist.z3Pct}%`, backgroundColor: "#f59e0b" }} />
                        )}
                        {hrZoneDist.z4Pct > 0 && (
                          <div title={`Z4 Umbral: ${hrZoneDist.z4Pct}% (${formatSecondsDetailed(hrZoneDist.z4Sec)})`} style={{ width: `${hrZoneDist.z4Pct}%`, backgroundColor: "#8b5cf6" }} />
                        )}
                        {hrZoneDist.z5Pct > 0 && (
                          <div title={`Z5 VO2max: ${hrZoneDist.z5Pct}% (${formatSecondsDetailed(hrZoneDist.z5Sec)})`} style={{ width: `${hrZoneDist.z5Pct}%`, backgroundColor: "#ef4444" }} />
                        )}
                      </div>

                      {/* Tabla Zonas FC */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-muted)" }}>
                              <th style={{ padding: "8px 4px" }}>Zona FC</th>
                              <th style={{ padding: "8px 4px" }}>Rango FC</th>
                              <th style={{ padding: "8px 4px" }}>Tiempo</th>
                              <th style={{ padding: "8px 4px" }}>% Total</th>
                              <th style={{ padding: "8px 4px" }}>Impacto Fisiológico</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "8px 4px" }}>
                                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#94a3b8" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#64748b" }} />
                                  Z1 Recuperación
                                </span>
                              </td>
                              <td style={{ padding: "8px 4px" }}>&lt; 60% FCmáx</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{formatSecondsDetailed(hrZoneDist.z1Sec)}</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{hrZoneDist.z1Pct}%</td>
                              <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Regeneración activa, calentamiento y vuelta a la calma</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "8px 4px" }}>
                                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#10b981" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                                  Z2 Base Aeróbica
                                </span>
                              </td>
                              <td style={{ padding: "8px 4px" }}>60% – 70% FCmáx</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700, color: "#10b981" }}>{formatSecondsDetailed(hrZoneDist.z2Sec)}</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{hrZoneDist.z2Pct}%</td>
                              <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Oxidación máxima de grasas y base mitocondrial</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "8px 4px" }}>
                                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#f59e0b" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                                  Z3 Tempo / Aeróbica
                                </span>
                              </td>
                              <td style={{ padding: "8px 4px" }}>70% – 80% FCmáx</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700, color: "#f59e0b" }}>{formatSecondsDetailed(hrZoneDist.z3Sec)}</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{hrZoneDist.z3Pct}%</td>
                              <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Resistencia aeróbica media y ritmo sostenido</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                              <td style={{ padding: "8px 4px" }}>
                                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#8b5cf6" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#8b5cf6" }} />
                                  Z4 Umbral Anaeróbico
                                </span>
                              </td>
                              <td style={{ padding: "8px 4px" }}>80% – 90% FCmáx</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700, color: "#8b5cf6" }}>{formatSecondsDetailed(hrZoneDist.z4Sec)}</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{hrZoneDist.z4Pct}%</td>
                              <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Tolerancia al lactato y alta demanda glucolítica</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "8px 4px" }}>
                                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#ef4444" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                                  Z5 Potencia / VO2máx
                                </span>
                              </td>
                              <td style={{ padding: "8px 4px" }}>&gt; 90% FCmáx</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700, color: "#ef4444" }}>{formatSecondsDetailed(hrZoneDist.z5Sec)}</td>
                              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{hrZoneDist.z5Pct}%</td>
                              <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Picos de esfuerzo máximo, WODs intensos y series</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 3: GRÁFICOS & CURVAS */}
              {activeTab === "charts" && (
                <div className="grid gap-4">
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <BarChart3 size={16} style={{ color: "var(--color-brand)" }} />
                        <span>Gráficos & Curvas Continuas</span>
                        {timeSeries.length > 0 && (
                          <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>
                            Telemetría {timeSeries.length} pts
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          className={`btn ${activeChart === "pace_hr" ? "btn-primary" : "btn-secondary"} text-xs`}
                          style={{ padding: "0.25rem 0.6rem" }}
                          onClick={() => setActiveChart("pace_hr")}
                        >
                          {isCycling ? "Velocidad & FC" : "Ritmo & FC"}
                        </button>
                        {continuousChartData.some((pt: any) => pt.Altitud != null && pt.Altitud > 0) && (
                          <button
                            className={`btn ${activeChart === "elevation_pace" ? "btn-primary" : "btn-secondary"} text-xs flex items-center gap-1.5`}
                            style={{ padding: "0.25rem 0.6rem" }}
                            onClick={() => setActiveChart("elevation_pace")}
                          >
                            <Mountain size={13} />
                            <span>Perfil Altimetría & Ritmo</span>
                          </button>
                        )}
                        {continuousChartData.some((pt: any) => pt.Cadencia != null) && (
                          <button
                            className={`btn ${activeChart === "cadence_stride" ? "btn-primary" : "btn-secondary"} text-xs`}
                            style={{ padding: "0.25rem 0.6rem" }}
                            onClick={() => setActiveChart("cadence_stride")}
                          >
                            {isRunning ? "Cadencia & Zancada" : "Cadencia"}
                          </button>
                        )}
                        {(zoneDist || hrZoneDist) && (
                          <button
                            className={`btn ${activeChart === "zones" ? "btn-primary" : "btn-secondary"} text-xs`}
                            style={{ padding: "0.25rem 0.6rem" }}
                            onClick={() => setActiveChart("zones")}
                          >
                            {zoneDist && isRunning ? "Zonas VAM" : "Zonas FC"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gráfico 1: Ritmo / Velocidad Continuo vs Pulso */}
                    {activeChart === "pace_hr" && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          {isCycling
                            ? "Curva continua • Eje izquierdo: Velocidad (km/h) • Eje derecho: Pulso cardíaco (lpm)."
                            : "Curva continua • Eje izquierdo: Ritmo (min/km, invertido para que arriba sea más rápido) • Eje derecho: Pulso cardíaco (lpm)."}
                        </div>
                        <div style={{ width: "100%", height: 260 }}>
                          <ResponsiveContainer>
                            <LineChart data={continuousChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="label" stroke="#9aa3b2" fontSize={11} minTickGap={25} />
                              <YAxis
                                yAxisId="left"
                                stroke="#2f6feb"
                                fontSize={11}
                                reversed={!isCycling}
                                domain={!isCycling ? ["dataMin - 0.2", "dataMax + 0.2"] : [0, "auto"]}
                                tickFormatter={(v) => (!isCycling && typeof v === "number" ? `${Math.floor(v)}:${Math.round((v % 1) * 60).toString().padStart(2, "0")}` : `${v}`)}
                              />
                              <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} domain={["dataMin - 5", "dataMax + 5"]} />
                              <Tooltip
                                contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any, name: any) => {
                                  if (name === "Ritmo" && typeof value === "number") {
                                    const m = Math.floor(value);
                                    const s = Math.round((value - m) * 60);
                                    return [`${m}:${s.toString().padStart(2, "0")} min/km`, name];
                                  }
                                  if (name === "FC") return [`${value} lpm`, name];
                                  if (name === "Velocidad") return [`${value} km/h`, name];
                                  return [value, name];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey={isCycling ? "Velocidad" : "Ritmo"}
                                stroke="#2f6feb"
                                strokeWidth={2}
                                dot={timeSeries.length > 50 ? false : { r: 3 }}
                                connectNulls
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="FC"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={timeSeries.length > 50 ? false : { r: 3 }}
                                connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Gráfico 2: Perfil Altimétrico & Ritmo */}
                    {activeChart === "elevation_pace" && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          Perfil topográfico continuo (m de altitud) combinado con ritmo de carrera.
                        </div>
                        <div style={{ width: "100%", height: 260 }}>
                          <ResponsiveContainer>
                            <AreaChart data={continuousChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="altitudeGradientModal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="label" stroke="#9aa3b2" fontSize={11} minTickGap={25} />
                              <YAxis yAxisId="alt" stroke="#10b981" fontSize={11} unit="m" domain={["dataMin - 10", "dataMax + 10"]} />
                              <YAxis
                                yAxisId="pace"
                                orientation="right"
                                stroke="#38bdf8"
                                fontSize={11}
                                reversed={!isCycling}
                                tickFormatter={(v) => (!isCycling && typeof v === "number" ? `${Math.floor(v)}:${Math.round((v % 1) * 60).toString().padStart(2, "0")}` : `${v}`)}
                              />
                              <Tooltip
                                contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any, name: any) => {
                                  if (name === "Altitud") return [`${value} m`, name];
                                  if (name === "Ritmo" && typeof value === "number") {
                                    const m = Math.floor(value);
                                    const s = Math.round((value - m) * 60);
                                    return [`${m}:${s.toString().padStart(2, "0")} min/km`, name];
                                  }
                                  return [value, name];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Area yAxisId="alt" type="monotone" dataKey="Altitud" stroke="#10b981" fillOpacity={1} fill="url(#altitudeGradientModal)" strokeWidth={2} />
                              <Line yAxisId="pace" type="monotone" dataKey={isCycling ? "Velocidad" : "Ritmo"} stroke="#38bdf8" strokeWidth={1.8} dot={false} connectNulls />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Gráfico 3: Cadencia & Zancada */}
                    {activeChart === "cadence_stride" && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          Evolución continua de cadencia ({isCycling ? "rpm" : "ppm"}) y longitud de zancada (metros).
                        </div>
                        <div style={{ width: "100%", height: 260 }}>
                          <ResponsiveContainer>
                            <LineChart data={continuousChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                              <XAxis dataKey="label" stroke="#9aa3b2" fontSize={11} minTickGap={25} />
                              <YAxis yAxisId="cad" stroke="#10b981" fontSize={11} domain={isCycling ? [50, 120] : [140, 205]} unit={isCycling ? " rpm" : " ppm"} />
                              {continuousChartData.some((p: any) => p.Zancada != null) && (
                                <YAxis yAxisId="stride" orientation="right" stroke="#f59e0b" fontSize={11} domain={[0.6, 2.2]} unit=" m" />
                              )}
                              <Tooltip
                                contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }}
                                formatter={(value: any, name: any) => {
                                  if (name === "Cadencia") return [`${value} ${isCycling ? "rpm" : "ppm"}`, name];
                                  if (name === "Zancada") return [`${value} m`, name];
                                  return [value, name];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Line yAxisId="cad" type="monotone" dataKey="Cadencia" stroke="#10b981" strokeWidth={2} dot={timeSeries.length > 50 ? false : { r: 3 }} connectNulls />
                              {continuousChartData.some((p: any) => p.Zancada != null) && (
                                <Line yAxisId="stride" type="monotone" dataKey="Zancada" stroke="#f59e0b" strokeWidth={2} dot={timeSeries.length > 50 ? false : { r: 3 }} connectNulls />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Gráfico 4: Zonas (VAM o FC) */}
                    {activeChart === "zones" && (zoneDist || hrZoneDist) && (
                      <div>
                        <div className="text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                          {zoneDist && isRunning
                            ? "Minutos acumulados por zona de ritmo (VAM 3:59 min/km)."
                            : "Minutos acumulados por zona de frecuencia cardíaca."}
                        </div>
                        <div style={{ width: "100%", height: 230 }}>
                          <ResponsiveContainer>
                            <BarChart data={zoneDist && isRunning ? zoneChartData : hrZoneChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
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
                                {(zoneDist && isRunning ? zoneChartData : hrZoneChartData).map((entry, index) => (
                                  <Cell key={`cell-chart-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
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
                    <div className="text-xs uppercase text-muted font-semibold flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                      <ListOrdered size={13} style={{ color: "var(--color-brand)" }} />
                      <span>Tabla de Parciales ({laps.length} vueltas registradas)</span>
                    </div>
                    <table style={{ width: "100%", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-muted)" }}>
                          <th style={{ padding: "6px 8px" }}>Vuelta #</th>
                          <th style={{ padding: "6px 8px" }}>Distancia</th>
                          <th style={{ padding: "6px 8px" }}>Tiempo</th>
                          <th style={{ padding: "6px 8px" }}>{isSwimming ? "Ritmo /100m" : isCycling ? "Velocidad" : "Ritmo"}</th>
                          <th style={{ padding: "6px 8px" }}>FC Media</th>
                          <th style={{ padding: "6px 8px" }}>{isSwimming ? "Brazadas / SWOLF" : isCycling ? "Potencia / Cadencia" : "Cadencia"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laps.map((lap: any) => (
                          <tr key={lap.index} style={{ borderBottom: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>#{lap.index}</td>
                            <td style={{ padding: "6px 8px" }}>
                              {lap.distanceKm !== null
                                ? isSwimming
                                  ? `${Math.round(lap.distanceKm * 1000)} m`
                                  : `${lap.distanceKm} km`
                                : "—"}
                            </td>
                            <td style={{ padding: "6px 8px" }}>{formatDurationDetailed(lap.durationMin)}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--color-brand)" }}>
                              {isSwimming
                                ? lap.pace100mFormatted || (lap.avgPaceMinKm ? formatPace(lap.avgPaceMinKm) : "—")
                                : isCycling
                                ? lap.avgSpeedKmh ? `${lap.avgSpeedKmh} km/h` : formatPace(lap.avgPaceMinKm)
                                : formatPace(lap.avgPaceMinKm)}
                            </td>
                            <td style={{ padding: "6px 8px", color: lap.avgHeartRate ? "var(--color-danger)" : "inherit" }}>
                              {lap.avgHeartRate ? `${lap.avgHeartRate} lpm` : "—"}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              {isSwimming
                                ? `${lap.totalStrokes ? `${lap.totalStrokes} br` : ""}${lap.avgSwolf ? ` · SWOLF ${lap.avgSwolf}` : "—"}`
                                : isCycling
                                ? `${lap.avgPowerWatts ? `${lap.avgPowerWatts} W` : ""}${lap.avgCadence ? ` · ${lap.avgCadence} rpm` : "—"}`
                                : lap.avgCadence ? `${lap.avgCadence} ppm` : "—"}
                            </td>
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
