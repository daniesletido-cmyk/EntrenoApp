"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { weekStartOf, todayISO } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { CoachSummaryCard } from "@/components/coach-summary-card";
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/summary?week=${weekStart}`).then((r) => r.json()),
      fetch(`/api/recommendations?week=${weekStart}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
      fetch(`/api/coach-assessment?week=${weekStart}`).then((r) => r.json()).catch(() => ({ assessment: null })),
    ])
      .then(([s, r, cfg, g, ca]) => {
        setSummary(s);
        setRec(r);
        setRaceDate(cfg.settings?.goal_race_date ?? null);
        const activos: Goal[] = (g.goals ?? []).filter((x: Goal) => x.status === "activo" && x.target_date);
        setNextGoal(activos.length > 0 ? activos[0] : null);
        setCoachAssessment(ca?.assessment ?? null);
      })
      .finally(() => setLoading(false));
  }, [weekStart]);

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
      />

      {raceDate && (
        <div
          className="surface flex items-center justify-between gap-3 animate-in"
          style={{
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.22)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "var(--color-brand)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
                flexShrink: 0,
              }}
            >
              <Flag size={18} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Objetivo Principal · Maratón
              </div>
              <div className="font-extrabold text-sm sm:text-base">
                Faltan <span style={{ color: "var(--color-brand)" }}>{daysUntilRace(raceDate)} días</span> ({raceDate})
              </div>
            </div>
          </div>
          <Link
            href="/objetivos"
            className="btn btn-secondary text-xs"
            style={{ minHeight: 34, height: 34, padding: "0 12px", borderRadius: "var(--radius-full)", flexShrink: 0 }}
          >
            Ver objetivo
          </Link>
        </div>
      )}

      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {loading && <Loading label="Cargando resumen de la semana…" />}

      {!loading && summary && (
        <div className="animate-in grid gap-5">
          {coachAssessment && <CoachSummaryCard assessment={coachAssessment} />}

          {rec && rec.action !== "mantener" && (
            <div
              className="surface flex items-start gap-3.5"
              style={{
                padding: "var(--space-4)",
                borderLeft: `3px solid ${BANNER_STYLE[ACTION_BANNER[rec.action].tone].color}`,
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
              <div style={{ flex: 1 }}>
                <div
                  className="font-semibold text-sm"
                  style={{ color: BANNER_STYLE[ACTION_BANNER[rec.action].tone].color }}
                >
                  {ACTION_BANNER[rec.action].label}
                </div>
                <p className="text-sm text-muted" style={{ marginTop: 2, lineHeight: 1.5 }}>
                  {rec.summary}
                </p>
              </div>
              <Link
                href="/recomendaciones"
                className="btn btn-secondary text-xs"
                style={{ flexShrink: 0, height: 36 }}
              >
                Ver detalle
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* Core Week Metrics Grid */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Métricas de la semana
              </span>
              {summary.compliancePct !== null && (
                <span className="text-xs text-muted">
                  {summary.realizadas + summary.parciales} de {summary.planificadas} sesiones
                  {summary.extrasRealizadas && summary.extrasRealizadas > 0
                    ? ` (+${summary.extrasRealizadas} extra)`
                    : ""}
                </span>
              )}
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
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
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
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
              label="Esfuerzo medio (RPE)"
              value={fmt(summary.rpeAvg)}
              icon={<Gauge size={16} />}
              sublabel="Escala subjetiva 0–10"
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
            <div className="text-xs font-semibold uppercase tracking-wider text-muted" style={{ marginBottom: "var(--space-2)" }}>
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

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="surface surface-interactive flex items-center justify-between"
      style={{
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{description}</div>
      </div>
      <ArrowRight size={15} className="text-muted" style={{ flexShrink: 0, marginLeft: 8 }} />
    </Link>
  );
}
