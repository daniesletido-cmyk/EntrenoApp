"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Trash2,
  Timer,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { SmartRestTimer } from "@/components/gym/rest-timer";
import { useToast } from "@/components/ui/toast";

interface SetEntry {
  set: number;
  weight: string;
  reps: string;
  done: boolean;
}

interface ExerciseBlock {
  exerciseId: number;
  exerciseName: string;
  sets: SetEntry[];
  notes: string;
  expanded: boolean;
  saving?: boolean;
}

interface CatalogExercise {
  id: number;
  name: string;
  gym_day_id: number;
}

interface SessionExerciseEditorProps {
  date: string;
  discipline?: string;
  onSaved?: () => void;
}

export function SessionExerciseEditor({ date, discipline, onSaved }: SessionExerciseEditorProps) {
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExId, setSelectedExId] = useState<string>("");
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, exRes] = await Promise.all([
        fetch(`/api/gym/logs?date=${date}`, { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/gym/exercises", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const exercisesList: CatalogExercise[] = exRes.exercises ?? [];
      setCatalog(exercisesList);

      const nameById = new Map(exercisesList.map((e) => [e.id, e.name]));
      const rawLogs: any[] = logsRes.logs ?? [];

      const loadedBlocks: ExerciseBlock[] = rawLogs.map((log, index) => {
        let parsedSets: SetEntry[] = [];
        if (log.series_data) {
          try {
            const arr = JSON.parse(log.series_data);
            if (Array.isArray(arr)) {
              parsedSets = arr.map((item: any, idx: number) => ({
                set: idx + 1,
                weight: item.weight !== undefined && item.weight !== null ? String(item.weight) : String(log.weight_kg ?? ""),
                reps: item.reps !== undefined && item.reps !== null ? String(item.reps) : String(log.reps ?? "10"),
                done: Boolean(item.done ?? log.completed),
              }));
            }
          } catch {}
        }

        if (parsedSets.length === 0) {
          const count = Math.max(1, Number(log.sets) || 3);
          parsedSets = Array.from({ length: count }, (_, idx) => ({
            set: idx + 1,
            weight: log.weight_kg != null ? String(log.weight_kg) : "",
            reps: log.reps != null ? String(log.reps) : "10",
            done: Boolean(log.completed),
          }));
        }

        return {
          exerciseId: log.exercise_id,
          exerciseName: nameById.get(log.exercise_id) || `Ejercicio #${log.exercise_id}`,
          sets: parsedSets,
          notes: log.notes ?? "",
          expanded: index === 0,
        };
      });

      setBlocks(loadedBlocks);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function persistBlock(block: ExerciseBlock) {
    setBlocks((prev) =>
      prev.map((b) => (b.exerciseId === block.exerciseId ? { ...b, saving: true } : b))
    );
    try {
      const doneSets = block.sets.filter((s) => s.done);
      const validWeights = block.sets
        .map((s) => parseFloat(s.weight.replace(",", ".")))
        .filter((n) => !isNaN(n) && n >= 0);
      const validReps = block.sets
        .map((s) => parseInt(s.reps, 10))
        .filter((n) => !isNaN(n) && n > 0);

      const topWeight = validWeights.length > 0 ? Math.max(...validWeights) : null;
      const avgReps = validReps.length > 0 ? Math.round(validReps.reduce((a, b) => a + b, 0) / validReps.length) : null;

      await fetch("/api/gym/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: block.exerciseId,
          date,
          weight_kg: topWeight,
          sets: block.sets.length,
          reps: avgReps,
          notes: block.notes || null,
          completed: doneSets.length === block.sets.length && block.sets.length > 0,
          series_data: block.sets.map((s) => ({
            set: s.set,
            weight: s.weight ? parseFloat(s.weight.replace(",", ".")) : null,
            reps: s.reps ? parseInt(s.reps, 10) : null,
            done: s.done,
          })),
        }),
      });
      onSaved?.();
    } catch {
      toast.push("error", "No se pudo guardar la serie");
    } finally {
      setBlocks((prev) =>
        prev.map((b) => (b.exerciseId === block.exerciseId ? { ...b, saving: false } : b))
      );
    }
  }

  function addExerciseBlock() {
    const id = Number(selectedExId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (blocks.some((b) => b.exerciseId === id)) {
      setBlocks((prev) => prev.map((b) => (b.exerciseId === id ? { ...b, expanded: true } : b)));
      setSelectedExId("");
      return;
    }
    const found = catalog.find((c) => c.id === id);
    if (!found) return;
    const newBlock: ExerciseBlock = {
      exerciseId: found.id,
      exerciseName: found.name,
      sets: [
        { set: 1, weight: "", reps: "10", done: false },
        { set: 2, weight: "", reps: "10", done: false },
        { set: 3, weight: "", reps: "10", done: false },
      ],
      notes: "",
      expanded: true,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedExId("");
    persistBlock(newBlock);
  }

  function updateSetField(exId: number, idx: number, field: "weight" | "reps", value: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exId) return b;
        const nextSets = b.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
        return { ...b, sets: nextSets };
      })
    );
  }

  function toggleSetDone(exId: number, idx: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exId) return b;
        const nextSets = b.sets.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
        const updated = { ...b, sets: nextSets };
        if (nextSets[idx].done) {
          setTimerSeconds(90);
          setTimerOpen(true);
        }
        persistBlock(updated);
        return updated;
      })
    );
  }

  function addSetRow(exId: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exId) return b;
        const last = b.sets[b.sets.length - 1];
        const nextSets = [
          ...b.sets,
          {
            set: b.sets.length + 1,
            weight: last?.weight ?? "",
            reps: last?.reps ?? "10",
            done: false,
          },
        ];
        const updated = { ...b, sets: nextSets };
        persistBlock(updated);
        return updated;
      })
    );
  }

  function removeSetRow(exId: number, idx: number) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exId || b.sets.length <= 1) return b;
        const nextSets = b.sets
          .filter((_, i) => i !== idx)
          .map((s, i) => ({ ...s, set: i + 1 }));
        const updated = { ...b, sets: nextSets };
        persistBlock(updated);
        return updated;
      })
    );
  }

  const showHint = discipline === "gimnasio" || discipline === "crossfit";

  return (
    <div className="space-y-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
      {/* Cabecera de bloques de ejercicios + botón temporizador flotante */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
          >
            <Dumbbell size={16} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Series y Ejercicios ({blocks.length})
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {showHint
                ? "Marca cada serie completada para lanzar el descanso automáticamente."
                : "Registra ejercicios de fuerza o accesorios realizados hoy."}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setTimerSeconds(90);
            setTimerOpen((v) => !v);
          }}
          className="btn btn-secondary btn-sm harbiz-press"
          style={{
            minHeight: 44,
            borderColor: timerOpen ? "var(--color-warning)" : "var(--color-border)",
            color: timerOpen ? "var(--color-warning)" : "var(--color-text)",
          }}
        >
          <Timer size={16} />
          <span>{timerOpen ? "Ocultar Descanso" : "Descanso (1:30)"}</span>
        </button>
      </div>

      {/* Selector para añadir ejercicio al bloque modular */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="field flex-1"
          value={selectedExId}
          onChange={(e) => setSelectedExId(e.target.value)}
          aria-label="Seleccionar ejercicio para añadir"
        >
          <option value="">+ Añadir ejercicio del catálogo…</option>
          {catalog.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addExerciseBlock}
          disabled={!selectedExId}
          className="btn btn-primary harbiz-press"
        >
          <Plus size={16} />
          <span>Añadir bloque</span>
        </button>
      </div>

      {/* Lista de bloques modulares colapsables por ejercicio */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs py-3" style={{ color: "var(--color-text-muted)" }}>
          <Loader2 size={14} className="animate-spin" />
          <span>Cargando ejercicios de la sesión…</span>
        </div>
      ) : blocks.length === 0 ? (
        <div
          className="rounded-xl p-3.5 text-xs text-center"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px dashed var(--color-border-strong)",
            color: "var(--color-text-muted)",
          }}
        >
          No hay ejercicios registrados todavía en esta fecha. Selecciona uno arriba para anotar series y kg.
        </div>
      ) : (
        <div className="space-y-2.5">
          {blocks.map((block) => {
            const doneCount = block.sets.filter((s) => s.done).length;
            const allDone = doneCount === block.sets.length && block.sets.length > 0;

            return (
              <div
                key={block.exerciseId}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "var(--color-surface)",
                  border: allDone
                    ? "1px solid rgba(16, 185, 129, 0.45)"
                    : "1px solid var(--color-border)",
                }}
              >
                {/* Cabecera colapsable táctil (>= 48px) */}
                <button
                  type="button"
                  onClick={() =>
                    setBlocks((prev) =>
                      prev.map((b) =>
                        b.exerciseId === block.exerciseId ? { ...b, expanded: !b.expanded } : b
                      )
                    )
                  }
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer harbiz-press"
                  style={{ minHeight: 52 }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {allDone ? (
                      <CheckCircle2 size={18} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                    ) : (
                      <Dumbbell size={17} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                        {block.exerciseName}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {doneCount}/{block.sets.length} series completadas
                        {block.saving ? " · Guardando…" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`badge ${allDone ? "badge-success" : "badge-brand"}`}
                    >
                      {doneCount}/{block.sets.length}
                    </span>
                    {block.expanded ? (
                      <ChevronUp size={18} style={{ color: "var(--color-text-muted)" }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: "var(--color-text-muted)" }} />
                    )}
                  </div>
                </button>

                {/* Tabla de series optimizada para móvil con teclado numérico nativo */}
                {block.expanded && (
                  <div
                    className="px-3 pb-3.5 pt-2 space-y-2"
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      background: "var(--color-surface-raised)",
                    }}
                  >
                    <div
                      className="grid items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider"
                      style={{
                        gridTemplateColumns: "36px 1fr 1fr 48px 44px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span>Serie</span>
                      <span>Peso (kg)</span>
                      <span>Reps</span>
                      <span className="text-center">Hecho</span>
                      <span />
                    </div>

                    {block.sets.map((s, idx) => (
                      <div
                        key={s.set}
                        className="grid items-center gap-2 p-1.5 rounded-xl transition-colors"
                        style={{
                          gridTemplateColumns: "36px 1fr 1fr 48px 44px",
                          background: s.done ? "var(--color-success-bg)" : "var(--color-surface)",
                          border: s.done
                            ? "1px solid rgba(16, 185, 129, 0.35)"
                            : "1px solid var(--color-border)",
                        }}
                      >
                        <div
                          className="text-xs font-bold text-center tabular-nums"
                          style={{ color: s.done ? "var(--color-success)" : "var(--color-text-muted)" }}
                        >
                          #{s.set}
                        </div>

                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          aria-label={`Serie ${s.set} peso en kg`}
                          value={s.weight}
                          onChange={(e) => updateSetField(block.exerciseId, idx, "weight", e.target.value)}
                          onBlur={() => persistBlock(block)}
                          className="field text-center font-bold tabular-nums"
                          style={{ minHeight: 44, padding: "6px 8px" }}
                        />

                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="10"
                          aria-label={`Serie ${s.set} repeticiones`}
                          value={s.reps}
                          onChange={(e) => updateSetField(block.exerciseId, idx, "reps", e.target.value)}
                          onBlur={() => persistBlock(block)}
                          className="field text-center font-bold tabular-nums"
                          style={{ minHeight: 44, padding: "6px 8px" }}
                        />

                        <button
                          type="button"
                          onClick={() => toggleSetDone(block.exerciseId, idx)}
                          aria-label={s.done ? "Marcar serie pendiente" : "Completar serie"}
                          className="flex items-center justify-center rounded-xl harbiz-press cursor-pointer mx-auto"
                          style={{
                            width: 44,
                            height: 44,
                            background: s.done ? "var(--color-success)" : "var(--color-surface-raised)",
                            color: s.done ? "#ffffff" : "var(--color-text-muted)",
                            border: s.done ? "none" : "1px solid var(--color-border)",
                          }}
                        >
                          <Check size={18} strokeWidth={2.5} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeSetRow(block.exerciseId, idx)}
                          disabled={block.sets.length <= 1}
                          aria-label="Eliminar serie"
                          className="flex items-center justify-center rounded-xl harbiz-press cursor-pointer disabled:opacity-30"
                          style={{
                            width: 44,
                            height: 44,
                            color: "var(--color-text-faint)",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => addSetRow(block.exerciseId)}
                        className="btn btn-secondary btn-sm flex-1 harbiz-press"
                        style={{ minHeight: 44 }}
                      >
                        <Plus size={15} />
                        <span>Añadir serie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => persistBlock(block)}
                        className="btn btn-primary btn-sm harbiz-press"
                        style={{ minHeight: 44 }}
                      >
                        <Check size={15} />
                        <span>Guardar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Temporizador flotante de descanso anclado sin tapar el registro */}
      <SmartRestTimer
        initialSeconds={timerSeconds}
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
      />
    </div>
  );
}
