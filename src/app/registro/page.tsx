"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Moon,
  Save,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  AlertTriangle,
  Watch,
  Heart,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeftRight,
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { weekStartOf, todayISO, weekDates, DAY_NAMES_ES, isoDayOfWeek } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface FitLap {
  index: number;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
}

interface FitSummary {
  date: string;
  sport: string;
  sportRaw: string | null;
  subSportRaw: string | null;
  activityName: string;
  durationMin: number | null;
  distanceKm: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  laps: FitLap[];
}

interface FitFeedbackItem {
  tone: "positive" | "neutral" | "warning";
  text: string;
}

interface SwapSuggestion {
  matchId: number;
  matchDate: string;
  matchDiscipline: string;
  matchPlannedCode: string | null;
  todayId: number | null;
  todayDiscipline: string | null;
  todayPlannedCode: string | null;
}

interface FitImportResult {
  summary: FitSummary;
  feedback: FitFeedbackItem[];
  matchedSessionId: number | null;
  suggestedActivityName?: string;
  otherSessionsThatDay: {
    id: number;
    discipline: string;
    planned_code: string | null;
    status: string;
    is_long_run?: number;
    isDisciplineMatch?: boolean;
  }[];
  swapSuggestions: SwapSuggestion[];
}

const FEEDBACK_ICON: Record<FitFeedbackItem["tone"], React.ReactNode> = {
  positive: <TrendingUp size={15} style={{ color: "var(--color-success)" }} />,
  warning: <TrendingDown size={15} style={{ color: "var(--color-warning)" }} />,
  neutral: <Minus size={15} style={{ color: "var(--color-text-muted)" }} />,
};

const DISCIPLINE_LABEL: Record<string, string> = {
  carrera: "Carrera",
  gimnasio: "Gimnasio",
  natacion: "Natación",
  crossfit: "CrossFit",
  otro: "Otro",
};

function formatPace(minKm: number | null): string {
  if (minKm === null) return "—";
  const min = Math.floor(minKm);
  const sec = Math.round((minKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

function dayLabel(date: string): string {
  return DAY_NAMES_ES[isoDayOfWeek(date) - 1] ?? date;
}

// Debe coincidir con el texto que se añade a las notas al aplicar un .fit
// (ver applyFitImport más abajo) — así se reconocen también las
// importaciones antiguas, aplicadas antes de que existiera fit_backup.
const FIT_IMPORT_MARKER = "Importado desde .fit";

function hasFitImport(s: SessionRow): boolean {
  return !!s.fit_backup || !!(s.notes && s.notes.includes(FIT_IMPORT_MARKER));
}

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
  // Presente (no null) cuando el último cambio de esta sesión fue aplicar un
  // .fit importado — habilita el botón "Deshacer importación .fit".
  fit_backup: string | null;
}

interface SleepRow {
  id: number;
  date: string;
  hours: number | null;
  quality: number | null;
  notes: string | null;
}

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "realizada", label: "Realizada" },
  { value: "parcial", label: "Parcial" },
  { value: "no_realizada", label: "No realizada" },
];

const DISCIPLINE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  carrera: Footprints,
  gimnasio: Dumbbell,
  natacion: Waves,
  crossfit: Flame,
  otro: MoreHorizontal,
};

const INJURY_KEYWORDS = ["dolor", "molestia", "tirón", "tiron", "pinchazo", "rodilla", "tobillo"];

export default function RegistroPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sleepByDate, setSleepByDate] = useState<Record<string, SleepRow>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [fitResult, setFitResult] = useState<FitImportResult | null>(null);
  const [fitTargetId, setFitTargetId] = useState<number | "new">("new");
  const [fitActivityName, setFitActivityName] = useState("");
  const [fitDiscipline, setFitDiscipline] = useState("carrera");
  const [fitRpe, setFitRpe] = useState("");
  const [fitLoading, setFitLoading] = useState(false);
  const [fitApplying, setFitApplying] = useState(false);
  const [applyingSwapId, setApplyingSwapId] = useState<number | null>(null);
  const [undoingFitId, setUndoingFitId] = useState<number | null>(null);
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });
  const [confirmUndo, setConfirmUndo] = useState<{
    open: boolean;
    id: number | null;
    exact: boolean;
    message: string;
  }>({ open: false, id: null, exact: false, message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const days = weekDates(weekStart);
  const weekEnd = days[6];

  const load = useCallback(() => {
    fetch(`/api/sessions?week=${weekStart}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
    fetch(`/api/sleep?from=${weekStart}&to=${weekEnd}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, SleepRow> = {};
        for (const l of d.logs ?? []) map[l.date] = l;
        setSleepByDate(map);
      });
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSession(s: SessionRow) {
    setSavingId(s.id);
    try {
      await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: s.status,
          rpe: s.rpe,
          duration_min: s.duration_min,
          distance_km: s.distance_km,
          notes: s.notes,
        }),
      });
      load();
      toast.push("success", "Sesión guardada");
    } catch {
      toast.push("error", "No se pudo guardar la sesión");
    } finally {
      setSavingId(null);
    }
  }

  async function saveEditedSession(s: SessionRow) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/sessions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline: s.discipline,
          planned_code: s.planned_code?.trim() || null,
          is_long_run: s.is_long_run,
          is_extra: s.is_extra,
          status: s.status,
          rpe: s.rpe,
          duration_min: s.duration_min,
          distance_km: s.distance_km,
          notes: s.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.push("success", "Sesión modificada correctamente");
      setEditingSession(null);
      load();
    } catch {
      toast.push("error", "No se pudo modificar la sesión");
    } finally {
      setSavingEdit(false);
    }
  }

  async function executeDeleteSession() {
    const { id } = confirmDelete;
    if (!id) return;
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.push("success", "Sesión eliminada");
      setEditingSession(null);
      setConfirmDelete({ open: false, id: null, name: "" });
      load();
    } catch {
      toast.push("error", "No se pudo eliminar la sesión");
    }
  }

  async function saveSleep(date: string, sleep: Partial<SleepRow>) {
    await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...sleep }),
    });
    load();
  }

  function updateLocalSession(id: number, patch: Partial<SessionRow>) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleFitFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFitLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sessions/import-fit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo .fit");
        return;
      }
      setFitResult(data);
      const targetId = data.matchedSessionId ?? "new";
      setFitTargetId(targetId);
      setFitDiscipline(data.summary.sport ?? "carrera");
      setFitActivityName(data.suggestedActivityName ?? data.summary.activityName ?? "");
      setFitRpe("");
    } finally {
      setFitLoading(false);
      e.target.value = "";
    }
  }

  function handleFitTargetChange(target: number | "new") {
    setFitTargetId(target);
    if (target === "new") {
      setFitActivityName(fitResult?.summary.activityName ?? "");
      setFitDiscipline(fitResult?.summary.sport ?? "carrera");
    } else {
      const s = sessions.find((item) => item.id === target);
      if (s) {
        setFitActivityName(s.planned_code || fitResult?.summary.activityName || "");
        setFitDiscipline(s.discipline || fitResult?.summary.sport || "carrera");
      }
    }
  }

  // Aplica una sugerencia de intercambio: si hoy había algo pendiente con lo
  // que intercambiar, se intercambian las fechas de las dos sesiones; si no
  // había nada pendiente hoy, simplemente se mueve la sesión encontrada a la
  // fecha de hoy. En ambos casos, la sesión resultante queda seleccionada
  // como destino para aplicar el .fit.
  async function applySwapSuggestion(s: SwapSuggestion) {
    if (!fitResult) return;
    setApplyingSwapId(s.matchId);
    try {
      if (s.todayId) {
        const res = await fetch("/api/sessions/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idA: s.todayId, idB: s.matchId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.push("error", data.error ?? "No se pudo intercambiar");
          return;
        }
        toast.push("success", `Intercambiado con el entreno del ${dayLabel(s.matchDate)}`);
      } else {
        const res = await fetch(`/api/sessions/${s.matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: fitResult.summary.date }),
        });
        if (!res.ok) {
          toast.push("error", "No se pudo mover la sesión");
          return;
        }
        toast.push("success", "Sesión movida a hoy");
      }
      setFitResult((prev) => (prev ? { ...prev, matchedSessionId: s.matchId, swapSuggestions: [] } : prev));
      setFitTargetId(s.matchId);
      const sessionWeek = weekStartOf(fitResult.summary.date);
      if (sessionWeek !== weekStart) setWeekStart(sessionWeek);
      else load();
    } finally {
      setApplyingSwapId(null);
    }
  }

  // Deshace la última importación de .fit aplicada a esta sesión. Si tiene
  // backup exacto (fit_backup) se restaura tal cual; si es una importación
  // antigua sin backup, el servidor hace un reset razonable (ver
  // undoFitImport en src/lib/repo/sessions.ts) — el texto de confirmación
  // avisa de cada caso.
  function undoFitImport(id: number, exact: boolean) {
    const message = exact
      ? "¿Deshacer la importación del .fit en esta sesión? Se restaurará el estado, RPE, duración, distancia y notas que tenía antes de importar el archivo. Si has editado algo después, también se perderá."
      : 'Esta importación es antigua y no tiene guardado el estado de antes, así que no se puede restaurar exactamente. Se volverá a "Pendiente", se quitarán RPE/duración/distancia, y se borrará solo la nota de la importación (se conserva cualquier detalle que hubieras escrito a mano). ¿Continuar?';
    setConfirmUndo({ open: true, id, exact, message });
  }

  async function executeUndoFit() {
    const { id } = confirmUndo;
    if (!id) return;
    setConfirmUndo((prev) => ({ ...prev, open: false }));
    setUndoingFitId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undoFit: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo deshacer la importación");
        return;
      }
      load();
      toast.push("success", "Importación de .fit deshecha");
    } finally {
      setUndoingFitId(null);
    }
  }

  async function applyFitImport() {
    if (!fitResult) return;
    setFitApplying(true);
    try {
      const { summary } = fitResult;
      const fitNote = `Importado desde .fit${summary.avgHeartRate ? ` · FC media ${summary.avgHeartRate} lpm (solo informativa)` : ""}`;
      let targetId = fitTargetId;
      let existingNotes: string | null = null;
      if (targetId === "new") {
        const created = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: summary.date,
            discipline: fitDiscipline,
            planned_code: fitActivityName.trim() || null,
            is_extra: true,
          }),
        }).then((r) => r.json());
        targetId = created.session.id;
      } else {
        existingNotes = sessions.find((s) => s.id === Number(targetId))?.notes ?? null;
      }
      // No se pisa el detalle del entreno planificado (p. ej. importado de una foto del plan) — se conserva y se
      // añade debajo la nota del .fit.
      const notes = existingNotes ? `${existingNotes}\n---\n${fitNote}` : fitNote;
      await fetch(`/api/sessions/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "realizada",
          discipline: fitDiscipline,
          planned_code: fitActivityName.trim() || undefined,
          rpe: fitRpe === "" ? null : Number(fitRpe),
          duration_min: summary.durationMin,
          distance_km: summary.distanceKm,
          notes,
          fitImport: true,
        }),
      });
      setFitResult(null);
      const sessionWeek = weekStartOf(summary.date);
      if (sessionWeek !== weekStart) setWeekStart(sessionWeek);
      else load();
      toast.push("success", `Entreno importado del .fit: ${fitActivityName.trim() || DISCIPLINE_LABEL[fitDiscipline] || "Sesión"}`);

      // Tras aplicar, comprobamos si esta sesión ha hecho que convenga
      // ajustar la semana — igual que si se hubiera registrado a mano.
      const rec = await fetch(`/api/recommendations?week=${sessionWeek}`).then((r) => r.json());
      if (rec.action === "alerta_medica") {
        toast.push("error", "Esta sesión ha generado una alerta médica — revisa Recomendaciones antes de seguir entrenando.");
      } else if (rec.action === "reducir") {
        toast.push("info", "Esta sesión sugiere ajustar la carga — mira Recomendaciones para ver el ajuste propuesto.");
      }
    } catch {
      toast.push("error", "No se pudo aplicar el entreno importado");
    } finally {
      setFitApplying(false);
    }
  }

  const totalSessions = sessions.filter((s) => s.discipline !== "descanso").length;

  return (
    <div>
      <PageHeader
        title="Registro"
        description="Marca lo que realmente hiciste cada día y cómo dormiste esa noche."
        actions={
          <>
            <input ref={fileInputRef} type="file" accept=".fit" onChange={handleFitFile} style={{ display: "none" }} />
            <Button variant="secondary" loading={fitLoading} onClick={() => fileInputRef.current?.click()}>
              <Watch size={15} />
              Importar .fit
            </Button>
          </>
        }
      />
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {fitResult && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Watch size={16} />
              Entreno leído del archivo .fit
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setFitResult(null)}>
              <X size={15} />
            </button>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", marginBottom: "var(--space-4)" }}>
            <MiniStat label="Fecha" value={fitResult.summary.date} />
            <MiniStat label="Actividad" value={fitResult.summary.activityName} />
            <MiniStat label="Deporte" value={DISCIPLINE_LABEL[fitResult.summary.sport] ?? "Otro"} />
            <MiniStat label="Duración" value={fitResult.summary.durationMin !== null ? `${fitResult.summary.durationMin} min` : "—"} />
            <MiniStat label="Distancia" value={fitResult.summary.distanceKm !== null ? `${fitResult.summary.distanceKm} km` : "—"} />
            {fitResult.summary.sport === "carrera" && (
              <MiniStat label="Ritmo medio" value={formatPace(fitResult.summary.avgPaceMinKm)} />
            )}
            {fitResult.summary.calories !== null && <MiniStat label="Calorías" value={String(fitResult.summary.calories)} />}
            {fitResult.summary.avgHeartRate !== null && (
              <MiniStat
                label="FC media"
                value={`${fitResult.summary.avgHeartRate} lpm`}
                icon={<Heart size={13} />}
                hint="Solo informativa — entrenas por RPE/ritmo"
              />
            )}
          </div>

          {fitResult.swapSuggestions.length > 0 && (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-4)" }}>
              {fitResult.swapSuggestions.map((s) => (
                <div
                  key={s.matchId}
                  className="surface-raised flex flex-wrap items-center justify-between gap-3 text-sm"
                  style={{ padding: "var(--space-3)", borderColor: "var(--color-brand)" }}
                >
                  <span className="flex items-start gap-2">
                    <ArrowLeftRight size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--color-brand)" }} />
                    <span>
                      Tenías <strong>{DISCIPLINE_LABEL[s.matchDiscipline] ?? s.matchDiscipline}</strong>
                      {s.matchPlannedCode ? ` (${s.matchPlannedCode})` : ""} planificado para el {dayLabel(s.matchDate)} — parece que lo
                      has hecho hoy.
                      {s.todayId
                        ? ` ¿Intercambio las fechas con ${DISCIPLINE_LABEL[s.todayDiscipline ?? ""] ?? s.todayDiscipline}${
                            s.todayPlannedCode ? ` (${s.todayPlannedCode})` : ""
                          }?`
                        : " ¿Muevo esa sesión a hoy?"}
                    </span>
                  </span>
                  <Button variant="secondary" loading={applyingSwapId === s.matchId} onClick={() => applySwapSuggestion(s)}>
                    <ArrowLeftRight size={14} />
                    {s.todayId ? "Intercambiar" : "Mover a hoy"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {fitResult.feedback.length > 0 && (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-4)" }}>
              {fitResult.feedback.map((f, i) => (
                <div key={i} className="surface-raised flex items-start gap-2 text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                  <span style={{ marginTop: 2, flexShrink: 0 }}>{FEEDBACK_ICON[f.tone]}</span>
                  {f.text}
                </div>
              ))}
            </div>
          )}

          {fitResult.summary.laps.length >= 3 && (
            <div className="surface-raised" style={{ padding: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div className="text-xs uppercase text-muted" style={{ marginBottom: "var(--space-2)", fontWeight: 600 }}>
                Ritmo y FC por vuelta
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={fitResult.summary.laps.map((l) => ({ vuelta: l.index, Ritmo: l.avgPaceMinKm, FC: l.avgHeartRate }))}>
                    <CartesianGrid stroke="#262c37" strokeDasharray="3 3" />
                    <XAxis dataKey="vuelta" stroke="#9aa3b2" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#9aa3b2" fontSize={11} reversed />
                    <YAxis yAxisId="right" orientation="right" stroke="#9aa3b2" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="Ritmo" stroke="#2f6feb" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line yAxisId="right" type="monotone" dataKey="FC" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2" style={{ marginBottom: "var(--space-3)" }}>
            <Select
              label="Aplicar a"
              value={String(fitTargetId)}
              onChange={(e) => handleFitTargetChange(e.target.value === "new" ? "new" : Number(e.target.value))}
            >
              {fitResult.matchedSessionId && (() => {
                const matched = fitResult.otherSessionsThatDay.find((s) => s.id === fitResult.matchedSessionId);
                const label = matched
                  ? `${DISCIPLINE_LABEL[matched.discipline] ?? matched.discipline}${matched.planned_code ? ` — ${matched.planned_code}` : ""} (${matched.status})`
                  : "Sesión planificada ese día";
                return <option value={fitResult.matchedSessionId}>★ [Recomendado] {label}</option>;
              })()}
              {fitResult.otherSessionsThatDay
                .filter((s) => s.id !== fitResult.matchedSessionId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {DISCIPLINE_LABEL[s.discipline] ?? s.discipline}
                    {s.planned_code ? ` — ${s.planned_code}` : ""} ({s.status})
                  </option>
                ))}
              <option value="new">+ Crear una nueva sesión ese día</option>
            </Select>

            <Input
              label="Nombre de la actividad"
              hint="Nombre que tendrá este entreno (ej. R1, Día A, Carrera)"
              value={fitActivityName}
              onChange={(e) => setFitActivityName(e.target.value)}
            />

            <Select
              label="Disciplina"
              value={fitDiscipline}
              onChange={(e) => setFitDiscipline(e.target.value)}
            >
              <option value="carrera">Carrera</option>
              <option value="gimnasio">Gimnasio</option>
              <option value="natacion">Natación</option>
              <option value="crossfit">CrossFit</option>
              <option value="otro">Otro</option>
            </Select>

            <Input
              label="RPE (0-10)"
              hint="El reloj no mide esfuerzo percibido — dilo tú"
              type="number"
              min={0}
              max={10}
              value={fitRpe}
              onChange={(e) => setFitRpe(e.target.value)}
            />
          </div>

          <Button variant="primary" loading={fitApplying} onClick={applyFitImport}>
            <Save size={15} />
            Aplicar al registro
          </Button>
        </div>
      )}

      {totalSessions === 0 && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <EmptyState
            icon={<Footprints size={22} />}
            title="No hay sesiones planificadas esta semana"
            description="Ve a Plan semanal y añade las sesiones de esta semana antes de poder registrarlas aquí."
          />
        </div>
      )}

      <div className="grid gap-3">
        {days.map((date, i) => {
          const daySessions = sessions.filter((s) => s.date === date);
          const sleep = sleepByDate[date] ?? { id: 0, date, hours: null, quality: null, notes: null };
          return (
            <div key={date} className="surface" style={{ padding: "var(--space-4)" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-3)" }}>
                <span className="font-semibold text-sm">{DAY_NAMES_ES[i]}</span>
                <span className="text-xs text-faint">{date}</span>
              </div>

              {daySessions.map((s) => {
                const Icon = DISCIPLINE_ICON[s.discipline] ?? MoreHorizontal;
                const hasInjuryNote = s.notes && INJURY_KEYWORDS.some((k) => s.notes!.toLowerCase().includes(k));
                return (
                  <div
                    key={s.id}
                    className="surface-raised"
                    style={{ padding: "var(--space-3)", marginBottom: "var(--space-3)" }}
                  >
                    <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon size={16} className="text-muted" />
                        <span className="font-semibold">{s.planned_code || DISCIPLINE_LABEL[s.discipline] || s.discipline}</span>
                        {s.planned_code && <span className="text-xs text-muted">({DISCIPLINE_LABEL[s.discipline] ?? s.discipline})</span>}
                        {!!s.is_long_run && <span className="badge badge-info">Tirada larga</span>}
                        {!!s.is_extra && (
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: "rgba(234, 179, 8, 0.15)",
                              color: "var(--color-warning)",
                              border: "1px solid rgba(234, 179, 8, 0.3)",
                            }}
                          >
                            Extra
                          </span>
                        )}
                        {hasFitImport(s) && <span className="badge badge-success" style={{ fontSize: 10 }}>.FIT</span>}
                      </div>
                      <Button variant="ghost" onClick={() => setEditingSession({ ...s })}>
                        <Pencil size={13} />
                        Editar
                      </Button>
                    </div>

                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                      <Select
                        label="Estado"
                        value={s.status}
                        onChange={(e) => updateLocalSession(s.id, { status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="RPE (0-10)"
                        type="number"
                        min={0}
                        max={10}
                        value={s.rpe ?? ""}
                        onChange={(e) => updateLocalSession(s.id, { rpe: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                      <Input
                        label="Duración (min)"
                        type="number"
                        value={s.duration_min ?? ""}
                        onChange={(e) =>
                          updateLocalSession(s.id, { duration_min: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                      {s.discipline === "carrera" && (
                        <Input
                          label="Distancia (km)"
                          type="number"
                          step="0.1"
                          value={s.distance_km ?? ""}
                          onChange={(e) =>
                            updateLocalSession(s.id, { distance_km: e.target.value === "" ? null : Number(e.target.value) })
                          }
                        />
                      )}
                    </div>

                    <div style={{ marginTop: "var(--space-3)" }}>
                      <Textarea
                        label="Notas / molestias"
                        hint="Si notas dolor articular o algo raro, anótalo aquí sin falta."
                        rows={2}
                        value={s.notes ?? ""}
                        onChange={(e) => updateLocalSession(s.id, { notes: e.target.value })}
                      />
                      {hasInjuryNote && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-warning)", marginTop: 4 }}>
                          <AlertTriangle size={13} />
                          Esta nota se revisará en Recomendaciones.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-3)" }}>
                      <Button variant="primary" loading={savingId === s.id} onClick={() => saveSession(s)}>
                        <Save size={15} />
                        Guardar
                      </Button>
                      {hasFitImport(s) && (
                        <Button
                          variant="ghost"
                          loading={undoingFitId === s.id}
                          onClick={() => undoFitImport(s.id, !!s.fit_backup)}
                        >
                          <RotateCcw size={15} />
                          {s.fit_backup ? "Deshacer importación .fit" : "Quitar datos del .fit"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
                <div className="flex items-center gap-2 text-xs text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  <Moon size={14} />
                  Sueño de esa noche
                </div>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
                  key={`sleep-${date}-${sleep.id || 'none'}-${sleep.hours ?? ''}-${sleep.quality ?? ''}`}
                >
                  <Input
                    label="Horas"
                    type="number"
                    step="0.1"
                    defaultValue={sleep.hours ?? ""}
                    onBlur={(e) =>
                      saveSleep(date, { hours: e.target.value === "" ? null : Number(e.target.value), quality: sleep.quality })
                    }
                  />
                  <Select
                    label="Calidad"
                    defaultValue={sleep.quality ?? ""}
                    onChange={(e) => saveSleep(date, { hours: sleep.hours, quality: e.target.value === "" ? null : Number(e.target.value) })}
                  >
                    <option value="">Sin registrar</option>
                    {[1, 2, 3, 4, 5].map((q) => (
                      <option key={q} value={q}>
                        {q}/5
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmUndo.open}
        title="Deshacer importación .fit"
        description={confirmUndo.message}
        confirmLabel="Deshacer"
        tone="danger"
        onConfirm={executeUndoFit}
        onCancel={() => setConfirmUndo((p) => ({ ...p, open: false }))}
      />

      {editingSession && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 250,
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) setEditingSession(null);
          }}
        >
          <div
            className="surface animate-in"
            style={{
              width: "min(500px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="font-semibold text-base flex items-center gap-2">
                <Pencil size={16} />
                Editar sesión ({editingSession.date})
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                disabled={savingEdit}
                onClick={() => setEditingSession(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3" style={{ padding: "var(--space-4)" }}>
              <Input
                label="Nombre de la actividad"
                hint="Ej. R1, Día A, Carrera 40', Caminata..."
                value={editingSession.planned_code ?? ""}
                onChange={(e) => setEditingSession({ ...editingSession, planned_code: e.target.value })}
              />

              <Select
                label="Disciplina"
                value={editingSession.discipline}
                onChange={(e) => setEditingSession({ ...editingSession, discipline: e.target.value })}
              >
                <option value="carrera">Carrera</option>
                <option value="gimnasio">Gimnasio</option>
                <option value="natacion">Natación</option>
                <option value="crossfit">CrossFit</option>
                <option value="otro">Otro</option>
                <option value="descanso">Descanso</option>
              </Select>

              {editingSession.discipline === "carrera" && (
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={!!editingSession.is_long_run}
                    onChange={(e) => setEditingSession({ ...editingSession, is_long_run: e.target.checked ? 1 : 0 })}
                  />
                  <span>Tirada larga</span>
                </label>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ marginTop: 2 }}>
                <input
                  type="checkbox"
                  checked={!!editingSession.is_extra}
                  onChange={(e) => setEditingSession({ ...editingSession, is_extra: e.target.checked ? 1 : 0 })}
                />
                <span>Sesión extra (fuera de la planificación)</span>
              </label>

              <Select
                label="Estado"
                value={editingSession.status}
                onChange={(e) => setEditingSession({ ...editingSession, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Input
                  label="Duración (min)"
                  type="number"
                  value={editingSession.duration_min ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      duration_min: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="RPE (0-10)"
                  type="number"
                  min={0}
                  max={10}
                  value={editingSession.rpe ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      rpe: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              {editingSession.discipline === "carrera" && (
                <Input
                  label="Distancia (km)"
                  type="number"
                  step="0.1"
                  value={editingSession.distance_km ?? ""}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      distance_km: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              )}

              <Textarea
                label="Notas / molestias"
                rows={3}
                value={editingSession.notes ?? ""}
                onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
              />
            </div>

            <div
              className="flex items-center justify-between gap-2"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid var(--color-border)",
                background: "var(--color-surface-raised)",
              }}
            >
              <Button
                variant="ghost"
                onClick={() =>
                  setConfirmDelete({
                    open: true,
                    id: editingSession.id,
                    name: editingSession.planned_code || editingSession.discipline,
                  })
                }
                style={{ color: "var(--color-danger)" }}
              >
                <Trash2 size={14} />
                Eliminar sesión
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={savingEdit} onClick={() => setEditingSession(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" loading={savingEdit} onClick={() => saveEditedSession(editingSession)}>
                  <Save size={14} />
                  Guardar cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        title="Eliminar sesión"
        description={`¿Seguro que quieres eliminar la sesión "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={executeDeleteSession}
        onCancel={() => setConfirmDelete({ open: false, id: null, name: "" })}
      />
    </div>
  );
}

function MiniStat({ label, value, icon, hint }: { label: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="surface-raised" style={{ padding: "var(--space-2) var(--space-3)" }} title={hint}>
      <div className="text-xs text-muted flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-sm" style={{ marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
