"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Footprints,
  Plus,
  Star,
  Trash2,
  Edit2,
  AlertTriangle,
  Check,
  X,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface ShoeItem {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  initial_km: number;
  total_km: number;
  max_km: number;
  wear_percentage: number;
  is_active: number;
  is_primary: number;
  notes: string | null;
}

export function ShoesManagerCard() {
  const [shoes, setShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShoe, setEditingShoe] = useState<ShoeItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [initialKm, setInitialKm] = useState("0");
  const [maxKm, setMaxKm] = useState("700");
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    shoeId: number | null;
    shoeName: string;
  }>({ open: false, shoeId: null, shoeName: "" });

  const loadShoes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shoes");
      const data = await res.json();
      if (data.success && Array.isArray(data.shoes)) {
        setShoes(data.shoes);
      }
    } catch (err) {
      console.error("Error al cargar zapatillas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShoes();
  }, []);

  const openCreateModal = () => {
    setEditingShoe(null);
    setName("");
    setBrand("");
    setModel("");
    setInitialKm("0");
    setMaxKm("700");
    setIsPrimary(shoes.length === 0);
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (shoe: ShoeItem) => {
    setEditingShoe(shoe);
    setName(shoe.name);
    setBrand(shoe.brand || "");
    setModel(shoe.model || "");
    setInitialKm(String(shoe.initial_km));
    setMaxKm(String(shoe.max_km));
    setIsPrimary(shoe.is_primary === 1);
    setNotes(shoe.notes || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.push("error", "El nombre de la zapatilla es obligatorio");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          initial_km: parseFloat(initialKm) || 0,
          max_km: parseFloat(maxKm) || 700,
          is_primary: isPrimary,
          notes: notes.trim() || null,
        };

        let res;
        if (editingShoe) {
          res = await fetch(`/api/shoes/${editingShoe.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/shoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          toast.push("error", data.error || "Error al guardar zapatillas");
          return;
        }

        toast.push(
          "success",
          editingShoe ? "Zapatilla actualizada" : "Zapatilla registrada correctamente"
        );
        setModalOpen(false);
        await loadShoes();
      } catch (err) {
        console.error("Error al guardar:", err);
        toast.push("error", "Error de red al guardar zapatillas");
      }
    });
  };

  const handleSetPrimary = async (shoeId: number) => {
    try {
      const res = await fetch(`/api/shoes/${shoeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_primary" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.push("error", data.error || "No se pudo cambiar la zapatilla principal");
        return;
      }
      toast.push("success", "Zapatilla principal actualizada");
      await loadShoes();
    } catch {
      toast.push("error", "Error al actualizar la zapatilla principal");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.shoeId) return;
    try {
      const res = await fetch(`/api/shoes/${confirmDelete.shoeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.push("error", data.error || "Error al eliminar zapatilla");
        return;
      }
      toast.push("success", "Zapatilla eliminada");
      setConfirmDelete({ open: false, shoeId: null, shoeName: "" });
      await loadShoes();
    } catch {
      toast.push("error", "Error al eliminar zapatilla");
    }
  };

  return (
    <div className="surface p-3.5 sm:p-5 min-w-0 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 shrink-0">
            <Footprints size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Equipamiento & Zapatillas
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                {shoes.length} {shoes.length === 1 ? "par" : "pares"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Control de vida útil y asignación automática por sesión de Suunto
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={openCreateModal}
          className="text-xs py-2 px-3 h-9 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Añadir par</span>
        </Button>
      </div>

      {/* Description / Medical note */}
      <div className="mb-4 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-start gap-2">
        <Gauge size={14} className="text-red-500 shrink-0 mt-0.5" />
        <span>
          <strong>Criterio de Fisioterapia:</strong> Retirar o rotar zapatillas al alcanzar los <strong>700 km</strong> previene sobrecargas en la cintilla iliotibial y periostitis por pérdida de reactividad en la mediasuela.
        </span>
      </div>

      {/* Shoes List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400">
          Cargando equipamiento...
        </div>
      ) : shoes.length === 0 ? (
        <div className="py-6 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4">
          <Footprints size={28} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            No tienes zapatillas registradas
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 mb-3">
            Registra tu par actual para vincular los kilómetros de tus entrenamientos.
          </p>
          <Button variant="secondary" onClick={openCreateModal} className="text-xs">
            <Plus size={13} className="mr-1" /> Registrar primer par
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 min-w-0">
          {shoes.map((shoe) => {
            const isAlert = shoe.wear_percentage >= 90;
            const isExceeded = shoe.total_km >= shoe.max_km;
            const progressClamped = Math.min(shoe.wear_percentage, 100);

            return (
              <div
                key={shoe.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  shoe.is_primary === 1
                    ? "border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                {/* Upper line: Name, Brand, Badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {shoe.name}
                      </span>
                      {shoe.is_primary === 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                          <Star size={10} className="fill-white" />
                          Principal
                        </span>
                      )}
                      {isAlert && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isExceeded
                              ? "bg-red-600 text-white border-red-700"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          <AlertTriangle size={10} />
                          {isExceeded ? "Vida útil superada" : "Cambio recomendado"}
                        </span>
                      )}
                    </div>
                    {(shoe.brand || shoe.model) && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {[shoe.brand, shoe.model].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {shoe.is_primary === 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(shoe.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Marcar como zapatilla principal"
                        aria-label="Marcar como principal"
                        style={{ minHeight: 34, minWidth: 34 }}
                      >
                        <Star size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(shoe)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Editar zapatilla"
                      aria-label="Editar"
                      style={{ minHeight: 34, minWidth: 34 }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          shoeId: shoe.id,
                          shoeName: shoe.name,
                        })
                      }
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Eliminar zapatilla"
                      aria-label="Eliminar"
                      style={{ minHeight: 34, minWidth: 34 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Kilometers & Percentage stats */}
                <div className="flex items-baseline justify-between text-xs mb-1.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {shoe.total_km.toFixed(1)}{" "}
                    <span className="font-normal text-zinc-500">
                      / {shoe.max_km} km
                    </span>
                  </span>
                  <span
                    className={`font-bold ${
                      isAlert
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {shoe.wear_percentage.toFixed(0)}% desgastadas
                  </span>
                </div>

                {/* Progress Bar (Red / Gray) */}
                <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAlert
                        ? "bg-red-600 shadow-sm shadow-red-500/50"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${progressClamped}%` }}
                  />
                </div>

                {/* Bottom hint / remaining km */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                  <span>
                    {isExceeded
                      ? `Exceso: ${(shoe.total_km - shoe.max_km).toFixed(1)} km`
                      : `Restan: ${(shoe.max_km - shoe.total_km).toFixed(1)} km`}
                  </span>
                  {shoe.initial_km > 0 && (
                    <span className="text-[10px] text-zinc-400">
                      (km iniciales: {shoe.initial_km} km)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Añadir / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Footprints size={18} className="text-red-600" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {editingShoe ? "Editar Zapatillas" : "Registrar Nuevas Zapatillas"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nombre o Identificador *
                </label>
                <Input
                  placeholder="ej. Nike Pegasus 40 (Entrenamiento)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Marca
                  </label>
                  <Input
                    placeholder="ej. Nike"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Modelo
                  </label>
                  <Input
                    placeholder="ej. Pegasus 40"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Km Iniciales
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={initialKm}
                    onChange={(e) => setInitialKm(e.target.value)}
                  />
                  <span className="text-[10px] text-zinc-400">Si ya las usabas</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Vida Útil Máxima (km)
                  </label>
                  <Input
                    type="number"
                    step="10"
                    min="100"
                    placeholder="700"
                    value={maxKm}
                    onChange={(e) => setMaxKm(e.target.value)}
                  />
                  <span className="text-[10px] text-zinc-400">Por defecto: 700 km</span>
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-zinc-300 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Establecer como par principal para nuevas carreras
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isPending}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white"
                >
                  <Check size={14} className="mr-1" />
                  {editingShoe ? "Guardar cambios" : "Crear zapatilla"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="¿Eliminar zapatilla?"
        description={`¿Estás seguro de que deseas eliminar "${confirmDelete.shoeName}"? Las sesiones pasadas mantendrán su historial pero ya no sumarán a este calzado.`}
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, shoeId: null, shoeName: "" })}
      />
    </div>
  );
}
