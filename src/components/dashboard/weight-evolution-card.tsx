"use client";

import { useMemo, useState } from "react";
import {
  Scale,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Droplets,
  UtensilsCrossed,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Save,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { mutateWithOfflineSync } from "@/lib/offline-sync";

export interface WeightRecord {
  date: string;
  weight_kg: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  source?: string | null;
  notes?: string | null;
}

interface WeightEvolutionCardProps {
  measurements: WeightRecord[];
  onWeightAdded?: () => void;
}

export function WeightEvolutionCard({
  measurements,
  onWeightAdded,
}: WeightEvolutionCardProps) {
  const [newDate, setNewDate] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Filtrar y ordenar mediciones cronológicamente
  const validMeasurements = useMemo(() => {
    return [...measurements]
      .filter((m) => m.weight_kg != null && !isNaN(m.weight_kg) && m.weight_kg > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements]);

  const latest = validMeasurements.length > 0 ? validMeasurements[validMeasurements.length - 1] : null;
  const previous = validMeasurements.length > 1 ? validMeasurements[validMeasurements.length - 2] : null;

  // Variación respecto a la medición anterior
  const deltaWeight = latest && previous && latest.weight_kg && previous.weight_kg
    ? Number((latest.weight_kg - previous.weight_kg).toFixed(2))
    : null;

  // Detección de pérdida brusca de peso (> 1.2 kg o > 1.5 kg)
  const isDehydrationAlert = deltaWeight !== null && deltaWeight <= -1.2;

  // Datos para el gráfico
  const chartData = validMeasurements.slice(-21).map((m) => ({
    date: m.date.slice(5),
    fullDate: m.date,
    kg: m.weight_kg,
    source: m.source || (m.notes?.includes("xiaomi") ? "Xiaomi S200" : "Manual"),
  }));

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newWeight) return;
    setSaving(true);
    try {
      const weightNum = parseFloat(newWeight);
      const res = await mutateWithOfflineSync({
        url: "/api/peso/sync",
        method: "POST",
        body: {
          peso: weightNum,
          fecha: newDate,
        },
        description: `Registrar peso ${weightNum} kg (${newDate})`,
      });

      if (res.ok) {
        toast.push(
          "success",
          res.offline
            ? "Peso guardado en local · Se sincronizará al recuperar conexión"
            : "Peso guardado con éxito"
        );
        setNewWeight("");
        setNewDate("");
        if (onWeightAdded) onWeightAdded();
      } else {
        toast.push("error", res.error || "No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const isXiaomiSource = latest?.source === "xiaomi_scale_s200" || latest?.notes?.includes("xiaomi");

  return (
    <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
      {/* Cabecera */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <Scale size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Evolución de Peso & Hidratación
              </h3>
              {isXiaomiSource ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} />
                  Xiaomi S200 Sync
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                  Apple Salud / Manual
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Registro continuo en ayunas · Detección de pérdida de agua post-tirada
            </p>
          </div>
        </div>

        {latest && latest.weight_kg && (
          <div className="text-right">
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {latest.weight_kg.toFixed(1)}{" "}
              <span className="text-xs font-normal text-zinc-500">kg</span>
            </div>
            {deltaWeight !== null && (
              <div
                className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                  deltaWeight < 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {deltaWeight < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                <span>{deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg vs anterior</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerta del Nutricionista Deportivo si hay deshidratación aguda */}
      {isDehydrationAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 animate-in fade-in">
          <Droplets size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 block">
              Criterio Nutricionista Deportivo: Posible Deshidratación Aguda ({deltaWeight} kg)
            </span>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
              Se detecta una caída rápida de más de 1.2 kg respecto a tu última medición, típica tras tiradas largas en Zuera o días de alto sudor. 
              <strong> Pauta de reposición:</strong> Bebe 1.5 litros de agua con electrolitos/sales por cada kilo de peso perdido antes de la siguiente sesión. Evita alimentos secos y mantén nutrición limpia sin frutos secos.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico de Evolución */}
      {chartData.length > 0 ? (
        <div className="w-full h-48 sm:h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)" />
              <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
                unit="kg"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#ffffff",
                }}
                formatter={(val: any) => [`${val} kg`, "Peso"]}
              />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="#DC2626"
                strokeWidth={2.5}
                fill="url(#weightGrad)"
                dot={{ r: 3.5, fill: "#DC2626" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          No hay pesajes registrados todavía. Pésate en tu Xiaomi Smart Scale S200 o anótalo abajo.
        </div>
      )}

      {/* Formulario rápido manual */}
      <form onSubmit={handleAddManual} className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              placeholder="Ej. 71.5"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-20 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-center focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span className="text-xs text-zinc-500">kg</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="secondary"
          disabled={!newDate || !newWeight || saving}
          className="text-xs py-1.5 px-3 h-8 rounded-xl shrink-0"
        >
          <Save size={13} className="mr-1" />
          <span>Guardar peso</span>
        </Button>
      </form>
    </div>
  );
}
