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
} from "lucide-react";
import Link from "next/link";
import { todayISO, isoDayOfWeek, weekStartOf } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyWorkoutToClipboard } from "@/lib/format-workout";
import type { DailyReadiness } from "@/lib/readiness";

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

// Misma lógica que en Calendario: qué fase de plan corresponde a una fecha, según los
// rangos guardados en Configuración, con la fase actual como resguardo.
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
  const [showReadinessDetail, setShowReadinessDetail] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
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
      const [settingsRes, sessionsRes, recRes, sleepRes, readinessRes] = await Promise.all([
        fetch(`/api/settings?t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sessions?from=${today}&to=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/recommendations?week=${weekStartOf(today)}&t=${t}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/sleep?from=${today}&to=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ logs: [] })),
        fetch(`/api/readiness?date=${today}&t=${t}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ readiness: null })),
      ]);

      const s: Record<string, string> = settingsRes.settings ?? {};
      setSettings(s);
      setSessions(sessionsRes.sessions ?? []);
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
        description={formatToday(today).replace(/^\w/, (c) => c.toUpperCase())}
        actions={
          <div className="flex items-center gap-2">
            {raceDays !== null && (
              <span
                className="badge badge-info hidden sm:inline-flex"
                style={{ fontSize: "var(--text-xs)", padding: "0.4rem 0.8rem", borderRadius: "var(--radius-full)" }}
              >
                <Flag size={13} style={{ marginRight: 4 }} />
                {raceDays >= 0 ? `Faltan ${raceDays} días para el maratón` : `Maratón hace ${-raceDays} días`}
              </span>
            )}
            <button
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
              onClick={() => load(true)}
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

      {readiness && (
        <div
          className="surface animate-in"
          style={{
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            borderLeft: `3px solid ${
              readiness.tone === "success"
                ? "var(--color-success)"
                : readiness.tone === "warning"
                ? "var(--color-warning)"
                : readiness.tone === "danger"
                ? "var(--color-danger)"
                : "var(--color-brand)"
            }`,
          }}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3" style={{ flexWrap: "wrap" }}>
            <div className="flex items-start gap-3">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface-raised)",
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
              >
                <Zap size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                  <span className="font-semibold text-base">Estado para entrenar hoy</span>
                  <span
                    className={`badge ${
                      readiness.tone === "success"
                        ? "badge-success"
                        : readiness.tone === "warning"
                        ? "badge-warning"
                        : readiness.tone === "danger"
                        ? "badge-danger"
                        : "badge-brand"
                    }`}
                  >
                    {readiness.levelLabel}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Calculado con sueño, fatiga de 48h y ratio de carga semanal (ACWR)
                </div>
              </div>
            </div>

            {/* Score Pill */}
            <div
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "baseline",
                gap: 3,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              <span
                className="tabular-nums font-extrabold"
                style={{
                  fontSize: "1.45rem",
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
              <span className="text-xs text-muted font-bold">/100</span>
            </div>
          </div>

          {/* Headline & Summary */}
          <div style={{ marginTop: "var(--space-3)" }}>
            <div className="font-semibold text-sm">
              {readiness.headline}
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 2, lineHeight: 1.5 }}>
              {readiness.summary}
            </p>
          </div>

          {/* Coach Advice Callout */}
          <div
            className="flex items-start gap-2.5"
            style={{
              marginTop: "var(--space-3)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Sparkles
              size={16}
              style={{
                color: "var(--color-brand)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="font-semibold text-xs uppercase" style={{ color: "var(--color-brand)", letterSpacing: "0.03em" }}>
                Consejo del entrenador
              </div>
              <p className="text-sm" style={{ marginTop: 2, lineHeight: 1.45 }}>
                {readiness.coachAdvice}
              </p>
            </div>
          </div>

          {/* Toggle breakdown button */}
          <div className="flex items-center justify-between" style={{ marginTop: "var(--space-3)" }}>
            <button
              onClick={() => setShowReadinessDetail((prev) => !prev)}
              className="btn btn-ghost inline-flex items-center gap-1.5"
              style={{ fontSize: "var(--text-xs)", padding: "0.3rem 0.6rem" }}
            >
              {showReadinessDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showReadinessDetail ? "Ocultar factores detallados" : "Ver qué influye en tu estado (sueño, fatiga y carga)"}
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
                      <span className="font-semibold text-xs uppercase text-muted">
                        {f.id === "sleep" ? "💤 " : f.id === "acute_fatigue" ? "⚡ " : "📈 "}
                        {f.title}
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
                return (
                  <div key={s.id} className="surface" style={{ padding: "var(--space-4)" }}>
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
                          <div className="font-semibold" style={{ fontSize: "var(--text-base)" }}>
                            {meta.label}
                            {s.planned_code ? ` · ${s.planned_code}` : ""}
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
                    {s.notes && (
                      <p
                        className="text-sm text-muted"
                        style={{ marginTop: "var(--space-3)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                      >
                        {s.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: "var(--space-4)" }}>
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

          {sleep && sleep.hours != null && (
            <div className="flex items-center gap-2 text-sm text-muted" style={{ marginTop: "var(--space-3)" }}>
              <Moon size={15} />
              Dormiste {sleep.hours}h anoche
              {sleep.quality ? ` · calidad ${sleep.quality}/5` : ""}
              {sleep.score != null ? ` · puntuación ${sleep.score}/100` : ""}
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
    </div>
  );
}
