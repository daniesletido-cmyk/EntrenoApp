"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dumbbell, Plus, Trash2, Save, History, Settings2, FileUp, X, Check, CheckCircle2, Trophy, Flame, Copy } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";
import { copyTextToClipboard } from "@/lib/format-workout";

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
interface GymPR {
  exercise_id: number;
  exercise_name: string;
  gym_day_name: string;
  max_weight: number;
  date: string;
  reps: number | null;
  sets: number | null;
}
interface GymLog {
  id: number;
  exercise_id: number;
  date: string;
  weight_kg: number | null;
  sets: number | null;
  reps: number | null;
  completed?: number | null;
  series_data?: string | null;
}

export interface DraftSet {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

function parseTargetSetsAndReps(exerciseName: string) {
  const match = exerciseName.match(/\b(\d+)\s*[xX]\s*(\d+(?:-\d+)?)\b/);
  if (match) {
    const sets = Math.min(8, Math.max(1, parseInt(match[1], 10)));
    const reps = match[2];
    return { sets, reps };
  }
  return { sets: 3, reps: "" };
}

function initDraftSets(exercise: GymExercise, log?: GymLog): DraftSet[] {
  if (log?.series_data) {
    try {
      const parsed = JSON.parse(log.series_data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: `set-${exercise.id}-${idx}`,
          weight: item.weight_kg !== null && item.weight_kg !== undefined ? String(item.weight_kg) : "",
          reps: item.reps !== null && item.reps !== undefined ? String(item.reps) : "",
          completed: Boolean(item.completed),
        }));
      }
    } catch {}
  }

  if (log && (log.weight_kg !== null || log.sets !== null || log.reps !== null)) {
    const count = Math.max(1, log.sets ?? 1);
    return Array.from({ length: count }, (_, i) => ({
      id: `set-${exercise.id}-${i}`,
      weight: log.weight_kg !== null && log.weight_kg !== undefined ? String(log.weight_kg) : "",
      reps: log.reps !== null && log.reps !== undefined ? String(log.reps) : "",
      completed: log.completed === 1,
    }));
  }

  // Por defecto, según objetivo en el nombre (ej. 4x8-10 -> 4 series) o 3 series
  const target = parseTargetSetsAndReps(exercise.name);
  const defaultReps = target.reps.includes("-") ? target.reps.split("-")[0] : target.reps;
  return Array.from({ length: target.sets }, (_, i) => ({
    id: `set-${exercise.id}-${i}`,
    weight: "",
    reps: defaultReps,
    completed: false,
  }));
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

export default function GimnasioPage() {
  const [date, setDate] = useState(todayISO());
  const [days, setDays] = useState<GymDay[]>([]);
  const [exercises, setExercises] = useState<GymExercise[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [scheduledGymDay, setScheduledGymDay] = useState<GymDay | null>(null);
  const [scheduledSession, setScheduledSession] = useState<SessionLite | null>(null);
  const [logsToday, setLogsToday] = useState<GymLog[]>([]);
  const [prsMap, setPrsMap] = useState<Record<number, GymPR>>({});
  const [drafts, setDrafts] = useState<Record<number, DraftSet[]>>({});
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
      const [daysRes, exRes, sessionsRes, logsRes, prsRes] = await Promise.all([
        fetch("/api/gym/days").then((r) => r.json()),
        fetch("/api/gym/exercises").then((r) => r.json()),
        fetch(`/api/sessions?from=${date}&to=${date}`).then((r) => r.json()),
        fetch(`/api/gym/logs?date=${date}`).then((r) => r.json()),
        fetch("/api/gym/logs?prs=true").then((r) => r.json()),
      ]);
      const loadedDays: GymDay[] = daysRes.days ?? [];
      setDays(loadedDays);
      setExercises(exRes.exercises ?? []);
      setLogsToday(logsRes.logs ?? []);

      const prMap: Record<number, GymPR> = {};
      for (const p of (prsRes.prs ?? []) as GymPR[]) {
        prMap[p.exercise_id] = p;
      }
      setPrsMap(prMap);

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
    const next: Record<number, DraftSet[]> = {};
    for (const ex of exercises) {
      const log = logsToday.find((l) => l.exercise_id === ex.id);
      next[ex.id] = initDraftSets(ex, log);
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
  const [copiedRoutine, setCopiedRoutine] = useState(false);

  async function copyActiveGymRoutine() {
    const currentDay = scheduledGymDay ?? days.find((d) => d.id === selectedDayId);
    if (!currentDay) return;
    const exs = exercises.filter((e) => e.gym_day_id === currentDay.id).sort((a, b) => a.sort_order - b.sort_order);
    const lines: string[] = [
      `🏋️ Gimnasio · ${currentDay.name}`,
      `Fecha: ${todayISO()}`,
      "",
      "Ejercicios:",
    ];
    for (const ex of exs) {
      const log = logsToday.find((l) => l.exercise_id === ex.id);
      const checked = log?.completed === 1 ? "[x]" : "[ ]";
      const sets = drafts[ex.id];
      let setsStr = "";
      if (sets && sets.length > 0) {
        const doneSets = sets.filter((s) => s.weight.trim() && s.reps.trim());
        if (doneSets.length > 0) {
          setsStr = ` (${doneSets.map((s) => `${s.weight}kg x ${s.reps}`).join(", ")})`;
        }
      }
      lines.push(`- ${checked} ${ex.name}${setsStr}`);
    }
    const ok = await copyTextToClipboard(lines.join("\n"));
    if (ok) {
      setCopiedRoutine(true);
      push("success", "Rutina de gimnasio copiada — pégala en Notas");
      setTimeout(() => setCopiedRoutine(false), 2500);
    } else {
      push("error", "No se pudo copiar automáticamente");
    }
  }

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

  async function saveSets(exerciseId: number, setsToSave?: DraftSet[], completedOverride?: boolean) {
    const currentSets = setsToSave ?? drafts[exerciseId] ?? [];
    if (currentSets.length === 0) return;

    const currentLog = logsToday.find((l) => l.exercise_id === exerciseId);
    const isCompleted =
      completedOverride !== undefined
        ? completedOverride
        : (currentSets.length > 0 && currentSets.every((s) => s.completed) ? true : currentLog?.completed === 1);

    const numericWeights = currentSets
      .map((s) => (s.weight.trim() ? Number(s.weight) : null))
      .filter((w): w is number => w !== null && !isNaN(w) && w > 0);

    const maxWeight = numericWeights.length > 0 ? Math.max(...numericWeights) : null;
    const heaviestSet = maxWeight !== null
      ? currentSets.find((s) => Number(s.weight) === maxWeight)
      : currentSets[0];
    const topReps = heaviestSet && heaviestSet.reps.trim() ? Number(heaviestSet.reps) : null;

    const series_data = JSON.stringify(
      currentSets.map((s, idx) => ({
        set_number: idx + 1,
        weight_kg: s.weight.trim() ? Number(s.weight) : null,
        reps: s.reps.trim() ? Number(s.reps) : null,
        completed: s.completed,
      }))
    );

    setSavingId(exerciseId);
    try {
      const res = await fetch("/api/gym/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exerciseId,
          date,
          weight_kg: maxWeight,
          sets: currentSets.length,
          reps: topReps,
          completed: isCompleted ? 1 : 0,
          series_data,
        }),
      });
      if (!res.ok) throw new Error();
      const { log } = await res.json();
      const updatedLogs = [...logsToday.filter((l) => l.exercise_id !== exerciseId), log];
      setLogsToday(updatedLogs);

      // Refleja el peso en el histórico del gráfico
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

      // Si el mayor peso introducido supera o iguala el récord, actualiza prsMap
      if (maxWeight !== null && maxWeight > 0) {
        setPrsMap((prev) => {
          const currentPr = prev[exerciseId];
          if (!currentPr || maxWeight >= currentPr.max_weight) {
            return {
              ...prev,
              [exerciseId]: {
                exercise_id: exerciseId,
                exercise_name: exercises.find((e) => e.id === exerciseId)?.name ?? "",
                gym_day_name: "",
                max_weight: maxWeight,
                date,
                reps: topReps,
                sets: currentSets.length,
              },
            };
          }
          return prev;
        });
      }

      // Si todos los ejercicios están completados, felicitar y marcar la sesión en realizada
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

  function updateSet(exerciseId: number, setIdx: number, patch: Partial<DraftSet>) {
    setDrafts((prev) => {
      const currentSets = prev[exerciseId] ?? [];
      const updated = currentSets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
      return { ...prev, [exerciseId]: updated };
    });
  }

  function toggleSetCompleted(exerciseId: number, setIdx: number) {
    const currentSets = drafts[exerciseId] ?? [];
    const updated = currentSets.map((s, i) =>
      i === setIdx ? { ...s, completed: !s.completed } : s
    );
    setDrafts((prev) => ({ ...prev, [exerciseId]: updated }));
    const allDone = updated.length > 0 && updated.every((s) => s.completed);
    saveSets(exerciseId, updated, allDone ? true : undefined);
  }

  function addSet(exerciseId: number) {
    const currentSets = drafts[exerciseId] ?? [];
    const lastSet = currentSets[currentSets.length - 1];
    const newSet: DraftSet = {
      id: `set-${exerciseId}-${Date.now()}`,
      weight: lastSet?.weight ?? "",
      reps: lastSet?.reps ?? "",
      completed: false,
    };
    const updated = [...currentSets, newSet];
    setDrafts((prev) => ({ ...prev, [exerciseId]: updated }));
    saveSets(exerciseId, updated);
  }

  function removeSet(exerciseId: number, setIdx: number) {
    const currentSets = drafts[exerciseId] ?? [];
    if (currentSets.length <= 1) return;
    const updated = currentSets.filter((_, i) => i !== setIdx);
    setDrafts((prev) => ({ ...prev, [exerciseId]: updated }));
    saveSets(exerciseId, updated);
  }

  function toggleExerciseComplete(exerciseId: number) {
    const currentLog = logsToday.find((l) => l.exercise_id === exerciseId);
    const isCurrentlyCompleted = currentLog?.completed === 1;
    const nextCompleted = !isCurrentlyCompleted;
    const currentSets = drafts[exerciseId] ?? [];
    const updatedSets = currentSets.map((s) => ({ ...s, completed: nextCompleted }));
    setDrafts((prev) => ({ ...prev, [exerciseId]: updatedSets }));
    saveSets(exerciseId, updatedSets, nextCompleted);
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
                  <Button
                    variant="ghost"
                    onClick={copyActiveGymRoutine}
                    style={{ padding: "0.25rem 0.65rem", fontSize: "var(--text-xs)" }}
                    title="Copiar rutina para Notas"
                  >
                    {copiedRoutine ? (
                      <Check size={13} style={{ color: "var(--color-success)" }} />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedRoutine ? "Copiada a Notas" : "Copiar rutina"}
                  </Button>
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
              <div className="grid gap-4">
                {dayExercises.map((ex, index) => {
                  const log = logsToday.find((l) => l.exercise_id === ex.id);
                  const isCompleted = log?.completed === 1;
                  const historyForEx = dayHistory.find((h) => h.exerciseId === ex.id)?.logs ?? [];
                  const prevWithWeight = historyForEx.filter((l) => l.weight_kg !== null && l.date < date);
                  const fallbackWithWeight = historyForEx.filter((l) => l.weight_kg !== null && l.date !== date);
                  const lastLog = prevWithWeight.length > 0
                    ? prevWithWeight[prevWithWeight.length - 1]
                    : fallbackWithWeight.length > 0
                    ? fallbackWithWeight[fallbackWithWeight.length - 1]
                    : null;

                  return (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      index={index}
                      sets={drafts[ex.id] ?? []}
                      isCompleted={isCompleted}
                      pr={prsMap[ex.id]}
                      previousLog={lastLog}
                      onUpdateSet={updateSet}
                      onToggleSetCompleted={toggleSetCompleted}
                      onAddSet={addSet}
                      onRemoveSet={removeSet}
                      onSaveSets={saveSets}
                      onToggleComplete={toggleExerciseComplete}
                      saving={savingId === ex.id}
                    />
                  );
                })}
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
                    <ExerciseProgressCard key={h.exerciseId} name={h.name} logs={h.logs} pr={prsMap[h.exerciseId]} />
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

function ExerciseCard({
  exercise,
  index,
  sets,
  isCompleted,
  pr,
  previousLog,
  onUpdateSet,
  onToggleSetCompleted,
  onAddSet,
  onRemoveSet,
  onSaveSets,
  onToggleComplete,
  saving,
}: {
  exercise: GymExercise;
  index: number;
  sets: DraftSet[];
  isCompleted: boolean;
  pr?: GymPR;
  previousLog?: GymLog | null;
  onUpdateSet: (exerciseId: number, setIdx: number, patch: Partial<DraftSet>) => void;
  onToggleSetCompleted: (exerciseId: number, setIdx: number) => void;
  onAddSet: (exerciseId: number) => void;
  onRemoveSet: (exerciseId: number, setIdx: number) => void;
  onSaveSets: (exerciseId: number) => void;
  onToggleComplete: (exerciseId: number) => void;
  saving: boolean;
}) {
  const parsed = parseExerciseName(exercise.name);

  // Parsear series de la sesión previa si existen
  let prevSeriesItems: { set_number: number; weight_kg: number | null; reps: number | null }[] = [];
  if (previousLog?.series_data) {
    try {
      const p = JSON.parse(previousLog.series_data);
      if (Array.isArray(p)) prevSeriesItems = p;
    } catch {}
  }

  const numericWeights = sets
    .map((s) => (s.weight.trim() ? Number(s.weight) : null))
    .filter((w): w is number => w !== null && !isNaN(w) && w > 0);
  const currentMaxWeight = numericWeights.length > 0 ? Math.max(...numericWeights) : 0;
  const isBreakingRecord = pr ? currentMaxWeight > pr.max_weight : currentMaxWeight > 0;
  const completedSetsCount = sets.filter((s) => s.completed).length;

  return (
    <div
      className="surface"
      style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg, 12px)",
        border: isCompleted
          ? "1px solid rgba(34, 197, 94, 0.45)"
          : "1px solid var(--color-border)",
        background: isCompleted ? "rgba(34, 197, 94, 0.03)" : undefined,
        transition: "all 0.2s ease",
      }}
    >
      {/* Cabecera del Ejercicio */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-3)",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="flex items-center gap-2">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: isCompleted ? "var(--color-success)" : "rgba(255, 255, 255, 0.08)",
                color: isCompleted ? "#ffffff" : "var(--color-text-muted)",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </span>
            <span
              className="font-semibold text-base"
              style={{
                textDecoration: isCompleted ? "line-through" : "none",
                color: isCompleted ? "var(--color-text-muted)" : "var(--color-text)",
              }}
            >
              {parsed.title}
            </span>
          </div>
          {parsed.detail && (
            <div
              className="text-xs text-muted"
              style={{ marginTop: 2, paddingLeft: 34, color: "var(--color-text-faint)" }}
            >
              {parsed.detail}
            </div>
          )}
        </div>

        {/* Botón de Completar Ejercicio */}
        <Button
          variant={isCompleted ? "secondary" : "primary"}
          onClick={() => onToggleComplete(exercise.id)}
          loading={saving}
          style={{
            padding: "0.35rem 0.85rem",
            fontSize: "var(--text-xs)",
            borderColor: isCompleted ? "rgba(34, 197, 94, 0.4)" : undefined,
            color: isCompleted ? "var(--color-success)" : undefined,
            backgroundColor: isCompleted ? "rgba(34, 197, 94, 0.12)" : undefined,
            whiteSpace: "nowrap",
          }}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={15} />
              <span>Completado</span>
            </>
          ) : (
            <>
              <Check size={14} />
              <span>Completar</span>
            </>
          )}
        </Button>
      </div>

      {/* Insignias de referencia: Mayor Peso (PR), Última vez y Récord */}
      <div
        className="flex items-center gap-2"
        style={{ flexWrap: "wrap", marginBottom: "var(--space-3)", paddingLeft: 2 }}
      >
        {pr ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(234, 179, 8, 0.12)",
              color: "#facc15",
              border: "1px solid rgba(234, 179, 8, 0.28)",
            }}
            title={`Mayor peso histórico: ${pr.max_weight} kg el ${pr.date}${pr.reps ? ` (${pr.reps} reps)` : ""}`}
          >
            <Trophy size={12} style={{ color: "#facc15" }} />
            Mayor peso: <strong style={{ color: "#fef08a" }}>{pr.max_weight} kg</strong>
            {pr.reps ? <span style={{ opacity: 0.8, fontWeight: 500 }}>({pr.reps} reps)</span> : null}
          </span>
        ) : (
          <span style={{ fontSize: "0.72rem", color: "var(--color-text-faint)", display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Trophy size={11} style={{ opacity: 0.35 }} /> Sin récord previo
          </span>
        )}

        {previousLog && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.75rem",
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span>⏱️ Última vez: <strong>{previousLog.weight_kg} kg</strong></span>
            {previousLog.reps ? <span style={{ opacity: 0.8 }}>({previousLog.reps} reps)</span> : null}
          </span>
        )}

        {isBreakingRecord && currentMaxWeight > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <Flame size={11} /> ¡Nuevo récord! ({currentMaxWeight} kg)
          </span>
        )}
      </div>

      {/* Contenedor de Series (Diseño compacto y adaptable a móvil sin barra de scroll) */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.18)",
          borderRadius: 8,
          padding: "var(--space-2) var(--space-3)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        {/* Cabecera de columnas de series */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 1fr 38px 26px",
            alignItems: "center",
            gap: 8,
            paddingBottom: 6,
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          <div style={{ textAlign: "center" }}>Serie</div>
          <div style={{ textAlign: "center" }}>Peso (kg)</div>
          <div style={{ textAlign: "center" }}>Reps</div>
          <div style={{ textAlign: "center" }}>Hecho</div>
          <div />
        </div>

        {/* Lista de series */}
        <div className="grid gap-2" style={{ marginTop: 6 }}>
          {sets.map((s, idx) => {
            const prevSerieInfo = prevSeriesItems[idx] ?? (previousLog?.weight_kg ? { weight_kg: previousLog.weight_kg, reps: previousLog.reps } : null);
            const isSetBreakingPr = pr && Number(s.weight) > pr.max_weight;

            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 1fr 38px 26px",
                  alignItems: "center",
                  gap: 8,
                  opacity: s.completed ? 0.75 : 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {/* Número de serie */}
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color: s.completed ? "var(--color-success)" : "var(--color-text-muted)",
                  }}
                >
                  #{idx + 1}
                </div>

                {/* Input Peso con etiqueta anterior debajo */}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    className="field"
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.35rem",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      fontWeight: 600,
                      borderColor: isSetBreakingPr ? "rgba(239, 68, 68, 0.6)" : undefined,
                      backgroundColor: isSetBreakingPr ? "rgba(239, 68, 68, 0.05)" : undefined,
                    }}
                    value={s.weight}
                    onChange={(e) => onUpdateSet(exercise.id, idx, { weight: e.target.value })}
                    onBlur={() => onSaveSets(exercise.id)}
                    onKeyDown={(e) => e.key === "Enter" && onSaveSets(exercise.id)}
                    placeholder={prevSerieInfo?.weight_kg ? String(prevSerieInfo.weight_kg) : "kg"}
                  />
                  {prevSerieInfo?.weight_kg && (
                    <div style={{ fontSize: "0.65rem", color: "var(--color-text-faint)", marginTop: 2, textAlign: "center" }}>
                      Ant: {prevSerieInfo.weight_kg} kg
                    </div>
                  )}
                </div>

                {/* Input Reps con etiqueta anterior debajo */}
                <div>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="field"
                    style={{
                      width: "100%",
                      padding: "0.4rem 0.35rem",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                    value={s.reps}
                    onChange={(e) => onUpdateSet(exercise.id, idx, { reps: e.target.value })}
                    onBlur={() => onSaveSets(exercise.id)}
                    onKeyDown={(e) => e.key === "Enter" && onSaveSets(exercise.id)}
                    placeholder={prevSerieInfo?.reps ? String(prevSerieInfo.reps) : "reps"}
                  />
                  {prevSerieInfo?.reps && (
                    <div style={{ fontSize: "0.65rem", color: "var(--color-text-faint)", marginTop: 2, textAlign: "center" }}>
                      Ant: {prevSerieInfo.reps} reps
                    </div>
                  )}
                </div>

                {/* Botón de completar serie individual */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => onToggleSetCompleted(exercise.id, idx)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: s.completed ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid var(--color-border)",
                      background: s.completed ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: s.completed ? "var(--color-success)" : "var(--color-text-muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      padding: 0,
                    }}
                    title={s.completed ? "Serie completada (clic para desmarcar)" : "Marcar serie completada"}
                  >
                    <Check size={14} style={{ strokeWidth: s.completed ? 3 : 2 }} />
                  </button>
                </div>

                {/* Botón borrar serie (si hay más de 1 serie) */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {sets.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveSet(exercise.id, idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-text-faint)",
                        cursor: "pointer",
                        padding: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Eliminar esta serie"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie de la tarjeta de series */}
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => onAddSet(exercise.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--color-brand)",
              background: "rgba(47, 111, 235, 0.08)",
              border: "1px solid rgba(47, 111, 235, 0.25)",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            <span>Añadir serie #{sets.length + 1}</span>
          </button>

          <span className="text-xs text-muted font-medium">
            {completedSetsCount} de {sets.length} series completadas
          </span>
        </div>
      </div>
    </div>
  );
}

// Mini gráfico de la evolución de peso de un ejercicio — se muestra siempre
// para todos los ejercicios del día seleccionado (ver useEffect de
// dayHistory más arriba), sin tener que pedir el histórico uno a uno.
function ExerciseProgressCard({
  name,
  logs,
  pr,
}: {
  name: string;
  logs: GymLog[];
  pr?: GymPR;
}) {
  const withWeight = logs.filter((l) => l.weight_kg !== null);
  const last = withWeight[withWeight.length - 1];
  const chartData = withWeight.map((l) => ({ date: l.date.slice(5), peso: l.weight_kg }));

  return (
    <div className="surface" style={{ padding: "var(--space-3)" }}>
      <div className="flex items-start justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
        <div>
          <span className="font-medium text-sm">{name}</span>
          {pr && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "#eab308",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              <Trophy size={12} style={{ color: "#facc15" }} />
              Mayor peso: <strong style={{ color: "#fef08a" }}>{pr.max_weight} kg</strong>
              <span style={{ opacity: 0.75, fontWeight: 400 }}>({pr.date.slice(5)}{pr.reps ? ` · ${pr.reps} reps` : ""})</span>
            </div>
          )}
        </div>
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
