"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dumbbell, Plus, Trash2, Save, History, Settings2, FileUp, X, Check, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";

interface GymDay {
  id: number;
  name: string;
  sort_order: number;
}
interface GymExercise {
  id: number;
  gym_day_id: number;
  name: string;
  sort_order: number;
}
interface GymLog {
  id: number;
  exercise_id: number;
  date: string;
  weight_kg: number | null;
  sets: number | null;
  reps: number | null;
  completed?: number | null;
}
interface SessionLite {
  id: number;
  date: string;
  discipline: string;
  planned_code: string | null;
  status: string;
}

interface GymPreviewRow {
  day_label: string;
  exercise: string;
  detail: string | null;
}

const CHART_COLORS = { primary: "#2f6feb", grid: "#262c37", text: "#9aa3b2" };
const TOOLTIP_STYLE = { background: "#171b24", border: "1px solid #262c37", borderRadius: 8, fontSize: 13 };

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--space-3) var(--space-4)",
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)",
  verticalAlign: "middle",
};

export default function GimnasioPage() {
  const [date, setDate] = useState(todayISO());
  const [days, setDays] = useState<GymDay[]>([]);
  const [exercises, setExercises] = useState<GymExercise[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [scheduledGymDay, setScheduledGymDay] = useState<GymDay | null>(null);
  const [scheduledSession, setScheduledSession] = useState<SessionLite | null>(null);
  const [logsToday, setLogsToday] = useState<GymLog[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { weight: string; sets: string; reps: string }>>({});
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Histórico de TODOS los ejercicios del día seleccionado, para pintar un
  // gráfico de cada uno a la vez (en vez de tener que abrir uno por uno).
  const [dayHistory, setDayHistory] = useState<{ exerciseId: number; name: string; logs: GymLog[] }[]>([]);
  const [dayHistoryLoading, setDayHistoryLoading] = useState(false);

  const [importPreview, setImportPreview] = useState<GymPreviewRow[] | null>(null);
  const [importInfo, setImportInfo] = useState<{ method: string; skipped: number } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [daysRes, exRes, sessionsRes, logsRes] = await Promise.all([
        fetch("/api/gym/days").then((r) => r.json()),
        fetch("/api/gym/exercises").then((r) => r.json()),
        fetch(`/api/sessions?from=${date}&to=${date}`).then((r) => r.json()),
        fetch(`/api/gym/logs?date=${date}`).then((r) => r.json()),
      ]);
      const loadedDays: GymDay[] = daysRes.days ?? [];
      setDays(loadedDays);
      setExercises(exRes.exercises ?? []);
      setLogsToday(logsRes.logs ?? []);

      const gymSession: SessionLite | undefined = (sessionsRes.sessions ?? []).find(
        (s: SessionLite) => s.discipline === "gimnasio"
      );
      setScheduledSession(gymSession ?? null);

      let matchedDay: GymDay | null = null;
      if (gymSession?.planned_code) {
        const code = String(gymSession.planned_code).trim().toLowerCase();
        matchedDay =
          loadedDays.find((d) => d.name.trim().toLowerCase() === code) ||
          loadedDays.find((d) => d.name.trim().toLowerCase().startsWith(code)) ||
          loadedDays.find((d) => d.name.trim().toLowerCase().includes(code)) ||
          loadedDays.find((d) => code.includes(d.name.trim().toLowerCase())) ||
          null;
      }
      setScheduledGymDay(matchedDay);

      let pick: number | null = null;
      if (matchedDay) {
        pick = matchedDay.id;
      } else if (selectedDayId && loadedDays.some((d) => d.id === selectedDayId)) {
        pick = selectedDayId;
      } else if (loadedDays.length > 0) {
        pick = loadedDays[0].id;
      }
      setSelectedDayId(pick);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const next: Record<number, { weight: string; sets: string; reps: string }> = {};
    for (const ex of exercises) {
      const log = logsToday.find((l) => l.exercise_id === ex.id);
      next[ex.id] = {
        weight: log?.weight_kg !== null && log?.weight_kg !== undefined ? String(log.weight_kg) : "",
        sets: log?.sets !== null && log?.sets !== undefined ? String(log.sets) : "",
        reps: log?.reps !== null && log?.reps !== undefined ? String(log.reps) : "",
      };
    }
    setDrafts(next);
  }, [exercises, logsToday]);

  const dayExercises = useMemo(
    () => exercises.filter((e) => e.gym_day_id === selectedDayId).sort((a, b) => a.sort_order - b.sort_order),
    [exercises, selectedDayId]
  );

  const completedCount = useMemo(() => {
    return dayExercises.filter((ex) => {
      const log = logsToday.find((l) => l.exercise_id === ex.id);
      return log?.completed === 1;
    }).length;
  }, [dayExercises, logsToday]);

  const completionPct = dayExercises.length > 0 ? Math.round((completedCount / dayExercises.length) * 100) : 0;

  const { push } = useToast();

  // Carga el histórico de peso de todos los ejercicios del día seleccionado
  // en paralelo, para pintar un gráfico de cada uno sin tener que hacer clic
  // ejercicio por ejercicio.
  useEffect(() => {
    let alive = true;
    if (dayExercises.length === 0) {
      setDayHistory([]);
      return;
    }
    setDayHistoryLoading(true);
    Promise.all(
      dayExercises.map((ex) =>
        fetch(`/api/gym/logs?exerciseId=${ex.id}`)
          .then((r) => r.json())
          .then((data) => ({ exerciseId: ex.id, name: ex.name, logs: (data.logs ?? []) as GymLog[] }))
      )
    )
      .then((results) => {
        if (alive) setDayHistory(results);
      })
      .finally(() => {
        if (alive) setDayHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [dayExercises]);

  async function saveLog(exerciseId: number, completedOverride?: boolean) {
    const d = drafts[exerciseId];
    if (!d) return;
    const currentLog = logsToday.find((l) => l.exercise_id === exerciseId);
    const isCompleted =
      completedOverride !== undefined ? completedOverride : currentLog?.completed === 1;
    setSavingId(exerciseId);
    try {
      const res = await fetch("/api/gym/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exerciseId,
          date,
          weight_kg: d.weight ? Number(d.weight) : null,
          sets: d.sets ? Number(d.sets) : null,
          reps: d.reps ? Number(d.reps) : null,
          completed: isCompleted ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error();
      const { log } = await res.json();
      const updatedLogs = [...logsToday.filter((l) => l.exercise_id !== exerciseId), log];
      setLogsToday(updatedLogs);
      // Refleja el peso recién guardado en el gráfico de este ejercicio
      setDayHistory((prev) =>
        prev.map((h) =>
          h.exerciseId === exerciseId
            ? {
                ...h,
                logs: [...h.logs.filter((l) => l.date !== date), log].sort((a, b) =>
                  a.date.localeCompare(b.date)
                ),
              }
            : h
        )
      );

      // Si todos los ejercicios de este día están completados, felicitar y marcar la sesión en realizada
      const allDone =
        dayExercises.length > 0 &&
        dayExercises.every((ex) => {
          const item = ex.id === exerciseId ? log : updatedLogs.find((l) => l.exercise_id === ex.id);
          return item?.completed === 1;
        });

      if (allDone && scheduledSession && scheduledSession.status !== "realizada") {
        await fetch(`/api/sessions/${scheduledSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "realizada" }),
        });
        setScheduledSession((prev) => (prev ? { ...prev, status: "realizada" } : null));
        push("success", "¡Enhorabuena! Has completado todos los ejercicios de la sesión.");
      } else if (completedOverride !== undefined) {
        push(
          "success",
          completedOverride ? "Ejercicio completado" : "Ejercicio marcado como pendiente"
        );
      }
    } catch {
      push("error", "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleComplete(exerciseId: number) {
    const currentLog = logsToday.find((l) => l.exercise_id === exerciseId);
    const currentlyCompleted = currentLog?.completed === 1;
    await saveLog(exerciseId, !currentlyCompleted);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/gym/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        push("error", data.error ?? "No se pudo leer el archivo");
        return;
      }
      setImportPreview(data.rows);
      setImportInfo({ method: data.method, skipped: data.skipped });
      if (data.rows.length === 0) {
        push("info", "No se ha reconocido ningún ejercicio en el archivo");
      }
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  }

  function updatePreviewRow(i: number, patch: Partial<GymPreviewRow>) {
    setImportPreview((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev));
  }

  function removePreviewRow(i: number) {
    setImportPreview((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  // Crea (o reutiliza si ya existe, comparando por nombre) el día de cada
  // fila y luego el ejercicio dentro de ese día. El detalle (series/reps/RPE/
  // peso) no tiene columna propia en el catálogo — se añade entre paréntesis
  // al nombre del ejercicio para no perderlo.
  async function commitImport() {
    if (!importPreview || importPreview.length === 0) return;
    setImportCommitting(true);
    try {
      const dayIdByName = new Map<string, number>();
      for (const d of days) dayIdByName.set(d.name.trim().toLowerCase(), d.id);

      for (const row of importPreview) {
        const key = row.day_label.trim().toLowerCase();
        let dayId = dayIdByName.get(key);
        if (dayId === undefined) {
          const created = await fetch("/api/gym/days", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: row.day_label.trim() }),
          }).then((r) => r.json());
          dayId = created.day.id;
          dayIdByName.set(key, dayId as number);
        }
        const name = row.detail ? `${row.exercise} (${row.detail})` : row.exercise;
        await fetch("/api/gym/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gym_day_id: dayId, name }),
        });
      }
      push("success", `${importPreview.length} ejercicio(s) añadidos`);
      setImportPreview(null);
      setImportInfo(null);
      await loadAll();
    } finally {
      setImportCommitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Gimnasio"
        description="Registra el peso, series y repeticiones de cada ejercicio y sigue tu evolución."
        actions={
          <>
            <input
              type="date"
              className="field"
              style={{ width: "auto" }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
            <Button variant="secondary" loading={importLoading} onClick={() => importFileRef.current?.click()}>
              <FileUp size={15} />
              Importar ejercicios
            </Button>
            <Button variant="secondary" onClick={() => setManageOpen(true)}>
              <Settings2 size={16} />
              Ejercicios
            </Button>
          </>
        }
      />

      {importPreview && (
        <div
          className="surface animate-in"
          style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}
        >
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div>
              <div className="font-semibold text-sm">Ejercicios detectados en el archivo</div>
              {importInfo && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Método: {importInfo.method}
                  {importInfo.skipped > 0 ? ` · ${importInfo.skipped} fila(s) descartadas (sin nombre de ejercicio)` : ""}
                  — revisa el día y el nombre de cada fila antes de importar; los días que no existan se crean solos.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setImportPreview(null)}>
              <X size={15} />
            </button>
          </div>

          {importPreview.length === 0 ? (
            <p className="text-sm text-muted">
              No se ha reconocido ningún ejercicio. Prueba con otro archivo, o añádelos a mano desde &quot;Ejercicios&quot;.
            </p>
          ) : (
            <div className="grid gap-2" style={{ marginBottom: "var(--space-3)" }}>
              {importPreview.map((row, i) => (
                <div key={i} className="surface-raised" style={{ padding: "var(--space-3)" }}>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input label="Día" value={row.day_label} onChange={(e) => updatePreviewRow(i, { day_label: e.target.value })} />
                    <Input
                      label="Ejercicio"
                      value={row.exercise}
                      onChange={(e) => updatePreviewRow(i, { exercise: e.target.value })}
                    />
                    <Input
                      label="Detalle (series/reps/RPE/peso)"
                      value={row.detail ?? ""}
                      onChange={(e) => updatePreviewRow(i, { detail: e.target.value || null })}
                    />
                    <button className="btn btn-ghost btn-icon" aria-label="Quitar esta fila" onClick={() => removePreviewRow(i)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {importPreview.length > 0 && (
            <Button variant="primary" loading={importCommitting} onClick={commitImport}>
              <Plus size={15} />
              Añadir {importPreview.length} ejercicio(s)
            </Button>
          )}
        </div>
      )}

      {loading && <Loading label="Cargando..." />}

      {!loading && days.length === 0 && (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="Todavía no tienes ningún día de gimnasio creado"
          description="Crea tus días (por ejemplo Día A, Día B) y los ejercicios de cada uno para poder registrar pesos."
          action={
            <Button variant="primary" onClick={() => setManageOpen(true)}>
              Crear días y ejercicios
            </Button>
          }
        />
      )}

      {!loading && days.length > 0 && (
        <div className="animate-in grid gap-5">
          {/* Banner de Rutina Activa para hoy */}
          {scheduledGymDay && (
            <div
              className="surface"
              style={{
                padding: "var(--space-4)",
                borderColor: completionPct === 100 ? "var(--color-success)" : "var(--color-brand)",
                background: completionPct === 100 ? "rgba(34, 197, 94, 0.05)" : "rgba(47, 111, 235, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div className="flex items-center justify-between gap-3" style={{ flexWrap: "wrap" }}>
                <div className="flex items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      backgroundColor: completionPct === 100 ? "rgba(34, 197, 94, 0.2)" : "rgba(47, 111, 235, 0.2)",
                      color: completionPct === 100 ? "var(--color-success)" : "var(--color-brand)",
                      fontWeight: 700,
                    }}
                  >
                    {completionPct === 100 ? "✓ Sesión Completada" : "⚡ Rutina Activa Hoy"}
                  </span>
                  <span className="font-semibold text-base">{scheduledGymDay.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted font-medium">
                    {completedCount} de {dayExercises.length} ejercicios completados ({completionPct}%)
                  </span>
                  {selectedDayId !== scheduledGymDay.id && (
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedDayId(scheduledGymDay.id)}
                      style={{ padding: "0.25rem 0.65rem", fontSize: "var(--text-xs)" }}
                    >
                      Ver rutina activa
                    </Button>
                  )}
                </div>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${completionPct}%`,
                    height: "100%",
                    backgroundColor: completionPct === 100 ? "var(--color-success)" : "var(--color-brand)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          <div className="section-group" style={{ marginBottom: 0 }}>
            <div className="flex items-center gap-3" style={{ flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
              <span className="label" style={{ marginBottom: 0 }}>
                Día
              </span>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {days.map((d) => {
                  const isScheduled = d.id === scheduledGymDay?.id;
                  const isSelected = d.id === selectedDayId;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDayId(d.id)}
                      className={isSelected ? "badge badge-brand" : "badge badge-neutral"}
                      style={{
                        cursor: "pointer",
                        border: isScheduled && !isSelected ? "1px solid var(--color-brand)" : "none",
                        fontSize: "var(--text-sm)",
                        padding: "0.4rem 0.9rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {d.name}
                      {isScheduled && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            backgroundColor: isSelected ? "#ffffff" : "var(--color-brand)",
                            color: isSelected ? "var(--color-brand)" : "#ffffff",
                            padding: "1px 5px",
                            borderRadius: 999,
                            fontWeight: 700,
                          }}
                        >
                          ACTIVO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {dayExercises.length === 0 ? (
              <EmptyState
                icon={<Dumbbell size={22} />}
                title="Este día todavía no tiene ejercicios"
                description="Añádelos desde el botón 'Ejercicios' de arriba."
              />
            ) : (
              <div className="surface" style={{ overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <th style={{ ...thStyle, width: 44, textAlign: "center" }} />
                        <th style={thStyle}>Ejercicio</th>
                        <th style={thStyle}>Peso (kg)</th>
                        <th style={thStyle}>Series</th>
                        <th style={thStyle}>Reps</th>
                        <th style={thStyle}>Última vez</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayExercises.map((ex) => {
                        const log = logsToday.find((l) => l.exercise_id === ex.id);
                        const isCompleted = log?.completed === 1;
                        return (
                          <ExerciseRow
                            key={ex.id}
                            exercise={ex}
                            draft={drafts[ex.id] ?? { weight: "", sets: "", reps: "" }}
                            isCompleted={isCompleted}
                            onChange={(patch) =>
                              setDrafts((prev) => ({ ...prev, [ex.id]: { ...prev[ex.id], ...patch } }))
                            }
                            onSave={() => saveLog(ex.id)}
                            onToggleComplete={() => toggleComplete(ex.id)}
                            saving={savingId === ex.id}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {dayExercises.length > 0 && (
            <div className="section-group" style={{ marginBottom: 0 }}>
              <div className="section-group-title">
                <History size={18} />
                Progreso — {days.find((d) => d.id === selectedDayId)?.name}
              </div>
              {dayHistoryLoading ? (
                <Loading label="Cargando progreso..." />
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  {dayHistory.map((h) => (
                    <ExerciseProgressCard key={h.exerciseId} name={h.name} logs={h.logs} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {manageOpen && (
        <ManageModal days={days} exercises={exercises} onClose={() => setManageOpen(false)} onChanged={loadAll} />
      )}
    </div>
  );
}

function parseExerciseName(fullName: string) {
  const match = fullName.match(/^([^(]+)(?:\((.*)\))?$/);
  if (match && match[2]) {
    return { title: match[1].trim(), detail: match[2].trim() };
  }
  return { title: fullName, detail: null };
}

function ExerciseRow({
  exercise,
  draft,
  isCompleted,
  onChange,
  onSave,
  onToggleComplete,
  saving,
}: {
  exercise: GymExercise;
  draft: { weight: string; sets: string; reps: string };
  isCompleted: boolean;
  onChange: (patch: Partial<{ weight: string; sets: string; reps: string }>) => void;
  onSave: () => void;
  onToggleComplete: () => void;
  saving: boolean;
}) {
  const parsed = parseExerciseName(exercise.name);

  return (
    <tr
      style={{
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: isCompleted ? "rgba(100, 116, 139, 0.08)" : "transparent",
        opacity: isCompleted ? 0.65 : 1,
        transition: "all 0.2s ease",
      }}
    >
      <td style={{ ...tdStyle, width: 44, textAlign: "center", paddingRight: 0 }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            background: isCompleted ? "rgba(34, 197, 94, 0.18)" : "rgba(255, 255, 255, 0.04)",
            border: isCompleted ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid var(--color-border)",
            borderRadius: "50%",
            width: 30,
            height: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isCompleted ? "var(--color-success)" : "var(--color-text-muted)",
            transition: "all 0.15s ease",
          }}
          title={isCompleted ? "Marcar como pendiente" : "Marcar como completado"}
        >
          {isCompleted ? <CheckCircle2 size={16} /> : <Check size={14} />}
        </button>
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            className="font-medium text-sm"
            style={{
              textDecoration: isCompleted ? "line-through" : "none",
              color: isCompleted ? "var(--color-text-muted)" : "var(--color-text)",
            }}
          >
            {parsed.title}
          </span>
          {parsed.detail && (
            <span
              className="text-xs"
              style={{
                color: "var(--color-text-faint)",
                marginTop: 2,
              }}
            >
              {parsed.detail}
            </span>
          )}
        </div>
      </td>
      <td style={tdStyle}>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          className="field"
          style={{ width: 90 }}
          value={draft.weight}
          onChange={(e) => onChange({ weight: e.target.value })}
          onBlur={onSave}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="kg"
        />
      </td>
      <td style={tdStyle}>
        <input
          type="number"
          inputMode="numeric"
          className="field"
          style={{ width: 70 }}
          value={draft.sets}
          onChange={(e) => onChange({ sets: e.target.value })}
          onBlur={onSave}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="—"
        />
      </td>
      <td style={tdStyle}>
        <input
          type="number"
          inputMode="numeric"
          className="field"
          style={{ width: 70 }}
          value={draft.reps}
          onChange={(e) => onChange({ reps: e.target.value })}
          onBlur={onSave}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          placeholder="—"
        />
      </td>
      <td style={tdStyle}>
        <LastValue exerciseId={exercise.id} />
      </td>
      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
        <Button
          variant={isCompleted ? "secondary" : "primary"}
          onClick={onToggleComplete}
          loading={saving}
          style={{ minWidth: 105, padding: "0.35rem 0.75rem", fontSize: "var(--text-xs)" }}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
              Completado
            </>
          ) : (
            <>
              <Check size={14} />
              Completar
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

function LastValue({ exerciseId }: { exerciseId: number }) {
  const [text, setText] = useState<string>("…");
  const [hasValue, setHasValue] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/api/gym/logs?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const logs: GymLog[] = data.logs ?? [];
        const withWeight = logs.filter((l) => l.weight_kg !== null);
        const last = withWeight[withWeight.length - 1];
        setHasValue(!!last);
        setText(last ? `${last.weight_kg} kg (${last.date.slice(5)})` : "—");
      })
      .catch(() => setText("—"));
    return () => {
      alive = false;
    };
  }, [exerciseId]);
  return <span className={hasValue ? "text-sm font-semibold" : "text-sm text-faint"}>{text}</span>;
}

// Mini gráfico de la evolución de peso de un ejercicio — se muestra siempre
// para todos los ejercicios del día seleccionado (ver useEffect de
// dayHistory más arriba), sin tener que pedir el histórico uno a uno.
function ExerciseProgressCard({ name, logs }: { name: string; logs: GymLog[] }) {
  const withWeight = logs.filter((l) => l.weight_kg !== null);
  const last = withWeight[withWeight.length - 1];
  const chartData = withWeight.map((l) => ({ date: l.date.slice(5), peso: l.weight_kg }));

  return (
    <div className="surface" style={{ padding: "var(--space-3)" }}>
      <div className="flex items-start justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
        <span className="font-medium text-sm">{name}</span>
        <span className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>
          {last ? `Última: ${last.weight_kg} kg (${last.date.slice(5)})` : "Sin registros"}
        </span>
      </div>
      {chartData.length < 2 ? (
        <p className="text-xs text-faint">
          {chartData.length === 0
            ? "Todavía no hay pesos registrados para este ejercicio."
            : "Hace falta al menos un registro más para dibujar el gráfico."}
        </p>
      ) : (
        <div style={{ height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={CHART_COLORS.text} fontSize={10} />
              <YAxis stroke={CHART_COLORS.text} fontSize={10} domain={["auto", "auto"]} width={34} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="peso"
                name="Peso (kg)"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ManageModal({
  days,
  exercises,
  onClose,
  onChanged,
}: {
  days: GymDay[];
  exercises: GymExercise[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { push } = useToast();
  const [newDayName, setNewDayName] = useState("");
  const [newExerciseName, setNewExerciseName] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  async function addDay() {
    if (!newDayName.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/gym/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDayName.trim() }),
      });
      setNewDayName("");
      await onChanged();
      push("success", "Día creado");
    } finally {
      setBusy(false);
    }
  }

  async function removeDay(id: number) {
    if (!confirm("¿Borrar este día y todos sus ejercicios e histórico? No se puede deshacer.")) return;
    await fetch(`/api/gym/days/${id}`, { method: "DELETE" });
    await onChanged();
    push("success", "Día borrado");
  }

  async function addExercise(dayId: number) {
    const name = newExerciseName[dayId]?.trim();
    if (!name) return;
    setBusy(true);
    try {
      await fetch("/api/gym/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gym_day_id: dayId, name }),
      });
      setNewExerciseName((prev) => ({ ...prev, [dayId]: "" }));
      await onChanged();
      push("success", "Ejercicio añadido");
    } finally {
      setBusy(false);
    }
  }

  async function removeExercise(id: number) {
    if (!confirm("¿Borrar este ejercicio y su histórico de pesos? No se puede deshacer.")) return;
    await fetch(`/api/gym/exercises/${id}`, { method: "DELETE" });
    await onChanged();
    push("success", "Ejercicio borrado");
  }

  return (
    <Modal title="Días y ejercicios de gimnasio" onClose={onClose}>
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nuevo día, ej. Día A"
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDay()}
          />
          <Button variant="primary" onClick={addDay} disabled={busy}>
            <Plus size={16} />
            Añadir día
          </Button>
        </div>

        {days.length === 0 && <p className="text-sm text-muted">Todavía no has creado ningún día.</p>}

        {days.map((d) => (
          <div key={d.id} className="surface-raised" style={{ padding: "var(--space-3)" }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{d.name}</span>
              <Button variant="danger" icon onClick={() => removeDay(d.id)} aria-label={`Borrar ${d.name}`}>
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="grid gap-2" style={{ marginTop: "var(--space-2)" }}>
              {exercises
                .filter((e) => e.gym_day_id === d.id)
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span>{e.name}</span>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeExercise(e.id)}
                      aria-label={`Borrar ${e.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <input
                  className="field"
                  style={{ fontSize: "var(--text-sm)" }}
                  placeholder="Nuevo ejercicio"
                  value={newExerciseName[d.id] ?? ""}
                  onChange={(e) => setNewExerciseName((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addExercise(d.id)}
                />
                <Button variant="secondary" onClick={() => addExercise(d.id)} disabled={busy}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
