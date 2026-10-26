"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Trophy,
  Plus,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Trash2,
  X,
  History,
  Dumbbell,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowUpRight,
  Activity,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";

interface ExerciseRecord {
  id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  date: string;
  notes: string | null;
  rpe: number | null;
}

interface ExerciseItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  is_custom: boolean;
  total_records: number;
  pr: {
    max_weight: number;
    reps: number;
    date: string;
    notes: string | null;
  } | null;
  latest: {
    weight_kg: number;
    reps: number;
    date: string;
    notes: string | null;
  } | null;
  history: ExerciseRecord[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Halterofilia": { bg: "rgba(6, 182, 212, 0.12)", text: "#06b6d4", border: "rgba(6, 182, 212, 0.3)" },
  "Fuerza & Powerlifting": { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  "Gimnásticos": { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  "Mancuernas": { bg: "rgba(168, 85, 247, 0.12)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" },
  "Kettlebells & Funcional": { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  "Ergómetros & Benchmarks": { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  "Accesorios": { bg: "rgba(148, 163, 184, 0.12)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
};

function formatDate(iso: string) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export default function MarcasPage() {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [onlyWithRecords, setOnlyWithRecords] = useState(false);

  // Modales
  const [logModalExercise, setLogModalExercise] = useState<ExerciseItem | null>(null);
  const [graphModalExercise, setGraphModalExercise] = useState<ExerciseItem | null>(null);
  const [historyModalExercise, setHistoryModalExercise] = useState<ExerciseItem | null>(null);
  const [newExerciseModal, setNewExerciseModal] = useState(false);

  // Formulario nuevo registro
  const [formWeight, setFormWeight] = useState("");
  const [formReps, setFormReps] = useState("1");
  const [formDate, setFormDate] = useState(todayISO());
  const [formRpe, setFormRpe] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  // Formulario nuevo ejercicio personalizado
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Fuerza & Powerlifting");
  const [customUnit, setCustomUnit] = useState("kg");
  const [savingCustom, setSavingCustom] = useState(false);

  const { push: pushToast } = useToast();
  const showToast = (message: string, type: "success" | "error" = "success") => {
    pushToast(type, message);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prs");
      if (!res.ok) throw new Error("Error cargando marcas");
      const data = await res.json();
      setExercises(data.exercises || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      showToast(err.message || "Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrado
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (selectedCategory !== "Todos" && ex.category !== selectedCategory) {
        return false;
      }
      if (onlyWithRecords && ex.total_records === 0) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        return ex.name.toLowerCase().includes(query) || ex.category.toLowerCase().includes(query);
      }
      return true;
    });
  }, [exercises, selectedCategory, onlyWithRecords, search]);

  // Totales
  const stats = useMemo(() => {
    const totalWithRecords = exercises.filter((e) => e.total_records > 0).length;
    let totalLogs = 0;
    for (const e of exercises) totalLogs += e.total_records;
    return {
      totalExercises: exercises.length,
      totalWithRecords,
      totalLogs,
    };
  }, [exercises]);

  // Abrir modal de nuevo registro
  const openNewLog = (exercise: ExerciseItem) => {
    setLogModalExercise(exercise);
    setFormWeight(exercise.latest ? String(exercise.latest.weight_kg) : "");
    setFormReps("1");
    setFormDate(todayISO());
    setFormRpe("");
    setFormNotes("");
  };

  // Guardar nuevo registro
  const handleSaveLog = async () => {
    if (!logModalExercise) return;
    if (!formWeight || isNaN(Number(formWeight))) {
      showToast("Introduce un peso o valor numérico válido", "error");
      return;
    }

    try {
      setSavingLog(true);
      const res = await fetch("/api/prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_name: logModalExercise.name,
          category: logModalExercise.category,
          weight_kg: Number(formWeight),
          reps: Number(formReps) || 1,
          date: formDate,
          rpe: formRpe ? Number(formRpe) : null,
          notes: formNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al guardar marca");
      }

      showToast(`¡Marca registrada para ${logModalExercise.name}!`, "success");
      setLogModalExercise(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setSavingLog(false);
    }
  };

  // Eliminar un registro
  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      const res = await fetch(`/api/prs/${recordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      showToast("Registro eliminado", "success");
      await loadData();
      // Si el modal de historial o gráfica está abierto para este ejercicio, actualizarlo
      if (historyModalExercise) {
        const updated = exercises.find((e) => e.name === historyModalExercise.name);
        if (updated) setHistoryModalExercise(updated);
      }
      if (graphModalExercise) {
        const updated = exercises.find((e) => e.name === graphModalExercise.name);
        if (updated) setGraphModalExercise(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Error al eliminar", "error");
    }
  };

  // Crear ejercicio personalizado
  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) {
      showToast("Introduce el nombre del ejercicio", "error");
      return;
    }

    try {
      setSavingCustom(true);
      const res = await fetch("/api/prs/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName.trim(),
          category: customCategory,
          unit: customUnit,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear ejercicio");
      }

      showToast(`Ejercicio "${customName}" añadido al catálogo`, "success");
      setCustomName("");
      setNewExerciseModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Error al guardar ejercicio", "error");
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Encabezado */}
      <PageHeader
        title="Pesos & Marcas Personales (PRs)"
        description="Registro de marcas máximas, progresión y evolución gráfica en CrossFit y Gimnasio"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNewExerciseModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 transition-colors"
            >
              <Plus size={15} className="text-emerald-400" />
              <span>Añadir Ejercicio</span>
            </button>
            {stats.totalWithRecords > 0 && (
              <button
                onClick={() => {
                  const first = exercises.find((e) => e.total_records > 0);
                  if (first) setGraphModalExercise(first);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all"
              >
                <TrendingUp size={15} />
                <span>Ver Gráficas</span>
              </button>
            )}
          </div>
        }
      />

      {/* Ribbon de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="surface p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Con Marcas</div>
            <div className="text-2xl font-black font-mono tabular-nums text-white">
              {stats.totalWithRecords}{" "}
              <span className="text-xs font-normal text-slate-500">/ {stats.totalExercises}</span>
            </div>
          </div>
        </div>

        <div className="surface p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Registros</div>
            <div className="text-2xl font-black font-mono tabular-nums text-white">
              {stats.totalLogs} <span className="text-xs font-normal text-slate-500">marcas</span>
            </div>
          </div>
        </div>

        <div className="surface p-3.5 rounded-2xl col-span-2 sm:col-span-1 flex items-center gap-3 border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Objetivo</div>
            <div className="text-sm font-bold text-slate-200">
              Superar marcas y PRs
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="surface p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ejercicio (ej. Snatch, Sentadilla, Press Banca, Dominadas...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setOnlyWithRecords((v) => !v)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              onlyWithRecords
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                : "bg-white/[0.04] text-slate-400 border-white/10 hover:text-white"
            }`}
          >
            <Trophy size={14} className={onlyWithRecords ? "text-amber-400" : "text-slate-400"} />
            <span>Solo con marcas registradas</span>
          </button>
        </div>

        {/* Chips de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] border border-white/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Ejercicios */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface p-4 rounded-2xl border border-white/10 animate-pulse space-y-3">
              <div className="h-4 bg-white/10 rounded w-24" />
              <div className="h-6 bg-white/15 rounded w-3/4" />
              <div className="h-14 bg-white/5 rounded-xl" />
              <div className="h-8 bg-white/10 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="surface p-8 rounded-2xl border border-white/10 text-center space-y-3">
          <Dumbbell size={36} className="mx-auto text-slate-500" />
          <div className="text-base font-bold text-slate-200">No se encontraron ejercicios</div>
          <div className="text-xs text-slate-400 max-w-sm mx-auto">
            {search
              ? `No hay ningún ejercicio que coincida con "${search}". Puedes añadirlo manualmente.`
              : "No hay ejercicios en esta categoría."}
          </div>
          <button
            onClick={() => setNewExerciseModal(true)}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 mt-2"
          >
            <Plus size={14} />
            <span>Crear este ejercicio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredExercises.map((exercise) => {
            const hasPr = exercise.pr !== null;
            const categoryStyle = CATEGORY_COLORS[exercise.category] || CATEGORY_COLORS["Fuerza & Powerlifting"];

            return (
              <div
                key={exercise.name}
                className="surface rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all duration-150 group"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
                      style={{
                        background: categoryStyle.bg,
                        color: categoryStyle.text,
                        border: `1px solid ${categoryStyle.border}`,
                      }}
                    >
                      {exercise.category}
                    </span>
                    {hasPr && (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <Trophy size={13} className="text-amber-400" />
                        <span>PR</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    {exercise.name}
                  </h3>

                  {/* Visualización del RÉCORD (Resaltando el Mayor) */}
                  {hasPr ? (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-slate-900/40 to-teal-500/5 border border-emerald-500/25 space-y-1 relative overflow-hidden">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Marca Máxima (PR)
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {formatDate(exercise.pr!.date)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black font-mono tabular-nums text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                          {exercise.pr!.max_weight}
                        </span>
                        <span className="text-sm font-bold text-emerald-500">
                          {exercise.unit}
                        </span>
                        {exercise.pr!.reps > 1 && (
                          <span className="text-xs text-slate-400 font-medium ml-1">
                            ({exercise.pr!.reps} reps)
                          </span>
                        )}
                      </div>

                      {exercise.latest && exercise.latest.weight_kg !== exercise.pr!.max_weight && (
                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                          <span>Último:</span>
                          <span className="font-mono tabular-nums text-slate-300 font-semibold">
                            {exercise.latest.weight_kg} {exercise.unit}{" "}
                            <span className="text-slate-500">({formatDate(exercise.latest.date)})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center py-4">
                      <div className="text-xs text-slate-400 font-medium">Sin marcas registradas</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Toca abajo para registrar tu peso</div>
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="p-2.5 bg-slate-950/40 border-t border-white/10 flex items-center gap-1.5">
                  <button
                    onClick={() => openNewLog(exercise)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Registrar</span>
                  </button>

                  <button
                    onClick={() => setGraphModalExercise(exercise)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                      hasPr
                        ? "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10"
                        : "bg-white/[0.02] text-slate-500 border border-transparent cursor-not-allowed opacity-60"
                    }`}
                    disabled={!hasPr}
                    title={hasPr ? "Ver gráfica de progresión" : "Registra al menos una marca para ver la gráfica"}
                  >
                    <TrendingUp size={14} className={hasPr ? "text-cyan-400" : ""} />
                    <span>Gráfica</span>
                  </button>

                  {hasPr && (
                    <button
                      onClick={() => setHistoryModalExercise(exercise)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent transition-colors"
                      title="Ver todos los registros históricos"
                    >
                      <History size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          MODAL: GRÁFICA INTERACTIVA DE EVOLUCIÓN
          ============================================================ */}
      {graphModalExercise && (
        <Modal
          onClose={() => setGraphModalExercise(null)}
          title={`Evolución: ${graphModalExercise.name}`}
        >
          <div className="space-y-4">
            {/* Selector para cambiar de ejercicio dentro del modal */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Ejercicio:</span>
              <select
                value={graphModalExercise.name}
                onChange={(e) => {
                  const target = exercises.find((ex) => ex.name === e.target.value);
                  if (target) setGraphModalExercise(target);
                }}
                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-emerald-500"
              >
                {exercises
                  .filter((e) => e.total_records > 0)
                  .map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name} (PR: {e.pr?.max_weight} {e.unit})
                    </option>
                  ))}
              </select>
            </div>

            {/* Estadísticas de la gráfica */}
            {graphModalExercise.pr && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-400">Récord (PR)</div>
                  <div className="text-lg font-black font-mono tabular-nums text-white">
                    {graphModalExercise.pr.max_weight} {graphModalExercise.unit}
                  </div>
                  <div className="text-[10px] text-slate-400">{formatDate(graphModalExercise.pr.date)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Última marca</div>
                  <div className="text-lg font-black font-mono tabular-nums text-white">
                    {graphModalExercise.latest?.weight_kg} {graphModalExercise.unit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatDate(graphModalExercise.latest?.date || "")}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Progreso</div>
                  {graphModalExercise.history.length > 1 ? (
                    (() => {
                      const first = graphModalExercise.history[0].weight_kg;
                      const max = graphModalExercise.pr.max_weight;
                      const diff = max - first;
                      return (
                        <>
                          <div className={`text-lg font-black font-mono tabular-nums ${diff >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                            {diff >= 0 ? `+${diff}` : diff} {graphModalExercise.unit}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {diff >= 0 ? `+${((diff / first) * 100).toFixed(1)}%` : ""}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-sm font-bold text-slate-400 mt-1">1er registro</div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-cyan-400">Sesiones</div>
                  <div className="text-lg font-black font-mono tabular-nums text-white">
                    {graphModalExercise.total_records}
                  </div>
                  <div className="text-[10px] text-slate-400">registros</div>
                </div>
              </div>
            )}

            {/* Gráfica Recharts */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <div className="h-64 w-full">
                {graphModalExercise.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={graphModalExercise.history.map((h) => ({
                        date: formatDate(h.date),
                        weight: h.weight_kg,
                        reps: h.reps,
                        notes: h.notes,
                      }))}
                      margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        domain={["dataMin - 5", "dataMax + 5"]}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/15 shadow-xl text-xs space-y-1">
                                <div className="text-slate-400">{data.date}</div>
                                <div className="text-base font-black font-mono text-emerald-400">
                                  {data.weight} {graphModalExercise.unit}
                                </div>
                                {data.reps > 1 && (
                                  <div className="text-slate-300">Reps: {data.reps}</div>
                                )}
                                {data.notes && (
                                  <div className="text-slate-400 italic mt-1 text-[11px]">
                                    "{data.notes}"
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: "#10b981", r: 5 }}
                        activeDot={{ r: 8, stroke: "#34d399", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Sin datos registrados
                  </div>
                )}
              </div>
            </div>

            {/* Botón rápido para registrar en este ejercicio */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setGraphModalExercise(null);
                  openNewLog(graphModalExercise);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Registrar nueva marca en {graphModalExercise.name}</span>
              </button>
              <button
                onClick={() => setGraphModalExercise(null)}
                className="btn btn-secondary btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: REGISTRAR NUEVO PESO / MARCA
          ============================================================ */}
      {logModalExercise && (
        <Modal
          onClose={() => setLogModalExercise(null)}
          title={`Registrar Marca: ${logModalExercise.name}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Categoría</div>
                <div className="text-xs font-bold text-white">{logModalExercise.category}</div>
              </div>
              {logModalExercise.pr && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-amber-400">Récord actual</div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {logModalExercise.pr.max_weight} {logModalExercise.unit}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Peso / Marca ({logModalExercise.unit}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  placeholder="Ej. 85.5"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-lg font-mono font-bold bg-slate-900 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Repeticiones
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formReps}
                  onChange={(e) => setFormReps(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-lg font-mono font-bold bg-slate-900 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Accesos rápidos a reps */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Reps rápidas:</span>
              {["1 (1RM)", "3", "5", "8", "10"].map((r) => {
                const num = r.split(" ")[0];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormReps(num)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      formReps === num
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                        : "bg-white/[0.04] text-slate-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">RPE (1-10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  placeholder="Ej. 8.5"
                  value={formRpe}
                  onChange={(e) => setFormRpe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Notas (opcional)</label>
              <textarea
                placeholder="Ej. Técnica fluida, con cinturón, buena velocidad en la salida..."
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLogModalExercise(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveLog}
                disabled={savingLog || !formWeight}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>{savingLog ? "Guardando..." : "Guardar Registro"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: HISTORIAL COMPLETO DE UN EJERCICIO
          ============================================================ */}
      {historyModalExercise && (
        <Modal
          onClose={() => setHistoryModalExercise(null)}
          title={`Historial: ${historyModalExercise.name}`}
        >
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Todos los registros anotados para este ejercicio ({historyModalExercise.history.length}):
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {[...historyModalExercise.history]
                .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
                .map((record) => {
                  const isPr =
                    historyModalExercise.pr &&
                    record.weight_kg === historyModalExercise.pr.max_weight;

                  return (
                    <div
                      key={record.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isPr
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black font-mono tabular-nums text-white">
                            {record.weight_kg} {historyModalExercise.unit}
                          </span>
                          {record.reps > 1 && (
                            <span className="text-xs text-slate-400 font-semibold">
                              ({record.reps} reps)
                            </span>
                          )}
                          {isPr && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                              🏆 PR Máximo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{formatDate(record.date)}</span>
                          {record.rpe && <span>· RPE {record.rpe}</span>}
                        </div>
                        {record.notes && (
                          <div className="text-xs text-slate-300 italic pt-0.5">
                            "{record.notes}"
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar este registro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  const ex = historyModalExercise;
                  setHistoryModalExercise(null);
                  openNewLog(ex);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Nuevo Registro</span>
              </button>
              <button
                onClick={() => setHistoryModalExercise(null)}
                className="btn btn-secondary btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL: AÑADIR NUEVO EJERCICIO PERSONALIZADO
          ============================================================ */}
      {newExerciseModal && (
        <Modal
          onClose={() => setNewExerciseModal(false)}
          title="Añadir Nuevo Ejercicio al Catálogo"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre del ejercicio *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ej. Overhead Squat en pausa, Zercher Squat, Sandbag..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Categoría
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Halterofilia">Halterofilia</option>
                  <option value="Fuerza & Powerlifting">Fuerza & Powerlifting</option>
                  <option value="Gimnásticos">Gimnásticos</option>
                  <option value="Mancuernas">Mancuernas</option>
                  <option value="Kettlebells & Funcional">Kettlebells & Funcional</option>
                  <option value="Ergómetros & Benchmarks">Ergómetros & Benchmarks</option>
                  <option value="Accesorios">Accesorios</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="kg">kg (Peso)</option>
                  <option value="reps">reps (Repeticiones)</option>
                  <option value="tiempo">tiempo (Segundos/Minutos)</option>
                  <option value="cals">cals (Calorías)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setNewExerciseModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCustomExercise}
                disabled={savingCustom || !customName.trim()}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>{savingCustom ? "Añadiendo..." : "Añadir al Catálogo"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
