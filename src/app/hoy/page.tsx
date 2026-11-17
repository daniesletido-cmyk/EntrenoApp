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
  Sparkles,
} from "lucide-react";
import { ReadinessCard, type ReadinessRecentSession } from "@/components/dashboard/readiness-card";
import { FallbackManualModal } from "@/components/suunto/fallback-manual-modal";
import { todayISO, weekStartOf, weekDates } from "@/lib/dates";
import {
  reconcileSessions,
  reconcileSleep,
  getFastCachedSessions,
  saveLocalWeeklySummary,
  getLocalWeeklySummary,
  saveLocalReadiness,
  getLocalReadiness,
} from "@/lib/client-persistence";
import { mutateWithOfflineSync } from "@/lib/offline-sync";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { copyWorkoutToClipboard } from "@/lib/format-workout";
import type { DailyReadiness } from "@/lib/readiness";
import { parseWorkoutModification } from "@/lib/workout-modifications";
import { WorkoutModificationBanner } from "@/components/workout-modification-banner";
import { WorkoutDetailModal } from "@/components/workout-detail-modal";
import { WorkoutStructuredNotes } from "@/components/workout-structured-notes";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import { SuuntoPushButton, type SuuntoSyncInfo } from "@/components/suunto-push-button";
import { detectVamZoneForSession } from "@/lib/vam-zones";
import { CalendarAgendaBadge } from "@/components/calendar/calendar-agenda-badge";
import { MultidisciplinaryAdaptationCard } from "@/components/multidisciplinary-adaptation-card";
import { MarathonCompactWidget } from "@/components/dashboard/marathon-compact-widget";
import { RaceStrategyCardWidget } from "@/components/dashboard/race-strategy-card-widget";
import { AerobicEfficiencyInsight } from "@/components/dashboard/aerobic-efficiency-insight";
import { PhysioAlertBanner } from "@/components/dashboard/physio-alert-banner";
import { CrossfitButtonWidget } from "@/components/crossfit/crossfit-button-widget";
import { WorkoutShareCardModal } from "@/components/modals/workout-share-card-modal";
import type { AdaptedSessionProposal } from "@/lib/adaptive_scheduler";
import { SubstituteWorkoutModal } from "@/components/modals/substitute-workout-modal";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
  user_notes?: string | null;
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
  const [weekSessions, setWeekSessions] = useState<SessionRow[]>(() => {
    return getFastCachedSessions(weekStartOf(today));
  });
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
  const [calendarProposal, setCalendarProposal] = useState<AdaptedSessionProposal | null>(null);
  const [calendarVersion, setCalendarVersion] = useState<"express" | "original">("express");
  const [substituteModalSession, setSubstituteModalSession] = useState<SessionRow | null>(null);
  const [shareCardSession, setShareCardSession] = useState<SessionRow | null>(null);
  const [sensoryAdaptation, setSensoryAdaptation] = useState<any | null>(null);
  const toast = useToast();

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const currentWeekStart = weekStartOf(today);

    // Si no tenemos sesiones en memoria, hidratar inmediatamente desde caché local
    if (weekSessions.length === 0) {
      const cached = await reconcileSessions([], currentWeekStart);
      if (cached && cached.length > 0) setWeekSessions(cached);
      const cachedSummary = await getLocalWeeklySummary(currentWeekStart);
      if (cachedSummary) setWeeklySummary(cachedSummary);
      const cachedReadiness = await getLocalReadiness(today);
      if (cachedReadiness) setReadiness(cachedReadiness);
    }

    try {
      const t = Date.now();
      const [weekSessionsRes, sleepRes, readinessRes, summaryRes, recRes, adaptiveRes] = await Promise.all([
        fetch(`/api/sessions?week=${currentWeekStart}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ sessions: [] })),
        fetch(`/api/sleep?from=${today}&to=${today}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ logs: [] })),
        fetch(`/api/readiness?date=${today}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ readiness: null })),
        fetch(`/api/summary?week=${currentWeekStart}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
        fetch(`/api/recommendations?week=${currentWeekStart}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
        fetch(`/api/adaptive-plan?week=${currentWeekStart}&t=${t}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      const reconciledWeek = await reconcileSessions(weekSessionsRes?.sessions ?? [], currentWeekStart);
      setWeekSessions(reconciledWeek);
      setSuuntoSyncMap(weekSessionsRes?.suuntoSyncMap ?? {});

      if (readinessRes?.readiness) {
        setReadiness(readinessRes.readiness);
        saveLocalReadiness(today, readinessRes.readiness);
      } else {
        const cachedR = await getLocalReadiness(today);
        if (cachedR) setReadiness(cachedR);
      }

      if (summaryRes) {
        setWeeklySummary(summaryRes);
        saveLocalWeeklySummary(currentWeekStart, summaryRes);
      } else {
        const cachedS = await getLocalWeeklySummary(currentWeekStart);
        if (cachedS) setWeeklySummary(cachedS);
      }

      if (recRes && typeof recRes.acwr === "number") setWeeklyAcwr(recRes.acwr);
      if (adaptiveRes?.latestSensoryAdaptation) {
        setSensoryAdaptation(adaptiveRes.latestSensoryAdaptation);
      } else {
        setSensoryAdaptation(null);
      }

      const sleepLogs: SleepRow[] = sleepRes?.logs ?? sleepRes?.sleepLogs ?? [];
      const reconciledSleep = await reconcileSleep(sleepLogs as never, today, today);
      setSleep((reconciledSleep.find((l) => l.date === today) as never) ?? null);
    } catch {
      // En caso de corte de red, recuperar todo desde IndexedDB
      const fallbackSessions = await reconcileSessions([], currentWeekStart);
      if (fallbackSessions.length > 0) setWeekSessions(fallbackSessions);
      const cachedSummary = await getLocalWeeklySummary(currentWeekStart);
      if (cachedSummary) setWeeklySummary(cachedSummary);
      const cachedReadiness = await getLocalReadiness(today);
      if (cachedReadiness) setReadiness(cachedReadiness);
      const fallbackSleep = await reconcileSleep([], today, today);
      setSleep((fallbackSleep.find((l) => l.date === today) as never) ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today, weekSessions.length]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    function onRefresh() {
      load(true);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        load(false);
      }
    }

    window.addEventListener("entrenoapp:refresh", onRefresh);
    window.addEventListener("entrenoapp:sleep-updated", onRefresh);
    window.addEventListener("focus", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("entrenoapp:refresh", onRefresh);
      window.removeEventListener("entrenoapp:sleep-updated", onRefresh);
      window.removeEventListener("focus", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
      const res = await mutateWithOfflineSync({
        url: "/api/readiness/adjust",
        method: "POST",
        body: { date: selectedDate, sessionId },
        description: `Adaptar sesión por Readiness (${selectedDate})`,
      });
      if (res.ok) {
        toast.push(
          "success",
          res.offline
            ? "Adaptación guardada en local · Se sincronizará al conectar"
            : "Sesión adaptada correctamente"
        );
        load(false);
      } else {
        toast.push("error", res.error ?? "No se pudo adaptar");
      }
    } finally {
      setApplyingAdjustment(false);
    }
  }

  async function handleRevertAdjustment(sessionId: number) {
    setApplyingAdjustment(true);
    try {
      const res = await mutateWithOfflineSync({
        url: "/api/readiness/adjust",
        method: "POST",
        body: { date: selectedDate, sessionId, action: "revert" },
        description: `Restaurar sesión original (${selectedDate})`,
      });
      if (res.ok) {
        toast.push(
          "success",
          res.offline
            ? "Restauración guardada en local · Se sincronizará al conectar"
            : "Plan original restaurado"
        );
        load(false);
      } else {
        toast.push("error", res.error ?? "No se pudo restaurar");
      }
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

      {/* Indicador Compacto de Objetivo y Periodización (Maratón 26/04/2027) */}
      <ErrorBoundary fallbackTitle="Objetivo Maratón">
        <MarathonCompactWidget />
      </ErrorBoundary>

      {/* Estrategia de Competición (Pacing & Nutrición) */}
      <ErrorBoundary fallbackTitle="Estrategia de Competición">
        <RaceStrategyCardWidget />
      </ErrorBoundary>

      {/* Analizar Semana CrossFit (Foto / Visión IA) */}
      <ErrorBoundary fallbackTitle="Analizador CrossFit">
        <CrossfitButtonWidget onAddedToCalendar={() => load(false)} />
      </ErrorBoundary>

      {/* Sugerencia Preventiva de Fisioterapia y Movilidad (10 min) si hay sobrecarga o fatiga */}
      <ErrorBoundary fallbackTitle="Alerta de Fisioterapia">
        {(() => {
          const lastCompletedSession = [...weekSessions]
            .filter((s) => s.status === "realizada" || s.status === "completada")
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            <PhysioAlertBanner
              readinessScore={readiness?.score ?? null}
              readinessLevel={readiness?.level ?? null}
              recentNotes={`${lastCompletedSession?.notes || ""} ${lastCompletedSession?.user_notes || ""}`}
              lastSessionRpe={lastCompletedSession?.rpe ?? null}
              lastSessionTitle={lastCompletedSession?.planned_code ?? null}
            />
          );
        })()}
      </ErrorBoundary>

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

      {/* Badge de Agenda y Adaptación del Calendario iPhone */}
      <CalendarAgendaBadge
        date={selectedDate}
        onSelectVersion={setCalendarVersion}
        activeVersion={calendarVersion}
        onAdaptationLoaded={setCalendarProposal}
      />

      {/* Tarjeta Multidisciplinar de Adaptación por Sensaciones & Carga */}
      <MultidisciplinaryAdaptationCard
        adaptation={sensoryAdaptation}
        onViewSession={(sId) => setDetailSessionId(sId)}
      />

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
            const isAdaptedExpress = Boolean(
              calendarProposal &&
              calendarProposal.status === "adapted_express" &&
              calendarVersion === "express" &&
              calendarProposal.originalSession.id === s.id
            );

            const effectiveSession = isAdaptedExpress
              ? {
                  ...s,
                  planned_code: calendarProposal!.adaptedSession.planned_code,
                  duration_min: calendarProposal!.adaptedSession.duration_min,
                  distance_km: calendarProposal!.adaptedSession.distance_km,
                  notes: calendarProposal!.adaptedSession.notes,
                }
              : s;

            const meta = DISCIPLINE_LABEL[s.discipline] ?? DISCIPLINE_LABEL.otro;
            const Icon = meta.Icon;
            const modInfo = parseWorkoutModification(s, readiness?.proposedMicroAdjustments, readiness?.score);
            const isCompleted = s.status === "realizada";
            const vamZone = s.discipline === "carrera" ? detectVamZoneForSession(effectiveSession) : null;

            const cleanNotes = effectiveSession.notes
              ? effectiveSession.notes
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
                {modInfo && (modInfo.isModified || modInfo.isPendingProposal || modInfo.isOptimal) && (
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
                        {isAdaptedExpress && (
                          <span className="badge badge-warning flex items-center gap-1">
                            <Zap size={10} />
                            Versión Express
                          </span>
                        )}
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
                        {effectiveSession.planned_code || meta.label}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Chips clave limpios (Distancia / Duración / RPE) */}
                {(effectiveSession.distance_km != null || effectiveSession.duration_min != null || s.rpe != null || effectiveSession.discipline === "crossfit") && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {effectiveSession.discipline === "crossfit" ? (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Modalidad</div>
                        <div className="text-sm font-bold mt-0.5 truncate" style={{ color: "var(--color-text)" }}>
                          Fuerza + WOD
                        </div>
                      </div>
                    ) : (
                      effectiveSession.distance_km != null && (
                        <div
                          className="p-3 rounded-xl"
                          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                        >
                          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Distancia</div>
                          <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                            {effectiveSession.distance_km} km
                          </div>
                        </div>
                      )
                    )}
                    {(effectiveSession.duration_min != null || effectiveSession.discipline === "crossfit") && (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Duración</div>
                        <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                          {effectiveSession.duration_min || 60} min
                        </div>
                      </div>
                    )}
                    {(s.rpe != null || effectiveSession.discipline === "crossfit") && (
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Esfuerzo</div>
                        <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
                          RPE {s.rpe || "7-8"}
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
                      discipline={effectiveSession.discipline}
                      distanceKm={effectiveSession.distance_km}
                      durationMin={effectiveSession.duration_min}
                    />
                  </div>
                )}

                {/* Análisis & Feedback del Equipo Técnico Multidisciplinar */}
                <SessionFeedbackCard
                  session={s}
                  onOpenDetail={(id) => setDetailSessionId(id)}
                />

                {/* Insight de Eficiencia Aeróbica y Desacople Cardíaco (Suunto) */}
                {s.discipline === "carrera" && (
                  <AerobicEfficiencyInsight
                    isCompleted={isCompleted}
                    discipline={s.discipline}
                  />
                )}

                {/* Botón principal: Exportar a Suunto + Acciones secundarias */}
                <div className="space-y-3 pt-2">
                  <SuuntoPushButton
                    sessionId={s.id}
                    discipline={s.discipline}
                    status={s.status}
                    sessionDate={s.date}
                    sessionCode={s.planned_code}
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

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs flex-1"
                      onClick={() => setDetailSessionId(s.id)}
                    >
                      <Activity size={15} />
                      <span>Detalle</span>
                    </button>
                    {isCompleted && (
                      <button
                        type="button"
                        className="btn btn-ghost text-xs flex-1 flex items-center justify-center gap-1 text-red-500 hover:text-red-400 font-semibold harbiz-press"
                        onClick={() => setShareCardSession(effectiveSession)}
                        title="Descargar Tarjeta Resumen 9:16"
                      >
                        <Sparkles size={14} className="text-red-500" />
                        <span>Tarjeta</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost text-xs flex-1"
                      onClick={() => copySession(effectiveSession)}
                    >
                      {copiedId === s.id ? <Check size={15} style={{ color: "var(--color-success)" }} /> : <Copy size={15} />}
                      <span>{copiedId === s.id ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>

                  {/* Acción rápida de sustitución por enfermedad/recuperación */}
                  <button
                    type="button"
                    className="w-full btn btn-ghost text-xs flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-300 hover:border-red-400 text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer bg-zinc-50/50"
                    onClick={() => setSubstituteModalSession(s)}
                  >
                    <Footprints size={14} className="text-amber-500" />
                    <span>Cambiar entreno (Andar / Enfermedad / Descanso)</span>
                  </button>
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

      {substituteModalSession && (
        <SubstituteWorkoutModal
          isOpen={Boolean(substituteModalSession)}
          onClose={() => setSubstituteModalSession(null)}
          date={substituteModalSession.date}
          sessionId={substituteModalSession.id}
          currentDiscipline={substituteModalSession.discipline}
          currentTitle={substituteModalSession.planned_code}
          onSuccess={() => load(false)}
        />
      )}

      {shareCardSession && (
        <WorkoutShareCardModal
          isOpen={Boolean(shareCardSession)}
          onClose={() => setShareCardSession(null)}
          workout={{
            title: shareCardSession.planned_code || "Entrenamiento",
            discipline: shareCardSession.discipline || "carrera",
            date: shareCardSession.date || today,
            distanceKm: shareCardSession.distance_km ?? null,
            durationMin: shareCardSession.duration_min ?? null,
            avgPaceMinKm:
              shareCardSession.distance_km && shareCardSession.duration_min
                ? shareCardSession.duration_min / shareCardSession.distance_km
                : null,
            avgHeartRate: null,
            readinessScore: readiness?.score ?? 88,
            readinessLevel: readiness?.level ?? "Óptimo",
            vamPace: "3:59 min/km",
            rpe: shareCardSession.rpe ?? null,
          }}
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
