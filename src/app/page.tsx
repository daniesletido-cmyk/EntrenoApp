"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Gauge,
  Moon,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Route,
  Timer,
  Flag,
  Footprints,
  RefreshCw,
  Activity,
} from "lucide-react";
import { weekStartOf, todayISO } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CoachSummaryCard } from "@/components/coach-summary-card";
import { useToast } from "@/components/ui/toast";
import type { WeeklyCoachAssessment } from "@/lib/coach-assessment";

interface Summary {
  weekStart: string;
  weekEnd: string;
  planificadas: number;
  realizadas: number;
  parciales: number;
  noRealizadas: number;
  pendientes: number;
  compliancePct: number | null;
  extrasTotal?: number;
  extrasRealizadas?: number;
  rpeAvg: number | null;
  sleepHoursAvg: number | null;
  sleepQualityAvg: number | null;
  distanceKm: number;
  durationMin: number;
  runDistanceKm?: number;
  runDurationMin?: number;
  runAvgPaceMinKm?: number | null;
  runCount?: number;
  walkDistanceKm?: number;
  walkDurationMin?: number;
  walkAvgPaceMinKm?: number | null;
  walkCount?: number;
  avgPaceMinKm: number | null;
}

interface Goal {
  id: number;
  title: string;
  target_date: string | null;
  status: "activo" | "cumplido" | "abandonado";
}

interface Recommendation {
  action: "mantener" | "reducir" | "alerta_medica";
  summary: string;
  flags: { severity: string; title: string }[];
}

const ACTION_BANNER: Record<Recommendation["action"], { tone: "success" | "warning" | "danger"; icon: React.ReactNode; label: string }> = {
  mantener: { tone: "success", icon: <CheckCircle2 size={20} />, label: "Sin señales de alarma" },
  reducir: { tone: "warning", icon: <AlertTriangle size={20} />, label: "Conviene ajustar la carga" },
  alerta_medica: { tone: "danger", icon: <ShieldAlert size={20} />, label: "Para y consulta médicamente" },
};

const BANNER_STYLE = {
  success: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
  warning: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  danger: { bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
};

function daysUntilRace(raceDate: string): number {
  const diff = new Date(raceDate + "T00:00:00Z").getTime() - new Date(todayISO() + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

export default function ResumenPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [raceDate, setRaceDate] = useState<string | null>(null);
  const [nextGoal, setNextGoal] = useState<Goal | null>(null);
  const [coachAssessment, setCoachAssessment] = useState<WeeklyCoachAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const t = Date.now();
      const [s, r, cfg, g, ca] = await Promise.all([
        fetch(`/api/summary?week=${weekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/recommendations?week=${weekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/settings?t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/goals?t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/coach-assessment?week=${weekStart}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ assessment: null })),
      ]);

      setSummary(s);
      setRec(r);
      setRaceDate(cfg.settings?.goal_race_date ?? null);
      const activos: Goal[] = (g.goals ?? []).filter((x: Goal) => x.status === "activo" && x.target_date);
      setNextGoal(activos.length > 0 ? activos[0] : null);
      setCoachAssessment(ca?.assessment ?? null);
    } catch {
      // silencioso al refrescar
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    function onGlobalRefresh() {
      loadData(true);
    }
    window.addEventListener("entrenoapp:refresh", onGlobalRefresh);
    return () => window.removeEventListener("entrenoapp:refresh", onGlobalRefresh);
  }, [loadData]);

  const fmt = (n: number | null, suffix = "") => (n === null ? "—" : `${n.toFixed(1)}${suffix}`);
  const fmtPace = (minPerKm: number | null) => {
    if (minPerKm === null) return "—";
    const min = Math.floor(minPerKm);
    const sec = Math.round((minPerKm - min) * 60);
    return `${min}:${String(sec).padStart(2, "0")}/km`;
  };
  const fmtDuration = (totalMin: number) => {
    if (totalMin <= 0) return "0h 00m";
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };
  const daysUntilGoal = (dateStr: string) => {
    const diff = new Date(dateStr + "T00:00:00Z").getTime() - new Date(todayISO() + "T00:00:00Z").getTime();
    return Math.round(diff / 86400000);
  };
  const complianceTone = summary?.compliancePct === null || summary?.compliancePct === undefined
    ? "neutral"
    : summary.compliancePct >= 80
    ? "success"
    : summary.compliancePct >= 50
    ? "warning"
    : "danger";

  return (
    <div>
      <PageHeader
        title="Resumen"
        description={
          summary?.weekStart
            ? `Semana del ${summary.weekStart} · Carga y rendimiento`
            : "Seguimiento y rendimiento semanal"
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/detalle"
              className="btn btn-primary text-xs inline-flex items-center gap-1.5"
              style={{
                height: 38,
                minHeight: 38,
                borderRadius: "var(--radius-full)",
                padding: "0 14px",
              }}
            >
              <Activity size={14} />
              <span>Ver Detalle Entreno</span>
            </Link>
            <button
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
              onClick={() => loadData(true)}
              disabled={refreshing}
              style={{
                height: 38,
                minHeight: 38,
                borderRadius: "var(--radius-full)",
                padding: "0 14px",
              }}
            >
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
              <span>{refreshing ? "Actualizando…" : "Refrescar"}</span>
            </button>
          </div>
        }
      />

      {raceDate && (
        <div
          className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in w-full p-4 mb-4 hover:border-emerald-500/30 transition-colors duration-150"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 shrink-0 mt-0.5"
            >
              <Flag size={18} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Daniel Espinosa · Objetivo Principal
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Maratón
                </span>
              </div>
              <div className="font-extrabold text-sm sm:text-base leading-tight mt-1 text-white" style={{ wordBreak: "break-word" }}>
                Faltan <span className="text-emerald-400 font-mono tabular-nums">{daysUntilRace(raceDate)} días</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1.5 inline-block">
                  ({new Date(raceDate + "T00:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })})
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/objetivos"
            className="btn btn-secondary text-xs self-stretch sm:self-auto justify-center rounded-xl border border-white/10 hover:border-emerald-500/40 transition-colors duration-150"
            style={{ minHeight: 34, height: 34, padding: "0 14px", flexShrink: 0 }}
          >
            Ver objetivo
          </Link>
        </div>
      )}

      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {loading && <HomeSkeleton />}

      {!loading && summary && (
        <div className="animate-in grid gap-4 w-full overflow-hidden">
          {coachAssessment && <CoachSummaryCard assessment={coachAssessment} />}

          {rec && rec.action !== "mantener" && (
            <div
              className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur-sm flex items-start gap-3.5 w-full p-4"
              style={{
                borderLeft: `4px solid ${BANNER_STYLE[ACTION_BANNER[rec.action].tone].color}`,
              }}
            >
              <span
                style={{
                  color: BANNER_STYLE[ACTION_BANNER[rec.action].tone].color,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {ACTION_BANNER[rec.action].icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="font-semibold text-sm"
                  style={{ color: BANNER_STYLE[ACTION_BANNER[rec.action].tone].color }}
                >
                  {ACTION_BANNER[rec.action].label}
                </div>
                <p className="text-xs sm:text-sm text-slate-400" style={{ marginTop: 2, lineHeight: 1.5 }}>
                  {rec.summary}
                </p>
              </div>
              <Link
                href="/recomendaciones"
                className="btn btn-secondary text-xs rounded-xl border border-white/10 hover:border-emerald-500/40 transition-colors duration-150"
                style={{ flexShrink: 0, height: 34, minHeight: 34 }}
              >
                Ver detalle
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Core Week Metrics Grid */}
          <div className="w-full">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Métricas de la semana
              </span>
              {summary.compliancePct !== null && (
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {summary.realizadas + summary.parciales} de {summary.planificadas} sesiones
                  {summary.extrasRealizadas && summary.extrasRealizadas > 0
                    ? ` (+${summary.extrasRealizadas} extra)`
                    : ""}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
              <StatCard
                label="Cumplimiento"
                value={summary.compliancePct !== null ? `${summary.compliancePct.toFixed(0)}%` : "—"}
                icon={<CalendarCheck2 size={16} />}
                tone={complianceTone}
                sublabel={
                  summary.noRealizadas > 0
                    ? `${summary.noRealizadas} no realizada${summary.noRealizadas > 1 ? "s" : ""}`
                    : "Todo al día"
                }
              />
              <StatCard
                label="Distancia total"
                value={`${summary.distanceKm.toFixed(1)} km`}
                icon={<Route size={16} />}
                sublabel={
                  (summary.runDistanceKm ?? 0) > 0 && (summary.walkDistanceKm ?? 0) > 0
                    ? `${summary.runDistanceKm?.toFixed(1)} km run · ${summary.walkDistanceKm?.toFixed(1)} km walk`
                    : "Suma semanal"
                }
              />
              <StatCard
                label="Tiempo total"
                value={fmtDuration(summary.durationMin)}
                icon={<Timer size={16} />}
                sublabel={
                  summary.extrasRealizadas && summary.extrasRealizadas > 0
                    ? `+${summary.extrasRealizadas} extra`
                    : "Tiempo entrenado"
                }
              />
              <StatCard
                label="Sueño medio"
                value={fmt(summary.sleepHoursAvg, "h")}
                icon={<Moon size={16} />}
                sublabel={summary.sleepQualityAvg ? `Calidad ${fmt(summary.sleepQualityAvg)}/5` : "Descanso"}
              />
            </div>
          </div>

          {/* Secondary stats: Pace & Goals */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
            <StatCard
              label="Ritmo medio carrera"
              value={fmtPace(summary.runAvgPaceMinKm ?? null)}
              icon={<Gauge size={16} />}
              sublabel={
                (summary.runDistanceKm ?? 0) > 0
                  ? `${summary.runDistanceKm?.toFixed(1)} km en ${summary.runCount} sesión${(summary.runCount ?? 0) > 1 ? "es" : ""}`
                  : "Sin carrera registrada"
              }
            />
            <StatCard
              label="Ritmo caminata"
              value={fmtPace(summary.walkAvgPaceMinKm ?? null)}
              icon={<Footprints size={16} />}
              sublabel={
                (summary.walkDistanceKm ?? 0) > 0
                  ? `${summary.walkDistanceKm?.toFixed(1)} km en ${summary.walkCount} sesión${(summary.walkCount ?? 0) > 1 ? "es" : ""}`
                  : "Sin caminatas registradas"
              }
            />
            <StatCard
              label="Esfuerzo medio"
              value={fmt(summary.rpeAvg)}
              icon={<Gauge size={16} />}
              sublabel="RPE escala 0–10"
            />
            {nextGoal && (
              <StatCard
                label="Próximo objetivo"
                value={nextGoal.target_date ? `${daysUntilGoal(nextGoal.target_date)} días` : "—"}
                icon={<Flag size={16} />}
                tone="brand"
                sublabel={nextGoal.title}
              />
            )}
          </div>

          {summary.planificadas === 0 && (
            <EmptyState
              icon={<CalendarCheck2 size={22} />}
              title="Todavía no hay nada planificado esta semana"
              description="Añade las sesiones de esta semana en Plan semanal para poder registrar resultados y ver el resumen."
              action={
                <Link href="/plan-semanal" className="btn btn-primary">
                  Ir a Plan semanal
                </Link>
              }
            />
          )}

          {/* Quick Actions */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Accesos directos
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <QuickLink href="/hoy" title="Hoy" description="Entreno planificado y menú del día" />
              <QuickLink href="/registro" title="Registrar entreno" description="RPE, sueño, sensaciones y molestias" />
              <QuickLink href="/entrenador" title="Entrenador" description="Ajustes de carga, ritmos y preguntas" />
              <QuickLink href="/progreso" title="Progreso y carga" description="Tendencias ACWR, volumen y evolución" />
              <QuickLink href="/plan-semanal" title="Plan semanal" description="Revisa o modifica los entrenamientos" />
              <QuickLink href="/menu" title="Nutrición" description="Plan de comidas y pautas por fase" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse mt-4">
      {/* Coach summary card skeleton */}
      <div className="h-28 w-full rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/5" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-white/5" />
      </div>

      {/* Primary Metrics Grid Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-white/10" />
          <div className="h-3 w-28 rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-5 w-5 rounded-full bg-white/10" />
              </div>
              <div className="h-8 w-24 rounded bg-white/10" />
              <div className="h-3 w-16 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Secondary Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-white/10" />
              <div className="h-5 w-5 rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-24 rounded bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Quick Links Skeleton */}
      <div className="space-y-2 pt-2">
        <div className="h-3.5 w-32 rounded bg-white/10" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-24 rounded bg-white/10" />
                <div className="h-2.5 w-40 rounded bg-white/5" />
              </div>
              <div className="h-4 w-4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-md backdrop-blur-sm p-4 flex items-center justify-between no-underline hover:bg-slate-800/80 hover:border-emerald-500/40 transition-colors duration-150 group"
    >
      <div>
        <div className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors duration-150">{title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{description}</div>
      </div>
      <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0 ml-2" />
    </Link>
  );
}
