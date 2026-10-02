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
  Bike,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Timer,
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
  const [activeTab, setActiveTab] = useState<"general" | "pacing" | "zones" | "charts" | "laps" | "gym" | "readiness">("general");
  const [activeChart, setActiveChart] = useState<"pace_hr" | "elevation_pace" | "cadence_stride" | "zones">("pace_hr");
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
  const hrZoneDist = sessionDetail?.hrZoneDistribution ?? deep?.hrZoneDistribution;
  const pacingAnalysis = sessionDetail?.pacingAnalysis ?? fit?.pacingAnalysis ?? deep?.pacingAnalysis ?? null;
  const timeSeries = sessionDetail?.timeSeries ?? fit?.timeSeries ?? deep?.timeSeries ?? [];

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

  const effectiveSport = fit?.sport ?? session?.discipline ?? "carrera";
  const isSwimming = effectiveSport === "natacion";
  const isCycling = effectiveSport === "ciclismo";
  const isWalking = effectiveSport === "caminata";
  const isRunning = effectiveSport === "carrera";
  const isCrossfit = effectiveSport === "crossfit";
  const isGym = effectiveSport === "gimnasio";

  // Datos para gráfico de barras de zonas VAM (Carrera)
  const zoneChartData = zoneDist
    ? [
        { name: "R0 Suave", timeMin: Number((zoneDist.r0TimeSec / 60).toFixed(1)), pct: zoneDist.r0Pct, color: "#64748b", rawTime: zoneDist.r0TimeSec },
        { name: "R1 Base", timeMin: Number((zoneDist.r1TimeSec / 60).toFixed(1)), pct: zoneDist.r1Pct, color: "#10b981", rawTime: zoneDist.r1TimeSec },
        { name: "R2 Tempo", timeMin: Number((zoneDist.r2TimeSec / 60).toFixed(1)), pct: zoneDist.r2Pct, color: "#f59e0b", rawTime: zoneDist.r2TimeSec },
        { name: "R4 Maratón", timeMin: Number((zoneDist.r3TimeSec / 60).toFixed(1)), pct: zoneDist.r3Pct, color: "#8b5cf6", rawTime: zoneDist.r3TimeSec },
        { name: "R5 Series", timeMin: Number((zoneDist.r5TimeSec / 60).toFixed(1)), pct: zoneDist.r5Pct, color: "#ef4444", rawTime: zoneDist.r5TimeSec },
      ]
    : [];

  // Datos para gráfico de barras de Zonas de Frecuencia Cardíaca (Multi-deporte)
  const hrZoneChartData = hrZoneDist
    ? [
        { name: "Z1 Recup", timeMin: Number((hrZoneDist.z1Sec / 60).toFixed(1)), pct: hrZoneDist.z1Pct, color: "#64748b", rawTime: hrZoneDist.z1Sec },
        { name: "Z2 Base", timeMin: Number((hrZoneDist.z2Sec / 60).toFixed(1)), pct: hrZoneDist.z2Pct, color: "#10b981", rawTime: hrZoneDist.z2Sec },
        { name: "Z3 Tempo", timeMin: Number((hrZoneDist.z3Sec / 60).toFixed(1)), pct: hrZoneDist.z3Pct, color: "#f59e0b", rawTime: hrZoneDist.z3Sec },
        { name: "Z4 Umbral", timeMin: Number((hrZoneDist.z4Sec / 60).toFixed(1)), pct: hrZoneDist.z4Pct, color: "#8b5cf6", rawTime: hrZoneDist.z4Sec },
        { name: "Z5 VO2max", timeMin: Number((hrZoneDist.z5Sec / 60).toFixed(1)), pct: hrZoneDist.z5Pct, color: "#ef4444", rawTime: hrZoneDist.z5Sec },
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
              {(pacingAnalysis || session.discipline === "carrera") && (
                <button
                  className={`btn ${activeTab === "pacing" ? "btn-primary" : "btn-ghost"} text-xs`}
                  style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius-sm)" }}
                  onClick={() => setActiveTab("pacing")}
                >
                  ⚡ Ritmos & Rendimiento
                </button>
              )}
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

                {/* Ritmo / Velocidad / SWOLF según deporte */}
                {isSwimming && (deep?.swimmingMetrics?.pacePer100mFormatted || fit?.avgPaceMinKm) && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Zap size={12} /> Ritmo /100m
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
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
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
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
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                      {formatPaceLocal(load?.avgPaceMinKm ?? fit?.avgPaceMinKm)}
                    </div>
                    <div className="text-xs text-faint">
                      {load?.avgSpeedKmh ? `${load.avgSpeedKmh.toFixed(1)} km/h` : "—"}
                    </div>
                  </div>
                )}

                {/* Potencia ciclista */}
                {isCycling && (deep?.cyclingMetrics?.avgPowerWatts || fit?.avgPowerWatts) && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Zap size={12} /> Potencia Media
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-warning)", marginTop: 2 }}>
                      {deep?.cyclingMetrics?.avgPowerWatts ?? fit?.avgPowerWatts} W
                    </div>
                    <div className="text-xs text-faint">
                      {deep?.cyclingMetrics?.normalizedPowerWatts ? `NP: ${deep.cyclingMetrics.normalizedPowerWatts} W` : "Potenciómetro"}
                    </div>
                  </div>
                )}

                {/* Eficiencia SWOLF en natación */}
                {isSwimming && deep?.swimmingMetrics?.avgSwolf != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Waves size={12} /> SWOLF Medio
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                      {deep.swimmingMetrics.avgSwolf}
                    </div>
                    <div className="text-xs text-faint">
                      {deep.swimmingMetrics.avgStrokeRate ? `${deep.swimmingMetrics.avgStrokeRate} brazadas/min` : "Eficiencia acuática"}
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
                      <div className="text-xl font-bold" style={{ color: "var(--color-danger)", marginTop: 2 }}>
                        {effectiveHr} lpm
                      </div>
                      <div className="text-xs text-faint">
                        {fit?.maxHeartRate ? `Máxima: ${fit.maxHeartRate} lpm` : "Monitorizada"}
                      </div>
                    </div>
                  );
                })()}

                {fit?.avgCadence != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Activity size={12} /> {isCycling ? "Cadencia Pedaleo" : isSwimming ? "Frec. Brazada" : "Cadencia"}
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                      {fit.avgCadence} {isCycling ? "rpm" : isSwimming ? "br/min" : "ppm"}
                    </div>
                    <div className="text-xs text-faint">
                      {isCycling
                        ? fit.avgCadence >= 80 ? "Cadencia ágil" : "Cadencia de fuerza"
                        : fit.avgCadence >= 170 ? "Cadencia eficiente" : "Mejorable"}
                    </div>
                  </div>
                )}

                {/* Mejor 1K de la sesión */}
                {pacingAnalysis?.bestEfforts?.find((b: any) => b.label === "1 km") && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Zap size={12} style={{ color: "var(--color-brand)" }} /> Mejor 1K
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-brand)", marginTop: 2 }}>
                      {pacingAnalysis.bestEfforts.find((b: any) => b.label === "1 km").paceFormatted}
                    </div>
                    <div className="text-xs text-faint">
                      {pacingAnalysis.bestEfforts.find((b: any) => b.label === "1 km").timeFormatted}
                      {pacingAnalysis.bestEfforts.find((b: any) => b.label === "1 km").avgHeartRate ? ` · ${pacingAnalysis.bestEfforts.find((b: any) => b.label === "1 km").avgHeartRate} lpm` : ""}
                    </div>
                  </div>
                )}

                {/* Split 1ª / 2ª mitad */}
                {pacingAnalysis?.splitHalves && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <TrendingUp size={12} style={{ color: pacingAnalysis.splitHalves.splitType === "negativo" ? "var(--color-success)" : "var(--color-text)" }} /> Split 1ª / 2ª
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{
                        color: pacingAnalysis.splitHalves.splitType === "negativo" ? "var(--color-success)" : pacingAnalysis.splitHalves.splitType === "parejo" ? "var(--color-brand)" : "var(--color-warning)",
                        marginTop: 2,
                      }}
                    >
                      {pacingAnalysis.splitHalves.splitType === "negativo" ? "Negativo" : pacingAnalysis.splitHalves.splitType === "parejo" ? "Parejo" : "Positivo"}
                    </div>
                    <div className="text-xs text-faint">
                      {pacingAnalysis.splitHalves.firstHalfPaceFormatted} → {pacingAnalysis.splitHalves.secondHalfPaceFormatted}
                    </div>
                  </div>
                )}

                {/* Longitud de Zancada (Carrera) */}
                {(pacingAnalysis?.avgStrideLengthM || deep?.avgStrideLengthM) && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Footprints size={12} /> Long. Zancada
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                      {(pacingAnalysis?.avgStrideLengthM ?? deep?.avgStrideLengthM)?.toFixed(2)} m
                    </div>
                    <div className="text-xs text-faint">
                      {(pacingAnalysis?.maxStrideLengthM ?? deep?.maxStrideLengthM) ? `Máx: ${(pacingAnalysis?.maxStrideLengthM ?? deep?.maxStrideLengthM).toFixed(2)} m` : "Amplitud media"}
                    </div>
                  </div>
                )}

                {/* Desnivel +/- y Altimetría */}
                {(fit?.elevationGainM != null || pacingAnalysis?.elevationGainM != null) && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Mountain size={12} /> Desnivel +/-
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
                      +{(fit?.elevationGainM ?? pacingAnalysis?.elevationGainM)}m / -{(deep?.elevationLossM ?? pacingAnalysis?.elevationLossM ?? 0)}m
                    </div>
                    <div className="text-xs text-faint">
                      {pacingAnalysis?.minAltitudeM != null ? `Alt: ${pacingAnalysis.minAltitudeM}m a ${pacingAnalysis.maxAltitudeM}m` : "Altimetría acumulada"}
                    </div>
                  </div>
                )}

                {fit?.calories != null && (
                  <div className="surface-raised" style={{ padding: "var(--space-3)" }}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1">
                      <Flame size={12} style={{ color: "var(--color-warning)" }} /> Calorías
                    </div>
                    <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 2 }}>
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

          {/* 1.5 RITMOS & RENDIMIENTO */}
          {activeTab === "pacing" && (
            <div className="grid gap-4">
              {/* 1. Análisis de Mitades (Split 50/50) */}
              <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: "var(--color-brand)" }} />
                    Estrategia de Ritmo: 1ª Mitad vs 2ª Mitad (Split 50/50)
                  </div>
                  {pacingAnalysis?.splitHalves && (
                    <span
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
                      {pacingAnalysis.splitHalves.splitType === "negativo"
                        ? "🚀 Split Negativo (Progresión)"
                        : pacingAnalysis.splitHalves.splitType === "parejo"
                        ? "⚖️ Split Parejo (Ritmo Constante)"
                        : "⚠️ Split Positivo (Desaceleración)"}
                    </span>
                  )}
                </div>

                {pacingAnalysis?.splitHalves ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: "var(--space-3)" }}>
                      {/* 1ª Mitad */}
                      <div
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--color-border)",
                        }}
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
                        }}
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
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(0,0,0,0.2)",
                        border: "1px solid var(--color-border)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>Diagnóstico de ritmo:</strong> {pacingAnalysis.splitHalves.splitDescription}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted italic">
                    Distancia insuficiente o sin datos de vueltas para calcular el split 50/50.
                  </div>
                )}
              </div>

              {/* 2. Mejores Parciales (Peak Efforts) */}
              <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                  <Zap size={16} style={{ color: "var(--color-warning)" }} />
                  Mejores Parciales de la Sesión (Peak Efforts)
                </div>

                {pacingAnalysis?.bestEfforts && pacingAnalysis.bestEfforts.length > 0 ? (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                    {pacingAnalysis.bestEfforts.map((effort: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--color-border)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs" style={{ color: "var(--color-brand)" }}>
                              {effort.label}
                            </span>
                            <span className="badge badge-neutral" style={{ fontSize: "0.6rem" }}>
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
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted italic">
                    No se han registrado tramos continuos suficientes para calcular mejores parciales.
                  </div>
                )}
              </div>

              {/* 3. Desglose de Ritmo por Pendiente (Relieve) */}
              {pacingAnalysis?.slopeAnalysis && (
                <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                  <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                    <Mountain size={16} style={{ color: "var(--color-text)" }} />
                    Gestión del Ritmo según el Relieve del Terreno
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Subida */}
                    <div
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(239, 68, 68, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: "var(--color-danger)" }}>
                        <ArrowUpRight size={14} />
                        <span>En Subida (&gt; +2%)</span>
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
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(59, 130, 246, 0.05)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: "var(--color-brand)" }}>
                        <ArrowRight size={14} />
                        <span>En Llano (-2% a +2%)</span>
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
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(16, 185, 129, 0.05)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: "var(--color-success)" }}>
                        <ArrowDownRight size={14} />
                        <span>En Bajada (&lt; -2%)</span>
                      </div>
                      <div className="text-xl font-bold" style={{ color: "var(--color-text)", marginTop: 6 }}>
                        {pacingAnalysis.slopeAnalysis.downhillPaceFormatted}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        {pacingAnalysis.slopeAnalysis.downhillDistanceKm} km · {Math.round(pacingAnalysis.slopeAnalysis.downhillTimeSec / 60)} min
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Dinámica de Carrera & Biomecánica */}
              <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                <div className="font-semibold text-sm flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                  <Footprints size={16} style={{ color: "var(--color-brand)" }} />
                  Biomecánica & Eficiencia Locomotriz
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

              {/* Gráfico y Desglose de Zonas VAM (Carrera) o Zonas FC (Multi-deporte) */}
              <div className="grid gap-4">
                {zoneDist && isRunning && (
                  <div className="surface-raised" style={{ padding: "var(--space-4)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Target size={16} style={{ color: "var(--color-brand)" }} />
                        Distribución de Zonas de Ritmo VAM (Base VAM: 3:59 min/km · 15.06 km/h)
                      </div>
                      {!isRealFit && (
                        <span className="text-xs text-muted italic">
                          Mostrando distribución teórica del plan
                        </span>
                      )}
                    </div>

                    {/* Gráfico de Barras de Tiempo por Zona VAM */}
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
                              {formatSecondsDetailed(zoneDist.r0TimeSec)}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist.r0Pct}%</td>
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
                              {formatSecondsDetailed(zoneDist.r1TimeSec)}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist.r1Pct}%</td>
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
                              {formatSecondsDetailed(zoneDist.r2TimeSec)}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist.r2Pct}%</td>
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
                              {formatSecondsDetailed(zoneDist.r3TimeSec)}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist.r3Pct}%</td>
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
                              {formatSecondsDetailed(zoneDist.r5TimeSec)}
                            </td>
                            <td style={{ padding: "8px 4px", fontWeight: 700 }}>{zoneDist.r5Pct}%</td>
                            <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>Potencia aeróbica máxima (VO2max) y velocidad</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Zonas de Frecuencia Cardíaca (Para todos los deportes) */}
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
                        className={`btn ${activeChart === "elevation_pace" ? "btn-primary" : "btn-secondary"} text-xs`}
                        style={{ padding: "0.25rem 0.6rem" }}
                        onClick={() => setActiveChart("elevation_pace")}
                      >
                        ⛰️ Perfil Altimetría & Ritmo
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
                        : "Curva continua • Eje izquierdo: Ritmo (min/km, invertido para que más arriba sea más rápido) • Eje derecho: Pulso cardíaco (lpm)."}
                    </div>
                    <div style={{ width: "100%", height: 280 }}>
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
                    <div style={{ width: "100%", height: 280 }}>
                      <ResponsiveContainer>
                        <AreaChart data={continuousChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="altitudeGradient" x1="0" y1="0" x2="0" y2="1">
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
                          <Area yAxisId="alt" type="monotone" dataKey="Altitud" stroke="#10b981" fillOpacity={1} fill="url(#altitudeGradient)" strokeWidth={2} />
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
                    <div style={{ width: "100%", height: 280 }}>
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
                        ? "Minutos acumulados en cada zona de ritmo según tu VAM de 3:59 min/km."
                        : "Minutos acumulados en cada zona de frecuencia cardíaca."}
                    </div>
                    <div style={{ width: "100%", height: 260 }}>
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
                        <td style={{ padding: "6px 8px" }}>{formatDuration(lap.durationMin)}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--color-brand)" }}>
                          {isSwimming
                            ? lap.pace100mFormatted || (lap.avgPaceMinKm ? formatPaceLocal(lap.avgPaceMinKm) : "—")
                            : isCycling
                            ? lap.avgSpeedKmh ? `${lap.avgSpeedKmh} km/h` : formatPaceLocal(lap.avgPaceMinKm)
                            : formatPaceLocal(lap.avgPaceMinKm)}
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
