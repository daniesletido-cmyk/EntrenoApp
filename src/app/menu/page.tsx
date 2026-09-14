"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { UtensilsCrossed, FileUp, X, Plus, Trash2 } from "lucide-react";
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
const PHASES = [1, 2, 3, 4];

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

  return (
    <div>
      <PageHeader
        title="Menú"
        description="Objetivos de macros por fase del plan."
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
        <div className="grid gap-3">
          {DAY_NAMES.map((dayName, idx) => {
            const dayItems = items.filter((it) => it.day_of_week === idx + 1);
            return (
              <div key={dayName} className="surface" style={{ padding: "var(--space-4)" }}>
                <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-2)" }}>
                  {dayName}
                </div>
                <div className="grid gap-2">
                  {dayItems.map((it) => (
                    <div key={it.id} className="surface-raised text-sm" style={{ padding: "var(--space-2) var(--space-3)" }}>
                      <span className="font-medium">{it.meal}: </span>
                      {it.foods_text}
                      {it.kcal ? <span className="text-muted"> ({it.kcal} kcal)</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
