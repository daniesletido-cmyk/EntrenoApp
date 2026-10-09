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
  Calendar,
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
    } catch {
      // silencioso al refrescar
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

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

      {/* 1. Microciclo Semanal (Minimalist 7-Day Strip) */}
      <section
        className="surface p-4 mb-4 animate-in"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Microciclo Semanal · Fase {phaseForDate(today, settings)}
            </span>
          </div>
          <Link
            href="/plan-semanal"
            className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <span>Plan semanal</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* 7-Day Selector */}
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
                  className="flex flex-col items-center py-2.5 px-1 rounded-xl relative transition-all"
                  style={{
                    background: "var(--color-brand-subtle)",
                    border: "1.5px solid var(--color-brand)",
                    boxShadow: "var(--shadow-glow-brand)",
                  }}
                >
                  <span className="text-[10px] font-semibold text-brand uppercase tracking-tight">
                    {letters[idx]}
                  </span>
                  <span className="text-base font-bold text-foreground mt-0.5 leading-none tabular-nums">
                    {dayNum}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2" />
                </div>
              );
            }

            return (
              <div
                key={dIso}
                className="flex flex-col items-center py-2.5 px-1 rounded-xl transition-all"
                style={{
                  background: isCompleted ? "var(--color-surface-hover)" : "var(--color-surface-raised)",
                  border: isCompleted ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                  opacity: isCompleted || (daySession && !isRest) ? 1 : 0.65,
                }}
              >
                <span className="text-[10px] font-medium text-muted uppercase tracking-tight">
                  {letters[idx]}
                </span>
                <span className="text-sm font-semibold text-foreground mt-0.5 leading-none tabular-nums">
                  {dayNum}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2"
                  style={{
                    background: isCompleted
                      ? "var(--color-brand)"
                      : daySession && !isRest
                      ? "var(--color-text-muted)"
                      : "transparent",
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Recuperación Fisiológica (Whoop / Oura Luxury Gauge) */}
      {readiness && (
        <section className="space-y-3 mb-5">
          <div
            className="relative overflow-hidden surface p-5 animate-in"
          >
            {/* Diffused Subtle Ambient Glow */}
            <div className="absolute -right-6 -top-6 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Recuperación Fisiológica
                </span>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background:
                    readiness.tone === "success"
                      ? "rgba(16, 185, 129, 0.15)"
                      : readiness.tone === "warning"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  color:
                    readiness.tone === "success"
                      ? "var(--color-brand)"
                      : readiness.tone === "warning"
                      ? "var(--color-warning)"
                      : "var(--color-danger)",
                  border: `1px solid ${
                    readiness.tone === "success"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(245, 158, 11, 0.3)"
                  }`,
                }}
              >
                {readiness.verdict?.badgeLabel || readiness.levelLabel}
              </span>
            </div>

            {/* Circular Gauge + Metrics Grid */}
            <div className="grid grid-cols-12 items-center gap-4">
              {/* Circular Minimal Gauge */}
              <div className="col-span-5 relative flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="40"
                    stroke="var(--color-border)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="40"
                    stroke={
                      readiness.tone === "success"
                        ? "var(--color-brand)"
                        : readiness.tone === "warning"
                        ? "var(--color-warning)"
                        : "var(--color-danger)"
                    }
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * Math.max(10, Math.min(100, readiness.score))) / 100}
                    strokeLinecap="round"
                    strokeWidth="7"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <div className="flex items-baseline justify-center">
                    <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                      {readiness.score}
                    </span>
                    <span className="text-xs font-semibold text-muted ml-0.5">%</span>
                  </div>
                  <span className="text-[10px] text-muted font-medium mt-0.5">Puntuación</span>
                </div>
              </div>

              {/* Key Autonomic Breakdown */}
              <div className="col-span-7 flex flex-col justify-between space-y-3 pl-3 border-l border-border">
                <div>
                  <div className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    HRV Basal (RMSSD)
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-bold text-foreground tabular-nums">
                      {readiness.factors[0]?.metrics?.find((m) => m.label.includes("HRV"))?.value ?? "74"}
                    </span>
                    <span className="text-xs text-muted">ms</span>
                    <span className="text-xs font-semibold text-emerald-500 ml-auto">
                      +8% Óptimo
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border">
                  <div className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    Tiempo en Cama
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-bold text-foreground tabular-nums">
                      {((sleep?.hours ?? 7.5) + (sleep?.nap_min ? sleep.nap_min / 60 : 0)).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted">horas</span>
                    <span className="text-xs font-medium text-muted ml-auto">
                      {sleep?.score ? `${sleep.score} desc.` : "Descanso óptimo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep Detailed Pills */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <Moon size={14} className="text-emerald-500" />
                <span>{sleep?.hours ?? 7.5}h Sueño nocturno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sun size={14} className="text-amber-500" />
                <span>{sleep?.nap_min && sleep.nap_min > 0 ? `+${sleep.nap_min}m Siesta reparadora` : "Calidad 4.8 / 5"}</span>
              </div>
            </div>
          </div>

          {/* Strain & Carga Cardiovascular */}
          <div
            className="surface p-4 space-y-2.5"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Carga Cardiovascular (Strain)
                </span>
              </div>
              <div className="text-xs font-medium">
                <span className="text-amber-500 font-bold">
                  {readiness.stats.last48hLoad > 0 ? (readiness.stats.last48hLoad / 25).toFixed(1) : "11.2"}
                </span>
                <span className="text-muted"> / 16.5 Objetivo</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full overflow-hidden p-[1px] bg-surface-raised border border-border">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(20, readiness.stats.last48hLoad > 0 ? (readiness.stats.last48hLoad / 25 / 16.5) * 100 : 68))}%`,
                  background: "linear-gradient(90deg, #f59e0b 0%, #10b981 100%)",
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-muted pt-0.5">
              <span>Capacidad cardiovascular disponible</span>
              <span className="text-foreground font-medium">Zona Óptima</span>
            </div>
          </div>
        </section>
      )}

      {/* 3. Nota del Entrenador (AI & Performance Staff) */}
      <section className="mb-5">
        <div
          className="surface p-4.5 relative overflow-hidden animate-in"
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2.5 rounded-xl text-emerald-500 shrink-0"
              style={{ background: "var(--color-brand-subtle)" }}
            >
              <Sparkles size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Nota del Entrenador
                </h3>
                <span className="text-[11px] font-medium text-emerald-500">
                  Actualizado hoy
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {readiness?.verdict?.actionGuidance || readiness?.coachAdvice ||
                  "Tus niveles de HRV y descanso nocturno están en su punto más alto del mes (+12%). En las series principales mantén el ritmo controlado sin exceder zona 4 temprana para proteger la sobrecarga muscular de cara a la tirada del domingo."}
              </p>

              {/* Adaptaciones de carga: Comparación explícita Plan Programado vs Plan a Realizar */}
              {readiness?.proposedMicroAdjustments && readiness.proposedMicroAdjustments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  {readiness.proposedMicroAdjustments.map((adj) => (
                    <div
                      key={adj.sessionId}
                      className="rounded-xl p-3.5 space-y-3"
                      style={{
                        background: adj.isApplied ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                        border: adj.isApplied ? "1px solid rgba(16, 185, 129, 0.28)" : "1px solid rgba(245, 158, 11, 0.28)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className="badge text-[11px] font-bold uppercase tracking-wider"
                          style={{
                            background: adj.isApplied ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                            color: adj.isApplied ? "var(--color-success)" : "var(--color-warning)",
                            border: `1px solid ${adj.isApplied ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {adj.isApplied ? "✅ Carga Adaptada en el Plan" : "⚡ Adaptación de Carga Sugerida"} · {adj.date}
                        </span>
                        {adj.isApplied ? (
                          <button
                            className="btn btn-ghost btn-sm text-xs"
                            disabled={applyingAdjustment}
                            onClick={() => handleRevertAdjustment(adj.sessionId)}
                            style={{ height: 28, padding: "0 8px" }}
                          >
                            <RotateCcw size={12} />
                            <span>Revertir al plan original</span>
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm text-xs font-semibold"
                            disabled={applyingAdjustment}
                            onClick={() => handleApplyAdjustment(adj.sessionId)}
                            style={{ height: 28, padding: "0 10px" }}
                          >
                            <Zap size={12} />
                            <span>Aplicar esta adaptación</span>
                          </button>
                        )}
                      </div>

                      {/* Comparativa clara solicitada por el usuario */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* 1. Plan Programado */}
                        <div
                          className="p-3 rounded-lg flex flex-col justify-between"
                          style={{
                            background: "rgba(0, 0, 0, 0.25)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-wider font-bold text-muted flex items-center gap-1.5 mb-1.5">
                            <Calendar size={13} className="text-muted" />
                            <span>ESTE ES EL PLAN PROGRAMADO</span>
                          </div>
                          <div
                            className="font-semibold text-sm text-foreground"
                            style={{ textDecoration: adj.isApplied ? "line-through" : "none", opacity: adj.isApplied ? 0.75 : 1 }}
                          >
                            {adj.originalPlannedCode || adj.discipline}
                          </div>
                          <div className="text-xs text-muted mt-1">
                            Planificación inicial prevista en el calendario.
                          </div>
                        </div>

                        {/* 2. Plan a Realizar para Adaptar la Carga */}
                        <div
                          className="p-3 rounded-lg flex flex-col justify-between"
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1.5px solid rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                            <Zap size={13} className="text-emerald-400" />
                            <span>ESTE ES EL QUE TIENES QUE HACER PARA ADAPTAR LA CARGA</span>
                          </div>
                          <div className="font-bold text-sm text-emerald-300">
                            {adj.suggestedPlannedCode || adj.suggestedDiscipline || "Descanso activo"}
                          </div>
                          {adj.suggestedPaceGuidance && (
                            <div className="text-xs text-emerald-400 font-medium mt-1">
                              Ritmo/Pauta: {adj.suggestedPaceGuidance}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        <strong>Motivo:</strong> {adj.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sesión Principal de Hoy & Menú de Hoy */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Columna Izquierda: Entrenamiento de Hoy */}
        <div>
          <div className="flex justify-between items-baseline mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Sesión Principal
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              Fase Clave
            </span>
          </div>

          {trainingSessions.length === 0 ? (
            <div
              className="surface p-6 text-center"
            >
              <BedDouble size={28} className="mx-auto text-muted mb-2 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">Día de descanso programado</h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                No hay sesiones intensivas asignadas para hoy. Día destinado a supercompensación, recarga de glucógeno y descanso activo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                const rpeEst = s.rpe ? `RPE ${s.rpe}` : "RPE 8.0";
                const distEst = s.distance_km ? `${s.distance_km} km` : `${durationEst} min`;

                return (
                  <section
                    key={s.id}
                    className="surface p-5 space-y-4 animate-in"
                  >
                    {/* Banner si hay adaptación aplicada o propuesta */}
                    {modInfo && (modInfo.isModified || modInfo.isPendingProposal) && (
                      <WorkoutModificationBanner
                        info={modInfo}
                        onRevert={() => handleRevertAdjustment(s.id)}
                        onApply={() => handleApplyAdjustment(s.id)}
                        reverting={applyingAdjustment}
                        applying={applyingAdjustment}
                      />
                    )}

                    {/* Title & Category Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                          {s.planned_code ? `${s.planned_code} · ` : ""}{meta.label}
                        </h2>
                        <p className="text-xs text-muted mt-0.5">
                          Bloque Pre-Competición · Semana {phaseForDate(today, settings)}
                        </p>
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <Icon size={20} />
                      </div>
                    </div>

                    {/* Metric Pill Chips */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div
                        className="surface-raised rounded-xl px-3 py-2 border border-border"
                      >
                        <div className="text-[11px] font-medium text-muted">Distancia</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{distEst}</div>
                      </div>
                      <div
                        className="surface-raised rounded-xl px-3 py-2 border border-border"
                      >
                        <div className="text-[11px] font-medium text-muted">Duración</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{durationEst} min</div>
                      </div>
                      <div
                        className="surface-raised rounded-xl px-3 py-2 border border-border"
                      >
                        <div className="text-[11px] font-medium text-muted">Intensidad</div>
                        <div className="text-sm font-bold text-emerald-500 mt-0.5">{rpeEst}</div>
                      </div>
                      <div
                        className="surface-raised rounded-xl px-3 py-2 border border-border"
                      >
                        <div className="text-[11px] font-medium text-muted">Carga</div>
                        <div className="text-sm font-bold text-amber-500 mt-0.5">
                          {Math.round(durationEst * 2.2)} AU
                        </div>
                      </div>
                    </div>

                    {/* Structure / Notes */}
                    {cleanNotes && (
                      <div className="pt-2 border-t border-border">
                        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                          Estructura de la sesión
                        </div>
                        <div className="p-3 rounded-xl surface-raised border border-border text-xs text-muted leading-relaxed whitespace-pre-wrap font-sans">
                          {cleanNotes}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <Link
                        href="/registro"
                        className="w-full btn btn-primary flex items-center justify-center gap-2 py-3 px-6 rounded-full font-semibold text-sm transition-all shadow-md"
                        style={{ textDecoration: "none" }}
                      >
                        <Zap size={16} />
                        <span>Iniciar Sesión / Registrar</span>
                      </Link>

                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-secondary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => setDetailSessionId(s.id)}
                          style={{ height: 34, borderRadius: "9999px" }}
                        >
                          <Activity size={13} />
                          <span>Detalle completo</span>
                        </button>
                        <button
                          className="btn btn-secondary text-xs flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => copySession(s)}
                          style={{ height: 34, borderRadius: "9999px" }}
                        >
                          {copiedId === s.id ? (
                            <Check size={13} className="text-emerald-400" />
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
        </div>

        {/* Columna Derecha: Nutrición & Menú de Hoy */}
        <div>
          <div className="flex justify-between items-baseline mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Nutrición &amp; Hidratación
            </span>
            <span className="text-xs text-muted">
              Objetivo Día Activo
            </span>
          </div>

          {/* Calorie & Macro Target Card */}
          <section
            className="surface p-4.5 space-y-3.5 mb-4 animate-in"
          >
            <div className="flex justify-between items-baseline">
              <div>
                <div className="text-[11px] font-medium text-muted">Ingesta Planificada</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  2.850 <span className="text-xs font-normal text-muted">/ 3.400 kcal</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-500">
                <Waves size={15} />
                <span>2.6L Agua</span>
              </div>
            </div>

            {/* Macro Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
              <div className="p-2.5 rounded-xl surface-raised border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Carbohidratos</div>
                <div className="text-base font-bold text-amber-500 mt-0.5">410g</div>
                <div className="text-[10px] text-muted">82% cubierto</div>
              </div>
              <div className="p-2.5 rounded-xl surface-raised border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Proteína</div>
                <div className="text-base font-bold text-emerald-500 mt-0.5">175g</div>
                <div className="text-[10px] text-muted">95% cubierto</div>
              </div>
              <div className="p-2.5 rounded-xl surface-raised border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Grasas</div>
                <div className="text-base font-bold text-foreground mt-0.5">68g</div>
                <div className="text-[10px] text-muted">Equilibrado</div>
              </div>
            </div>
          </section>

          {/* Menú Timeline Cards */}
          <div className="space-y-2.5">
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
              <>
                {menu.map((m) => {
                  const isBreakfast = m.meal.toLowerCase().includes("desayuno");
                  const isLunch = m.meal.toLowerCase().includes("almuerzo") || m.meal.toLowerCase().includes("comida");
                  const isSnack = m.meal.toLowerCase().includes("merienda") || m.meal.toLowerCase().includes("snack");

                  return (
                    <div
                      key={m.id}
                      className="surface p-4 flex items-start gap-3 transition-all"
                    >
                      <div
                        className="p-2.5 rounded-full shrink-0 mt-0.5"
                        style={{
                          background: isBreakfast
                            ? "rgba(245, 158, 11, 0.15)"
                            : isLunch
                            ? "rgba(16, 185, 129, 0.15)"
                            : isSnack
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(168, 85, 247, 0.15)",
                          color: isBreakfast
                            ? "#f59e0b"
                            : isLunch
                            ? "#10b981"
                            : isSnack
                            ? "#3b82f6"
                            : "#c084fc",
                        }}
                      >
                        {isBreakfast ? (
                          <Sun size={17} />
                        ) : isLunch ? (
                          <UtensilsCrossed size={17} />
                        ) : isSnack ? (
                          <Flame size={17} />
                        ) : (
                          <Moon size={17} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {m.meal}
                            {m.option_label ? ` · ${m.option_label}` : ""}
                          </span>
                          {m.kcal != null && (
                            <span className="text-xs font-semibold text-emerald-500 shrink-0">
                              {m.kcal} kcal
                            </span>
                          )}
                        </div>
                        {m.foods_text && (
                          <p className="text-xs text-muted mt-1 leading-relaxed whitespace-pre-wrap">
                            {m.foods_text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/menu"
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:text-emerald-600 pt-1"
                >
                  <span>Ver menú completo de la fase</span>
                  <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>
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
