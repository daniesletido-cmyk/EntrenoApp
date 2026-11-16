"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Flag,
  Timer,
  Zap,
  Flame,
  Droplets,
  Heart,
  ShieldCheck,
  Download,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  Coffee,
  Bookmark,
} from "lucide-react";
import {
  formatTimeSeconds,
  formatPaceFromSec,
  calculateRaceStrategy,
  RaceDistancePreset,
} from "@/lib/race-strategy";
import { generateRaceStrategyCard } from "@/lib/race-strategy-card-generator";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface RaceStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreset?: RaceDistancePreset;
}

const STORAGE_KEY = "entrenoapp_race_strategy_simple";

function normalizePreset(d?: string): "10k" | "21k" | "42k" {
  if (d === "10k") return "10k";
  if (d === "21k" || d === "media") return "21k";
  return "42k";
}

const defaultTimes: Record<"10k" | "21k" | "42k", { h: number; m: number; s: number; label: string }> = {
  "10k": { h: 0, m: 44, s: 0, label: "00:44:00" }, // ~4:24 min/km
  "21k": { h: 1, m: 38, s: 0, label: "01:38:00" }, // ~4:39 min/km
  "42k": { h: 3, m: 35, s: 0, label: "03:35:00" }, // ~5:06 min/km (Escenario Maratón Zuera de Dani)
};

export function RaceStrategyModal({
  isOpen,
  onClose,
  initialPreset = "42k",
}: RaceStrategyModalProps) {
  const toast = useToast();

  // 1. Selector de distancia (10K | 21K | 42K)
  const [distancePreset, setDistancePreset] = useState<"10k" | "21k" | "42k">(() =>
    normalizePreset(initialPreset)
  );

  // 2. Tiempo objetivo (editable en horas, minutos y segundos)
  const [hours, setHours] = useState<number>(3);
  const [minutes, setMinutes] = useState<number>(35);
  const [seconds, setSeconds] = useState<number>(0);

  const [downloadingCard, setDownloadingCard] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sincronizar initialPreset cuando cambia o se abre
  useEffect(() => {
    if (isOpen && initialPreset) {
      const norm = normalizePreset(initialPreset);
      setDistancePreset(norm);
      const def = defaultTimes[norm] || defaultTimes["42k"];
      setHours(def.h);
      setMinutes(def.m);
      setSeconds(def.s);
    }
  }, [isOpen, initialPreset]);

  // Cargar estado guardado al montar en cliente
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.distancePreset) {
          const norm = normalizePreset(parsed.distancePreset);
          setDistancePreset(norm);
        }
        if (typeof parsed.hours === "number" && !isNaN(parsed.hours)) setHours(parsed.hours);
        if (typeof parsed.minutes === "number" && !isNaN(parsed.minutes)) setMinutes(parsed.minutes);
        if (typeof parsed.seconds === "number" && !isNaN(parsed.seconds)) setSeconds(parsed.seconds);
      }
    } catch {}
  }, []);

  // Al cambiar la distancia, cargar su tiempo proyectado
  const handleSelectDistance = (d: "10k" | "21k" | "42k") => {
    const norm = normalizePreset(d);
    setDistancePreset(norm);
    const def = defaultTimes[norm] || defaultTimes["42k"];
    setHours(def.h);
    setMinutes(def.m);
    setSeconds(def.s);
  };

  // Distancia numérica exacta
  const distanceKm = useMemo(() => {
    if (distancePreset === "10k") return 10.0;
    if (distancePreset === "21k") return 21.0975;
    return 42.195;
  }, [distancePreset]);

  // Total segundos del objetivo
  const totalTargetSeconds = useMemo(() => {
    return Math.max(300, hours * 3600 + minutes * 60 + seconds);
  }, [hours, minutes, seconds]);

  // Ritmo medio objetivo en segundos por km
  const avgPaceSec = useMemo(() => {
    return totalTargetSeconds / distanceKm;
  }, [totalTargetSeconds, distanceKm]);

  // Ritmo medio formateado (ej. "5:06 min/km")
  const avgPaceFormatted = useMemo(() => {
    return formatPaceFromSec(avgPaceSec);
  }, [avgPaceSec]);

  // Tiempo formateado (ej. "03:35:00")
  const targetTimeFormatted = useMemo(() => {
    return formatTimeSeconds(totalTargetSeconds);
  }, [totalTargetSeconds]);

  // Pulso límite recomendado según distancia y fisiología de Dani
  const maxHeartRateLimit = useMemo(() => {
    if (distancePreset === "10k") return "174 lpm";
    if (distancePreset === "21k") return "168 lpm";
    return "164 lpm"; // Maratón: preservar sustrato glucogénico
  }, [distancePreset]);

  // Cálculo de los 2 bloques (Primera mitad y Segunda mitad)
  const blocks = useMemo(() => {
    const halfKm = (distanceKm / 2).toFixed(1);

    if (distancePreset === "42k") {
      const paceFirstHalf = formatPaceFromSec(avgPaceSec + 3);
      const paceSecondHalf = formatPaceFromSec(avgPaceSec - 3);
      return {
        firstHalf: {
          label: `Km 0 a ${halfKm}`,
          name: "Primera mitad · Control y Reserva",
          pace: `${paceFirstHalf} (+3s)`,
          notes: "Freno de mano puesto y pulso controlado (< 158 lpm). Guardar glucógeno es la clave absoluta.",
          tone: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40",
        },
        secondHalf: {
          label: `${halfKm} a 42.2 km`,
          name: "Segunda mitad · Progresión y Cierre",
          pace: `${paceSecondHalf} (-3s)`,
          notes: "Aceleración desde el km 32. Adelanta corredores con confianza; el muro no existe con buen avituallamiento.",
          tone: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
        },
      };
    }

    if (distancePreset === "21k") {
      const paceFirstHalf = formatPaceFromSec(avgPaceSec + 2);
      const paceSecondHalf = formatPaceFromSec(avgPaceSec - 2);
      return {
        firstHalf: {
          label: `Km 0 a 10.5`,
          name: "Primera mitad · Ritmo Crucero",
          pace: `${paceFirstHalf} (+2s)`,
          notes: "Ritmo respiratorio cómodo 2-2. Pulso estable por debajo del umbral anaeróbico.",
          tone: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40",
        },
        secondHalf: {
          label: `10.5 a 21.1 km`,
          name: "Segunda mitad · Progresión Umbral",
          pace: `${paceSecondHalf} (-2s)`,
          notes: "Saca el trabajo de series R3/R4 y vacíate en los últimos 3 km.",
          tone: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
        },
      };
    }

    // 10K
    const paceFirstHalf = formatPaceFromSec(avgPaceSec + 2);
    const paceSecondHalf = formatPaceFromSec(avgPaceSec - 2);
    return {
      firstHalf: {
        label: `Km 0 a 5.0`,
        name: "Primera mitad · Ritmo Firme",
        pace: `${paceFirstHalf} (+2s)`,
        notes: "Inicio rápido pero sin sprint desbocado. Ajusta cadencia a ~180 ppm.",
        tone: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40",
      },
      secondHalf: {
        label: `5.0 a 10.0 km`,
        name: "Segunda mitad · Cambio de Ritmo",
        pace: `${paceSecondHalf} (-2s)`,
        notes: "Exprime la reserva glucolítica desde el km 7 hasta meta.",
        tone: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
      },
    };
  }, [distancePreset, distanceKm, avgPaceSec]);

  // Cronograma de avituallamiento milimétrico limpio
  const nutritionTimeline = useMemo(() => {
    if (distancePreset === "42k") {
      return [
        { km: "Km 10", item: "Gel 1", detail: "Isotónico 30g CHO", icon: "⚡", tag: "Energía" },
        { km: "Km 20", item: "Gel 2 + Sales", detail: "30g CHO + Cápsula electrolitos", icon: "🧂", tag: "Sales" },
        { km: "Km 28", item: "Gel 3", detail: "Energía sostenida + Agua", icon: "⚡", tag: "Energía" },
        { km: "Km 35", item: "Gel 4 (Cafeína)", detail: "Pico de foco y adrenalina final", icon: "☕", tag: "Pico Final" },
      ];
    }
    if (distancePreset === "21k") {
      return [
        { km: "Km 7", item: "Gel 1", detail: "Isotónico 30g CHO + Agua", icon: "⚡", tag: "Energía" },
        { km: "Km 14", item: "Gel 2 + Sales", detail: "Con cafeína + Electrolitos", icon: "🚀", tag: "Pico Final" },
      ];
    }
    return [
      { km: "Pre-Salida", item: "Gel Isotónico", detail: "15 min antes de salir + 200 ml agua", icon: "⚡", tag: "Activación" },
      { km: "Km 5", item: "Agua fresca", detail: "Sorbos pequeños en avituallamiento", icon: "💧", tag: "Hidratación" },
    ];
  }, [distancePreset]);

  // Guardar en almacenamiento
  const handleSaveStrategy = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          distancePreset,
          hours,
          minutes,
          seconds,
          avgPace: avgPaceFormatted,
          targetTime: targetTimeFormatted,
        })
      );
      setSavedSuccess(true);
      toast.push("success", "Estrategia de carrera guardada con éxito");
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      toast.push("error", "No se pudo guardar localmente");
    }
  };

  // Descarga de imagen para el móvil
  const handleDownloadCard = async () => {
    setDownloadingCard(true);
    try {
      // Objeto compatible con el generador de tarjetas Canvas
      const stratObj = calculateRaceStrategy(
        distanceKm,
        totalTargetSeconds,
        "negative_split"
      );

      const canvas = generateRaceStrategyCard(stratObj);
      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.download = `estrategia-${distancePreset}-${targetTimeFormatted.replace(/:/g, "-")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.push("success", "Tarjeta de carrera generada y lista en tu carrete");
    } catch (err) {
      console.error("Error generando tarjeta:", err);
      toast.push("error", "No se pudo descargar la tarjeta");
    } finally {
      setDownloadingCard(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Cabecera limpia */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-red-600/30">
              <Flag size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Estrategia de Competición
              </h2>
              <p className="text-[11px] text-zinc-500">
                Pacing simplificado y avituallamiento milimétrico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido con scroll vertical limpio adaptado a 390px */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 min-w-0">
          {/* 1. SELECTOR ULTRA SIMPLE (2 DATOS: DISTANCIA Y TIEMPO) */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            {/* Selector de distancia segmentado */}
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
              {(["10k", "21k", "42k"] as const).map((d) => {
                const isSelected = distancePreset === d;
                const labels = {
                  "10k": "10K",
                  "21k": "21K (Media)",
                  "42k": "42K (Maratón)",
                };
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDistance(d)}
                    className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {labels[d]}
                  </button>
                );
              })}
            </div>

            {/* Input de tiempo objetivo */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Tiempo Objetivo:
              </span>

              <div className="flex items-center gap-1 font-mono text-sm font-bold bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-7 text-center bg-transparent focus:outline-none focus:text-red-600"
                />
                <span className="text-zinc-400">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes.toString().padStart(2, "0")}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-7 text-center bg-transparent focus:outline-none focus:text-red-600"
                />
                <span className="text-zinc-400">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds.toString().padStart(2, "0")}
                  onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-7 text-center bg-transparent focus:outline-none focus:text-red-600"
                />
              </div>
            </div>
          </div>

          {/* TARJETA 1 — RITMO Y ESTRATEGIA DE CARRERA */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
            {/* Ritmo y Pulso destacados */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Ritmo Medio Objetivo
                </span>
                <span className="text-2xl font-black text-red-600 tracking-tight font-mono">
                  {avgPaceFormatted}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Pulso Límite
                </span>
                <span className="text-base font-extrabold text-zinc-800 dark:text-zinc-200 font-mono">
                  {maxHeartRateLimit}
                </span>
              </div>
            </div>

            {/* Dos mitades claras: Control vs Progresión */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${blocks.firstHalf.tone}`}>
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 mb-0.5">
                  {blocks.firstHalf.label}
                </div>
                <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {blocks.firstHalf.pace}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-tight">
                  {blocks.firstHalf.notes}
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border ${blocks.secondHalf.tone}`}>
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-400 mb-0.5">
                  {blocks.secondHalf.label}
                </div>
                <div className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                  {blocks.secondHalf.pace}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-tight">
                  {blocks.secondHalf.notes}
                </p>
              </div>
            </div>

            {/* Veredicto de Preparador Físico + Psicólogo */}
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
              <Brain size={14} className="text-red-500 shrink-0 mt-0.5" />
              <span>
                <strong>Técnico & Mental:</strong> La carrera se decide en la segunda mitad. Si controlas el ego en los primeros kms y tomas los geles a tiempo, el muro no existe.
              </span>
            </div>
          </div>

          {/* TARJETA 2 — PAUTA SIMPLE DE AVITUALLAMIENTO (NUTRICIONISTA) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <Droplets size={14} className="text-sky-500" />
                <span>Pauta de Avituallamiento</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-400">
                Nutricionista Deportivo
              </span>
            </div>

            {/* Timeline visual limpio */}
            <div className="space-y-1.5 pt-1">
              {nutritionTimeline.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-1.5">
                        {item.km}:
                      </span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {item.item}
                      </span>
                      <span className="text-[11px] text-zinc-400 block sm:inline sm:ml-1">
                        ({item.detail})
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 shrink-0">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>

            {/* Nota de hidratación y regla médica */}
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug pt-1">
              💧 Bebe 150-200 ml de agua en cada puesto. <strong>Alergia estricta:</strong> cero frutos secos (nueces, avellanas, almendras).
            </p>
          </div>

          {/* TARJETA 3 — ACCIÓN RÁPIDA (DESCARGAR TARJETA MÓVIL 9:16 O GUARDAR) */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadCard}
              loading={downloadingCard}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download size={15} />
              <span>Descargar Tarjeta Móvil (Fondo 9:16)</span>
            </Button>

            <button
              type="button"
              onClick={handleSaveStrategy}
              className="w-full py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? <Check size={14} className="text-emerald-500" /> : <Bookmark size={14} />}
              <span>{savedSuccess ? "Guardado en EntrenoApp" : "Guardar como estrategia activa"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
