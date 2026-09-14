"use client";

import { useEffect, useState, useCallback } from "react";
import { Target, Trash2, Plus, Timer, Scale, Dumbbell, Ruler, MoreHorizontal, Flag, Save } from "lucide-react";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface Goal {
  id: number;
  title: string;
  metric_type: string;
  target_value: string | null;
  current_value: string | null;
  target_date: string | null;
  status: string;
  notes: string | null;
}

const METRICS = [
  { value: "tiempo_carrera", label: "Tiempo de carrera", Icon: Timer },
  { value: "peso", label: "Peso", Icon: Scale },
  { value: "fuerza", label: "Fuerza (carga/reps)", Icon: Dumbbell },
  { value: "distancia", label: "Distancia", Icon: Ruler },
  { value: "otro", label: "Otro", Icon: MoreHorizontal },
];
const METRIC_MAP = Object.fromEntries(METRICS.map((m) => [m.value, m]));

const STATUS_TONE: Record<string, "neutral" | "success" | "danger"> = {
  activo: "neutral",
  cumplido: "success",
  abandonado: "danger",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00Z").getTime() - new Date(todayISO() + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

const emptyForm = { title: "", metric_type: "tiempo_carrera", target_value: "", target_date: "", notes: "" };

export default function ObjetivosPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mainGoal, setMainGoal] = useState({ goal_race_date: "", target_pace_scenario: "" });
  const [savingMain, setSavingMain] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<{ id: number; title: string } | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) =>
        setMainGoal({
          goal_race_date: d.settings?.goal_race_date ?? "",
          target_pace_scenario: d.settings?.target_pace_scenario ?? "",
        })
      );
  }, [load]);

  async function saveMainGoal() {
    setSavingMain(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mainGoal),
      });
      toast.push("success", "Objetivo principal guardado");
    } finally {
      setSavingMain(false);
    }
  }

  const raceDays = daysUntil(mainGoal.goal_race_date || null);

  async function addGoal() {
    if (!form.title) return;
    setSaving(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
      toast.push("success", "Objetivo añadido");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function updateCurrentValue(id: number, current_value: string) {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value }),
    });
    load();
    toast.push("success", "Progreso actualizado");
  }

  async function removeGoal(id: number, title: string) {
    setGoalToDelete({ id, title });
  }

  async function executeRemoveGoal() {
    if (!goalToDelete) return;
    const { id } = goalToDelete;
    setGoalToDelete(null);
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
    toast.push("info", "Objetivo eliminado");
  }

  const active = goals.filter((g) => g.status === "activo");
  const inactive = goals.filter((g) => g.status !== "activo");

  return (
    <div>
      <PageHeader
        title="Objetivos"
        description="Metas concretas con fecha, para saber siempre cuánto falta."
        actions={
          !showForm && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              Nuevo objetivo
            </Button>
          )
        }
      />

      <div className="surface" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ marginBottom: "var(--space-1)" }}>
          <Flag size={16} />
          Objetivo principal: tu maratón
        </div>
        <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
          La fecha y el ritmo objetivo del maratón viven aquí — se usan en el Resumen, el Calendario y el motor de
          recomendaciones.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Fecha del maratón objetivo"
            type="date"
            value={mainGoal.goal_race_date}
            onChange={(e) => setMainGoal((m) => ({ ...m, goal_race_date: e.target.value }))}
          />
          <Input
            label="Ritmo objetivo"
            placeholder="p. ej. 5:20/km, sub 3:45"
            value={mainGoal.target_pace_scenario}
            onChange={(e) => setMainGoal((m) => ({ ...m, target_pace_scenario: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3" style={{ marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="primary" loading={savingMain} onClick={saveMainGoal}>
            <Save size={15} />
            Guardar objetivo principal
          </Button>
          {raceDays !== null && (
            <span className={`badge ${raceDays >= 0 ? "badge-info" : "badge-warning"}`}>
              {raceDays >= 0 ? `Faltan ${raceDays} días para el maratón` : `El maratón fue hace ${-raceDays} días`}
            </span>
          )}
        </div>
      </div>

      {showForm && (
        <div className="surface animate-in" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Título"
              required
              placeholder="p. ej. Maratón sub 3:45"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Select label="Tipo de métrica" value={form.metric_type} onChange={(e) => setForm((f) => ({ ...f, metric_type: e.target.value }))}>
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Input
              label="Valor objetivo"
              placeholder="p. ej. 3:45:00, 74kg, 50kg x5"
              value={form.target_value}
              onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
            />
            <Input
              label="Fecha objetivo"
              type="date"
              value={form.target_date}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
            />
            <div className="md:col-span-2">
              <Textarea label="Notas" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2" style={{ marginTop: "var(--space-3)" }}>
            <Button variant="primary" loading={saving} disabled={!form.title} onClick={addGoal}>
              Guardar objetivo
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <EmptyState
          icon={<Target size={22} />}
          title="Todavía no has fijado ningún objetivo"
          description="Añade metas como una marca de media maratón, un peso objetivo o una carga de fuerza — con fecha, para ver la cuenta atrás."
          action={
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              Crear el primero
            </Button>
          }
        />
      )}

      <div className="grid gap-3">
        {[...active, ...inactive].map((g) => {
          const meta = METRIC_MAP[g.metric_type] ?? METRICS[4];
          const Icon = meta.Icon;
          const d = daysUntil(g.target_date);
          return (
            <div key={g.id} className="surface" style={{ padding: "var(--space-4)", opacity: g.status === "abandonado" ? 0.6 : 1 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-raised)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{g.title}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {meta.label}
                      {g.target_value ? ` · objetivo: ${g.target_value}` : ""}
                      {g.target_date ? ` · ${g.target_date}` : ""}
                    </div>
                    {d !== null && g.status === "activo" && (
                      <span className={`badge ${d >= 0 ? "badge-info" : "badge-warning"}`} style={{ marginTop: 6 }}>
                        {d >= 0 ? `Faltan ${d} días` : `Hace ${-d} días`}
                      </span>
                    )}
                  </div>
                </div>
                <Select
                  aria-label="Estado del objetivo"
                  value={g.status}
                  onChange={(e) => updateStatus(g.id, e.target.value)}
                  style={{ width: 130, flexShrink: 0 }}
                >
                  <option value="activo">Activo</option>
                  <option value="cumplido">Cumplido</option>
                  <option value="abandonado">Abandonado</option>
                </Select>
              </div>

              <div className="flex items-center gap-2" style={{ marginTop: "var(--space-3)" }}>
                <div style={{ flex: 1, maxWidth: 220 }}>
                  <Input
                    aria-label="Valor actual"
                    placeholder="Valor actual"
                    defaultValue={g.current_value ?? ""}
                    onBlur={(e) => e.target.value !== (g.current_value ?? "") && updateCurrentValue(g.id, e.target.value)}
                  />
                </div>
                <button className="btn btn-ghost btn-icon" aria-label={`Borrar objetivo ${g.title}`} onClick={() => removeGoal(g.id, g.title)}>
                  <Trash2 size={15} />
                </button>
              </div>

              {g.notes && (
                <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
                  {g.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={goalToDelete !== null}
        title="Borrar objetivo"
        description={`¿Estás seguro de que deseas eliminar el objetivo "${goalToDelete?.title ?? ""}"? No se puede deshacer.`}
        confirmLabel="Borrar objetivo"
        tone="danger"
        onConfirm={executeRemoveGoal}
        onCancel={() => setGoalToDelete(null)}
      />
    </div>
  );
}
