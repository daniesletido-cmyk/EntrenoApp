"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
  AlertTriangle,
  CalendarDays,
  Sparkles,
  BarChart3,
  UploadCloud,
  FileCheck,
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
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import WeekSwitcher from "@/components/week-switcher";
import {
  todayISO,
  weekStartOf,
  weekDates,
  DAY_NAMES_ES,
} from "@/lib/dates";
import { formatSecondsDetailed } from "@/lib/fit-feedback";

const DISCIPLINE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  carrera: Footprints,
  gimnasio: Dumbbell,
  natacion: Waves,
  crossfit: Flame,
  otro: MoreHorizontal,
  descanso: Moon,
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

  const today = todayISO();
  const initialSessionId = searchParams.get("id");
  const initialDate = searchParams.get("date") ?? today;

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [weekStart, setWeekStart] = useState<string>(weekStartOf(initialDate));
  const [weekSessions, setWeekSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    initialSessionId ? Number(initialSessionId) : null
  );
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "zones" | "charts" | "laps" | "gym" | "readiness">("general");
  const [activeChart, setActiveChart] = useState<"pace_hr" | "zones" | "cadence">("pace_hr");
  const [uploadingFit, setUploadingFit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const days = weekDates(weekStart);

  // 1. Cargar las sesiones de la semana activa
  useEffect(() => {
    fetch(`/api/sessions?week=${weekStart}`)
      .then((r) => r.json())
      .then((res) => {
        const list = res.sessions ?? [];
        setWeekSessions(list);

        // Si ya hay una sesión seleccionada por ID
        if (selectedSessionId) {
          const found = list.find((s: any) => s.id === selectedSessionId);
          if (found) {
            setSelectedDate(found.date);
            return;
          }
        }

        // Si no, auto-seleccionar la sesión del selectedDate
        const dayList = list.filter((s: any) => s.date === selectedDate && s.discipline !== "descanso");
        if (dayList.length > 0) {
          setSelectedSessionId(dayList[0].id);
        } else {
          // Si el día actual no tiene sesiones, buscar el día más cercano con sesiones
          const firstWithSession = list.find((s: any) => s.discipline !== "descanso");
          if (firstWithSession) {
            setSelectedDate(firstWithSession.date);
            setSelectedSessionId(firstWithSession.id);
          } else {
            setSelectedSessionId(null);
          }
        }
      })
      .catch(() => {});
  }, [weekStart]);

  // 2. Al cambiar de día, seleccionar automáticamente la primera sesión de ese día
  const handleSelectDay = (date: string) => {
    setSelectedDate(date);
    const dayList = weekSessions.filter((s) => s.date === date && s.discipline !== "descanso");
    if (dayList.length > 0) {
      setSelectedSessionId(dayList[0].id);
      router.replace(`/detalle?id=${dayList[0].id}&date=${date}`);
    } else {
      setSelectedSessionId(null);
      setSessionDetail(null);
      router.replace(`/detalle?date=${date}`);
    }
  };

  // 3. Al cambiar de sesión directamente
  const handleSelectSession = (id: number) => {
    setSelectedSessionId(id);
    const s = weekSessions.find((item) => item.id === id);
    if (s) {
      setSelectedDate(s.date);
      router.replace(`/detalle?id=${id}&date=${s.date}`);
    }
  };

  // 4. Cambiar de fecha directamente desde el input de fecha
  const handleDirectDateChange = (date: string) => {
    if (!date) return;
    setSelectedDate(date);
    const newWeek = weekStartOf(date);
    if (newWeek !== weekStart) {
      setWeekStart(newWeek);
    } else {
      handleSelectDay(date);
    }
  };

  // 5. Cargar detalle profundo de la sesión seleccionada
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      return;
    }
    setLoadingSession(true);
    fetch(`/api/sessions/${selectedSessionId}`)
      .then((r) => r.json())
      .then((res) => setSessionDetail(res))
      .catch(() => {})
      .finally(() => setLoadingSession(false));
  }, [selectedSessionId]);

  // Subida directa de archivo .FIT
  async function handleDirectFitUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedSessionId) return;
    setUploadingFit(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sessions/import-fit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo leer el archivo .fit");
        return;
      }
      const { summary } = data;
      await fetch(`/api/sessions/${selectedSessionId}`, {
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

      // Recargar detalles y lista semanal
      const resDetail = await fetch(`/api/sessions/${selectedSessionId}`).then((r) => r.json());
      setSessionDetail(resDetail);
      fetch(`/api/sessions?week=${weekStart}`)
        .then((r) => r.json())
        .then((res) => setWeekSessions(res.sessions ?? []));
    } catch {
      alert("Error al cargar el archivo .fit");
    } finally {
      setUploadingFit(false);
      e.target.value = "";
    }
  }

  const currentDaySessions = weekSessions.filter(
    (s) => s.date === selectedDate && s.discipline !== "descanso"
  );

  const session = sessionDetail?.session;
  const fit = sessionDetail?.fitSummary;
  const structuredFeedback = sessionDetail?.structuredFeedback;
  const zoneDist = sessionDetail?.zoneDistribution;
  const laps = sessionDetail?.laps ?? fit?.laps ?? [];
  const isRealFit = sessionDetail?.isRealFit ?? !!(fit || session?.fit_data);
  const gym = sessionDetail?.gymDetails ?? [];
  const sleep = sessionDetail?.sleep;
  const readiness = sessionDetail?.readiness;
  const load = sessionDetail?.load;

  const IconComp = session?.discipline ? DISCIPLINE_ICON[session.discipline] ?? MoreHorizontal : Activity;
  const statusInfo = session ? STATUS_LABEL[session.status] ?? STATUS_LABEL.pendiente : STATUS_LABEL.pendiente;
  const deep = fit?.deepAnalysis;

  // Datos para gráfico de barras de zonas VAM
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
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".fit"
        onChange={handleDirectFitUpload}
        style={{ display: "none" }}
      />

      <PageHeader
        title="Detalle del Entrenamiento"
        description="Selecciona cualquier día en el calendario para inspeccionar sus métricas, zonas VAM, laps y cargas."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted font-medium flex items-center gap-1">
              <CalendarDays size={14} />
              <span>Ir al día:</span>
            </label>
            <input
              type="date"
              className="field-input text-xs"
              style={{ width: 140, padding: "4px 8px", height: 36, borderRadius: "var(--radius-md)" }}
              value={selectedDate}
              onChange={(e) => handleDirectDateChange(e.target.value)}
            />
          </div>
        }
      />

      {/* Navegador Semanal */}
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {/* SELECTOR DE DÍAS (Lunes a Domingo) */}
      <div className="surface" style={{ padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div className="text-xs uppercase font-semibold text-muted" style={{ marginBottom: "var(--space-2)" }}>
          📅 Selecciona un día para ver sus entrenamientos:
        </div>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
          }}
        >
          {days.map((date, idx) => {
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const daySess = weekSessions.filter((s) => s.date === date && s.discipline !== "descanso");
            const dayNum = date.split("-")[2];

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleSelectDay(date)}
                className="surface-interactive text-left flex flex-col justify-between"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected
                    ? "var(--color-brand)"
                    : isToday
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                  backgroundColor: isSelected
                    ? "var(--color-surface-hover)"
                    : isToday
                    ? "rgba(16, 185, 129, 0.05)"
                    : "var(--color-surface-raised)",
                  minHeight: 80,
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="font-bold text-xs"
                      style={{
                        color: isSelected
                          ? "var(--color-brand)"
                          : isToday
                          ? "var(--color-accent)"
                          : "var(--color-text)",
                      }}
                    >
                      {DAY_NAMES_ES[idx].slice(0, 3)} {dayNum}
                    </span>
                    {isToday && (
                      <span className="badge badge-accent" style={{ fontSize: "0.6rem", padding: "1px 4px" }}>
                        Hoy
                      </span>
                    )}
                  </div>

                  <div className="grid gap-1" style={{ marginTop: 6 }}>
                    {daySess.length === 0 ? (
                      <span className="text-faint text-xs italic">Descanso</span>
                    ) : (
                      daySess.map((ds) => {
                        const SIcon = DISCIPLINE_ICON[ds.discipline] ?? MoreHorizontal;
                        return (
                          <div
                            key={ds.id}
                            className="flex items-center gap-1 text-xs truncate"
                            style={{
                              color: ds.status === "realizada" ? "var(--color-success)" : "var(--color-text-muted)",
                            }}
                          >
                            <SIcon size={11} style={{ flexShrink: 0 }} />
                            <span className="truncate font-medium">
                              {ds.planned_code || DISCIPLINE_LABEL[ds.discipline] || ds.discipline}
                            </span>
                            {ds.status === "realizada" && <span style={{ fontSize: "0.65rem" }}>✓</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SI ESE DÍA TIENE MÚLTIPLES SESIONES, MOSTRAR SELECTOR DE SESIÓN */}
      {currentDaySessions.length > 1 && (
        <div
          className="surface flex flex-wrap items-center gap-2"
          style={{
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            backgroundColor: "var(--color-surface-raised)",
          }}
        >
          <span className="text-xs font-semibold text-muted">Sesiones de este día:</span>
          {currentDaySessions.map((s, i) => {
            const isSel = s.id === selectedSessionId;
            const SIcon = DISCIPLINE_ICON[s.discipline] ?? MoreHorizontal;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`btn ${isSel ? "btn-primary" : "btn-secondary"} text-xs flex items-center gap-1.5`}
                style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-full)" }}
              >
                <SIcon size={13} />
                <span>
                  {i + 1}. {s.planned_code || DISCIPLINE_LABEL[s.discipline] || s.discipline}
                </span>
                {s.status === "realizada" && <span style={{ opacity: 0.8 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* CONTENIDO PRINCIPAL DE LA SESIÓN SELECCIONADA */}
      {currentDaySessions.length === 0 ? (
        <div className="surface text-center" style={{ padding: "var(--space-8) var(--space-4)" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto var(--space-3) auto",
              color: "var(--color-text-muted)",
            }}
          >
            <Moon size={26} />
          </div>
          <h3 className="font-semibold text-base">Día de Descanso o Sin Sesiones</h3>
          <p className="text-xs text-muted" style={{ maxWidth: 420, margin: "var(--space-2) auto var(--space-4) auto" }}>
            No hay ninguna sesión de entrenamiento planificada para el{" "}
            <strong>
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </strong>
            . Puedes seleccionar otro día con entrenamiento o añadir una sesión en Plan Semanal.
          </p>
          <button className="btn btn-secondary text-xs" onClick={() => router.push("/plan-semanal")}>
            Ir a Plan Semanal
          </button>
        </div>
      ) : loadingSession ? (
        <div className="surface flex items-center justify-center" style={{ height: 260 }}>
          <div className="text-sm text-muted animate-pulse">Cargando métricas completas del entrenamiento...</div>
        </div>
      ) : !session ? (
        <div className="surface text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
          Selecciona una sesión para cargar los datos.
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
                    {isRealFit ? (
                      <span className="badge badge-success flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                        <FileCheck size={12} />
                        Telemetría .FIT
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                        📋 Prescripción del Plan
                      </span>
                    )}
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

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-secondary text-xs flex items-center gap-1.5"
                  disabled={uploadingFit}
                  onClick={() => fileInputRef.current?.click()}
                  title="Cargar archivo .FIT de Garmin/Zepp para este entreno"
                >
                  <UploadCloud size={14} />
                  <span>{uploadingFit ? "Importando..." : isRealFit ? "Reemplazar .FIT" : "Cargar .FIT"}</span>
                </button>
                <button className="btn btn-ghost text-xs" onClick={() => router.push("/registro")}>
                  Ir a Registro
                </button>
              </div>
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
                📊 Resumen & KPIs
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
                  className={`btn ${activeTab === "charts" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("charts")}
                >
                  📈 Gráficos & Curvas
                </button>
              )}
              {laps.length > 0 && (
                <button
                  className={`btn ${activeTab === "laps" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("laps")}
                >
                  ⏱️ Parciales ({laps.length} vueltas)
                </button>
              )}
              {gym.length > 0 && (
                <button
                  className={`btn ${activeTab === "gym" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("gym")}
                >
                  🏋️ Ejercicios ({gym.length})
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

              {/* Diagnósticos del Entrenador IA */}
              {structuredFeedback && (structuredFeedback.positives?.length > 0 || structuredFeedback.deviations?.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Aspectos Positivos */}
                  {structuredFeedback.positives?.length > 0 && (
                    <div
                      style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-success" style={{ marginBottom: "var(--space-2)" }}>
                        <CheckCircle2 size={16} />
                        <span>Aspectos Positivos & Enfoque</span>
                      </div>
                      <ul className="grid gap-2 text-xs" style={{ color: "var(--color-text)", paddingLeft: 4 }}>
                        {structuredFeedback.positives.map((pos: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-success font-bold">•</span>
                            <span dangerouslySetInnerHTML={{ __html: pos.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Puntos de Mejora / Desviaciones */}
                  {structuredFeedback.deviations?.length > 0 && (
                    <div
                      style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-warning" style={{ marginBottom: "var(--space-2)" }}>
                        <AlertTriangle size={16} />
                        <span>Puntos a Cuidar / Desviaciones</span>
                      </div>
                      <ul className="grid gap-2 text-xs" style={{ color: "var(--color-text)", paddingLeft: 4 }}>
                        {structuredFeedback.deviations.map((dev: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
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

          {/* 2. ZONAS VAM */}
          {activeTab === "zones" && (
            <div className="grid gap-4">
              {/* Tarjeta de Cumplimiento de Objetivo */}
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-muted">Tiempo en Zona</div>
                        <div className="text-base font-bold text-brand">
                          {structuredFeedback.targetCompliance.timeInTargetFormatted} ({structuredFeedback.targetCompliance.compliancePct}%)
                        </div>
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
                        <span>Desviaciones & Puntos de Mejora</span>
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
                  {!isRealFit && (
                    <span className="text-xs text-muted italic">
                      Mostrando distribución teórica del plan
                    </span>
                  )}
                </div>

                {/* Gráfico de Barras de Tiempo por Zona */}
                {zoneDist && (
                  <div style={{ width: "100%", height: 180, marginBottom: "var(--space-4)" }}>
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

          {/* 3. GRÁFICOS & CURVAS */}
          {activeTab === "charts" && (
            <div className="grid gap-4">
              <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                {/* Selector de tipo de gráfico */}
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
                      Eje izquierdo: Ritmo (min/km, invertido para que arriba sea más rápido) • Eje derecho: Pulso cardíaco (lpm).
                    </div>
                    <div style={{ width: "100%", height: 260 }}>
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
                      Minutos acumulados en cada zona de ritmo según tu VAM de 3:59 min/km.
                    </div>
                    <div style={{ width: "100%", height: 260 }}>
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
                      Evolución de la cadencia de zancada (ppm) a lo largo de los kilómetros.
                    </div>
                    <div style={{ width: "100%", height: 260 }}>
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

          {/* 4. PARCIALES Y VUELTAS */}
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

          {/* 5. FUERZA / GIMNASIO */}
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

          {/* 6. RECUPERACIÓN & CONTEXTO */}
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
