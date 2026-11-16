"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Flag,
  Timer,
  Zap,
  Flame,
  Droplets,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Sliders,
  UtensilsCrossed,
  Info,
} from "lucide-react";
import {
  RaceDistancePreset,
  PacingStrategy,
  RACE_PRESETS,
  calculateRaceStrategy,
  formatTimeSeconds,
  formatPaceFromSec,
  RaceStrategyResult,
} from "@/lib/race-strategy";
import { generateRaceStrategyCard } from "@/lib/race-strategy-card-generator";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface RaceStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreset?: RaceDistancePreset;
}

const STORAGE_KEY = "entrenoapp_race_strategy_state";

export function RaceStrategyModal({
  isOpen,
  onClose,
  initialPreset = "42k",
}: RaceStrategyModalProps) {
  const toast = useToast();
  const [selectedPreset, setSelectedPreset] = useState<RaceDistancePreset>(initialPreset);
  const [customDistanceKm, setCustomDistanceKm] = useState<string>("15");
  const [strategy, setStrategy] = useState<PacingStrategy>("negative_split");

  // Inputs de tiempo
  const [hours, setHours] = useState<number>(3);
  const [minutes, setMinutes] = useState<number>(30);
  const [seconds, setSeconds] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<"splits" | "nutrition" | "advice">("splits");
  const [copied, setCopied] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  // Cargar estado guardado al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.preset) setSelectedPreset(parsed.preset);
        if (parsed.customDistance) setCustomDistanceKm(String(parsed.customDistance));
        if (parsed.strategy) setStrategy(parsed.strategy);
        if (parsed.hours !== undefined) setHours(parsed.hours);
        if (parsed.minutes !== undefined) setMinutes(parsed.minutes);
        if (parsed.seconds !== undefined) setSeconds(parsed.seconds);
      } else {
        // Inicializar según el preset
        const p = RACE_PRESETS[initialPreset] || RACE_PRESETS["42k"];
        const sec = p.defaultTimeSeconds;
        setHours(Math.floor(sec / 3600));
        setMinutes(Math.floor((sec % 3600) / 60));
        setSeconds(sec % 60);
      }
    } catch {
      // Ignorar fallos de parsing de storage
    }
  }, [initialPreset]);

  // Al cambiar de preset, ajustar el tiempo por defecto si no es custom
  const handleSelectPreset = (preset: RaceDistancePreset) => {
    setSelectedPreset(preset);
    const p = RACE_PRESETS[preset];
    if (preset !== "custom") {
      const sec = p.defaultTimeSeconds;
      setHours(Math.floor(sec / 3600));
      setMinutes(Math.floor((sec % 3600) / 60));
      setSeconds(sec % 60);
    }
  };

  // Distancia actual efectiva
  const effectiveDistanceKm = useMemo(() => {
    if (selectedPreset === "custom") {
      const val = parseFloat(customDistanceKm);
      return isNaN(val) || val <= 0 ? 10 : val;
    }
    return RACE_PRESETS[selectedPreset].distanceKm;
  }, [selectedPreset, customDistanceKm]);

  // Tiempo total objetivo en segundos
  const totalTargetSeconds = useMemo(() => {
    return (hours * 3600) + (minutes * 60) + seconds;
  }, [hours, minutes, seconds]);

  // Ritmo medio objetivo calculado en tiempo real
  const avgPaceSec = useMemo(() => {
    if (effectiveDistanceKm <= 0) return 300;
    return totalTargetSeconds / effectiveDistanceKm;
  }, [totalTargetSeconds, effectiveDistanceKm]);

  // Cálculo de la estrategia completa
  const racePlan: RaceStrategyResult = useMemo(() => {
    return calculateRaceStrategy(effectiveDistanceKm, totalTargetSeconds, strategy);
  }, [effectiveDistanceKm, totalTargetSeconds, strategy]);

  // Guardar en local storage
  const handleSaveToStorage = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          preset: selectedPreset,
          customDistance: customDistanceKm,
          strategy,
          hours,
          minutes,
          seconds,
        })
      );
      toast.push("success", "Estrategia guardada en tu dispositivo");
    } catch {
      toast.push("error", "No se pudo guardar la estrategia");
    }
  };

  // Copiar tabla en formato texto legible
  const handleCopyText = async () => {
    const textLines = [
      `🏁 ESTRATEGIA DE COMPETICIÓN: ${selectedPreset.toUpperCase()} (${effectiveDistanceKm} km)`,
      `⏱ Tiempo Objetivo: ${racePlan.targetTimeFormatted} · Ritmo Medio: ${racePlan.avgPaceFormatted}`,
      `⚡ Estrategia de Ritmo: ${racePlan.strategyLabel}`,
      `💧 Hidratación: ~${racePlan.totalWaterMl} ml · Carbohidratos: ${racePlan.carbsPerHour}g CHO/h`,
      `🧂 Cápsulas de sales: ${racePlan.totalElectrolyteCaps}`,
      "",
      "--- PARCIALES CADA 5 KM Y AVITUALLAMIENTOS ---",
      ...racePlan.segments.map((seg) => {
        const nutBadge = seg.nutrition.badge === "gel"
          ? `[GEL 30g CHO]`
          : seg.nutrition.badge === "cafeina"
          ? `[GEL CON CAFEÍNA + SALES]`
          : seg.nutrition.badge === "sales"
          ? `[CÁPSULA SALES]`
          : seg.nutrition.badge === "meta"
          ? `[RECUPERADOR LÍQUIDO]`
          : `[AGUA 150ml]`;
        return `${seg.label.padEnd(16)} | Ritmo: ${seg.paceFormatted} | Paso: ${seg.cumulativeTimeFormatted} | ${nutBadge}`;
      }),
      "",
      "🛡️ Seguridad médica: Pauta 100% limpia de frutos secos (alergia a nuez, almendra, avellana).",
      "Generado con EntrenoApp · Equipo Preparador Físico & Nutricionista",
    ];

    try {
      await navigator.clipboard.writeText(textLines.join("\n"));
      setCopied(true);
      toast.push("success", "Estrategia copiada al portapapeles");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.push("error", "No se pudo copiar al portapapeles");
    }
  };

  // Descargar tarjeta vertical PNG
  const handleDownloadCard = () => {
    setGeneratingCard(true);
    try {
      const canvas = generateRaceStrategyCard(racePlan);
      const dataUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Estrategia_${selectedPreset.toUpperCase()}_${racePlan.targetTimeFormatted.replace(/:/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.push("success", "Tarjeta vertical descargada con éxito");
    } catch (err) {
      console.error("Error al exportar tarjeta:", err);
      toast.push("error", "Error al generar la imagen de la estrategia");
    } finally {
      setGeneratingCard(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Flag size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                <span>Estrategia de Competición</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  Élite
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Pacing 5K y avituallamiento · Criterio Preparador + Nutricionista
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-zinc-900 dark:text-zinc-100">
          {/* 1. Selector de Distancia */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
              1. Distancia de Competición
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(RACE_PRESETS) as RaceDistancePreset[]).map((key) => {
                const preset = RACE_PRESETS[key];
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? "bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                    style={{ minHeight: 48 }}
                  >
                    <span className="font-bold">{preset.name}</span>
                    <span className={`text-[10px] ${isSelected ? "text-red-100" : "text-zinc-400"}`}>
                      {key === "custom" ? "A medida" : `${preset.distanceKm} km`}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedPreset === "custom" && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-zinc-500">Distancia personalizada (km):</span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="100"
                  value={customDistanceKm}
                  onChange={(e) => setCustomDistanceKm(e.target.value)}
                  className="w-24 text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* 2. Tiempo Objetivo & Ritmo */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Timer size={14} className="text-red-600" />
                <span>2. Tiempo Objetivo (HH:MM:SS)</span>
              </label>
              <div className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
                Ritmo Medio: {formatPaceFromSec(avgPaceSec)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <span className="block text-[11px] text-zinc-500 mb-1">Horas</span>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center font-bold text-sm sm:text-base py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500 mb-1">Minutos</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full text-center font-bold text-sm sm:text-base py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <span className="block text-[11px] text-zinc-500 mb-1">Segundos</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full text-center font-bold text-sm sm:text-base py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Presets rápidos de tiempo según distancia */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-400 font-medium">Marcas habituales:</span>
              {(selectedPreset === "42k"
                ? [
                    { label: "Sub 3h30", h: 3, m: 29, s: 59 },
                    { label: "Sub 3h45", h: 3, m: 44, s: 59 },
                    { label: "Sub 4h00", h: 3, m: 59, s: 59 },
                  ]
                : selectedPreset === "21k"
                ? [
                    { label: "Sub 1h35", h: 1, m: 34, s: 59 },
                    { label: "Sub 1h40", h: 1, m: 39, s: 59 },
                    { label: "Sub 1h45", h: 1, m: 44, s: 59 },
                  ]
                : [
                    { label: "Sub 42'", h: 0, m: 41, s: 59 },
                    { label: "Sub 45'", h: 0, m: 44, s: 59 },
                    { label: "Sub 50'", h: 0, m: 49, s: 59 },
                  ]
              ).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setHours(preset.h);
                    setMinutes(preset.m);
                    setSeconds(preset.s);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Estrategia de Ritmo / Pacing */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>3. Estrategia de Ritmo (Pacing)</span>
              <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 font-semibold">
                Criterio Preparador Físico
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "negative_split",
                  title: "Split Negativo (-1.8%)",
                  badge: "Recomendado",
                  desc: "Primera mitad controlada (+4s/km) y segunda mitad rápida (-4s/km). Preserva glucógeno.",
                },
                {
                  id: "even",
                  title: "Ritmo Parejo (Even)",
                  badge: "Lineal",
                  desc: "Velocidad constante de salida a meta. Exige alta eficiencia aeróbica.",
                },
                {
                  id: "progressive",
                  title: "Progresivo Prudente",
                  badge: "Conservador",
                  desc: "Salida muy suave en los primeros 5 km y aceleración progresiva tras el ecuador.",
                },
              ].map((item) => {
                const isSelected = strategy === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStrategy(item.id as PacingStrategy)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-50/40 dark:bg-red-950/20 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      {item.badge === "Recomendado" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Resumen Superior de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Tiempo Total</div>
              <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {racePlan.targetTimeFormatted}
              </div>
              <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                {racePlan.avgPaceFormatted}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Carbohidratos</div>
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {racePlan.carbsPerHour}g <span className="text-xs font-normal">/ hora</span>
              </div>
              <div className="text-[10px] text-zinc-500">
                Total: {racePlan.totalCarbsGrams}g CHO
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Hidratación</div>
              <div className="text-base font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                ~{racePlan.totalWaterMl} <span className="text-xs font-normal">ml</span>
              </div>
              <div className="text-[10px] text-zinc-500">150ml cada 5 km</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Sales Minerales</div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {racePlan.totalElectrolyteCaps} <span className="text-xs font-normal">cápsulas</span>
              </div>
              <div className="text-[10px] text-zinc-500">Sodio + Magnesio</div>
            </div>
          </div>

          {/* Selector de Pestañas Interiores */}
          <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("splits")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "splits"
                  ? "border-red-600 text-red-600 dark:text-red-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <TrendingUp size={14} />
              <span>Parciales 5K & Avituallamientos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nutrition")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "nutrition"
                  ? "border-red-600 text-red-600 dark:text-red-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <UtensilsCrossed size={14} />
              <span>Pauta Nutricionista</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advice")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "advice"
                  ? "border-red-600 text-red-600 dark:text-red-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Criterio Técnico</span>
            </button>
          </div>

          {/* TAB 1: PARCIALES CADA 5 KM Y AVITUALLAMIENTOS */}
          {activeTab === "splits" && (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Tramo</th>
                      <th className="py-2.5 px-3">Ritmo</th>
                      <th className="py-2.5 px-3">Paso Acum.</th>
                      <th className="py-2.5 px-3">Avituallamiento Exacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {racePlan.segments.map((seg) => {
                      const nut = seg.nutrition;
                      return (
                        <tr
                          key={seg.index}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {seg.label}
                          </td>
                          <td className="py-3 px-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                            {seg.paceFormatted}
                          </td>
                          <td className="py-3 px-3 font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            {seg.cumulativeTimeFormatted}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {nut.badge === "gel" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <Zap size={10} /> {nut.carbsLabel}
                                  </span>
                                )}
                                {nut.badge === "cafeina" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                                    <Flame size={10} /> {nut.carbsLabel}
                                  </span>
                                )}
                                {nut.badge === "sales" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                    <ShieldCheck size={10} /> {nut.electrolytesLabel}
                                  </span>
                                )}
                                {nut.electrolytesLabel && nut.badge !== "sales" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                    + {nut.electrolytesLabel}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                  <Droplets size={10} className="text-sky-500" /> {nut.waterMl}ml agua
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {nut.advice}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAUTA NUTRICIONISTA DEPORTIVO */}
          {activeTab === "nutrition" && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 mb-1">
                  <UtensilsCrossed size={14} />
                  <span>Carga de Carbohidratos (48h Previas)</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Incrementa la ingesta a <strong>7-9 g de CHO / kg de peso corporal</strong>. Fuentes seguras: arroz blanco, pasta, patatas al horno o cocidas, copos de avena, plátanos maduros, compota de manzana y pan blanco con miel.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  <Droplets size={14} className="text-sky-500" />
                  <span>Desayuno Pre-Carrera (3 Horas Antes)</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Gachas de avena cocida con plátano y miel, o tostadas de pan blanco con mermelada y un chorrito de AOVE limpio. 400-500 ml de agua a sorbos espaciados hasta 60 min antes de la salida.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300 mb-1">
                  <ShieldCheck size={14} />
                  <span>Restricción Médica y Alergia (Vital)</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  <strong>PROHIBICIÓN TOTAL DE FRUTOS SECOS:</strong> Cero nueces, avellanas, almendras o cremas derivadas. Todos los geles deben ser 100% basados en maltodextrina o glucosa/fructosa pura sin trazas alergénicas.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CONSEJOS TÉCNICOS PREPARADOR FÍSICO */}
          {activeTab === "advice" && (
            <div className="space-y-3 text-xs">
              {racePlan.coachAdvice.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                >
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {tip}
                  </p>
                </div>
              ))}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  Psicología Deportiva: El Muro del Km 30
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  El split negativo garantiza que llegarás al km 30 sin deuda glucolítica severa. Cuando aparezca la fatiga perceptiva, fragmenta la carrera en bloques mentales de 5 km y enfócate en el próximo avituallamiento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Acciones */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveToStorage}
              className="text-xs py-2 px-3 h-9 rounded-xl"
            >
              Guardar Ajustes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyText}
              className="text-xs py-2 px-3 h-9 rounded-xl flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Copiado" : "Copiar texto"}</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleDownloadCard}
            loading={generatingCard}
            className="text-xs py-2 px-4 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Descargar Tarjeta (PNG)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
