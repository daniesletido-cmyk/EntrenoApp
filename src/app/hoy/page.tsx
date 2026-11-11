"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  BedDouble,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  Moon,
  Copy,
  Check,
  Zap,
  Activity,
  RefreshCw,
  CalendarRange,
} from "lucide-react";
import { ReadinessCard, type ReadinessRecentSession } from "@/components/dashboard/readiness-card";
import { FallbackManualModal } from "@/components/suunto/fallback-manual-modal";
import { todayISO, weekStartOf, weekDates } from "@/lib/dates";
import { reconcileSessions, reconcileSleep } from "@/lib/client-persistence";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { copyWorkoutToClipboard } from "@/lib/format-workout";
import type { DailyReadiness } from "@/lib/readiness";
import { parseWorkoutModification } from "@/lib/workout-modifications";
import { WorkoutModificationBanner } from "@/components/workout-modification-banner";
import { WorkoutDetailModal } from "@/components/workout-detail-modal";
import { WorkoutStructuredNotes } from "@/components/workout-structured-notes";
import { SuuntoPushButton, type SuuntoSyncInfo } from "@/components/suunto-push-button";
import { detectVamZoneForSession } from "@/lib/vam-zones";

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

interface SleepRow {
  date: string;
  hours: number | null;
  quality: number | null;
  score: number | null;
  resting_hr?: number | null;
  hrv_rmssd?: number | null;
  nap_min?: number | null;
}

const DISCIPLINE_LABEL: Record<string, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  carrera: { label: "Carrera", Icon: Footprints },
  gimnasio: { label: "Gimnasio", Icon: Dumbbell },
  natacion: { label: "Natación", Icon: Waves },
  crossfit: { label: "CrossFit", Icon: Flame },
  caminata: { label: "Caminata", Icon: Footprints },
  otro: { label: "Entrenamiento", Icon: MoreHorizontal },
  descanso: { label: "Descanso", Icon: BedDouble },
};

const DAY_NAMES_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const name = DAY_NAMES_LONG[d.getUTCDay()];
  return `${name.charAt(0).toUpperCase() + name.slice(1)}, ${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()]}`;
}

export default function HoyPage() {
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekSessions, setWeekSessions] = useState<SessionRow[]>([]);
  const [suuntoSyncMap, setSuuntoSyncMap] = useState<Record<number, SuuntoSyncInfo>>({});
  const [sleep, setSleep] = useState<SleepRow | null>(null);
  const [readiness, setReadiness] = useState<DailyReadiness | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<{
    distanceKm: number;
    durationMin: number;
    realizadas: number;
    parciales: number;
    planificadas: number;
    sleepHoursAvg: number | null;
    recentSessions?: ReadinessRecentSession[];
  } | null>(null);
  const [weeklyAcwr, setWeeklyAcwr] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [applyingAdjustment, setApplyingAdjustment] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const t = Date.now();
      const currentWeekStart = weekStartOf(today);
      const [weekSessionsRes, sleepRes, readinessRes, summaryRes, recRes] = await Promise.all([
        fetch(`/api/sessions?week=${currentWeekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sleep?from=${today}&to=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ logs: [] })),
        fetch(`/api/readiness?date=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ readiness: null })),
        fetch(`/api/summary?week=${currentWeekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`/api/recommendations?week=${currentWeekStart}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);

      const reconciledWeek = await reconcileSessions(weekSessionsRes.sessions ?? [], currentWeekStart);
      setWeekSessions(reconciledWeek);
      setSuuntoSyncMap(weekSessionsRes.suuntoSyncMap ?? {});
      setReadiness(readinessRes.readiness ?? null);
      if (summaryRes) setWeeklySummary(summaryRes);
      if (recRes && typeof recRes.acwr === "number") setWeeklyAcwr(recRes.acwr);

      const sleepLogs: SleepRow[] = sleepRes.logs ?? sleepRes.sleepLogs ?? [];
      const reconciledSleep = await reconcileSleep(sleepLogs as never, today, today);
      setSleep((reconciledSleep.find((l) => l.date === today) as never) ?? null);
    } catch {
      // silent
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
      toast.push("success", "Entreno copiado");
      setTimeout(() => setCopiedId(null), 2200);
    }
  }

  async function handleApplyAdjustment(sessionId?: number) {
    setApplyingAdjustment(true);
    try {
      const res = await fetch("/api/readiness/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error aplicando ajuste");
      toast.push("success", "Sesión adaptada correctamente");
      load(false);
    } catch (err: any) {
      toast.push("error", err?.message ?? "No se pudo adaptar");
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
        body: JSON.stringify({ date: selectedDate, sessionId, action: "revert" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error revirtiendo");
      toast.push("success", "Plan original restaurado");
      load(false);
    } catch (err: any) {
      toast.push("error", err?.message ?? "No se pudo revertir");
    } finally {
      setApplyingAdjustment(false);
    }
  }

  const weekDays = weekDates(weekStartOf(today));
  const daySessions = weekSessions.filter((s) => s.date === selectedDate && s.discipline !== "descanso");

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hoy" description={formatDateLabel(selectedDate)} />
        <HoySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={selectedDate === today ? "Hoy" : "Plan del día"}
        description={formatDateLabel(selectedDate)}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/plan-semanal"
              className="btn btn-secondary btn-sm harbiz-press no-underline"
              style={{ minHeight: 44 }}
            >
              <CalendarRange size={16} style={{ color: "var(--color-text-muted)" }} />
              <span>Semana completa</span>
            </Link>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="btn btn-ghost btn-icon harbiz-press hidden sm:inline-flex"
              aria-label="Actualizar"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* 0. Readiness / Estado Actual */}
      <ReadinessCard
        readiness={readiness}
        acwr={weeklyAcwr}
        weeklyKm={weeklySummary?.distanceKm ?? weekSessions.reduce((acc, s) => acc + (s.status === "realizada" ? (s.distance_km || 0) : 0), 0)}
        weeklyTargetKm={45}
        weeklyDurationMin={weeklySummary?.durationMin ?? weekSessions.reduce((acc, s) => acc + (s.status === "realizada" ? (s.duration_min || 0) : 0), 0)}
        completedSessions={(weeklySummary?.realizadas ?? 0) + (weeklySummary?.parciales ?? 0)}
        plannedSessions={weeklySummary?.planificadas ?? weekSessions.filter((s) => s.discipline !== "descanso").length}
        sleepHours={sleep?.hours ?? weeklySummary?.sleepHoursAvg ?? readiness?.stats?.sleepHours ?? null}
        sleepScore={sleep?.score ?? readiness?.stats?.sleepScore ?? null}
        sleepQuality={sleep?.quality ?? readiness?.stats?.sleepQuality ?? null}
        recentSessions={weeklySummary?.recentSessions ?? []}
      />

      {/* 1. Calendario Semanal Deslizable (Lunes a Domingo) */}
      <section className="surface p-4">
        <div className="snap-carousel gap-2 text-center">
          {weekDays.map((dIso, idx) => {
            const isSelected = dIso === selectedDate;
            const isDayToday = dIso === today;
            const dayNum = parseInt(dIso.slice(8), 10);
            const letters = ["L", "M", "X", "J", "V", "S", "D"];
            const daySession = weekSessions.find((s) => s.date === dIso && s.discipline !== "descanso");
            const isCompleted = daySession && (daySession.status === "realizada" || daySession.status === "parcial");

            return (
              <button
                key={dIso}
                type="button"
                onClick={() => setSelectedDate(dIso)}
                className="snap-item flex-1 min-w-[48px] min-h-[68px] flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all harbiz-press cursor-pointer"
                style={{
                  background: isSelected
                    ? "var(--color-brand)"
                    : "var(--color-surface-raised)",
                  border: isSelected
                    ? "1px solid var(--color-brand)"
                    : isDayToday
                    ? "1.5px solid var(--color-brand)"
                    : "1px solid var(--color-border)",
                  color: isSelected ? "#ffffff" : "var(--color-text)",
                }}
              >
                <span
                  className="text-xs font-semibold uppercase"
                  style={{
                    color: isSelected ? "rgba(255,255,255,0.85)" : "var(--color-text-muted)",
                  }}
                >
                  {letters[idx]}
                </span>
                <span className="text-base font-bold mt-0.5 tabular-nums leading-none">
                  {dayNum}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2"
                  style={{
                    background: isSelected
                      ? "#ffffff"
                      : isCompleted
                      ? "var(--color-success)"
                      : daySession
                      ? "var(--color-brand)"
                      : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Sesión Programada del Día (Protagonista, sin saturación) */}
      {daySessions.length === 0 ? (
        <EmptyState
          icon={<BedDouble size={24} />}
          title="Día de descanso programado"
          description="No hay entrenamientos asignados para este día. Aprovecha para recuperar."
          action={
            <Link href="/plan-semanal" className="btn btn-secondary">
              Gestionar plan semanal
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {daySessions.map((s) => {
            const meta = DISCIPLINE_LABEL[s.discipline] ?? DISCIPLINE_LABEL.otro;
            const Icon = meta.Icon;
            const modInfo = parseWorkoutModification(s, readiness?.proposedMicroAdjustments);
            const isCompleted = s.status === "realizada";
            const vamZone = s.discipline === "carrera" ? detectVamZoneForSession(s) : null;

            const cleanNotes = s.notes
              ? s.notes
                  .split("\n")
                  .filter(
                    (line) =>
                      !line.includes("[Ajuste inteligente]") &&
                      !line.includes("- Enfoque Psicológico & Tip Mental:")
                  )
                  .join("\n")
                  .trim()
              : "";

            return (
              <section key={s.id} className="surface p-5 sm:p-6 space-y-5 animate-in">
                {modInfo && (modInfo.isModified || modInfo.isPendingProposal) && (
                  <WorkoutModificationBanner
                    info={modInfo}
                    onRevert={() => handleRevertAdjustment(s.id)}
                    onApply={() => handleApplyAdjustment(s.id)}
                    reverting={applyingAdjustment}
                    applying={applyingAdjustment}
                  />
                )}

                {/* Cabecera limpia de la sesión */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isCompleted ? "var(--color-success-bg)" : "var(--color-brand-subtle)",
                        color: isCompleted ? "var(--color-success)" : "var(--color-brand)",
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={isCompleted ? "badge badge-success" : "badge badge-brand"}>
                          {isCompleted ? "Completado" : meta.label}
                        </span>
                        {vamZone && (
                          <span className="badge badge-neutral tabular-nums">
                            Objetivo {vamZone.rangeLabel}
                          </span>
                        )}
                      </div>
                      <h2
                        className="text-lg sm:text-xl font-bold tracking-tight mt-1.5 leading-snug break-words"
                        style={{ color: "var(--color-text)" }}
                      >
                        {s.planned_code || meta.label}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Chips clave limpios (Distancia / Duración / RPE) */}
                {(s.distance_km != null || s.duration_min != null || s.rpe != null) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {s.distance_km != null && (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Distancia</div>
                        <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                          {s.distance_km} km
                        </div>
                      </div>
                    )}
                    {s.duration_min != null && (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Duración</div>
                        <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                          {s.duration_min} min
                        </div>
                      </div>
                    )}
                    {s.rpe != null && (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Esfuerzo</div>
                        <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                          RPE {s.rpe}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Desglose estructurado de bloques */}
                {cleanNotes && (
                  <div className="pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <WorkoutStructuredNotes
                      notes={cleanNotes}
                      discipline={s.discipline}
                      distanceKm={s.distance_km}
                      durationMin={s.duration_min}
                    />
                  </div>
                )}

                {/* Botón principal: Exportar a Suunto + Acciones secundarias */}
                <div className="space-y-3 pt-2">
                  <SuuntoPushButton
                    sessionId={s.id}
                    discipline={s.discipline}
                    status={s.status}
                    initialSync={suuntoSyncMap[s.id] ?? null}
                    primaryMode
                    showFitDownload
                  />

                  <Link
                    href="/registro"
                    className="w-full btn btn-secondary flex items-center justify-center gap-2 rounded-xl font-semibold text-sm harbiz-press"
                    style={{ textDecoration: "none", minHeight: 44 }}
                  >
                    {isCompleted ? <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> : <Zap size={16} style={{ color: "var(--color-brand)" }} />}
                    <span>{isCompleted ? "Ver / editar registro" : "Registrar realización"}</span>
                  </Link>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs flex-1"
                      onClick={() => setDetailSessionId(s.id)}
                    >
                      <Activity size={15} />
                      <span>Detalle</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost text-xs flex-1"
                      onClick={() => copySession(s)}
                    >
                      {copiedId === s.id ? <Check size={15} style={{ color: "var(--color-success)" }} /> : <Copy size={15} />}
                      <span>{copiedId === s.id ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* 3. Resumen secundario limpio y espaciado (Sueño & Accesos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/"
          className="surface p-5 flex items-center justify-between gap-4 no-underline harbiz-press"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
            >
              <Moon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Sueño &amp; Recuperación
              </div>
              <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                {sleep?.hours ? `${sleep.hours.toFixed(1)} h` : "Ver estado de forma"}
                {sleep?.score != null && (
                  <span className="text-xs font-semibold ml-2" style={{ color: "var(--color-success)" }}>
                    {sleep.score}/100
                  </span>
                )}
              </div>
            </div>
          </div>
          <ArrowRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        </Link>

        <Link
          href="/menu"
          className="surface p-5 flex items-center justify-between gap-4 no-underline harbiz-press"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-text)" }}
            >
              <UtensilsCrossed size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Nutrición de hoy
              </div>
              <div className="text-base font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                Plan de comidas y pautas
              </div>
            </div>
          </div>
          <ArrowRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        </Link>
      </div>

      {/* Acceso discreto de Rescate Manual (Fallback) */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="text-xs hover:underline cursor-pointer px-2 py-2"
          style={{ color: "var(--color-text-muted)", minHeight: 44 }}
        >
          ¿Fallo de sincronización? Carga manual (.FIT / .CSV)
        </button>
      </div>

      <FallbackManualModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => load(true)}
      />

      {detailSessionId && (
        <WorkoutDetailModal
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
        />
      )}
    </div>
  );
}

function HoySkeleton() {
  return (
    <div className="space-y-4 animate-pulse w-full">
      <div className="surface p-4">
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 rounded-2xl" style={{ background: "var(--color-surface-raised)" }} />
          ))}
        </div>
      </div>
      <div className="surface p-6 space-y-4">
        <div className="h-6 w-2/3 rounded-lg" style={{ background: "var(--color-surface-raised)" }} />
        <div className="h-24 rounded-xl" style={{ background: "var(--color-surface-raised)" }} />
        <div className="h-12 rounded-xl" style={{ background: "var(--color-surface-raised)" }} />
      </div>
    </div>
  );
}
