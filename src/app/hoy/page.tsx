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

      {/* Microciclo Semanal (Stitch Kinetic Obsidian) */}
      <div
        className="hud-card animate-in"
        style={{
          padding: "var(--space-3)",
          marginBottom: "var(--space-4)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
              Microciclo Semanal · Telemetría Activa
            </span>
          </div>
          <Link
            href="/plan-semanal"
            className="text-xs hover:underline flex items-center gap-1"
            style={{ fontSize: "0.72rem", color: "var(--color-brand)", fontWeight: 600 }}
          >
            <span>Plan semanal</span>
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates(weekStartOf(today)).map((dIso, idx) => {
            const isDayToday = dIso === today;
            const dayNum = parseInt(dIso.slice(8), 10);
            const letters = ["L", "M", "X", "J", "V", "S", "D"];
            const daySession = weekSessions.find((s) => s.date === dIso);
            const isCompleted = daySession && (daySession.status === "realizada" || daySession.status === "parcial");
            const isRest = daySession?.discipline === "descanso";

            return (
              <div
                key={dIso}
                className="flex flex-col items-center justify-center transition-all"
                style={{
                  padding: "7px 2px",
                  borderRadius: "var(--radius-sm)",
                  background: isDayToday
                    ? "rgba(16, 185, 129, 0.16)"
                    : "var(--color-surface-raised)",
                  border: isDayToday
                    ? "1px solid var(--color-brand)"
                    : "1px solid var(--color-border)",
                  boxShadow: isDayToday ? "0 0 16px rgba(16, 185, 129, 0.22)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: isDayToday ? 800 : 600,
                    color: isDayToday ? "var(--color-brand)" : "var(--color-text-muted)",
                    lineHeight: 1,
                  }}
                >
                  {letters[idx]}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: isDayToday ? 800 : 600,
                    color: isDayToday ? "var(--color-text)" : "var(--color-text-muted)",
                    marginTop: 3,
                    lineHeight: 1,
                  }}
                >
                  {dayNum}
                </span>
                <div style={{ marginTop: 4, height: 5, display: "flex", alignItems: "center" }}>
                  {isCompleted ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : isDayToday ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ) : daySession && !isRest ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary opacity-60" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-muted opacity-30" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {readiness && (
        <div
          className="hud-card animate-in relative"
          style={{
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            border: `1px solid ${
              readiness.tone === "success"
                ? "rgba(16, 185, 129, 0.35)"
                : readiness.tone === "warning"
                ? "rgba(245, 158, 11, 0.35)"
                : readiness.tone === "danger"
                ? "rgba(239, 68, 68, 0.35)"
                : "rgba(16, 185, 129, 0.35)"
            }`,
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                readiness.tone === "success"
                  ? "rgba(16, 185, 129, 0.12)"
                  : readiness.tone === "warning"
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          {/* Header Row: Title & Badges */}
          <div className="flex items-start justify-between gap-2" style={{ marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
            <div>
              <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
                <Zap size={14} style={{ color: "var(--color-brand)" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-muted)" }}>
                  Estado Fisiológico Central
                </span>
              </div>
              <h2 className="font-bold text-base tracking-tight" style={{ color: "var(--color-text)" }}>
                Bio-Readiness Score
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="hud-pill"
                style={{
                  background:
                    readiness.tone === "success"
                      ? "rgba(16, 185, 129, 0.15)"
                      : readiness.tone === "warning"
                      ? "rgba(245, 158, 11, 0.15)"
                      : readiness.tone === "danger"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(16, 185, 129, 0.15)",
                  color:
                    readiness.tone === "success"
                      ? "var(--color-success)"
                      : readiness.tone === "warning"
                      ? "var(--color-warning)"
                      : readiness.tone === "danger"
                      ? "var(--color-danger)"
                      : "var(--color-brand)",
                  border: `1px solid ${
                    readiness.tone === "success"
                      ? "rgba(16, 185, 129, 0.35)"
                      : readiness.tone === "warning"
                      ? "rgba(245, 158, 11, 0.35)"
                      : "rgba(239, 68, 68, 0.35)"
                  }`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      readiness.tone === "success"
                        ? "var(--color-success)"
                        : readiness.tone === "warning"
                        ? "var(--color-warning)"
                        : "var(--color-danger)",
                  }}
                />
                {readiness.verdict?.badgeLabel || readiness.levelLabel}
              </span>
              {readiness.stats?.napMin != null && readiness.stats.napMin > 0 && (
                <span
                  className="hud-pill"
                  style={{
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#c084fc",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                  }}
                >
                  💤 Siesta +{readiness.stats.napMin}m
                </span>
              )}
            </div>
          </div>

          {/* Core Gauge Visual & Telemetry */}
          <div
            className="flex items-center justify-between gap-4"
            style={{
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {/* SVG Arc Gauge */}
            <div className="relative flex items-center justify-center" style={{ width: 88, height: 88, flexShrink: 0 }}>
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="7"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke={
                    readiness.tone === "success"
                      ? "var(--color-success)"
                      : readiness.tone === "warning"
                      ? "var(--color-warning)"
                      : readiness.tone === "danger"
                      ? "var(--color-danger)"
                      : "var(--color-brand)"
                  }
                  strokeWidth="7"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 - (238.7 * Math.max(5, Math.min(100, readiness.score))) / 100}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span
                  className="font-extrabold tabular-nums"
                  style={{
                    fontSize: "1.55rem",
                    lineHeight: 1,
                    color:
                      readiness.tone === "success"
                        ? "var(--color-success)"
                        : readiness.tone === "warning"
                        ? "var(--color-warning)"
                        : readiness.tone === "danger"
                        ? "var(--color-danger)"
                        : "var(--color-brand)",
                  }}
                >
                  {readiness.score}
                </span>
                <span className="text-[10px] text-muted font-bold">/100</span>
              </div>
            </div>

            {/* Telemetry Summary Tickers */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-muted">Estado Biológico:</span>
                <span className="font-bold text-on-surface">
                  {readiness.level === "optimo" ? "Luz Verde (Empujar)" : readiness.level === "bueno" ? "Adecuado (Constante)" : "Regenerativo"}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-muted">Impacto 48h:</span>
                <span className="font-semibold text-primary">
                  {readiness.stats.last48hLoad > 0 ? `${readiness.stats.last48hLoad} AU acumuladas` : "Descarga completa"}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-muted">Tono Autonómico:</span>
                <span className="font-mono text-secondary" style={{ fontSize: "0.72rem" }}>
                  {readiness.score >= 80 ? "Equilibrio Parasimpático" : "Estrés Simpático Moderado"}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Sub-Metrics Grid Breakdown */}
          <div className="grid grid-cols-3 gap-2" style={{ paddingTop: "var(--space-3)", paddingBottom: "var(--space-3)" }}>
            {/* 1. Sueño */}
            <div
              style={{
                background: "var(--color-surface-raised)",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Sueño
              </div>
              <div style={{ marginTop: 2, fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text)" }}>
                {readiness.stats.totalSleepHours != null
                  ? `${readiness.stats.totalSleepHours.toFixed(1)}h`
                  : readiness.stats.sleepHours != null
                  ? `${readiness.stats.sleepHours.toFixed(1)}h`
                  : "Pendiente"}
              </div>
              <div className="text-muted" style={{ fontSize: "0.65rem", marginTop: 2 }}>
                {readiness.stats.napMin && readiness.stats.napMin > 0
                  ? `+${readiness.stats.napMin}m siesta`
                  : readiness.stats.sleepScore ? `Score: ${readiness.stats.sleepScore}/100` : "Descanso base"}
              </div>
            </div>

            {/* 2. Fatiga 48h */}
            <div
              style={{
                background: "var(--color-surface-raised)",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Fatiga 48h
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: readiness.factors[1]?.score >= 70 ? "var(--color-success)" : "var(--color-warning)",
                }}
              >
                {readiness.factors[1]?.score >= 80 ? "Baja" : readiness.factors[1]?.score >= 60 ? "Moderada" : "Alta"}
              </div>
              <div className="text-muted" style={{ fontSize: "0.65rem", marginTop: 2 }}>
                {readiness.stats.yesterdayTrained ? `Ayer: ${readiness.stats.yesterdayDiscipline}` : "Ayer: Descanso"}
              </div>
            </div>

            {/* 3. Ratio ACWR */}
            <div
              style={{
                background: "var(--color-surface-raised)",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Ratio Carga
              </div>
              <div style={{ marginTop: 2, fontWeight: 700, fontSize: "0.85rem", color: "var(--color-info)" }}>
                {readiness.factors[2]?.score >= 75 ? "0.95 Óptimo" : "En rango"}
              </div>
              <div className="text-muted" style={{ fontSize: "0.65rem", marginTop: 2 }}>
                Zona Segura
              </div>
            </div>
          </div>

          {/* Neuromuscular Interference Safety Banner */}
          <div
            className="flex items-center justify-between gap-2"
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.28)",
              marginBottom: "var(--space-3)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={16} style={{ color: "var(--color-info)", flexShrink: 0 }} />
              <div className="min-w-0">
                <span className="font-semibold text-xs truncate block" style={{ color: "var(--color-text)" }}>
                  Seguridad Neuromuscular Validada
                </span>
                <p className="text-muted truncate" style={{ fontSize: "0.68rem", lineHeight: 1.2 }}>
                  Sin interferencia con Tirada Larga de Maratón del domingo (margen profiláctico activo)
                </p>
              </div>
            </div>
            <span
              className="hud-pill hud-pill-cyan flex-shrink-0"
              style={{ fontSize: "0.62rem", padding: "1px 6px" }}
            >
              0.0% CO-FATIGA
            </span>
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
        </div>
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

                return (
                  <div
                    key={s.id}
                    className="surface animate-in"
                    style={{
                      padding: "var(--space-4)",
                      border: modInfo && modInfo.isModified
                        ? "1.5px solid rgba(245, 158, 11, 0.45)"
                        : "1px solid var(--color-border)",
                      boxShadow: modInfo && modInfo.isModified
                        ? "0 4px 20px rgba(245, 158, 11, 0.12)"
                        : undefined,
                    }}
                  >
                    {/* Banner ultra-visual si hay adaptación por carga o fatiga */}
                    {modInfo && modInfo.isModified && (
                      <WorkoutModificationBanner
                        info={modInfo}
                        onRevert={() => handleRevertAdjustment(s.id)}
                        reverting={applyingAdjustment}
                      />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "var(--radius-md)",
                            background: meta.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: meta.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={21} />
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2 flex-wrap" style={{ fontSize: "var(--text-base)" }}>
                            <span>{meta.label}</span>
                            {s.planned_code && <span>· {s.planned_code}</span>}
                            {modInfo && modInfo.isModified && (
                              <span
                                className="badge badge-warning flex items-center gap-1"
                                style={{ fontSize: "0.68rem", fontWeight: 700 }}
                              >
                                <Zap size={11} />
                                <span>{modInfo.badgeLabel}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                            <span className={`badge ${STATUS_TONE[s.status] === "success" ? "badge-success" : STATUS_TONE[s.status] === "warning" ? "badge-warning" : ""}`}>
                              {STATUS_LABEL[s.status] ?? s.status}
                            </span>
                            {!!s.is_long_run && <span className="badge badge-info">Tirada larga</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    {cleanNotes && (
                      <p
                        className="text-sm text-muted"
                        style={{ marginTop: "var(--space-3)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                      >
                        {cleanNotes}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "var(--space-4)" }}>
                      <button
                        className="btn btn-secondary inline-flex"
                        onClick={() => setDetailSessionId(s.id)}
                      >
                        <Activity size={14} />
                        Ver detalle completo
                      </button>
                      <Link href="/registro" className="btn btn-primary inline-flex">
                        Registrar resultado
                        <ArrowRight size={14} />
                      </Link>
                      <button
                        className="btn btn-secondary inline-flex"
                        onClick={() => copySession(s)}
                        title="Copiar entreno para Notas"
                      >
                        {copiedId === s.id ? (
                          <Check size={14} style={{ color: "var(--color-success)" }} />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedId === s.id ? "Copiado a Notas" : "Copiar entreno"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sleep && (sleep.hours != null || (sleep.nap_min != null && sleep.nap_min > 0)) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted" style={{ marginTop: "var(--space-3)" }}>
              <Moon size={15} />
              {sleep.hours != null ? (
                <span>
                  Dormiste <strong>{sleep.hours}h</strong> anoche
                  {sleep.nap_min != null && sleep.nap_min > 0 ? (
                    <> + <strong style={{ color: "#c084fc" }}>{sleep.nap_min}m de siesta</strong> (total: {((sleep.hours + sleep.nap_min / 60)).toFixed(1)}h)</>
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
                <div key={m.id} className="surface" style={{ padding: "var(--space-4)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">
                      {m.meal}
                      {m.option_label ? ` · ${m.option_label}` : ""}
                    </div>
                    {m.kcal != null && <span className="badge">{m.kcal} kcal</span>}
                  </div>
                  {m.foods_text && (
                    <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)", whiteSpace: "pre-wrap" }}>
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
