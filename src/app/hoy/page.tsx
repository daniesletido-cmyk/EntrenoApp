"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sun,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  BedDouble,
  UtensilsCrossed,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Moon,
  Copy,
  Check,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  RefreshCw,
  Gauge,
  Sliders,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { todayISO, isoDayOfWeek, weekStartOf, weekDates } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyWorkoutToClipboard } from "@/lib/format-workout";
import type { DailyReadiness } from "@/lib/readiness";
import { parseWorkoutModification } from "@/lib/workout-modifications";
import { WorkoutModificationBanner } from "@/components/workout-modification-banner";
import { WorkoutDetailModal } from "@/components/workout-detail-modal";

interface SessionRow {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  is_long_run: number;
  is_extra?: number;
  status: string;
  rpe: number | null;
  duration_min: number | null;
  distance_km: number | null;
  notes: string | null;
}

interface MenuItem {
  id: number;
  day_of_week: number;
  meal: string;
  option_label: string | null;
  foods_text: string | null;
  kcal: number | null;
}

interface SleepRow {
  date: string;
  hours: number | null;
  quality: number | null;
  score: number | null;
  nap_min?: number | null;
  nap_count?: number | null;
  nap_notes?: string | null;
}

interface Recommendation {
  action: "mantener" | "reducir" | "alerta_medica";
  summary: string;
}

const DISCIPLINE_META: Record<string, { label: string; Icon: React.ComponentType<{ size?: number }>; color: string; bg: string }> = {
  carrera: { label: "Carrera", Icon: Footprints, color: "var(--color-success)", bg: "var(--color-success-bg)" },
  gimnasio: { label: "Gimnasio", Icon: Dumbbell, color: "#a855f7", bg: "rgba(168, 85, 247, 0.14)" },
  natacion: { label: "Natación", Icon: Waves, color: "var(--color-info)", bg: "var(--color-info-bg)" },
  crossfit: { label: "CrossFit", Icon: Flame, color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  otro: { label: "Otro", Icon: MoreHorizontal, color: "var(--color-brand)", bg: "var(--color-brand-subtle)" },
  descanso: { label: "Descanso", Icon: BedDouble, color: "var(--color-text-muted)", bg: "var(--color-surface-raised)" },
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  parcial: "Parcial",
  no_realizada: "No realizada",
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning"> = {
  pendiente: "neutral",
  realizada: "success",
  parcial: "warning",
  no_realizada: "warning",
};

const ACTION_META: Record<Recommendation["action"], { tone: "success" | "warning" | "danger"; icon: React.ReactNode; label: string }> = {
  mantener: { tone: "success", icon: <CheckCircle2 size={18} />, label: "Todo en orden" },
  reducir: { tone: "warning", icon: <AlertTriangle size={18} />, label: "Conviene ajustar carga esta semana" },
  alerta_medica: { tone: "danger", icon: <ShieldAlert size={18} />, label: "Parar y consultar médicamente" },
};

const TONE_STYLE = {
  success: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
  warning: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  danger: { bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
};

function phaseForDate(date: string, settings: Record<string, string>): number {
  for (let p = 1; p <= 4; p++) {
    const start = settings[`phase_${p}_start`];
    const end = settings[`phase_${p}_end`];
    if (start && end && date >= start && date <= end) return p;
  }
  const fallback = parseInt(settings.current_phase ?? "1", 10);
  return Number.isFinite(fallback) && fallback >= 1 && fallback <= 4 ? fallback : 1;
}

const DAY_NAMES_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatToday(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${DAY_NAMES_LONG[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()]}`;
}

function daysUntil(dateStr: string | undefined, from: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

export default function HoyPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [sleep, setSleep] = useState<SleepRow | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [readiness, setReadiness] = useState<DailyReadiness | null>(null);
  const [weekSessions, setWeekSessions] = useState<SessionRow[]>([]);
  const [showReadinessDetail, setShowReadinessDetail] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [applyingAdjustment, setApplyingAdjustment] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null);
  const toast = useToast();

  const today = todayISO();

  async function copySession(s: SessionRow) {
    const ok = await copyWorkoutToClipboard({
      date: s.date,
      discipline: s.discipline,
      planned_code: s.planned_code,
      is_long_run: s.is_long_run,
      status: s.status,
      rpe: s.rpe,
      duration_min: s.duration_min,
      distance_km: s.distance_km,
      notes: s.notes,
    });
    if (ok) {
      setCopiedId(s.id);
      toast.push("success", "Entreno copiado — pégalo en Notas");
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      toast.push("error", "No se pudo copiar automáticamente");
    }
  }

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const t = Date.now();
      const currentWeekStart = weekStartOf(today);
      const [settingsRes, sessionsRes, weekSessionsRes, recRes, sleepRes, readinessRes] = await Promise.all([
        fetch(`/api/settings?t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sessions?from=${today}&to=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sessions?week=${currentWeekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ sessions: [] })),
        fetch(`/api/recommendations?week=${currentWeekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sleep?from=${today}&to=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ logs: [] })),
        fetch(`/api/readiness?date=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ readiness: null })),
      ]);

      const s: Record<string, string> = settingsRes.settings ?? {};
      setSettings(s);
      setSessions(sessionsRes.sessions ?? []);
      setWeekSessions(weekSessionsRes.sessions ?? []);
      setRec(recRes);
      setReadiness(readinessRes.readiness ?? null);
      const sleepLogs: SleepRow[] = sleepRes.logs ?? sleepRes.sleepLogs ?? [];
      setSleep(sleepLogs.find((l) => l.date === today) ?? null);

      const phase = phaseForDate(today, s);
      const menuRes = await fetch(`/api/menu?phase=${phase}&t=${t}`, { cache: "no-store" }).then((r) => r.json());
      const dow = isoDayOfWeek(today);
      setMenu((menuRes.items ?? []).filter((m: MenuItem) => m.day_of_week === dow));

      if (isManual) {
        toast.push("success", "Estado del día y entrenos actualizados");
      }
    } catch {
      if (isManual) {
        toast.push("error", "Error al actualizar los datos");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today, toast]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    function onGlobalRefresh() {
      load(true);
    }
    window.addEventListener("entrenoapp:refresh", onGlobalRefresh);
    return () => window.removeEventListener("entrenoapp:refresh", onGlobalRefresh);
  }, [load]);

  async function handleApplyAdjustment(sessionId?: number) {
    setApplyingAdjustment(true);
    try {
      const res = await fetch("/api/readiness/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error aplicando ajuste");
      toast.push("success", `Adaptación inteligente aplicada (${data.appliedCount} sesión/es modificada/s)`);
      load(false);
    } catch (err: any) {
      toast.push("error", err?.message ?? "No se pudo aplicar la adaptación");
    } finally {
      setApplyingAdjustment(false);
    }
  }

  async function handleRevertAdjustment(sessionId: number) {
    setApplyingAdjustment(true);
    try {
      const res = await fetch("/api/readiness/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, sessionId, action: "revert" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error revirtiendo");
      toast.push("success", "Ajuste revertido correctamente");
      load(false);
    } catch (err: any) {
      toast.push("error", err?.message ?? "No se pudo revertir el ajuste");
    } finally {
      setApplyingAdjustment(false);
    }
  }

  const raceDays = daysUntil(settings.goal_race_date, today);
  const trainingSessions = sessions.filter((s) => s.discipline !== "descanso");

  if (loading) {
    return (
      <div>
        <PageHeader title="Hoy" />
        <Loading label="Cargando el día de hoy…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Hoy"
        description={`Daniel Espinosa · ${formatToday(today).replace(/^\w/, (c) => c.toUpperCase())}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link
              href="/detalle"
              className="btn btn-primary text-xs inline-flex items-center gap-1.5"
              style={{
                height: 36,
                minHeight: 36,
                borderRadius: "var(--radius-full)",
                padding: "0 13px",
              }}
            >
              <Activity size={13} />
              <span>Ver Detalle Entreno</span>
            </Link>
            {raceDays !== null && (
              <span
                className="badge badge-info inline-flex"
                style={{ fontSize: "0.74rem", padding: "0.4rem 0.75rem", borderRadius: "var(--radius-full)" }}
              >
                <Flag size={12} style={{ marginRight: 5, flexShrink: 0 }} />
                {raceDays >= 0 ? `Maratón en ${raceDays} días` : `Maratón hace ${-raceDays} d`}
              </span>
            )}
            <button
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
              onClick={() => load(true)}
              disabled={refreshing}
              style={{
                height: 36,
                minHeight: 36,
                borderRadius: "var(--radius-full)",
                padding: "0 13px",
              }}
            >
              <RefreshCw size={13} className={refreshing ? "spinner" : ""} />
              <span>{refreshing ? "Actualizando…" : "Refrescar"}</span>
            </button>
          </div>
        }
      />

      {/* 1. Microciclo Semanal (Segmented Kinetic HUD Bar) */}
      <section
        className="relative rounded-xl p-3 sm:p-4 laser-border overflow-hidden animate-in"
        style={{
          marginBottom: "var(--space-4)",
          background: "rgba(10, 13, 20, 0.85)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-br" />
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider" style={{ color: "var(--color-brand)" }}>
            <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: "var(--color-accent)" }} />
            <span>// FASE 03 · CARGA MÁXIMA &amp; CONDICIONAMIENTO</span>
          </div>
          <Link
            href="/plan-semanal"
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            <span>Plan semanal</span>
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Segmented Day Trackers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {weekDates(weekStartOf(today)).map((dIso, idx) => {
            const isDayToday = dIso === today;
            const dayNum = parseInt(dIso.slice(8), 10);
            const letters = ["L", "M", "X", "J", "V", "S", "D"];
            const daySession = weekSessions.find((s) => s.date === dIso);
            const isCompleted = daySession && (daySession.status === "realizada" || daySession.status === "parcial");
            const isRest = daySession?.discipline === "descanso";

            if (isDayToday) {
              return (
                <div
                  key={dIso}
                  className="flex flex-col items-center py-2 px-1 rounded relative scale-105"
                  style={{
                    background: "rgba(20, 26, 38, 0.95)",
                    border: "2px solid var(--color-brand)",
                    boxShadow: "0 0 16px rgba(195, 244, 0, 0.45)",
                  }}
                >
                  <span
                    className="absolute -top-2 px-1 rounded font-mono font-bold uppercase text-[7px]"
                    style={{ background: "var(--color-brand)", color: "#050507" }}
                  >
                    HOY
                  </span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: "var(--color-brand)" }}>
                    {letters[idx]}
                  </span>
                  <span
                    className="tabular-nums font-mono text-[15px] font-bold mt-0.5 leading-none"
                    style={{ color: "var(--color-brand)" }}
                  >
                    {dayNum}
                  </span>
                  <span
                    className="w-full h-1 rounded-full mt-1.5"
                    style={{
                      background: "var(--color-accent)",
                      boxShadow: "0 0 6px var(--color-accent)",
                    }}
                  />
                </div>
              );
            }

            return (
              <div
                key={dIso}
                className="flex flex-col items-center py-2 px-1 rounded transition-all"
                style={{
                  background: isCompleted ? "rgba(20, 24, 34, 0.6)" : "rgba(14, 17, 23, 0.4)",
                  border: isCompleted ? "1px solid rgba(195, 244, 0, 0.25)" : "1px solid var(--color-border)",
                  opacity: isCompleted || (daySession && !isRest) ? 1 : 0.65,
                }}
              >
                <span className="font-mono text-[10px] text-muted">{letters[idx]}</span>
                <span className="tabular-nums font-mono text-[13px] font-semibold text-white mt-0.5 leading-none">
                  {dayNum}
                </span>
                <span
                  className="w-full h-1 rounded-full mt-1.5"
                  style={{
                    background: isCompleted
                      ? "var(--color-brand)"
                      : daySession && !isRest
                      ? "rgba(0, 227, 253, 0.5)"
                      : "transparent",
                    boxShadow: isCompleted ? "0 0 4px var(--color-brand)" : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. CENTRAL HERO: READINESS COCKPIT // APEX HUD */}
      {readiness && (
        <section
          className="relative rounded-xl p-4 sm:p-5 laser-border overflow-hidden animate-in"
          style={{
            marginBottom: "var(--space-5)",
            background: "rgba(10, 13, 20, 0.92)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="corner-bracket-tl" />
          <div className="corner-bracket-br" />

          {/* Decorative ambient crosshair marks */}
          <div className="absolute top-2.5 right-3 font-mono text-[9px] select-none tracking-widest" style={{ color: "rgba(255, 255, 255, 0.25)" }}>
            HUD // BIO-ARC 01
          </div>

          {/* Header Row */}
          <div className="flex items-center justify-between pb-2.5 border-b mb-3" style={{ borderColor: "rgba(195, 244, 0, 0.15)" }}>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: "var(--color-brand)" }} />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                READINESS COCKPIT // APEX HUD
              </span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
              OPTICAL SENSING ON
            </span>
          </div>

          {/* Circular Glowing Arc Gauge & Readiness Score */}
          <div className="flex flex-col items-center justify-center relative py-2">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                {/* Background smoked track */}
                <circle
                  cx="80"
                  cy="80"
                  fill="none"
                  r="68"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="380"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                  strokeWidth="6"
                />
                {/* Secondary Cyan calibration ring */}
                <circle
                  cx="80"
                  cy="80"
                  fill="none"
                  r="60"
                  stroke="rgba(0, 227, 253, 0.2)"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                {/* Neon Volt & Hyper Cyan active arc */}
                <circle
                  cx="80"
                  cy="80"
                  fill="none"
                  r="68"
                  stroke={
                    readiness.tone === "success"
                      ? "#c3f400"
                      : readiness.tone === "warning"
                      ? "#f59e0b"
                      : "#ef4444"
                  }
                  strokeDasharray="427"
                  strokeDashoffset={427 - (427 * Math.max(10, Math.min(100, readiness.score))) / 100}
                  strokeLinecap="round"
                  strokeWidth="7"
                  style={{
                    filter:
                      readiness.tone === "success"
                        ? "drop-shadow(0 0 10px rgba(195, 244, 0, 0.75))"
                        : "drop-shadow(0 0 10px rgba(245, 158, 11, 0.75))",
                    transition: "stroke-dashoffset 1s ease-out",
                  }}
                />
                {/* Terminal Photon Dot */}
                <circle
                  cx="80"
                  cy="12"
                  fill="#00e3fd"
                  r="3.5"
                  style={{ filter: "drop-shadow(0 0 6px #00e3fd)" }}
                />
              </svg>

              {/* Digital Core Score Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[8px] uppercase tracking-widest text-muted">
                  BIOMARKER INDEX
                </span>
                <div className="flex items-baseline justify-center">
                  <span
                    className="font-bold text-4xl sm:text-5xl tracking-tighter tabular-nums"
                    style={{
                      color:
                        readiness.tone === "success"
                          ? "var(--color-brand)"
                          : readiness.tone === "warning"
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                      textShadow: "0 0 14px rgba(195, 244, 0, 0.5)",
                    }}
                  >
                    {readiness.score}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                    /100
                  </span>
                </div>
                <span className="font-mono text-[8px] tracking-wider" style={{ color: "var(--color-accent)" }}>
                  {readiness.score >= 85 ? "APEX READY" : readiness.score >= 70 ? "OPTIMAL ZONE" : "RECOVERY REQUIRED"}
                </span>
              </div>
            </div>

            {/* Status Badge (Volt & Orange Alert) */}
            <div
              className="mt-2 px-3 py-1 rounded-full flex items-center gap-2"
              style={{
                background: "rgba(20, 26, 38, 0.8)",
                border: "1px solid rgba(195, 244, 0, 0.35)",
                boxShadow: "0 0 12px rgba(195, 244, 0, 0.2)",
              }}
            >
              <span className="w-2 h-2 rounded-full animate-ping" style={{ background: "var(--color-brand)" }} />
              <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: "var(--color-brand)" }}>
                ESTADO: {readiness.verdict?.badgeLabel || readiness.levelLabel} · GREENLIGHT
              </span>
              <span
                className="font-mono text-[8px] px-1 py-0.2 rounded font-bold"
                style={{ background: "rgba(255, 85, 0, 0.2)", color: "#ff8c42" }}
              >
                RPE MAX
              </span>
            </div>
          </div>

          {/* 3-Column Micro-Telemetry Cards */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t" style={{ borderColor: "rgba(195, 244, 0, 0.15)" }}>
            {/* HRV */}
            <div
              className="p-2 sm:p-2.5 rounded relative"
              style={{
                background: "rgba(14, 17, 23, 0.85)",
                border: "1px solid rgba(0, 227, 253, 0.25)",
              }}
            >
              <div className="flex items-center justify-between text-muted font-mono text-[9px]">
                <span>HRV RMSSD</span>
                <span style={{ color: "var(--color-accent)" }}>+12%</span>
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-white mt-1">
                88 <span className="text-[10px] text-muted font-normal">ms</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1 rounded-sm" style={{ background: "var(--color-accent)" }} />
                <span className="w-3 h-1 rounded-sm" style={{ background: "var(--color-accent)" }} />
                <span className="w-4 h-1 rounded-sm" style={{ background: "rgba(0, 227, 253, 0.3)" }} />
                <span className="text-[8px] font-mono" style={{ color: "var(--color-accent)" }}>CYAN ECG</span>
              </div>
            </div>

            {/* FC Reposo */}
            <div
              className="p-2 sm:p-2.5 rounded relative"
              style={{
                background: "rgba(14, 17, 23, 0.85)",
                border: "1px solid rgba(195, 244, 0, 0.2)",
              }}
            >
              <div className="flex items-center justify-between text-muted font-mono text-[9px]">
                <span>FC REPOSO</span>
                <span style={{ color: "var(--color-brand)" }}>LASER</span>
              </div>
              <div className="font-mono text-base sm:text-lg font-bold text-white mt-1">
                44 <span className="text-[10px] text-muted font-normal">bpm</span>
              </div>
              <div className="font-mono text-[8px] mt-1" style={{ color: "var(--color-brand)" }}>
                ● PULSO ESTABLE
              </div>
            </div>

            {/* ACWR Ratio */}
            <div
              className="p-2 sm:p-2.5 rounded relative"
              style={{
                background: "rgba(14, 17, 23, 0.85)",
                border: "1px solid rgba(195, 244, 0, 0.2)",
              }}
            >
              <div className="flex items-center justify-between text-muted font-mono text-[9px]">
                <span>ACWR RATIO</span>
                <span style={{ color: "var(--color-brand)" }}>SWEET</span>
              </div>
              <div className="font-mono text-base sm:text-lg font-bold mt-1" style={{ color: "var(--color-brand)" }}>
                0.95
              </div>
              <div className="font-mono text-[8px] text-muted mt-1 truncate">
                ZONA ÓPTIMA
              </div>
            </div>
          </div>

          {/* Holographic Callout: Neuromuscular Compatibility */}
          <div
            className="mt-3 p-2.5 rounded-lg flex items-start gap-2.5"
            style={{
              background: "rgba(0, 227, 253, 0.08)",
              border: "1px solid rgba(0, 227, 253, 0.35)",
            }}
          >
            <ShieldCheck size={18} style={{ color: "var(--color-accent)", flexShrink: 0, marginTop: 1 }} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-bold tracking-wider" style={{ color: "var(--color-accent)" }}>
                COMPATIBILIDAD NEUROMUSCULAR // 100%
              </div>
              <p className="text-xs text-white leading-tight mt-0.5" style={{ fontSize: "0.75rem" }}>
                <span className="font-bold" style={{ color: "var(--color-brand)" }}>0.0% CO-FATIGA</span> // Permiso total para CrossFit Metcon + Tirada de Maratón dominical sin interferencia adaptativa.
              </p>
            </div>
          </div>

          {/* Verdict Title & Guidance Box */}
          <div
            style={{
              marginTop: "var(--space-3)",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-raised)",
              border: `1px solid ${
                readiness.tone === "success"
                  ? "rgba(34, 197, 94, 0.3)"
                  : readiness.tone === "warning"
                  ? "rgba(234, 179, 8, 0.3)"
                  : readiness.tone === "danger"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(59, 130, 246, 0.3)"
              }`,
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                size={17}
                style={{
                  color:
                    readiness.tone === "success"
                      ? "var(--color-success)"
                      : readiness.tone === "warning"
                      ? "var(--color-warning)"
                      : readiness.tone === "danger"
                      ? "var(--color-danger)"
                      : "var(--color-brand)",
                  flexShrink: 0,
                }}
              />
              <div className="font-bold text-sm">
                {readiness.verdict?.title || readiness.headline}
              </div>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
              {readiness.verdict?.actionGuidance || readiness.coachAdvice}
            </p>

            {/* Target Sport-Specific Focus Badges */}
            {(() => {
              const activeDiscipline = readiness.stats?.todayDiscipline ?? sessions.find((s) => s.discipline !== "descanso")?.discipline ?? "descanso";
              if (activeDiscipline === "carrera") {
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                      Zonas VAM:
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>R0: &gt;5:23</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>R1: 5:23–4:59</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>RMC: 5:00–5:15</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>R2: 4:59–4:35</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>R3: 4:23–4:11</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>R3+: 3:59</span>
                  </div>
                );
              }
              if (activeDiscipline === "crossfit") {
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                      Pauta CrossFit:
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>WOD + Skill</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Intensidad: RPE 8.5–9</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Control Postural & Ritmo</span>
                  </div>
                );
              }
              if (activeDiscipline === "gimnasio") {
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                      Pauta Fuerza:
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Básicos & Accesorios</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Cargas al 100% Objetivo</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>RIR 1–2 (Sin fallo)</span>
                  </div>
                );
              }
              if (activeDiscipline === "natacion") {
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                      Pauta Natación:
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Eficiencia & Deslizamiento</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>SWOLF Eficiente</span>
                  </div>
                );
              }
              if (activeDiscipline === "ciclismo") {
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                      Pauta Ciclismo:
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Cadencia Ágil: 85–95 rpm</span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Zona Z2 / Z3</span>
                  </div>
                );
              }
              return (
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                >
                  <span className="text-xs font-semibold text-muted" style={{ marginRight: 4 }}>
                    Pauta del Día:
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Supercompensación & Descanso</span>
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>Hidratación & Nutrición</span>
                </div>
              );
            })()}
          </div>

          {/* Proposed Micro-Adjustments for next 48-72h */}
          {readiness.proposedMicroAdjustments && readiness.proposedMicroAdjustments.length > 0 && (
            <div
              className="animate-in"
              style={{
                marginTop: "var(--space-3)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              <div className="flex items-center justify-between gap-2" style={{ flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                <div className="flex items-center gap-1.5">
                  <Sliders size={15} style={{ color: "var(--color-brand)" }} />
                  <span className="font-semibold text-xs uppercase" style={{ color: "var(--color-brand)", letterSpacing: "0.03em" }}>
                    Modulación Adaptativa de Próximos Entrenos ({readiness.proposedMicroAdjustments.length})
                  </span>
                </div>
                {readiness.proposedMicroAdjustments.some((a) => !a.isApplied) && (
                  <Button
                    variant="primary"
                    loading={applyingAdjustment}
                    onClick={() => handleApplyAdjustment()}
                    style={{ fontSize: "var(--text-xs)", height: 32, padding: "0 12px" }}
                  >
                    <Sparkles size={13} />
                    Aplicar adaptaciones automáticas
                  </Button>
                )}
              </div>

              <div className="grid gap-2">
                {readiness.proposedMicroAdjustments.map((adj) => (
                  <div
                    key={adj.sessionId}
                    className="surface"
                    style={{
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">{adj.date}</span>
                        <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
                          {adj.discipline}
                        </span>
                        {adj.isApplied ? (
                          <span className="badge badge-success flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                            <Check size={11} />
                            <span>Adaptado</span>
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                            Propuesta
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ marginTop: 2 }}>
                        {adj.suggestedPlannedCode ? (
                          <span>
                            Sugerido: <strong>{adj.suggestedPlannedCode}</strong>{" "}
                            {adj.originalPlannedCode && <span className="text-muted">(antes: {adj.originalPlannedCode})</span>}
                          </span>
                        ) : (
                          <span>
                            Sugerido: <strong>Descanso / Regenerativo</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2, lineHeight: 1.3 }}>
                        {adj.reason}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!adj.isApplied ? (
                        <button
                          className="btn btn-secondary text-xs"
                          disabled={applyingAdjustment}
                          onClick={() => handleApplyAdjustment(adj.sessionId)}
                          style={{ height: 28, padding: "0 10px", fontSize: "0.75rem" }}
                        >
                          Aplicar a esta sesión
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost text-xs text-muted inline-flex items-center gap-1"
                          disabled={applyingAdjustment}
                          onClick={() => handleRevertAdjustment(adj.sessionId)}
                          style={{ height: 28, padding: "0 8px", fontSize: "0.75rem" }}
                        >
                          <RotateCcw size={12} />
                          Revertir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle breakdown button */}
          <div className="flex items-center justify-between" style={{ marginTop: "var(--space-3)" }}>
            <button
              onClick={() => setShowReadinessDetail((prev) => !prev)}
              className="btn btn-ghost inline-flex items-center gap-1.5"
              style={{ fontSize: "var(--text-xs)", padding: "0.3rem 0.6rem" }}
            >
              {showReadinessDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showReadinessDetail ? "Ocultar desglose biométrico" : "Ver qué influye en tu estado (sueño, fatiga 48h y carga)"}
            </button>
          </div>

          {/* Factors Breakdown */}
          {showReadinessDetail && (
            <div
              className="grid gap-3 sm:grid-cols-3 animate-in"
              style={{
                marginTop: "var(--space-3)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {readiness.factors.map((f) => (
                <div
                  key={f.id}
                  className="surface-raised"
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs uppercase text-muted flex items-center gap-1.5">
                        {f.id === "sleep" ? (
                          <Moon size={12} className="text-brand" />
                        ) : f.id === "acute_fatigue" ? (
                          <Zap size={12} className="text-warning" />
                        ) : (
                          <TrendingUp size={12} className="text-accent" />
                        )}
                        <span>{f.title}</span>
                      </span>
                      <span
                        className={`badge ${
                          f.status === "optimo"
                            ? "badge-success"
                            : f.status === "bueno"
                            ? "badge-brand"
                            : f.status === "moderado"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                        style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}
                      >
                        {f.badge}
                      </span>
                    </div>
                    <div className="font-semibold text-sm" style={{ marginTop: "var(--space-2)" }}>
                      {f.headline}
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.4 }}>
                      {f.detail}
                    </p>
                  </div>
                  {f.metrics.length > 0 && (
                    <div
                      className="flex flex-wrap gap-1.5"
                      style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}
                    >
                      {f.metrics.map((m, idx) => (
                        <span
                          key={idx}
                          className="badge badge-neutral"
                          style={{ fontSize: "0.68rem", padding: "0.15rem 0.4rem" }}
                        >
                          {m.label}: <strong>{m.value}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {rec && rec.action !== "mantener" && (
        <div
          className="surface flex items-start gap-3.5 animate-in"
          style={{
            padding: "var(--space-4)",
            borderLeft: `3px solid ${TONE_STYLE[ACTION_META[rec.action].tone].color}`,
            marginBottom: "var(--space-5)",
          }}
        >
          <span style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color, flexShrink: 0, marginTop: 2 }}>
            {ACTION_META[rec.action].icon}
          </span>
          <div style={{ flex: 1 }}>
            <div className="font-semibold text-sm" style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color }}>
              {ACTION_META[rec.action].label}
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 2, lineHeight: 1.5 }}>
              {rec.summary}
            </p>
          </div>
          <Link href="/recomendaciones" className="btn btn-secondary text-xs" style={{ flexShrink: 0, height: 36 }}>
            Ver detalle
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 font-semibold" style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-3)" }}>
            <Sun size={18} />
            Entrenamiento de hoy
          </div>

          {trainingSessions.length === 0 ? (
            <EmptyState
              icon={<BedDouble size={22} />}
              title="Día de descanso"
              description="No hay ninguna sesión planificada para hoy en Plan semanal."
            />
          ) : (
            <div className="grid gap-3">
              {trainingSessions.map((s) => {
                const meta = DISCIPLINE_META[s.discipline] ?? DISCIPLINE_META.otro;
                const Icon = meta.Icon;
                const modInfo = parseWorkoutModification(s, readiness?.proposedMicroAdjustments);

                const cleanNotes = s.notes
                  ? s.notes
                      .split("\n")
                      .filter((line) => !line.includes("[Ajuste inteligente]"))
                      .join("\n")
                      .trim()
                  : "";

                const durationEst = s.duration_min ?? 55;
                const rpeEst = s.rpe ? `RPE ${s.rpe}` : "RPE 8.5";
                const kcalEst = Math.round(durationEst * 10.5);

                return (
                  <section
                    key={s.id}
                    className="relative rounded-xl p-4 sm:p-5 laser-border overflow-hidden animate-in"
                    style={{
                      background: "rgba(10, 13, 20, 0.92)",
                      backdropFilter: "blur(20px)",
                      border: modInfo && modInfo.isModified
                        ? "1.5px solid rgba(245, 158, 11, 0.55)"
                        : undefined,
                    }}
                  >
                    <div className="corner-bracket-tl" />
                    <div className="corner-bracket-br" />

                    {/* Banner ultra-visual si hay adaptación por carga o fatiga */}
                    {modInfo && modInfo.isModified && (
                      <WorkoutModificationBanner
                        info={modInfo}
                        onRevert={() => handleRevertAdjustment(s.id)}
                        reverting={applyingAdjustment}
                      />
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-start pb-2.5 border-b" style={{ borderColor: "rgba(195, 244, 0, 0.15)" }}>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-wider block" style={{ color: "var(--color-brand)" }}>
                          // OBJETIVO DIARIO ACTIVADO
                        </span>
                        <h3 className="font-bold text-base sm:text-lg text-white tracking-tight mt-0.5">
                          {s.planned_code ? `${s.planned_code} · ` : ""}{meta.label}
                        </h3>
                        <span className="font-mono text-[10px] uppercase text-muted tracking-wide">
                          SESIÓN DEL DÍA // {meta.label.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "rgba(20, 26, 38, 0.9)",
                          border: "1px solid rgba(195, 244, 0, 0.3)",
                          color: "var(--color-brand)",
                        }}
                      >
                        <Icon size={19} />
                      </div>
                    </div>

                    {/* Tactical Metrics Chips */}
                    <div className="grid grid-cols-3 gap-2 my-3">
                      <div className="p-2 rounded text-center" style={{ background: "rgba(14, 17, 23, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-muted block">DURACIÓN</span>
                        <span className="font-mono text-sm sm:text-base font-bold text-white">
                          {durationEst} <span className="text-[9px] text-muted font-normal">MIN</span>
                        </span>
                      </div>
                      <div className="p-2 rounded text-center" style={{ background: "rgba(14, 17, 23, 0.8)", border: "1px solid rgba(255, 85, 0, 0.3)" }}>
                        <span className="font-mono text-[8px] uppercase tracking-wider block" style={{ color: "#ff8c42" }}>INTENSIDAD</span>
                        <span className="font-mono text-sm sm:text-base font-bold" style={{ color: "#ff8c42" }}>
                          {rpeEst}
                        </span>
                      </div>
                      <div className="p-2 rounded text-center" style={{ background: "rgba(14, 17, 23, 0.8)", border: "1px solid rgba(0, 227, 253, 0.3)" }}>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-muted block">CALORÍAS</span>
                        <span className="font-mono text-sm sm:text-base font-bold" style={{ color: "var(--color-accent)" }}>
                          {kcalEst} <span className="text-[9px] text-muted font-normal">KCAL</span>
                        </span>
                      </div>
                    </div>

                    {/* Split Breakdown Phases */}
                    <div className="space-y-2 mb-4">
                      {/* FASE A */}
                      <div className="p-2.5 rounded" style={{ background: "rgba(14, 17, 23, 0.6)", borderLeft: "2px solid var(--color-accent)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0, 227, 253, 0.15)", color: "var(--color-accent)" }}>
                            FASE A · ACTIVACIÓN &amp; FUERZA
                          </span>
                          <span className="font-mono text-[9px] text-muted">REST: 90-120s</span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-1">Calentamiento Neuromuscular &amp; Series de Carga</div>
                      </div>

                      {/* FASE B */}
                      <div className="p-2.5 rounded" style={{ background: "rgba(14, 17, 23, 0.6)", borderLeft: "2px solid var(--color-brand)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(195, 244, 0, 0.2)", color: "var(--color-brand)" }}>
                            FASE B · NÚCLEO PRINCIPAL
                          </span>
                          <span className="font-mono text-[9px] font-bold" style={{ color: "var(--color-brand)" }}>BLOQUE OBJETIVO</span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-1">
                          {s.planned_code ?? meta.label} {s.distance_km ? `(${s.distance_km} km)` : ""}
                        </div>
                        {cleanNotes && (
                          <div className="text-xs text-muted mt-1 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                            {cleanNotes}
                          </div>
                        )}
                      </div>

                      {/* FASE C */}
                      <div className="p-2.5 rounded" style={{ background: "rgba(14, 17, 23, 0.6)", borderLeft: "2px solid rgba(255, 255, 255, 0.2)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] uppercase text-muted px-1.5 py-0.5 rounded" style={{ background: "rgba(255, 255, 255, 0.08)" }}>
                            FASE C · REGENERACIÓN
                          </span>
                          <span className="font-mono text-[9px] text-muted">10 MIN</span>
                        </div>
                        <div className="text-xs text-muted mt-1">Vuelta a la calma, descarga miofascial y movilidad profiláctica</div>
                      </div>
                    </div>

                    {/* Primary Tactile Action CTA Button */}
                    <div className="space-y-2">
                      <Link
                        href="/registro"
                        className="w-full font-mono text-xs uppercase py-3 px-4 rounded font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: "var(--color-brand)",
                          color: "#050507",
                          boxShadow: "0 0 20px rgba(195, 244, 0, 0.45)",
                          textDecoration: "none",
                        }}
                      >
                        <Zap size={15} />
                        <span>INICIAR SESIÓN // APEX LIVE TRACKING</span>
                      </Link>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          className="btn btn-secondary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => setDetailSessionId(s.id)}
                          style={{ height: 32 }}
                        >
                          <Activity size={13} />
                          <span>Detalle</span>
                        </button>
                        <button
                          className="btn btn-secondary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => copySession(s)}
                          style={{ height: 32 }}
                        >
                          {copiedId === s.id ? (
                            <Check size={13} style={{ color: "var(--color-success)" }} />
                          ) : (
                            <Copy size={13} />
                          )}
                          <span>{copiedId === s.id ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {sleep && (sleep.hours != null || (sleep.nap_min != null && sleep.nap_min > 0)) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-mono" style={{ marginTop: "var(--space-3)" }}>
              <Moon size={14} style={{ color: "var(--color-accent)" }} />
              {sleep.hours != null ? (
                <span>
                  Sueño nocturno: <strong className="text-white">{sleep.hours}h</strong>
                  {sleep.nap_min != null && sleep.nap_min > 0 ? (
                    <> + <strong style={{ color: "#c084fc" }}>{sleep.nap_min}m siesta</strong> (total: {((sleep.hours + sleep.nap_min / 60)).toFixed(1)}h)</>
                  ) : null}
                </span>
              ) : (
                <span>
                  Siesta registrada: <strong style={{ color: "#c084fc" }}>{sleep.nap_min}m</strong>
                </span>
              )}
              {sleep.quality ? <span>· calidad {sleep.quality}/5</span> : null}
              {sleep.score != null ? <span>· puntuación {sleep.score}/100</span> : null}
            </div>
          )}
        </div>

        <div>
          {/* Energy & Recovery Telemetry Bar (Stitch Kinetic Apex) */}
          <section
            className="relative rounded-xl p-4 laser-border overflow-hidden mb-4 animate-in"
            style={{
              background: "rgba(10, 13, 20, 0.88)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="corner-bracket-tl" />
            <div className="corner-bracket-br" />
            <div className="flex items-center justify-between pb-2 border-b mb-3" style={{ borderColor: "rgba(195, 244, 0, 0.15)" }}>
              <div className="flex items-center gap-2">
                <Flame size={15} style={{ color: "var(--color-accent)" }} />
                <span className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                  COMBUSTIBLE &amp; NUTRICIÓN METABÓLICA
                </span>
              </div>
              <span className="font-mono text-[9px] font-bold" style={{ color: "var(--color-brand)" }}>
                72% CONSUMIDO
              </span>
            </div>

            {/* Progress bar with Neon Gradient */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline font-mono text-xs">
                <span className="text-white font-bold">2.850 <span className="text-muted font-normal text-[10px]">KCAL</span></span>
                <span className="text-muted text-[11px]">OBJETIVO: <strong style={{ color: "var(--color-accent)" }}>3.400 KCAL</strong></span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden p-0.5" style={{ background: "rgba(20, 26, 38, 0.9)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "72%",
                    background: "linear-gradient(90deg, #00e3fd 0%, #c3f400 60%, #abd600 100%)",
                    boxShadow: "0 0 10px #00e3fd",
                  }}
                />
              </div>
            </div>

            {/* Macro Pills & Hydration */}
            <div className="grid grid-cols-2 gap-2 mt-3.5">
              <div className="p-2 rounded" style={{ background: "rgba(14, 17, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span className="font-mono text-[8px] uppercase text-muted block mb-1">MACRONUTRIENTES</span>
                <div className="flex items-center gap-1 font-mono text-[10px] text-white">
                  <span className="font-bold" style={{ color: "var(--color-brand)" }}>180g</span> P
                  <span className="text-muted">·</span>
                  <span className="font-bold" style={{ color: "var(--color-accent)" }}>360g</span> C
                  <span className="text-muted">·</span>
                  <span className="font-bold" style={{ color: "#ff8c42" }}>75g</span> G
                </div>
              </div>
              <div className="p-2 rounded flex items-center justify-between" style={{ background: "rgba(14, 17, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div>
                  <span className="font-mono text-[8px] uppercase text-muted block mb-1">HIDRATACIÓN</span>
                  <div className="font-mono text-[10px] text-white">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>2.8L</span> / 3.5L <span className="text-[8px]" style={{ color: "var(--color-brand)" }}>ÓPTIMO</span>
                  </div>
                </div>
                <Waves size={16} style={{ color: "var(--color-accent)" }} />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 font-semibold" style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-3)" }}>
            <UtensilsCrossed size={18} />
            Menú de hoy
          </div>

          {menu.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed size={22} />}
              title="Sin menú para hoy"
              description="Importa o añade el menú de esta fase en la pestaña Menú."
              action={
                <Link href="/menu" className="btn btn-primary">
                  Ir a Menú
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3">
              {menu.map((m) => (
                <div
                  key={m.id}
                  className="relative rounded-xl p-3.5 laser-border"
                  style={{ background: "rgba(10, 13, 20, 0.85)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm text-white">
                      {m.meal}
                      {m.option_label ? ` · ${m.option_label}` : ""}
                    </div>
                    {m.kcal != null && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "rgba(195, 244, 0, 0.15)", color: "var(--color-brand)" }}>
                        {m.kcal} kcal
                      </span>
                    )}
                  </div>
                  {m.foods_text && (
                    <p className="text-xs text-muted mt-2 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                      {m.foods_text}
                    </p>
                  )}
                </div>
              ))}
              <Link href="/menu" className="btn btn-ghost" style={{ justifySelf: "start" }}>
                Ver menú completo de la fase
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {detailSessionId && (
        <WorkoutDetailModal
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
        />
      )}
    </div>
  );
}
