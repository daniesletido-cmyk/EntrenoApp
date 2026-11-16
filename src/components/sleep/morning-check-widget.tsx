"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Scale,
  Droplets,
  Zap,
  Sparkles,
  Check,
  ShieldCheck,
  UtensilsCrossed,
  Activity,
  HeartPulse,
} from "lucide-react";
import {
  HydrationLevel,
  EnergyLevel,
  MorningCheckData,
} from "@/lib/morning-check";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { mutateWithOfflineSync } from "@/lib/offline-sync";

interface MorningCheckWidgetProps {
  date: string;
  sleepHours?: number | null;
  sleepScore?: number | null;
  onSaved?: (check: MorningCheckData) => void;
}

export function MorningCheckWidget({
  date,
  sleepHours,
  sleepScore,
  onSaved,
}: MorningCheckWidgetProps) {
  const [weight, setWeight] = useState<string>("");
  const [hydration, setHydration] = useState<HydrationLevel>("normal");
  const [energy, setEnergy] = useState<EnergyLevel>("media");
  const [savedCheck, setSavedCheck] = useState<MorningCheckData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  // Cargar datos existentes para la fecha
  useEffect(() => {
    fetch(`/api/morning-check?date=${date}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.check) {
          setSavedCheck(res.check);
          if (res.check.weightKg) setWeight(String(res.check.weightKg));
          if (res.check.hydration) setHydration(res.check.hydration);
          if (res.check.energy) setEnergy(res.check.energy);
        }
      })
      .catch(() => {});
  }, [date]);

  const handleSave = async (customHydration?: HydrationLevel, customEnergy?: EnergyLevel) => {
    const hyd = customHydration || hydration;
    const nrg = customEnergy || energy;
    const weightVal = weight.trim() ? parseFloat(weight) : null;

    startTransition(async () => {
      try {
        const res = await mutateWithOfflineSync({
          url: "/api/morning-check",
          method: "POST",
          body: {
            date,
            weightKg: weightVal,
            hydration: hyd,
            energy: nrg,
          },
          description: `Check matinal ${date} (Hidratación: ${hyd}, Energía: ${nrg})`,
          onOptimisticLocal: () => {
            const optimisticCheck: MorningCheckData = {
              date,
              weightKg: weightVal,
              hydration: hyd,
              energy: nrg,
              checkedAt: new Date().toISOString(),
              advice: savedCheck?.advice || {
                nutritionistAdvice: "Datos guardados en modo local. Recomendaciones activas.",
                physioAdvice: "Activación habitual según plan.",
                hydrationStatusText: hyd === "sediento" ? "Déficit hídrico matinal" : "Hidratación adecuada",
                energyStatusText: nrg === "baja" ? "Fatiga percibida" : "Energía adecuada",
              },
            };
            setSavedCheck(optimisticCheck);
            if (onSaved) onSaved(optimisticCheck);
          },
        });

        if (res.ok) {
          if (res.data?.check) {
            setSavedCheck(res.data.check);
            if (onSaved) onSaved(res.data.check);
          }
          toast.push(
            "success",
            res.offline
              ? "Check matinal guardado en local · Se sincronizará al conectar"
              : "Check matinal registrado con éxito"
          );
        } else {
          toast.push("error", res.error || "Error al guardar check matinal");
        }
      } catch {
        toast.push("error", "Error al guardar check matinal");
      }
    });
  };

  const selectHydration = (h: HydrationLevel) => {
    setHydration(h);
    handleSave(h, energy);
  };

  const selectEnergy = (e: EnergyLevel) => {
    setEnergy(e);
    handleSave(hydration, e);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                Check Matinal en 1 Toque
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Opcional
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              Cruza hidratación y energía con Zepp & Suunto para afinar recomendaciones
            </p>
          </div>
        </div>

        {savedCheck && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Check size={11} />
            Registrado
          </span>
        )}
      </div>

      {/* Controles de 1 Toque */}
      <div className="space-y-2.5 pt-1">
        {/* Fila 1: Peso matinal opcional */}
        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <Scale size={14} className="text-red-500" />
              <span className="font-medium">Peso al despertar:</span>
              {savedCheck?.source && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {savedCheck.source === "xiaomi_scale_s200" ? "Xiaomi S200" : "Sincronizado"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="40"
                max="150"
                placeholder="Ej. 71.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onBlur={() => handleSave()}
                className="w-20 text-xs font-bold px-2 py-1 text-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="text-xs font-semibold text-zinc-500">kg</span>
            </div>
          </div>

          {(savedCheck?.bodyFatPct != null || savedCheck?.muscleMassKg != null || savedCheck?.waterPct != null) && (
            <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-700/50">
              {savedCheck.bodyFatPct != null && <span>Grasa: <strong className="text-zinc-800 dark:text-zinc-200">{savedCheck.bodyFatPct}%</strong></span>}
              {savedCheck.muscleMassKg != null && <span>Músculo: <strong className="text-zinc-800 dark:text-zinc-200">{savedCheck.muscleMassKg} kg</strong></span>}
              {savedCheck.waterPct != null && <span>Agua: <strong className="text-zinc-800 dark:text-zinc-200">{savedCheck.waterPct}%</strong></span>}
            </div>
          )}
        </div>

        {/* Fila 2: Nivel de Hidratación al despertar */}
        <div>
          <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
            <Droplets size={12} className="text-sky-500" />
            <span>Hidratación al despertar:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "sediento", label: "Sediento / Seco", icon: "💧" },
              { id: "normal", label: "Normal", icon: "🥤" },
              { id: "optimo", label: "Óptimo", icon: "🌊" },
            ].map((item) => {
              const isSelected = hydration === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectHydration(item.id as HydrationLevel)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                  style={{ minHeight: 38 }}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Nivel de Energía / Sensación matinal */}
        <div>
          <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
            <Zap size={12} className="text-amber-500" />
            <span>Energía / Frescura:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "baja", label: "Baja / Pesadez", icon: "🔋" },
              { id: "media", label: "Media / Neutra", icon: "⚡" },
              { id: "alta", label: "Alta / Vital", icon: "🔥" },
            ].map((item) => {
              const isSelected = energy === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectEnergy(item.id as EnergyLevel)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                  style={{ minHeight: 38 }}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recomendación afinada en vivo por el Nutricionista & Fisioterapeuta */}
      {savedCheck?.advice && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-0.5">
              <UtensilsCrossed size={12} />
              <span>Pauta Nutricional Afinada:</span>
            </div>
            {savedCheck.advice.nutritionistAdvice}
          </div>

          <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <div className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1 mb-0.5">
              <ShieldCheck size={12} />
              <span>Ajuste Fisioterapéutico:</span>
            </div>
            {savedCheck.advice.physioAdvice}
          </div>
        </div>
      )}
    </div>
  );
}
