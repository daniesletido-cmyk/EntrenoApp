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
  const [swappingId, setSwappingId] = useState<number | null>(null);
  const [swapTarget, setSwapTarget] = useState<string>("");
  const [swapping, setSwapping] = useState(false);
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

  const load = useCallback(() => {
    fetch(`/api/sessions?week=${weekStart}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const days = weekDates(weekStart);

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

  function startSwap(id: number) {
    setSwappingId(id);
    setSwapTarget("");
  }

  function cancelSwap() {
    setSwappingId(null);
    setSwapTarget("");
  }

  async function confirmSwap(id: number) {
    if (!swapTarget) return;
    setSwapping(true);
    try {
      const res = await fetch("/api/sessions/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idA: id, idB: Number(swapTarget) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo intercambiar");
        return;
      }
      toast.push("success", "Sesiones intercambiadas");
      setSwappingId(null);
      setSwapTarget("");
      load();
    } finally {
      setSwapping(false);
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
    <div>
      <PageHeader
        title="Plan semanal"
        description="Planifica qué toca cada día — carrera, gimnasio, natación… — y luego registra el resultado en Registro."
        actions={
          <>
            <input ref={importFileRef} type="file" accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg" onChange={handleImportFile} style={{ display: "none" }} />
            <Button variant="secondary" loading={importLoading} onClick={() => importFileRef.current?.click()}>
              <FileUp size={15} />
              Importar plan
            </Button>
          </>
        }
      />
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {importPreview && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div>
              <div className="font-semibold text-sm">Sesiones detectadas en el archivo</div>
              {importInfo && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Método: {importInfo.method}
                  {importInfo.skipped > 0 ? ` · ${importInfo.skipped} fila(s) descartadas (no se pudo determinar el día)` : ""}
                  — revisa cada fila antes de importar.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setImportPreview(null)}>
              <X size={15} />
            </button>
          </div>

          {importPreview.length === 0 ? (
            <p className="text-sm text-muted">No se ha reconocido ninguna sesión. Prueba con otro archivo o añade las sesiones a mano abajo.</p>
          ) : (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-3)" }}>
              {importPreview.map((row, i) => (
                <div key={i} className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="flex flex-wrap items-end gap-2">
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
                    <label className="flex items-center gap-2 text-xs text-muted" style={{ minHeight: 38 }}>
                      <input
                        type="checkbox"
                        checked={row.is_long_run}
                        onChange={(e) => updatePreviewRow(i, { is_long_run: e.target.checked })}
                      />
                      Tirada larga
                    </label>
                    <button className="btn btn-ghost btn-icon" aria-label="Quitar esta fila" onClick={() => removePreviewRow(i)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <Textarea
                      label="Detalle del entrenamiento (ejercicios, series, RPE, ritmos...)"
                      rows={row.notes && row.notes.length > 120 ? 5 : 2}
                      value={row.notes ?? ""}
                      onChange={(e) => updatePreviewRow(i, { notes: e.target.value || null })}
                      hint="Revisa que coincida con el documento original antes de importar — se guarda tal cual."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {importPreview.length > 0 && (
            <Button variant="primary" loading={importCommitting} onClick={commitImport}>
              <Plus size={15} />
              Añadir {importPreview.length} sesión(es) al plan
            </Button>
          )}
        </div>
      )}

      {totalSessions === 0 && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <EmptyState
            icon={<Footprints size={22} />}
            title="Esta semana todavía no tiene sesiones"
            description="Añade al menos una sesión en cualquiera de los días de abajo para empezar a planificar la semana."
          />
        </div>
      )}

      <div className="grid gap-3">
        {days.map((date, i) => {
          const daySessions = sessions.filter((s) => s.date === date);
          const f = form[date] ?? { discipline: "", planned_code: "", is_long_run: false, notes: "" };
          const isToday = date === today();
          const isAdding = savingDate === date || !!f.discipline;

          return (
            <div
              key={date}
              className="surface"
              style={{
                padding: "var(--space-4)",
                borderLeft: isToday ? "3px solid var(--color-brand)" : undefined,
              }}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between gap-3" style={{ marginBottom: daySessions.length > 0 || isAdding ? "var(--space-3)" : 0 }}>
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 44,
                      height: 48,
                      borderRadius: "var(--radius-md)",
                      background: isToday ? "var(--color-brand)" : "var(--color-surface-raised)",
                      color: isToday ? "#ffffff" : "var(--color-text)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: isToday ? "none" : "1px solid var(--color-border)",
                      boxShadow: isToday ? "0 4px 14px rgba(59, 130, 246, 0.4)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em", opacity: isToday ? 0.95 : 0.65 }}>
                      {DAY_NAMES_ES[i].substring(0, 3).toUpperCase()}
                    </span>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, lineHeight: 1 }}>
                      {parseInt(date.split("-")[2] || "1", 10)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">{DAY_NAMES_ES[i]}</span>
                      {isToday && (
                        <span className="badge badge-brand" style={{ fontSize: "0.68rem", padding: "0.1rem 0.45rem" }}>
                          Hoy
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 1 }}>
                      {daySessions.length === 0
                        ? "Descanso / Sin programar"
                        : `${daySessions.length} entreno${daySessions.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>

                {!isAdding && daySessions.length === 0 && (
                  <button
                    className="btn btn-secondary text-xs"
                    onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "carrera", planned_code: "", is_long_run: false, notes: "" } }))}
                    style={{ height: 34, minHeight: 34, padding: "0 12px", borderRadius: "var(--radius-full)" }}
                  >
                    <Plus size={14} />
                    Planificar
                  </button>
                )}

                {!isAdding && daySessions.length > 0 && (
                  <button
                    className="btn btn-ghost text-xs"
                    onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "carrera", planned_code: "", is_long_run: false, notes: "" } }))}
                    style={{ height: 32, minHeight: 32, padding: "0 10px", borderRadius: "var(--radius-full)" }}
                  >
                    <Plus size={13} />
                    Añadir otro
                  </button>
                )}
              </div>

              {/* Day Sessions List */}
              {daySessions.length > 0 && (
                <ul className="grid gap-2" style={{ marginBottom: isAdding ? "var(--space-3)" : 0 }}>
                  {daySessions.map((s) => {
                    const meta = DISCIPLINE_MAP[s.discipline] ?? DISCIPLINES[4];
                    const discTheme = DISCIPLINE_COLORS[s.discipline] ?? DISCIPLINE_COLORS.otro;
                    const Icon = meta.Icon;
                    const isEditing = editingId === s.id;
                    const isSwapping = swappingId === s.id;
                    return (
                      <li
                        key={s.id}
                        className="surface-raised"
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 text-sm min-w-0">
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "var(--radius-sm)",
                                background: discTheme.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: discTheme.color,
                              }}
                            >
                              <Icon size={17} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate" style={{ color: "var(--color-text)" }}>
                                {meta.label} {s.planned_code ? `· ${s.planned_code}` : ""}
                              </div>
                              <div className="flex items-center gap-1.5" style={{ marginTop: 2 }}>
                                {!!s.is_long_run && (
                                  <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                                    Tirada larga
                                  </span>
                                )}
                                <span
                                  className={`badge ${s.status === "realizada" ? "badge-success" : "badge-neutral"}`}
                                  style={{ fontSize: "0.68rem" }}
                                >
                                  {STATUS_LABEL[s.status] ?? s.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Intercambiar con otra sesión de la semana"
                              title="Intercambiar día"
                              onClick={() => (isSwapping ? cancelSwap() : startSwap(s.id))}
                            >
                              <ArrowLeftRight size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Escribir o editar el detalle del entreno"
                              title="Editar notas del entreno"
                              onClick={() => (isEditing ? setEditingId(null) : startEditingNotes(s))}
                            >
                              <NotebookPen size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Copiar entreno para Notas"
                              title="Copiar entreno para Notas"
                              onClick={() => copySession(s)}
                            >
                              {copiedId === s.id ? (
                                <Check size={15} style={{ color: "var(--color-success)" }} />
                              ) : (
                                <Copy size={15} />
                              )}
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label="Quitar sesión"
                              title="Eliminar sesión"
                              onClick={() => requestRemoveSession(s.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {!isEditing && s.notes && (
                          <div
                            className="text-xs sm:text-sm text-muted"
                            style={{
                              marginTop: "var(--space-2)",
                              marginLeft: 42,
                              padding: "var(--space-2) var(--space-3)",
                              background: "var(--color-surface)",
                              borderRadius: "var(--radius-sm)",
                              borderLeft: `2px solid ${discTheme.color}`,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.5,
                            }}
                          >
                            {s.notes}
                          </div>
                        )}

                        {isEditing && (
                          <div style={{ marginTop: "var(--space-3)", paddingLeft: 36 }}>
                            <Textarea
                              label="Detalle del entrenamiento (ejercicios, series, RPE, ritmos...)"
                              rows={4}
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              hint="Escríbelo directamente según tu plan."
                            />
                            <div className="flex gap-2" style={{ marginTop: "var(--space-2)" }}>
                              <Button variant="primary" loading={savingNotes} onClick={() => saveNotes(s.id)}>
                                <Save size={14} />
                                Guardar
                              </Button>
                              <Button variant="ghost" onClick={() => setEditingId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {isSwapping && (
                          <div style={{ marginTop: "var(--space-3)", paddingLeft: 36 }}>
                            <Select
                              label="Intercambiar con"
                              value={swapTarget}
                              onChange={(e) => setSwapTarget(e.target.value)}
                            >
                              <option value="">Elige una sesión de esta semana…</option>
                              {sessions
                                .filter((other) => other.id !== s.id)
                                .map((other) => {
                                  const otherMeta = DISCIPLINE_MAP[other.discipline] ?? DISCIPLINES[4];
                                  return (
                                    <option key={other.id} value={other.id}>
                                      {dayNameForDate(other.date)} — {otherMeta.label}
                                      {other.planned_code ? ` (${other.planned_code})` : ""}
                                    </option>
                                  );
                                })}
                            </Select>
                            <div className="flex gap-2" style={{ marginTop: "var(--space-2)" }}>
                              <Button variant="primary" loading={swapping} disabled={!swapTarget} onClick={() => confirmSwap(s.id)}>
                                <ArrowLeftRight size={14} />
                                Intercambiar
                              </Button>
                              <Button variant="ghost" onClick={cancelSwap}>
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
                  className="surface-raised"
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    marginTop: daySessions.length > 0 ? "var(--space-2)" : 0,
                  }}
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div style={{ minWidth: 140, flex: 1 }}>
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
                    </div>
                    <div style={{ minWidth: 140, flex: 1 }}>
                      <Input
                        aria-label="Código de la receta"
                        placeholder="Código (R2, Día A…)"
                        value={f.planned_code}
                        onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, planned_code: e.target.value } }))}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted" style={{ minHeight: 38 }}>
                      <input
                        type="checkbox"
                        checked={f.is_long_run}
                        onChange={(e) => setForm((p) => ({ ...p, [date]: { ...f, is_long_run: e.target.checked } }))}
                      />
                      Tirada larga
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Button variant="primary" disabled={!f.discipline} loading={savingDate === date} onClick={() => addSession(date)}>
                        <Plus size={15} />
                        Guardar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setForm((p) => ({ ...p, [date]: { discipline: "", planned_code: "", is_long_run: false, notes: "" } }))}
                      >
                        Cancelar
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
        })}
      </div>

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