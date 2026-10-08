"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  UtensilsCrossed,
  FileUp,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  label: string;
}

interface MenuItem {
  id: number;
  day_of_week: number;
  meal: string;
  option_label: string | null;
  foods_text: string | null;
  kcal: number | null;
}

interface MenuPreviewRow {
  day_of_week: number;
  meal: string;
  foods_text: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const PHASES = [1, 2, 3, 4];

// Mapa de colores sutiles y distintivos según el tipo de comida
function getMealBadgeStyle(mealName: string) {
  const norm = mealName.toLowerCase();
  if (norm.includes("desayuno")) {
    return { bg: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
  }
  if (norm.includes("media") || norm.includes("almuerzo") || norm.includes("snack") || norm.includes("tentenpié")) {
    return { bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" };
  }
  if (norm.includes("comida")) {
    return { bg: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (norm.includes("merienda")) {
    return { bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" };
  }
  if (norm.includes("cena")) {
    return { bg: "rgba(236, 72, 153, 0.12)", color: "#f472b6", border: "rgba(236, 72, 153, 0.3)" };
  }
  return { bg: "var(--color-surface-raised)", color: "var(--color-text)", border: "var(--color-border)" };
}

export default function MenuPage() {
  const [phase, setPhase] = useState(1);
  const [macros, setMacros] = useState<Macros | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [imported, setImported] = useState(false);
  const [preview, setPreview] = useState<MenuPreviewRow[] | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{ method: string; skipped: number } | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Día seleccionado (1 = Lunes ... 7 = Domingo) y modo de vista
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });
  const [viewMode, setViewMode] = useState<"horizontal" | "all">("horizontal");

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const load = useCallback(() => {
    fetch(`/api/menu?phase=${phase}`)
      .then((r) => r.json())
      .then((d) => {
        setMacros(d.macros);
        setItems(d.items ?? []);
        setImported(d.imported);
      });
  }, [phase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/menu/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudo leer el archivo");
        return;
      }
      setPreview(data.rows);
      setPreviewInfo({ method: data.method, skipped: data.skipped });
      if (data.rows.length === 0) toast.push("info", "No se ha reconocido ninguna comida en el archivo");
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  }

  function updateRow(i: number, patch: Partial<MenuPreviewRow>) {
    setPreview((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev));
  }

  function removeRow(i: number) {
    setPreview((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function commitImport() {
    if (!preview || preview.length === 0) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, items: preview, replaceExisting }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push("error", data.error ?? "No se pudieron importar las comidas");
        return;
      }
      toast.push("success", `${preview.length} comida(s) importadas`);
      setPreview(null);
      setPreviewInfo(null);
      load();
    } catch {
      toast.push("error", "Error de red al importar el menú");
    } finally {
      setCommitting(false);
    }
  }

  const goToPrevDay = () => setSelectedDay((prev) => (prev > 1 ? prev - 1 : 7));
  const goToNextDay = () => setSelectedDay((prev) => (prev < 7 ? prev + 1 : 1));

  // Comidas del día activo
  const activeDayMeals = items.filter((it) => it.day_of_week === selectedDay);
  const activeDayKcal = activeDayMeals.reduce((acc, it) => acc + (it.kcal || 0), 0);

  return (
    <div>
      <PageHeader
        title="Menú"
        description="Objetivos de macros y planificación nutricional por fase del plan."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg" onChange={handleImportFile} style={{ display: "none" }} />
            <Button variant="secondary" loading={importLoading} onClick={() => fileRef.current?.click()}>
              <FileUp size={15} />
              Importar menú
            </Button>
          </>
        }
      />

      {/* Selector de fase */}
      <div className="flex gap-1 surface-raised" style={{ padding: 4, display: "inline-flex", marginBottom: "var(--space-4)" }} role="tablist">
        {PHASES.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={phase === p}
            className="btn"
            style={{
              minHeight: 34,
              padding: "0.4rem 0.9rem",
              background: phase === p ? "var(--color-brand)" : "transparent",
              color: phase === p ? "var(--color-brand-contrast)" : "var(--color-text-muted)",
            }}
            onClick={() => setPhase(p)}
          >
            Fase {p}
          </button>
        ))}
      </div>

      {preview && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)", borderColor: "var(--color-brand)" }}>
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-3)" }}>
            <div>
              <div className="font-semibold text-sm">Comidas detectadas en el archivo (Fase {phase})</div>
              {previewInfo && (
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Método: {previewInfo.method}
                  {previewInfo.skipped > 0 ? ` · ${previewInfo.skipped} fila(s) descartadas` : ""} — revisa antes de importar.
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Descartar importación" onClick={() => setPreview(null)}>
              <X size={15} />
            </button>
          </div>

          {preview.length === 0 ? (
            <p className="text-sm text-muted">No se ha reconocido ninguna comida. Prueba con otro archivo.</p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm" style={{ marginBottom: "var(--space-3)" }}>
                <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
                Sustituir lo que ya haya en la Fase {phase} (si no, se añade a lo existente)
              </label>
              <div className="grid gap-2" style={{ marginBottom: "var(--space-3)" }}>
                {preview.map((row, i) => (
                  <div key={i} className="surface-raised flex flex-wrap items-end gap-2" style={{ padding: "var(--space-3)" }}>
                    <Select
                      label="Día"
                      value={row.day_of_week}
                      onChange={(e) => updateRow(i, { day_of_week: Number(e.target.value) })}
                    >
                      {DAY_NAMES.map((d, idx) => (
                        <option key={d} value={idx + 1}>
                          {d}
                        </option>
                      ))}
                    </Select>
                    <Input label="Comida" value={row.meal} onChange={(e) => updateRow(i, { meal: e.target.value })} />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <Input
                        label="Alimentos"
                        value={row.foods_text ?? ""}
                        onChange={(e) => updateRow(i, { foods_text: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Kcal"
                      type="number"
                      value={row.kcal ?? ""}
                      onChange={(e) => updateRow(i, { kcal: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                    <button className="btn btn-ghost btn-icon" aria-label="Quitar esta fila" onClick={() => removeRow(i)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="primary" loading={committing} onClick={commitImport}>
                <Plus size={15} />
                Importar {preview.length} comida(s)
              </Button>
            </>
          )}
        </div>
      )}

      {macros && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", marginBottom: "var(--space-5)" }}>
          <StatCard label="Kcal" value={String(macros.kcal)} sublabel={macros.label} />
          <StatCard label="Proteína" value={`${macros.protein_g} g`} />
          <StatCard label="Carbohidratos" value={`${macros.carbs_g} g`} />
          <StatCard label="Grasas" value={`${macros.fat_g} g`} />
        </div>
      )}

      {!imported ? (
        <EmptyState
          icon={<UtensilsCrossed size={22} />}
          title="Menú día a día pendiente de importar"
          description="Usa el botón «Importar menú» de arriba para traer tu menú real desde un Excel, PDF o foto — para no inventar comidas, hasta entonces esta vista solo muestra los objetivos de macros de la fase."
        />
      ) : (
        <div className="space-y-4">
          {/* Cabecera del selector de días y switch de vista */}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-muted tracking-wider uppercase">Días del menú</span>
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
          <div className="w-full">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {DAY_NAMES.map((dayName, idx) => {
                const dayNum = idx + 1;
                const isSelected = viewMode === "horizontal" && selectedDay === dayNum;
                const isToday = todayDow === dayNum;
                const dayMeals = items.filter((it) => it.day_of_week === dayNum);
                const dayLetter = DAY_SHORT[idx];

                return (
                  <button
                    key={dayName}
                    type="button"
                    onClick={() => {
                      setSelectedDay(dayNum);
                      if (viewMode === "all") setViewMode("horizontal");
                    }}
                    className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 select-none border text-center ${
                      isSelected
                        ? "bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.02]"
                        : isToday
                        ? "bg-brand/10 text-brand border-brand/40 hover:bg-brand/15"
                        : "bg-surface-raised/70 text-muted hover:text-foreground hover:bg-surface-raised border-border/60"
                    }`}
                    style={{ minHeight: "56px" }}
                    title={`${dayName} (${dayMeals.length} comidas)`}
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
                      D{dayNum}
                    </span>
                    <div className="flex items-center gap-0.5 mt-1 h-1.5">
                      {dayMeals.length > 0 ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-brand"
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

          {/* Modo Horizontal (Día a Día) */}
          {viewMode === "horizontal" && (
            <div className="space-y-3">
              {/* Barra de navegación de fecha */}
              <div className="flex items-center justify-between gap-2 bg-surface border border-border/70 rounded-xl px-3 py-2 shadow-xs">
                <button
                  type="button"
                  onClick={goToPrevDay}
                  className="btn btn-ghost btn-icon-sm"
                  aria-label="Día anterior"
                  title="Día anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center min-w-0 flex-1 px-1">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground capitalize">
                      {DAY_NAMES[selectedDay - 1]}
                    </span>
                    {selectedDay === todayDow && (
                      <span className="badge badge-brand text-[10px] px-1.5 py-0.5">
                        Hoy
                      </span>
                    )}
                    <span className="text-xs text-muted font-medium">
                      ({activeDayMeals.length} {activeDayMeals.length === 1 ? "comida" : "comidas"}
                      {activeDayKcal > 0 ? ` · ${activeDayKcal} kcal` : ""})
                    </span>
                  </div>
                  <div className="text-[11px] text-muted truncate mt-0.5">
                    Fase {phase} · Toca las flechas o los días de arriba para cambiar
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToNextDay}
                  className="btn btn-ghost btn-icon-sm"
                  aria-label="Día siguiente"
                  title="Día siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Contenido del día seleccionado */}
              {activeDayMeals.length === 0 ? (
                <div className="surface p-8 text-center rounded-2xl border border-dashed border-border/80">
                  <UtensilsCrossed size={32} className="mx-auto text-muted mb-2 opacity-50" />
                  <p className="font-medium text-sm text-foreground">No hay comidas asignadas para el {DAY_NAMES[selectedDay - 1]}</p>
                  <p className="text-xs text-muted mt-1">Usa «Importar menú» para rellenar las comidas de este día o cambia de fase.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeDayMeals.map((it) => {
                    const badge = getMealBadgeStyle(it.meal);
                    return (
                      <div
                        key={it.id}
                        className="surface rounded-2xl p-4 sm:p-5 border border-border/70 hover:border-brand/40 transition-all shadow-xs flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              borderColor: badge.border,
                            }}
                          >
                            <Sparkles size={12} />
                            {it.meal}
                          </span>
                          {it.kcal ? (
                            <span className="badge badge-neutral text-xs font-semibold inline-flex items-center gap-1">
                              <Flame size={12} className="text-amber-500" />
                              {it.kcal} kcal
                            </span>
                          ) : null}
                        </div>

                        {it.option_label && (
                          <div className="text-xs text-brand font-medium">
                            Opción: {it.option_label}
                          </div>
                        )}

                        <div className="text-sm sm:text-base leading-relaxed text-foreground font-normal whitespace-pre-line pl-0.5">
                          {it.foods_text || <span className="text-muted italic">Sin detalles especificados</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modo Vista Completa (Todos los 7 Días apilados) */}
          {viewMode === "all" && (
            <div className="grid gap-4">
              {DAY_NAMES.map((dayName, idx) => {
                const dayNum = idx + 1;
                const dayItems = items.filter((it) => it.day_of_week === dayNum);
                const dayKcal = dayItems.reduce((acc, it) => acc + (it.kcal || 0), 0);
                const isToday = todayDow === dayNum;

                return (
                  <div
                    key={dayName}
                    className={`surface rounded-2xl p-4 sm:p-5 border ${
                      isToday ? "border-brand/50 shadow-sm" : "border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base sm:text-lg text-foreground">
                          {dayName}
                        </span>
                        {isToday && (
                          <span className="badge badge-brand text-[10px] px-1.5 py-0.5">
                            Hoy
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted font-medium">
                        {dayItems.length} {dayItems.length === 1 ? "comida" : "comidas"}
                        {dayKcal > 0 ? ` · ${dayKcal} kcal` : ""}
                      </span>
                    </div>

                    {dayItems.length === 0 ? (
                      <p className="text-xs text-muted italic py-1">Sin comidas planificadas.</p>
                    ) : (
                      <div className="grid gap-2.5">
                        {dayItems.map((it) => {
                          const badge = getMealBadgeStyle(it.meal);
                          return (
                            <div
                              key={it.id}
                              className="surface-raised rounded-xl p-3 border border-border/40 text-sm flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span
                                  className="text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider"
                                  style={{
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    borderColor: badge.border,
                                  }}
                                >
                                  {it.meal}
                                </span>
                                {it.kcal ? (
                                  <span className="text-xs text-muted font-medium">
                                    {it.kcal} kcal
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-sm text-foreground whitespace-pre-line">
                                {it.foods_text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
