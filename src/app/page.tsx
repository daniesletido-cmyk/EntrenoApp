"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Moon,
  ArrowRight,
  Route,
  Timer,
  Flag,
  RefreshCw,
  Activity,
} from "lucide-react";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { FallbackManualModal } from "@/components/suunto/fallback-manual-modal";
import type { DailyReadiness } from "@/lib/readiness";
import { weekStartOf, todayISO } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TrainingLoadChart } from "@/components/dashboard/training-load-chart";

interface RecentSession {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  status: string;
  duration_min: number | null;
  distance_km: number | null;
  rpe: number | null;
  hasFit: boolean;
}

interface RecentSleepItem {
  date: string;
  hours: number | null;
  quality: number | null;
  score: number | null;
  deep_min: number | null;
}

interface Summary {
  weekStart: string;
  weekEnd: string;
  planificadas: number;
  realizadas: number;
  parciales: number;
  noRealizadas: number;
  pendientes: number;
  compliancePct: number | null;
  rpeAvg: number | null;
  sleepHoursAvg: number | null;
  sleepQualityAvg: number | null;
  distanceKm: number;
  durationMin: number;
  recentSessions?: RecentSession[];
  recentSleep?: RecentSleepItem[];
}

interface Recommendation {
  action: "mantener" | "reducir" | "alerta_medica";
  summary: string;
  acwr?: number | null;
}

function daysUntilRace(raceDate: string): number {
  const diff = new Date(raceDate + "T00:00:00Z").getTime() - new Date(todayISO() + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

export default function ProgresoSaludPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [readiness, setReadiness] = useState<DailyReadiness | null>(null);
  const [raceDate, setRaceDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const t = Date.now();
      const todayStr = todayISO();
      const [s, r, cfg, rd] = await Promise.all([
        fetch(`/api/summary?week=${weekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/recommendations?week=${weekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/settings?t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/readiness?date=${todayStr}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ readiness: null })),
      ]);

      setSummary(s);
      setRec(r);
      setReadiness(rd?.readiness ?? null);
      setRaceDate(cfg.settings?.goal_race_date ?? null);
    } catch {
      // silent
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
  const fmtDuration = (totalMin: number) => {
    if (totalMin <= 0) return "0h 00m";
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const complianceTone =
    summary?.compliancePct === null || summary?.compliancePct === undefined
      ? "neutral"
      : summary.compliancePct >= 80
      ? "success"
      : "brand";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progreso & Salud"
        description={summary?.weekStart ? `Semana del ${summary.weekStart}` : "Carga, sueño y evolución"}
        actions={
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm harbiz-press"
            style={{ minHeight: 44 }}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>
        }
      />

      {/* Panel Readiness / Estado Actual */}
      <ReadinessCard
        readiness={readiness}
        acwr={rec?.acwr ?? 1.0}
        weeklyKm={summary?.distanceKm ?? 0}
        weeklyTargetKm={45}
        weeklyDurationMin={summary?.durationMin ?? 0}
        completedSessions={(summary?.realizadas ?? 0) + (summary?.parciales ?? 0)}
        plannedSessions={summary?.planificadas ?? 0}
        sleepHours={summary?.sleepHoursAvg ?? readiness?.stats?.sleepHours ?? null}
        sleepScore={summary?.recentSleep?.[0]?.score ?? readiness?.stats?.sleepScore ?? null}
        sleepQuality={summary?.sleepQualityAvg ?? readiness?.stats?.sleepQuality ?? null}
        recentSessions={summary?.recentSessions ?? []}
      />

      {raceDate && (
        <div className="surface p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
            >
              <Flag size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Próximo objetivo
              </div>
              <div className="text-sm sm:text-base font-bold truncate" style={{ color: "var(--color-text)" }}>
                Maratón · Faltan{" "}
                <span className="tabular-nums" style={{ color: "var(--color-brand)" }}>
                  {daysUntilRace(raceDate)} días
                </span>
              </div>
            </div>
          </div>
          <Link href="/progreso" className="btn btn-secondary btn-sm harbiz-press no-underline">
            Histórico
          </Link>
        </div>
      )}

      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {loading && <ProgressSkeleton />}

      {!loading && summary && (
        <div className="space-y-5 animate-in">
          {/* 4 métricas clave en tarjetas limpias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Cumplimiento"
              value={summary.compliancePct !== null ? `${summary.compliancePct.toFixed(0)}%` : "—"}
              icon={<CalendarCheck2 size={17} />}
              tone={complianceTone}
              sublabel={`${summary.realizadas + summary.parciales} de ${summary.planificadas} sesiones`}
            />
            <StatCard
              label="Distancia semanal"
              value={`${summary.distanceKm.toFixed(1)} km`}
              icon={<Route size={17} />}
              tone="brand"
              sublabel="Volumen acumulado"
            />
            <StatCard
              label="Tiempo entrenado"
              value={fmtDuration(summary.durationMin)}
              icon={<Timer size={17} />}
              sublabel={summary.rpeAvg ? `RPE medio ${summary.rpeAvg.toFixed(1)}` : "Duración total"}
            />
            <StatCard
              label="Sueño medio"
              value={fmt(summary.sleepHoursAvg, "h")}
              icon={<Moon size={17} />}
              sublabel={summary.sleepQualityAvg ? `Calidad ${fmt(summary.sleepQualityAvg)}/5` : "Descanso nocturno"}
            />
          </div>

          {/* Gráfico único principal de carga y recuperación */}
          <TrainingLoadChart
            currentWeekTss={Math.round(summary.durationMin * ((summary.rpeAvg ?? 5) / 10) * 1.5) || 410}
            acwr={rec?.acwr ?? 1.05}
          />

          {/* Sueño últimas noches */}
          <div className="surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Moon size={17} style={{ color: "var(--color-brand)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Sueño (Últimas noches)
                </span>
              </div>
              <Link
                href="/sueno"
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: "var(--color-brand)" }}
              >
                <span>Ver detalle</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {summary.recentSleep && summary.recentSleep.length > 0 ? (
              <div className="snap-carousel gap-2.5 pb-1">
                {summary.recentSleep.slice(0, 7).reverse().map((sl, idx) => (
                  <div
                    key={idx}
                    className="snap-item flex-1 min-w-[68px] flex flex-col items-center rounded-xl p-3 text-center"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {sl.date.slice(5)}
                    </span>
                    <span
                      className="text-base font-bold tabular-nums mt-1"
                      style={{
                        color: (sl.score ?? 0) >= 80 ? "var(--color-success)" : "var(--color-brand)",
                      }}
                    >
                      {sl.score ?? "—"}
                    </span>
                    <span className="text-xs tabular-nums mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {sl.hours ? `${Number(sl.hours).toFixed(1)}h` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Sin registros de sueño esta semana.
              </p>
            )}
          </div>

          {/* Últimas sesiones */}
          {summary.recentSessions && summary.recentSessions.length > 0 ? (
            <div className="surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={17} style={{ color: "var(--color-brand)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    Últimas Sesiones
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.recentSessions.slice(0, 6).map((ses) => {
                  const isDone = ses.status === "realizada" || ses.status === "completado";
                  return (
                    <Link
                      key={ses.id}
                      href={`/detalle?id=${ses.id}&date=${ses.date}`}
                      className="p-4 rounded-xl transition-all flex flex-col justify-between no-underline harbiz-press"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                            {ses.date} · {ses.discipline}
                          </span>
                          <span className={isDone ? "badge badge-success" : "badge badge-neutral"}>
                            {isDone ? "Completado" : "Pendiente"}
                          </span>
                        </div>
                        <div className="font-semibold text-sm mt-2 leading-snug break-words">
                          {ses.planned_code || ses.discipline}
                        </div>
                      </div>

                      {(ses.duration_min || ses.distance_km || ses.rpe) && (
                        <div
                          className="mt-3 pt-2.5 flex items-center gap-2 text-xs tabular-nums"
                          style={{
                            borderTop: "1px solid var(--color-border)",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {ses.duration_min ? <span>{ses.duration_min} min</span> : null}
                          {ses.distance_km ? <span>· {ses.distance_km} km</span> : null}
                          {ses.rpe ? <span>· RPE {ses.rpe}</span> : null}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<CalendarCheck2 size={22} />}
              title="Sin sesiones registradas esta semana"
              description="Planifica o registra tu entrenamiento desde Hoy / Plan."
              action={
                <Link href="/hoy" className="btn btn-primary">
                  Ir a Hoy / Plan
                </Link>
              }
            />
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="text-xs hover:underline cursor-pointer px-2 py-2"
          style={{ color: "var(--color-text-muted)", minHeight: 44 }}
        >
          ¿Fallo de sincronización? Carga manual (.FIT / .CSV)
        </button>
      </div>

      <FallbackManualModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 surface p-5" />
        ))}
      </div>
      <div className="h-64 surface p-5" />
    </div>
  );
}
