"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flag,
  Timer,
  Zap,
  Droplets,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Footprints,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { RaceStrategyModal } from "@/components/competition/race-strategy-modal";
import { PhysioLibraryCard } from "@/components/physio/physio-library-card";
import { CrossfitButtonWidget } from "@/components/crossfit/crossfit-button-widget";

export default function BibliotecaPage() {
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<"10k" | "21k" | "42k" | "custom">("42k");

  const openStrategyWith = (preset: "10k" | "21k" | "42k" | "custom") => {
    setSelectedPreset(preset);
    setStrategyModalOpen(true);
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-5">
      <PageHeader
        title="Biblioteca & Estrategia"
        description="Recursos tácticos, zonas fisiológicas de ritmo y cálculo de estrategia de competición."
      />

      {/* 1. MÓDULO PRINCIPAL: ESTRATEGIA DE COMPETICIÓN */}
      <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <Flag size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                  Estrategia de Competición (Pacing 5K & Avituallamiento)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  Activa
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Calcula parciales acumulados cada 5 km, ritmo en split negativo y pauta milimétrica de hidratación y carbohidratos.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => openStrategyWith("42k")}
            className="text-xs py-2 px-4 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles size={14} />
            <span>Configurar Estrategia</span>
          </Button>
        </div>

        {/* Tarjetas de Acceso Rápido por Distancia */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={() => openStrategyWith("42k")}
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-red-300 dark:hover:border-red-900/60 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Maratón
              </span>
              <span className="text-[11px] font-bold text-zinc-500">42.195 km</span>
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 transition-colors">
              Zuera / Valencia / Sevilla
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Pacing con split negativo, toma de 5 geles (60g CHO/h), sales en km 15 y 30.
            </p>
          </button>

          <button
            type="button"
            onClick={() => openStrategyWith("21k")}
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-red-300 dark:hover:border-red-900/60 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Media Maratón
              </span>
              <span className="text-[11px] font-bold text-zinc-500">21.097 km</span>
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 transition-colors">
              Competición de Ritmo Umbral
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              2 geles (km 10 y 15 con cafeína), sorbos de agua y sales preventivas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => openStrategyWith("10k")}
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-red-300 dark:hover:border-red-900/60 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                10K Rápido
              </span>
              <span className="text-[11px] font-bold text-zinc-500">10.0 km</span>
            </div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 transition-colors">
              Intensidad Máxima VAM / R4
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Ritmo parejo sostenido, hidratación en km 5 y foco en cadencia alta (180 ppm).
            </p>
          </button>
        </div>
      </div>

      {/* ANALIZAR SEMANA CROSSFIT (FOTO / VISIÓN IA) */}
      <CrossfitButtonWidget />

      {/* 2. SESIONES EXPRESS DE FISIOTERAPIA Y MOVILIDAD (10 MIN) */}
      <PhysioLibraryCard />

      {/* 3. ZONAS DE RITMO FISIOLÓGICAS (VAM DE DANI: 3:59 MIN/KM · 15.06 KM/H) */}
      <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-red-600" />
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
              Zonas de Ritmo Fisiológicas (VAM 3:59 min/km · 15.06 km/h)
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            Zuera Performance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>🟢 R0 · Regenerativo / Calentamiento</span>
              <span className="text-emerald-600 dark:text-emerald-400">&gt; 5:25 - 5:45 min/km</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Trote suave, FC &lt; 140 lpm. Utilizado en los primeros 1.0-1.5 km de calentamiento y vuelta a la calma.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>🟡 R1 · Base Aeróbica Continua</span>
              <span className="text-amber-600 dark:text-amber-400">5:25 - 4:59 min/km</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Rodaje fundamental, RPE 4-5. Desarrollo de densidad mitocondrial y quema de grasas.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>🟣 R5 · Tirada Larga Zuera</span>
              <span className="text-purple-600 dark:text-purple-400">5:25 - 5:10 min/km</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Volumen largo progresivo con los últimos 3-4 km a Ritmo Maratón (5:05 - 5:10 min/km).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>🟠 R2 · Tempo / Moderado Progresivo</span>
              <span className="text-orange-600 dark:text-orange-400">4:59 - 4:35 min/km</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Zona aeróbica media-alta. Enseña al organismo a aclarar lactato a velocidades crucero.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>🔴 R3 / R4 · Intervalos y Umbral</span>
              <span className="text-red-600 dark:text-red-400">4:18 - 4:20 min/km</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Series de umbral y potencia aeróbica con recuperación activa al trote suave (~6:00 min/km).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              <span>⚡ Cuestas & Rectas de Potencia</span>
              <span className="text-rose-600 dark:text-rose-400">RPE 8-9 (Explosivo)</span>
            </div>
            <p className="text-zinc-500 text-[11px]">
              Subida con aceleración neuromuscular y bajada caminando (cero impacto articular).
            </p>
          </div>
        </div>
      </div>

      {/* 3. REGLAS NUTRICIONALES Y MÉDICAS DEL ATLETA */}
      <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={18} className="text-amber-500" />
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
            Protocolo Nutricional & Alergias (Criterio Nutricionista Deportivo)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <div className="font-bold text-red-700 dark:text-red-300 mb-1">
              🛡️ Restricción Vital: Alergia a Frutos Secos
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Dani tiene alergia estricta a nueces, avellanas, almendras y trazas de frutos de cáscara. Toda pauta de entrenamiento y competición utiliza exclusivamente <strong>semillas de calabaza, chía, lino, sésamo/tahini puro, avena, fruta fresca y AOVE</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              💧 Hidratación y Ratio 1:0.8
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              En pruebas de más de 90 minutos se busca una ingesta de <strong>60 a 75 g CHO/h</strong> mediante combinación de maltodextrina y fructosa, asegurando vaciado gástrico rápido junto con 150ml de agua por cada toma.
            </p>
          </div>
        </div>
      </div>

      <RaceStrategyModal
        isOpen={strategyModalOpen}
        onClose={() => setStrategyModalOpen(false)}
        initialPreset={selectedPreset}
      />
    </div>
  );
}
