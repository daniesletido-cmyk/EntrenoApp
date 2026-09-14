"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flag, Target, Copy, Check } from "lucide-react";
import { toISODate, todayISO, isoDayOfWeek } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Goal {
  id: number;
  title: string;
  target_date: string | null;
  status: string;
  target_value: string | null;
}

interface SessionRow {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  is_long_run: number;
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
  foods_text: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera",
  gimnasio: "Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit",
  otro: "Otro",
  descanso: "Descanso",
};
const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  parcial: "Parcial",
  no_realizada: "No realizada",
};

function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startDow = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Determina en qué fase del plan cae una fecha, usando los rangos guardados
// en Configuración (phase_1_start/end ... phase_4_start/end). Si no cae en
// ningún rango guardado, se usa la fase actual configurada como resguardo.
function phaseForDate(date: string, settings: Record<string, string>): number {
  for (let p = 1; p <= 4; p++) {
    const start = settings[`phase_${p}_start`];
    const end = settings[`phase_${p}_end`];
    if (start && end && date >= start && date <= end) return p;
  }
  const fallback = parseInt(settings.current_phase ?? "1", 10);
  return Number.isFinite(fallback) && fallback >= 1 && fallback <= 4 ? fallback : 1;
}

function formatSessionLine(s: SessionRow): string {
  const parts = [DISCIPLINE_LABEL[s.discipline] ?? s.discipline];
  if (s.planned_code) parts.push(s.planned_code);
  if (s.is_long_run) parts.push("(tirada larga)");
  let line = "- " + parts.join(" ") + ` — ${STATUS_LABEL[s.status] ?? s.status}`;
  const details: string[] = [];
  if (s.rpe !== null) details.push(`RPE ${s.rpe}`);
  if (s.duration_min !== null) details.push(`${s.duration_min} min`);
  if (s.distance_km !== null) details.push(`${s.distance_km} km`);
  if (details.length) line += ` (${details.join(", ")})`;
  if (s.notes) line += `\n  Notas: ${s.notes}`;
  return line;
}

function formatMenuLine(m: MenuItem): string {
  let line = `- ${m.meal}: ${m.foods_text ?? "—"}`;
  const macros: string[] = [];
  if (m.kcal !== null) macros.push(`${m.kcal} kcal`);
  if (m.protein_g !== null) macros.push(`P ${m.protein_g}g`);
  if (m.carbs_g !== null) macros.push(`C ${m.carbs_g}g`);
  if (m.fat_g !== null) macros.push(`G ${m.fat_g}g`);
  if (macros.length) line += ` (${macros.join(", ")})`;
  return line;
}

export default function CalendarioPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [menuByPhase, setMenuByPhase] = useState<Record<number, MenuItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    const first = toISODate(new Date(Date.UTC(year, month, 1)));
    const last = toISODate(new Date(Date.UTC(year, month + 1, 0)));
    fetch("/api/goals").then((r) => r.json()).then((d) => setGoals(d.goals ?? []));
    fetch(`/api/sessions?from=${first}&to=${last}`).then((r) => r.json()).then((d) => setSessions(d.sessions ?? []));
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings ?? {}));
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCopied(false);
  }, [selectedDate]);

  async function ensureMenuLoaded(phase: number) {
    if (menuByPhase[phase]) return;
    const data = await fetch(`/api/menu?phase=${phase}`).then((r) => r.json());
    setMenuByPhase((prev) => ({ ...prev, [phase]: data.items ?? [] }));
  }

  function openDay(iso: string) {
    setSelectedDate(iso);
    ensureMenuLoaded(phaseForDate(iso, settings));
  }

  const cells = monthGrid(year, month);
  const goalDates = new Map<string, Goal[]>();
  for (const g of goals) {
    if (!g.target_date || g.status !== "activo") continue;
    const arr = goalDates.get(g.target_date) ?? [];
    arr.push(g);
    goalDates.set(g.target_date, arr);
  }
  const longRunDates = new Set(sessions.filter((s) => s.is_long_run).map((s) => s.date));
  const sessionsByDate = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const arr = sessionsByDate.get(s.date) ?? [];
    arr.push(s);
    sessionsByDate.set(s.date, arr);
  }
  const raceDate = settings.goal_race_date;

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : [];
  const selectedGoals = selectedDate ? goalDates.get(selectedDate) ?? [] : [];
  const selectedPhase = selectedDate ? phaseForDate(selectedDate, settings) : 1;
  const selectedMenu = selectedDate
    ? (menuByPhase[selectedPhase] ?? []).filter((m) => m.day_of_week === isoDayOfWeek(selectedDate))
    : [];
  const selectedIsRace = selectedDate === raceDate;

  function buildCopyText(): string {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T00:00:00Z");
    const dayName = DAY_NAMES_FULL[isoDayOfWeek(selectedDate) - 1];
    const lines: string[] = [`${dayName} ${selectedDate}`];
    if (selectedIsRace) lines.push("🏁 Día del maratón");
    if (selectedGoals.length) {
      lines.push("");
      lines.push("Objetivos:");
      for (const g of selectedGoals) lines.push(`- ${g.title}${g.target_value ? ` (objetivo: ${g.target_value})` : ""}`);
    }
    lines.push("");
    lines.push("Entrenamiento:");
    if (selectedSessions.length === 0) lines.push("- Sin sesiones planificadas");
    else for (const s of selectedSessions) lines.push(formatSessionLine(s));
    lines.push("");
    lines.push("Menú:");
    if (selectedMenu.length === 0) lines.push("- Sin menú importado para este día");
    else for (const m of selectedMenu) lines.push(formatMenuLine(m));
    return lines.join("\n");
  }

  async function copyDetails() {
    const text = buildCopyText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.push("success", "Copiado — pégalo en Notas");
    } catch {
      toast.push("error", "No se pudo copiar automáticamente. Selecciona el texto a mano.");
    }
  }

  return (
    <div>
      <PageHeader title="Calendario" description="Pulsa un día para ver todos los detalles y copiarlos a tus notas." />

      <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
        <button className="btn btn-secondary btn-icon" aria-label="Mes anterior" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <div className="font-semibold text-sm" style={{ minWidth: 140, textAlign: "center" }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <button className="btn btn-secondary btn-icon" aria-label="Mes siguiente" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560 }}>
          <div className="grid grid-cols-7 gap-1 text-xs text-muted" style={{ marginBottom: 4 }}>
            {DOW.map((d) => (
              <div key={d} className="text-center font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} style={{ minHeight: 88 }} />;
              const iso = toISODate(date);
              const isToday = iso === todayISO();
              const isRace = iso === raceDate;
              const dayGoals = goalDates.get(iso) ?? [];
              const isLongRun = longRunDates.has(iso);
              const daySessions = (sessionsByDate.get(iso) ?? []).filter((s) => !s.is_long_run);
              return (
                <button
                  key={i}
                  onClick={() => openDay(iso)}
                  className="surface surface-interactive text-left"
                  aria-label={`Ver detalles del ${iso}`}
                  style={{
                    padding: 6,
                    minHeight: 88,
                    borderColor: isToday ? "var(--color-brand)" : "var(--color-border)",
                    borderWidth: isToday ? 2 : 1,
                  }}
                >
                  <div className="text-xs font-semibold" style={{ marginBottom: 4 }}>
                    {date.getUTCDate()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {isRace && (
                      <span className="badge badge-danger" style={{ fontSize: 10 }}>
                        <Flag size={11} /> Maratón
                      </span>
                    )}
                    {dayGoals.map((g) => (
                      <span key={g.id} className="badge" style={{ fontSize: 10, background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
                        <Target size={11} /> {g.title}
                      </span>
                    ))}
                    {isLongRun && (
                      <span className="badge badge-info" style={{ fontSize: 10 }}>
                        Tirada larga
                      </span>
                    )}
                    {daySessions.map((s) => (
                      <div key={s.id} className="text-faint" style={{ fontSize: 10 }}>
                        {s.discipline}
                        {s.planned_code ? ` ${s.planned_code}` : ""}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-faint" style={{ marginTop: "var(--space-4)" }}>
        Los objetivos activos con fecha, las tiradas largas y el menú de la fase correspondiente aparecen aquí
        automáticamente.
      </p>

      {selectedDate && (
        <Modal
          title={`${DAY_NAMES_FULL[isoDayOfWeek(selectedDate) - 1]} · ${selectedDate}`}
          onClose={() => setSelectedDate(null)}
          footer={
            <Button variant="primary" onClick={copyDetails} style={{ width: "100%" }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiado" : "Copiar todo (para Notas)"}
            </Button>
          }
        >
          <div className="grid gap-4">
            {selectedIsRace && <div className="badge badge-danger">🏁 Día del maratón</div>}

            {selectedGoals.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted" style={{ marginBottom: 6, fontWeight: 600 }}>
                  Objetivos
                </div>
                <div className="grid gap-1">
                  {selectedGoals.map((g) => (
                    <div key={g.id} className="text-sm">
                      {g.title}
                      {g.target_value ? <span className="text-muted"> — objetivo: {g.target_value}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase text-muted" style={{ marginBottom: 6, fontWeight: 600 }}>
                Entrenamiento
              </div>
              {selectedSessions.length === 0 ? (
                <p className="text-sm text-muted">Sin sesiones planificadas este día.</p>
              ) : (
                <div className="grid gap-2">
                  {selectedSessions.map((s) => (
                    <div key={s.id} className="surface-raised text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                      <div className="flex items-center gap-2 font-medium">
                        {DISCIPLINE_LABEL[s.discipline] ?? s.discipline}
                        {s.planned_code ? ` — ${s.planned_code}` : ""}
                        {!!s.is_long_run && <span className="badge badge-info">Tirada larga</span>}
                        <span className="badge badge-neutral">{STATUS_LABEL[s.status] ?? s.status}</span>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        {[
                          s.rpe !== null ? `RPE ${s.rpe}` : null,
                          s.duration_min !== null ? `${s.duration_min} min` : null,
                          s.distance_km !== null ? `${s.distance_km} km` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {s.notes && <div className="text-sm" style={{ marginTop: 4 }}>{s.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase text-muted" style={{ marginBottom: 6, fontWeight: 600 }}>
                Menú (Fase {selectedPhase})
              </div>
              {selectedMenu.length === 0 ? (
                <p className="text-sm text-muted">Sin menú importado para este día — ve a Menú para importarlo.</p>
              ) : (
                <div className="grid gap-2">
                  {selectedMenu.map((m) => (
                    <div key={m.id} className="surface-raised text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                      <span className="font-medium">{m.meal}: </span>
                      {m.foods_text}
                      {m.kcal ? <span className="text-muted"> ({m.kcal} kcal)</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
