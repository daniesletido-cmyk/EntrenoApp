"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { todayISO, isoDayOfWeek, weekStartOf } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

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

const DISCIPLINE_META: Record<string, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  carrera: { label: "Carrera", Icon: Footprints },
  gimnasio: { label: "Gimnasio", Icon: Dumbbell },
  natacion: { label: "Natación", Icon: Waves },
  crossfit: { label: "CrossFit", Icon: Flame },
  otro: { label: "Otro", Icon: MoreHorizontal },
  descanso: { label: "Descanso", Icon: BedDouble },
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

  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [settingsRes, sessionsRes, recRes, sleepRes] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch(`/api/sessions?from=${today}&to=${today}`).then((r) => r.json()),
        fetch(`/api/recommendations?week=${weekStartOf(today)}`).then((r) => r.json()),
        fetch(`/api/sleep?from=${today}&to=${today}`).then((r) => r.json()).catch(() => ({ logs: [] })),
      ]);
      if (cancelled) return;
      const s: Record<string, string> = settingsRes.settings ?? {};
      setSettings(s);
      setSessions(sessionsRes.sessions ?? []);
      setRec(recRes);
      const sleepLogs: SleepRow[] = sleepRes.logs ?? sleepRes.sleepLogs ?? [];
      setSleep(sleepLogs.find((l) => l.date === today) ?? null);

      const phase = phaseForDate(today, s);
      const menuRes = await fetch(`/api/menu?phase=${phase}`).then((r) => r.json());
      if (cancelled) return;
      const dow = isoDayOfWeek(today);
      setMenu((menuRes.items ?? []).filter((m: MenuItem) => m.day_of_week === dow));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

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
          raceDays !== null && (
            <span className="badge badge-info" style={{ fontSize: "var(--text-sm)", padding: "0.4rem 0.8rem" }}>
              <Flag size={14} style={{ marginRight: 4 }} />
              {raceDays >= 0 ? `Faltan ${raceDays} días para el maratón` : `Maratón hace ${-raceDays} días`}
            </span>
          )
        }
      />

      {rec && rec.action !== "mantener" && (
        <div
          className="flex items-start gap-3 animate-in"
          style={{
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            background: TONE_STYLE[ACTION_META[rec.action].tone].bg,
            marginBottom: "var(--space-5)",
          }}
        >
          <span style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color, flexShrink: 0 }}>{ACTION_META[rec.action].icon}</span>
          <div style={{ flex: 1 }}>
            <div className="font-semibold" style={{ color: TONE_STYLE[ACTION_META[rec.action].tone].color }}>
              {ACTION_META[rec.action].label}
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 2 }}>
              {rec.summary}
            </p>
          </div>
          <Link href="/recomendaciones" className="btn btn-ghost" style={{ flexShrink: 0 }}>
            Ver detalle
            <ArrowRight size={14} />
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
                            width: 40,
                            height: 40,
                            borderRadius: "var(--radius-sm)",
                            background: "var(--color-surface-raised)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--color-brand)",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={19} />
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
                    <Link href="/registro" className="btn btn-secondary inline-flex" style={{ marginTop: "var(--space-3)" }}>
                      Registrar resultado
                      <ArrowRight size={14} />
                    </Link>
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
