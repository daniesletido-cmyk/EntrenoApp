"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  Footprints,
  Dumbbell,
  Waves,
  Flame,
  MoreHorizontal,
  BedDouble,
  FileUp,
  X,
  NotebookPen,
  Save,
  ArrowLeftRight,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Gauge,
} from "lucide-react";
import { weekStartOf, todayISO, weekDates, DAY_NAMES_ES, todayISO as today } from "@/lib/dates";
import WeekSwitcher from "@/components/week-switcher";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { copyWorkoutToClipboard } from "@/lib/format-workout";
import { parseWorkoutModification } from "@/lib/workout-modifications";
import { detectVamZoneForSession } from "@/lib/vam-zones";
import { WorkoutModificationBanner } from "@/components/workout-modification-banner";

interface PlanPreviewRow {
  date: string;
  discipline: string;
  planned_code: string | null;
  is_long_run: boolean;
  notes: string | null;
}

interface SessionRow {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  is_long_run: number;
  is_extra?: number;
  status: string;
  notes: string | null;
}

const DISCIPLINES = [
  { value: "carrera", label: "Carrera", Icon: Footprints },
  { value: "gimnasio", label: "Gimnasio", Icon: Dumbbell },
  { value: "natacion", label: "Natación", Icon: Waves },
  { value: "crossfit", label: "CrossFit", Icon: Flame },
  { value: "otro", label: "Otro", Icon: MoreHorizontal },
  { value: "descanso", label: "Descanso", Icon: BedDouble },
];

const DISCIPLINE_COLORS: Record<string, { color: string; bg: string }> = {
  carrera: { color: "var(--color-success)", bg: "var(--color-success-bg)" },
  gimnasio: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.14)" },
  natacion: { color: "var(--color-info)", bg: "var(--color-info-bg)" },
  crossfit: { color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  descanso: { color: "var(--color-text-muted)", bg: "var(--color-surface-raised)" },
  otro: { color: "var(--color-brand)", bg: "var(--color-brand-subtle)" },
};

const DISCIPLINE_MAP = Object.fromEntries(DISCIPLINES.map((d) => [d.value, d]));

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  parcial: "Parcial",
  no_realizada: "No realizada",
};

export default function PlanSemanalPage() {
  const [weekStart, setWeekStart] = useState(weekStartOf(todayISO()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [form, setForm] = useState<Record<string, { discipline: string; planned_code: string; is_long_run: boolean; notes: string }>>({});
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [importPreview, setImportPreview] = useState<PlanPreviewRow[] | null>(null);
  const [importInfo, setImportInfo] = useState<{ method: string; skipped: number } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function copySession(s: SessionRow) {
    const ok = await copyWorkoutToClipboard({
      date: s.date,
      discipline: s.discipline,
      planned_code: s.planned_code,
      is_long_run: s.is_long_run,
      status: s.status,
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
    try {
      const res = await fetch(`/api/sessions?week=${weekStart}&t=${Date.now()}`, { cache: "no-store" });
      const d = await res.json();
      setSessions(d.sessions ?? []);
    } catch {
      // silencioso al refrescar
    } finally {
      setRefreshing(false);
    }
  }, [weekStart]);

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

  const days = weekDates(weekStart);

  // Modo de visualización: por defecto 'horizontal' (un día enfocado con navegación)
  const [viewMode, setViewMode] = useState<"horizontal" | "all">("horizontal");

  // Fecha seleccionada: por defecto hoy si está en la semana actual, o el primer día
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const t = todayISO();
    const currentWeekDays = weekDates(weekStartOf(t));
    return currentWeekDays.includes(t) ? t : currentWeekDays[0];
  });

  // Al cambiar la semana, si hoy está en ella se abre hoy automáticamente; si no, el primer día
  useEffect(() => {
    const wDays = weekDates(weekStart);
    const t = todayISO();
    if (wDays.includes(t)) {
      setSelectedDate(t);
    } else {
      setSelectedDate(wDays[0]);
    }
  }, [weekStart]);

  const currentIndex = Math.max(0, days.indexOf(selectedDate));
  const prevDate = currentIndex > 0 ? days[currentIndex - 1] : null;
  const nextDate = currentIndex < days.length - 1 ? days[currentIndex + 1] : null;

  const goToPrevDay = useCallback(() => {
    if (prevDate) setSelectedDate(prevDate);
  }, [prevDate]);

  const goToNextDay = useCallback(() => {
    if (nextDate) setSelectedDate(nextDate);
  }, [nextDate]);

  // Soporte de navegación táctil swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      if (diff > 0 && nextDate) {
        goToNextDay();
      } else if (diff < 0 && prevDate) {
        goToPrevDay();
      }
    }
    setTouchStartX(null);
  }

  // Soporte de flechas del teclado (izquierda / derecha)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") goToPrevDay();
      if (e.key === "ArrowRight") goToNextDay();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPrevDay, goToNextDay]);

  function dayNameForDate(date: string): string {
    const idx = days.indexOf(date);
    return idx >= 0 ? DAY_NAMES_ES[idx] : date;
  }

  async function addSession(date: string) {
    const f = form[date];
    if (!f?.discipline) return;
    setSavingDate(date);
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          discipline: f.discipline,
          planned_code: f.planned_code || null,
          is_long_run: f.is_long_run,
          notes: f.notes || null,
        }),
      });
      setForm((prev) => ({ ...prev, [date]: { discipline: "", planned_code: "", is_long_run: false, notes: "" } }));
      load();
      toast.push("success", "Sesión añadida al plan");
    } catch {
      toast.push("error", "No se pudo añadir la sesión");
    } finally {
      setSavingDate(null);
    }
  }

  function requestRemoveSession(id: number) {
    setSessionToDelete(id);
  }

  async function executeRemoveSession() {
    if (!sessionToDelete) return;
    const id = sessionToDelete;
    setSessionToDelete(null);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    load();
    toast.push("info", "Sesión eliminada");
  }

  function startEditingNotes(s: SessionRow) {
    setEditingId(s.id);
    setNotesDraft(s.notes ?? "");
  }

  async function saveNotes(id: number) {
    setSavingNotes(true);
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft || null }),
      });
      setEditingId(null);
      load();
      toast.push("success", "Detalle guardado");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("weekStart", weekStart);
      const res = await fetch("/api/sessions/import-plan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo");
        return;
      }
      setImportPreview(data.rows);
      setImportInfo({ method: data.method, skipped: data.skipped });
      if (data.rows.length === 0) {
        toast.push("info", "No se ha reconocido ninguna sesión en el archivo");
      }
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  }

  function updatePreviewRow(i: number, patch: Partial<PlanPreviewRow>) {
    setImportPreview((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev));
  }

  function removePreviewRow(i: number) {
    setImportPreview((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function commitImport() {
    if (!importPreview || importPreview.length === 0) return;
    setImportCommitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: importPreview }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudieron añadir las sesiones");
        return;
      }
      toast.push("success", `${importPreview.length} sesión(es) añadidas al plan`);
      setImportPreview(null);
      setImportInfo(null);
      load();
    } catch {
      toast.push("error", "Error de red al añadir las sesiones");
    } finally {
      setImportCommitting(false);
    }
  }

  const totalSessions = sessions.filter((s) => s.discipline !== "descanso").length;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <PageHeader
        title="Plan semanal"
        description="Planifica qué toca cada día — carrera, gimnasio, natación… — y luego registra el resultado en Registro."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input ref={importFileRef} type="file" accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg" onChange={handleImportFile} style={{ display: "none" }} />
            <Button
              variant="secondary"
              loading={importLoading}
              onClick={() => importFileRef.current?.click()}
              style={{ height: 36, minHeight: 36, borderRadius: "var(--radius-full)", padding: "0 14px", flex: "1 1 auto" }}
            >
              <FileUp size={14} />
              Importar plan
            </Button>
            <button
              className="btn btn-secondary text-xs inline-flex items-center justify-center gap-1.5"
              onClick={() => load(true)}
              disabled={refreshing}
              style={{
                height: 36,
                minHeight: 36,
                borderRadius: "var(--radius-full)",
                padding: "0 14px",
                flex: "1 1 auto",
              }}
            >
              <RefreshCw size={14} className={refreshing ? "spinner" : ""} />
              <span>{refreshing ? "Actualizando…" : "Refrescar"}</span>
            </button>
          </div>
        }
      />
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {importPreview && (
        <div className="surface animate-in w-full overflow-hidden" style={{ padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between gap-2" style={{ marginBottom: "var(--space-3)" }}>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Sesiones detectadas en el archivo</div>
              {importInfo && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Método: {importInfo.method}
                  {importInfo.skipped > 0 ? ` · ${importInfo.skipped} fila(s) descartadas` : ""}
                  — revisa cada fila antes de importar.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon-sm flex-shrink-0" aria-label="Descartar importación" onClick={() => setImportPreview(null)}>
              <X size={15} />
            </button>
          </div>

          {importPreview.length === 0 ? (
            <p className="text-sm text-muted">No se ha reconocido ninguna sesión. Prueba con otro archivo o añade las sesiones a mano abajo.</p>
          ) : (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-3)" }}>
              {importPreview.map((row, i) => (
                <div key={i} className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end">
                    <Input
                      label="Fecha"
                      type="date"
                      value={row.date}
                      onChange={(e) => updatePreviewRow(i, { date: e.target.value })}
                    />
                    <Select label="Disciplina" value={row.discipline} onChange={(e) => updatePreviewRow(i, { discipline: e.target.value })}>
                      {DISCIPLINES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Código"
                      value={row.planned_code ?? ""}
                      onChange={(e) => updatePreviewRow(i, { planned_code: e.target.value || null })}
                    />
                    <div className="flex items-center justify-between gap-2 h-10">
                      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.is_long_run}
                          onChange={(e) => updatePreviewRow(i, { is_long_run: e.target.checked })}
                        />
                        Tirada larga
                      </label>
                      <button className="btn btn-ghost btn-icon-sm" aria-label="Quitar esta fila" onClick={() => removePreviewRow(i)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <Textarea
                      label="Detalle del entrenamiento (ejercicios, series, RPE, ritmos...)"
                      rows={row.notes && row.notes.length > 120 ? 4 : 2}
                      value={row.notes ?? ""}
                      onChange={(e) => updatePreviewRow(i, { notes: e.target.value || null })}
                      hint="Revisa que coincida con el documento original antes de importar."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {importPreview.length > 0 && (
            <Button variant="primary" loading={importCommitting} onClick={commitImport} style={{ height: 36, minHeight: 36, fontSize: "0.8rem" }}>
              <Plus size={15} />
              Añadir {importPreview.length} sesión(es) al plan
            </Button>
          )}
        </div>
      )}

      {totalSessions === 0 && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <EmptyState
            icon={<Footprints size={22} />}
            title="Esta semana todavía no tiene sesiones"
            description="Añade al menos una sesión en cualquiera de los días de abajo para empezar a planificar la semana."
          />
        </div>
      )}

      {/* Cabecera del selector de días y conmutador de vista */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="text-xs font-semibold text-muted tracking-wider uppercase">Días de la semana</span>
        <div className="inline-flex items-center bg-surface-raised rounded-lg p-0.5 border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("horizontal")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              viewMode === "horizontal"
                ? "bg-brand text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Día a día
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              viewMode === "all"
                ? "bg-brand text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Ver semana
          </button>
        </div>
      </div>

      {/* Selector Horizontal de los 7 Días */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((date, idx) => {
            const isSelected = viewMode === "horizontal" && date === selectedDate;
            const isToday = date === today();
            const daySessions = sessions.filter((s) => s.date === date && s.discipline !== "descanso");
            const hasCompleted = daySessions.some((s) => s.status === "realizada");
            const dayNum = parseInt(date.split("-")[2] || "1", 10);
            const dayLetter = DAY_NAMES_ES[idx].substring(0, 3).toUpperCase();

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  if (viewMode === "all") setViewMode("horizontal");
                }}
                className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 select-none border text-center ${
                  isSelected
                    ? "bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.02]"
                    : isToday
                    ? "bg-brand/10 text-brand border-brand/40 hover:bg-brand/15"
                    : "bg-surface-raised/70 text-muted hover:text-foreground hover:bg-surface-raised border-border/60"
                }`}
                style={{
                  minHeight: "56px",
                }}
                title={`${DAY_NAMES_ES[idx]} ${dayNum} (${daySessions.length} sesiones)`}
              >
                {isToday && (
                  <span
                    className={`absolute -top-1.5 px-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      isSelected ? "bg-white text-brand" : "bg-brand text-white"
                    }`}
                    style={{ lineHeight: "12px" }}
                  >
                    Hoy
                  </span>
                )}
                <span className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase ${isSelected ? "opacity-90" : "opacity-75"}`}>
                  {dayLetter}
                </span>
                <span className="text-sm sm:text-base font-extrabold leading-none mt-0.5">
                  {dayNum}
                </span>
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {daySessions.length > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? "bg-white"
                          : hasCompleted
                          ? "bg-emerald-500"
                          : "bg-brand"
                      }`}
                    />
                  ) : (
                    <span className="w-1 h-1 rounded-full opacity-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controles de Navegación Horizontal (solo en modo horizontal) */}
      {viewMode === "horizontal" && (
        <div className="flex items-center justify-between gap-2 mb-3 bg-surface border border-border/70 rounded-xl px-3 py-2 shadow-xs">
          <button
            type="button"
            onClick={goToPrevDay}
            disabled={!prevDate}
            className="btn btn-ghost btn-icon-sm disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Día anterior"
            title="Día anterior (← Flecha izquierda)"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-foreground capitalize">
                {DAY_NAMES_ES[currentIndex]}, {parseInt(selectedDate.split("-")[2] || "1", 10)} de{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { month: "long" })}
              </span>
              {selectedDate === today() && (
                <span className="badge badge-brand text-[10px] px-1.5 py-0.5">
                  Hoy
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5">
              Usa las flechas, botones o desliza para navegar
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextDay}
            disabled={!nextDate}
            className="btn btn-ghost btn-icon-sm disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Día siguiente"
            title="Día siguiente (Flecha derecha →)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Renderizado de Día(s) */}
      {(() => {
        function renderDayCard(date: string, i: number) {
          const daySessions = sessions.filter((s) => s.date === date);
          const f = form[date] ?? { discipline: "", planned_code: "", is_long_run: false, notes: "" };
          const isToday = date === today();
          const isAdding = savingDate === date || !!f.discipline;

          return (
            <div
              key={date}
              className="surface w-full overflow-hidden"
              style={{
                padding: "var(--space-3) var(--space-3)",
                borderLeft: isToday ? "3px solid var(--color-brand)" : undefined,
              }}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between gap-3 w-full" style={{ marginBottom: daySessions.length > 0 || isAdding ? "var(--space-3)" : 0 }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    style={{
                      width: 46,
                      height: 50,
                      borderRadius: "var(--radius-md)",
                      background: isToday ? "var(--color-brand)" : "var(--color-surface-raised)",
                      color: isToday ? "#ffffff" : "var(--color-text)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isToday ? "none" : "1px solid var(--color-border)",
                      boxShadow: isToday ? "0 4px 14px rgba(59, 130, 246, 0.35)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", opacity: isToday ? 0.95 : 0.7 }}>
                      {DAY_NAMES_ES[i].substring(0, 3).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1, marginTop: 1 }}>
                      {parseInt(date.split("-")[2] || "1", 10)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base sm:text-lg truncate">{DAY_NAMES_ES[i]}</span>
                      {isToday && (
                        <span className="badge badge-brand text-xs px-2 py-0.5 font-bold">
                          Hoy
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted truncate" style={{ marginTop: 2 }}>
                      {daySessions.length === 0
                        ? "Descanso / Sin programar"
                        : `${daySessions.length} entreno${daySessions.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>

                {!isAdding && daySessions.length === 0 && (
                  <button
                    className="btn btn-secondary text-xs sm:text-sm flex-shrink-0 font-medium"
                    onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "carrera", planned_code: "", is_long_run: false, notes: "" } }))}
                    style={{ height: 36, minHeight: 36, padding: "0 14px", borderRadius: "var(--radius-full)" }}
                  >
                    <Plus size={15} />
                    <span>Planificar</span>
                  </button>
                )}

                {!isAdding && daySessions.length > 0 && (
                  <button
                    className="btn btn-ghost text-xs sm:text-sm flex-shrink-0 font-medium"
                    onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "carrera", planned_code: "", is_long_run: false, notes: "" } }))}
                    style={{ height: 34, minHeight: 34, padding: "0 12px", borderRadius: "var(--radius-full)" }}
                  >
                    <Plus size={14} />
                    <span>Añadir</span>
                  </button>
                )}
              </div>

              {/* Day Sessions List */}
              {daySessions.length > 0 && (
                <ul className="grid gap-3 w-full" style={{ marginBottom: isAdding ? "var(--space-3)" : 0 }}>
                  {daySessions.map((s) => {
                    const meta = DISCIPLINE_MAP[s.discipline] ?? DISCIPLINES[4];
                    const discTheme = DISCIPLINE_COLORS[s.discipline] ?? DISCIPLINE_COLORS.otro;
                    const Icon = meta.Icon;
                    const isEditing = editingId === s.id;
                    const mod = parseWorkoutModification(s);
                    const cleanNotes = s.notes
                      ? s.notes
                          .split("\n")
                          .filter((l) => !l.includes("[Ajuste inteligente]"))
                          .join("\n")
                          .trim()
                      : "";

                    return (
                      <li
                        key={s.id}
                        className="surface-raised w-full overflow-hidden"
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          borderRadius: "var(--radius-lg)",
                          border: mod && mod.isModified ? "1.5px solid rgba(245, 158, 11, 0.55)" : "1px solid var(--color-border)",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {/* Banner visual si la sesión está adaptada */}
                        {mod && mod.isModified && (
                          <div style={{ marginBottom: 8 }}>
                            <WorkoutModificationBanner info={mod} />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "var(--radius-md)",
                                background: discTheme.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: discTheme.color,
                              }}
                            >
                              <Icon size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-base sm:text-lg tracking-tight truncate" style={{ color: "var(--color-text)" }}>
                                {meta.label} {s.planned_code ? `· ${s.planned_code}` : ""}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 4 }}>
                                {mod && mod.isModified && (
                                  <span className="badge badge-warning flex items-center gap-1 font-bold" style={{ fontSize: "0.72rem", padding: "0.12rem 0.5rem" }}>
                                    <Zap size={11} />
                                    <span>{mod.badgeLabel}</span>
                                  </span>
                                )}
                                {s.discipline === "carrera" && (() => {
                                  const vz = detectVamZoneForSession(s);
                                  if (!vz) return null;
                                  return (
                                    <span
                                      className="badge flex items-center gap-1 font-bold"
                                      style={{
                                        fontSize: "0.72rem",
                                        padding: "0.12rem 0.55rem",
                                        backgroundColor: "rgba(16, 185, 129, 0.18)",
                                        color: "var(--color-success, #10b981)",
                                        border: "1px solid rgba(16, 185, 129, 0.35)",
                                      }}
                                      title={`Zona ${vz.code}: ${vz.name} (${vz.pctVam} · VAM 3:59)`}
                                    >
                                      <Gauge size={11} />
                                      <span>Ritmo VAM: {vz.rangeLabel}</span>
                                    </span>
                                  );
                                })()}
                                {!!s.is_long_run && (
                                  <span className="badge badge-info font-semibold" style={{ fontSize: "0.72rem", padding: "0.12rem 0.5rem" }}>
                                    Tirada larga
                                  </span>
                                )}
                                <span
                                  className={`badge font-semibold ${s.status === "realizada" ? "badge-success" : "badge-neutral"}`}
                                  style={{ fontSize: "0.72rem", padding: "0.12rem 0.5rem" }}
                                >
                                  {STATUS_LABEL[s.status] ?? s.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              className="btn btn-ghost"
                              style={{ width: 34, height: 34, padding: 0, borderRadius: "var(--radius-sm)" }}
                              aria-label="Escribir o editar el detalle del entreno"
                              title="Editar notas del entreno"
                              onClick={() => (isEditing ? setEditingId(null) : startEditingNotes(s))}
                            >
                              <NotebookPen size={16} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ width: 34, height: 34, padding: 0, borderRadius: "var(--radius-sm)" }}
                              aria-label="Copiar entreno para Notas"
                              title="Copiar entreno para Notas"
                              onClick={() => copySession(s)}
                            >
                              {copiedId === s.id ? (
                                <Check size={16} style={{ color: "var(--color-success)" }} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ width: 34, height: 34, padding: 0, borderRadius: "var(--radius-sm)" }}
                              aria-label="Quitar sesión"
                              title="Eliminar sesión"
                              onClick={() => requestRemoveSession(s.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {!isEditing && cleanNotes && (
                          <div
                            className="w-full text-sm sm:text-base"
                            style={{
                              marginTop: "var(--space-3)",
                              padding: "var(--space-3) var(--space-4)",
                              background: "var(--color-surface)",
                              borderRadius: "var(--radius-md)",
                              borderLeft: `4px solid ${discTheme.color}`,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.55,
                              wordBreak: "break-word",
                              color: "var(--color-text)",
                            }}
                          >
                            {s.notes}
                          </div>
                        )}

                        {isEditing && (
                          <div className="w-full" style={{ marginTop: "var(--space-2)" }}>
                            <Textarea
                              label="Detalle del entrenamiento (ejercicios, series, RPE, ritmos...)"
                              rows={4}
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              hint="Escríbelo directamente según tu plan."
                            />
                            <div className="flex gap-2" style={{ marginTop: "var(--space-2)" }}>
                              <Button variant="primary" loading={savingNotes} onClick={() => saveNotes(s.id)} style={{ height: 34, minHeight: 34, fontSize: "0.78rem" }}>
                                <Save size={14} />
                                Guardar
                              </Button>
                              <Button variant="ghost" onClick={() => setEditingId(null)} style={{ height: 34, minHeight: 34, fontSize: "0.78rem" }}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Inline Add Session Form */}
              {isAdding && (
                <div
                  className="surface-raised w-full"
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    marginTop: daySessions.length > 0 ? "var(--space-2)" : 0,
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      aria-label="Añadir disciplina"
                      value={f.discipline}
                      onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, discipline: e.target.value } }))}
                    >
                      <option value="">Disciplina…</option>
                      {DISCIPLINES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>

                    <Input
                      aria-label="Código de la receta"
                      placeholder="Código (R2, Día A…)"
                      value={f.planned_code}
                      onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, planned_code: e.target.value } }))}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2" style={{ marginTop: "var(--space-2)" }}>
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.is_long_run}
                        onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, is_long_run: e.target.checked } }))}
                      />
                      Tirada larga
                    </label>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "", planned_code: "", is_long_run: false, notes: "" } }))}
                        style={{ height: 32, minHeight: 32, fontSize: "0.75rem", padding: "0 10px" }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        disabled={!f.discipline}
                        loading={savingDate === date}
                        onClick={() => addSession(date)}
                        style={{ height: 32, minHeight: 32, fontSize: "0.75rem", padding: "0 12px" }}
                      >
                        <Plus size={13} />
                        Guardar
                      </Button>
                    </div>
                  </div>

                  <div style={{ marginTop: "var(--space-2)" }}>
                    <Textarea
                      aria-label="Detalle del entrenamiento (opcional)"
                      placeholder="Detalle opcional: ejercicios, series, RPE, pesos, ritmos..."
                      rows={2}
                      value={f.notes}
                      onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, notes: e.target.value } }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (viewMode === "horizontal") {
          return (
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="w-full transition-opacity duration-150"
            >
              {renderDayCard(selectedDate, currentIndex)}
            </div>
          );
        }

        return (
          <div className="grid gap-2.5 w-full">
            {days.map((date, i) => renderDayCard(date, i))}
          </div>
        );
      })()}

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Quitar sesión del plan"
        description="¿Seguro que deseas eliminar esta sesión planificada? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={executeRemoveSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}