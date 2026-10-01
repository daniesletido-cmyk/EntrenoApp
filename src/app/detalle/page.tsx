"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  Clock,
  Heart,
  Zap,
  Mountain,
  Target,
  Moon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { todayISO } from "@/lib/dates";

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
  realizada: { label: "Realizada", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  parcial: { label: "Parcial", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  pendiente: { label: "Pendiente", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  no_realizada: { label: "No realizada", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
};

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "—";
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s > 0 ? `${s}s` : ""}`.trim();
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}

function formatPaceLocal(minKm: number | null | undefined): string {
  if (minKm === null || minKm === undefined) return "—";
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

function rpeDescription(rpe: number | null): string {
  if (rpe === null) return "Sin registrar";
  if (rpe <= 2) return "Muy suave · Regenerativo";
  if (rpe <= 4) return "Suave / Cómodo · Base aeróbica R1";
  if (rpe <= 6) return "Moderado / Duro · Tempo / Umbral R2";
  if (rpe <= 8) return "Muy duro · Sub-VAM / Umbral anaeróbico";
  return "Máximo esfuerzo · Series VAM / All-out";
}

function DetalleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSessionId = searchParams.get("id");

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialSessionId ? Number(initialSessionId) : null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "zones" | "laps" | "gym" | "readiness">("general");

  // Cargar lista de sesiones recientes
  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((res) => {
        const list = res.sessions ?? [];
        setAllSessions(list);
        if (!selectedId && list.length > 0) {
          // Elegir la más reciente completada o de hoy
          const today = todayISO();
          const todaySession = list.find((s: any) => s.date === today);
          const latestDone = list.find((s: any) => s.status === "realizada");
          setSelectedId(todaySession ? todaySession.id : latestDone ? latestDone.id : list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Cargar detalle de la sesión seleccionada
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/sessions/${selectedId}`)
      .then((r) => r.json())
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleSelectSession = (id: number) => {
    setSelectedId(id);
    router.replace(`/detalle?id=${id}`);
  };

  const session = data?.session;
  const fit = data?.fitSummary;
  const gym = data?.gymDetails ?? [];
  const sleep = data?.sleep;
  const readiness = data?.readiness;
  const load = data?.load;

  const IconComp = session?.discipline ? DISCIPLINE_ICON[session.discipline] ?? MoreHorizontal : Activity;
  const statusInfo = session ? STATUS_LABEL[session.status] ?? STATUS_LABEL.pendiente : STATUS_LABEL.pendiente;

  const laps = fit?.laps ?? [];
  const deep = fit?.deepAnalysis;
  const zoneDist = deep?.zoneDistribution;

  return (
    <div>
      <PageHeader
        title="Detalle del Entrenamiento"
        description="Panel exhaustivo con todas las métricas, fisiología, zonas VAM, laps y cargas al detalle."
      />

      {/* Selector rápido de sesiones */}
      <div className="surface" style={{ padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div className="text-xs uppercase font-semibold text-muted" style={{ marginBottom: "var(--space-2)" }}>
          Selecciona un entrenamiento para ver todo su detalle:
        </div>
        <div className="flex items-center gap-2" style={{ overflowX: "auto", paddingBottom: 4 }}>
          {allSessions.slice(0, 10).map((s: any) => {
            const isSel = s.id === selectedId;
            const Icon = DISCIPLINE_ICON[s.discipline] ?? MoreHorizontal;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`btn ${isSel ? "btn-primary" : "btn-secondary"} text-xs flex items-center gap-1.5`}
                style={{
                  flexShrink: 0,
                  padding: "0.4rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <Icon size={14} />
                <span>
                  {s.date.slice(5)} · {s.planned_code || DISCIPLINE_LABEL[s.discipline] || s.discipline}
                </span>
                {s.status === "realizada" && <span style={{ opacity: 0.8 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="surface flex items-center justify-center" style={{ height: 260 }}>
          <div className="text-sm text-muted animate-pulse">Cargando métricas y análisis detallado...</div>
        </div>
      ) : !session ? (
        <div className="surface text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
          Selecciona una sesión de la lista para ver todos sus datos.
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Tarjeta de Cabecera del Entreno */}
          <div
            className="surface"
            style={{
              padding: "var(--space-4)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-brand-subtle)",
                    color: "var(--color-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>
                      {session.planned_code || DISCIPLINE_LABEL[session.discipline] || "Entrenamiento"}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 10px",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                    {session.is_long_run ? (
                      <span className="badge badge-brand" style={{ fontSize: "0.75rem" }}>
                        ⭐ Tirada Larga
                      </span>
                    ) : null}
                    {session.is_extra ? (
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                        Sesión Extra
                      </span>
                    ) : null}
                    {session.fit_backup || session.fit_data || fit ? (
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                        ⌚ Archivo .FIT
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-2" style={{ marginTop: 4 }}>
                    <Calendar size={13} />
                    <span>
                      {new Date(`${session.date}T12:00:00`).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>{DISCIPLINE_LABEL[session.discipline] ?? session.discipline}</span>
                  </div>
                </div>
              </div>

              {/* Botón directo para registrar o editar */}
              <button
                className="btn btn-secondary text-xs"
                onClick={() => router.push("/registro")}
              >
                Ir a Registro
              </button>
            </div>

            {/* Pestañas de Navegación del Detalle */}
            <div
              className="flex items-center gap-1.5"
              style={{
                marginTop: "var(--space-4)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--color-border)",
                overflowX: "auto",
              }}
            >
              <button
                className={`btn ${activeTab === "general" ? "btn-primary" : "btn-ghost"} text-xs`}
                style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                onClick={() => setActiveTab("general")}
              >
                📊 Resumen & Fisiología
              </button>
              {session.discipline === "carrera" && (
                <button
                  className={`btn ${activeTab === "zones" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("zones")}
                >
                  🎯 Zonas VAM (3:59)
                </button>
              )}
              {laps.length > 0 && (
                <button
                  className={`btn ${activeTab === "laps" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("laps")}
                >
                  ⏱️ Parciales y Vueltas ({laps.length})
                </button>
              )}
              {gym.length > 0 && (
                <button
                  className={`btn ${activeTab === "gym" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("gym")}
                >
                  🏋️ Ejercicios de Fuerza ({gym.length})
                </button>
              )}
              <button
                className={`btn ${activeTab === "readiness" ? "btn-primary" : "btn-ghost"} text-xs`}
                style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                onClick={() => setActiveTab("readiness")}
              >
                🌙 Recuperación & Contexto
              </button>
            </div>
          </div>

          {/* CONTENIDO DE PESTAÑAS */}

          {/* 1. RESUMEN & FISIOLOGÍA */}
          {activeTab === "general" && (
            <div className="grid gap-4">
              {/* Grid de KPIs exhaustivos */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="text-xs text-muted font-medium flex items-center gap-1">
                    <Clock size={12} /> Duración Total
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                    {formatDuration(session.duration_min)}
                  </div>
                  <div className="text-xs text-faint">{session.duration_min ? `${session.duration_min} min` : "—"}</div>
                </div>

                <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="text-xs text-muted font-medium flex items-center gap-1">
                    <Footprints size={12} /> Distancia
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                    {session.distance_km !== null ? `${session.distance_km} km` : "—"}
                  </div>
                  <div className="text-xs text-faint">
                    {session.distance_km ? `${Math.round(session.distance_km * 1000)} metros` : "Sin GPS / Indoor"}
                  </div>
                </div>

                {session.discipline === "carrera" && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Zap size={12} /> Ritmo Medio
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                      {formatPaceLocal(load?.avgPaceMinKm ?? fit?.avgPaceMinKm)}
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
                  <div className="text-xl font-bold" style={{ color: "var(--color-warning)", marginTop: 2 }}>
                    {session.rpe !== null ? `${session.rpe} / 10` : "—"}
                  </div>
                  <div className="text-xs text-faint">{rpeDescription(session.rpe)}</div>
                </div>

                <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="text-xs text-muted font-medium flex items-center gap-1">
                    <Flame size={12} /> Carga Foster
                  </div>
                  <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
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
                    <div className="text-xl font-bold" style={{ color: "var(--color-danger)", marginTop: 2 }}>
                      {fit.avgHeartRate} lpm
                    </div>
                    <div className="text-xs text-faint">
                      {fit.maxHeartRate ? `Máxima: ${fit.maxHeartRate} lpm` : "Monitorizada"}
                    </div>
                  </div>
                )}

                {fit?.avgCadence != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Activity size={12} /> Cadencia
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                      {fit.avgCadence} ppm
                    </div>
                    <div className="text-xs text-faint">
                      {fit.avgCadence >= 170 ? "Cadencia eficiente" : "Mejorable (>170 ppm)"}
                    </div>
                  </div>
                )}

                {fit?.elevationGainM != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Mountain size={12} /> Desnivel +
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                      +{fit.elevationGainM} m
                    </div>
                    <div className="text-xs text-faint">Altimetría ascendida</div>
                  </div>
                )}

                {deep?.aerobicDecouplingPct != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <TrendingUp size={12} /> Desacoplamiento
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{
                        color: Math.abs(deep.aerobicDecouplingPct) < 5 ? "var(--color-success)" : "var(--color-warning)",
                        marginTop: 2,
                      }}
                    >
                      {deep.aerobicDecouplingPct > 0 ? "+" : ""}
                      {deep.aerobicDecouplingPct}%
                    </div>
                    <div className="text-xs text-faint">
                      {Math.abs(deep.aerobicDecouplingPct) < 5 ? "Excelente (<5%)" : "Deriva por fatiga (>5%)"}
                    </div>
                  </div>
                )}

                {deep?.pacingStabilityScore != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Award size={12} /> Estabilidad Ritmo
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                      {deep.pacingStabilityScore} / 100
                    </div>
                    <div className="text-xs text-faint">Consistencia de paso</div>
                  </div>
                )}
              </div>

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

          {/* 2. ZONAS VAM */}
          {activeTab === "zones" && (
            <div className="grid gap-4">
              <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Target size={16} style={{ color: "var(--color-brand)" }} />
                    Zonas de Intensidad VAM (Dani: 3:59 min/km · 15.06 km/h)
                  </div>
                  {zoneDist?.targetZoneName && (
                    <span className="badge badge-brand" style={{ fontSize: "0.75rem" }}>
                      🎯 Objetivo: {zoneDist.targetZoneName} ({zoneDist.targetCompliancePct ?? 0}% en zona)
                    </span>
                  )}
                </div>

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
                        title={`R0 Regenerativo: ${zoneDist.r0Pct}%`}
                        style={{ width: `${zoneDist.r0Pct}%`, backgroundColor: "#64748b" }}
                      />
                    )}
                    {zoneDist.r1Pct > 0 && (
                      <div
                        title={`R1 Base Aeróbica: ${zoneDist.r1Pct}%`}
                        style={{ width: `${zoneDist.r1Pct}%`, backgroundColor: "#10b981" }}
                      />
                    )}
                    {zoneDist.r2Pct > 0 && (
                      <div
                        title={`R2 Tempo: ${zoneDist.r2Pct}%`}
                        style={{ width: `${zoneDist.r2Pct}%`, backgroundColor: "#f59e0b" }}
                      />
                    )}
                    {zoneDist.r3Pct > 0 && (
                      <div
                        title={`R4 Sub-VAM / Maratón: ${zoneDist.r3Pct}%`}
                        style={{ width: `${zoneDist.r3Pct}%`, backgroundColor: "#8b5cf6" }}
                      />
                    )}
                    {zoneDist.r5Pct > 0 && (
                      <div
                        title={`R5 Series / VAM: ${zoneDist.r5Pct}%`}
                        style={{ width: `${zoneDist.r5Pct}%`, backgroundColor: "#ef4444" }}
                      />
                    )}
                  </div>
                )}

                {/* Tabla de Zonas */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "var(--text-xs)", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left", color: "var(--color-text-muted)" }}>
                        <th style={{ padding: "8px 4px" }}>Zona VAM</th>
                        <th style={{ padding: "8px 4px" }}>Rango Ritmo</th>
                        <th style={{ padding: "8px 4px" }}>% Tiempo</th>
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
                        <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist ? `${zoneDist.r5Pct}%` : "—"}</td>
                        <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Potencia aeróbica máxima (VO2max) y velocidad</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PARCIALES Y VUELTAS */}
          {activeTab === "laps" && (
            <div className="grid gap-4">
              {laps.length >= 3 && (
                <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="text-xs uppercase text-muted font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                    📈 Curva de Ritmo y Frecuencia Cardíaca por Vuelta
                  </div>
                  <div style={{ width: "100%", height: 210 }}>
                    <ResponsiveContainer>
                      <LineChart data={laps.map((l: any) => ({ vuelta: l.index, Ritmo: l.avgPaceMinKm, FC: l.avgHeartRate }))}>
                        <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                        <XAxis dataKey="vuelta" stroke="#9aa3b2" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#9aa3b2" fontSize={11} reversed />
                        <YAxis yAxisId="right" orientation="right" stroke="#9aa3b2" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line yAxisId="left" type="monotone" dataKey="Ritmo" stroke="#2f6feb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

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
                        <td style={{ padding: "6px 8px" }}>{formatDuration(lap.durationMin)}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--color-brand)" }}>
                          {formatPaceLocal(lap.avgPaceMinKm)}
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

          {/* 4. FUERZA / GIMNASIO */}
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

          {/* 5. RECUPERACIÓN & CONTEXTO */}
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
        </div>
      )}
    </div>
  );
}

export default function DetallePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted p-4">Cargando...</div>}>
      <DetalleContent />
    </Suspense>
  );
}
