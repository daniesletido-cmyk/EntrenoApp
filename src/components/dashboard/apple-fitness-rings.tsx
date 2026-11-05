"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Flame, HeartPulse, Moon, Sparkles, TrendingUp, ShieldCheck, AlertCircle, Info, ArrowRight } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface AppleFitnessRingsProps {
  loadTss: number;
  targetLoadTss: number;
  readinessScore: number;
  sleepHours: number;
  targetSleepHours?: number;
  acwr: number | null;
  rpeAvg: number | null;
  hrvMs?: number | null;
  rhrBpm?: number | null;
}

export function AppleFitnessRings({
  loadTss = 350,
  targetLoadTss = 450,
  readinessScore = 85,
  sleepHours = 8.1,
  targetSleepHours = 8.0,
  acwr = 1.05,
  rpeAvg = 5.5,
  hrvMs = 54,
  rhrBpm = 52,
}: AppleFitnessRingsProps) {
  const [activeMetric, setActiveMetric] = useState<"load" | "readiness" | "sleep" | "acwr">("readiness");

  // Cálculos de porcentajes y perímetros de anillo SVG (radio: R, perímetro: 2 * PI * R)
  const loadPct = Math.min(Math.max(Math.round((loadTss / (targetLoadTss || 1)) * 100), 5), 150);
  const readinessPct = Math.min(Math.max(readinessScore, 5), 100);
  const sleepPct = Math.min(Math.max(Math.round((sleepHours / (targetSleepHours || 8)) * 100), 5), 130);

  // Anillos concéntricos: Exterior (Carga, R=58), Medio (Readiness, R=44), Interior (Sueño, R=30)
  const rOuter = 58;
  const circOuter = 2 * Math.PI * rOuter;
  const strokeOuter = circOuter - (Math.min(loadPct, 100) / 100) * circOuter;

  const rMid = 44;
  const circMid = 2 * Math.PI * rMid;
  const strokeMid = circMid - (readinessPct / 100) * circMid;

  const rInner = 30;
  const circInner = 2 * Math.PI * rInner;
  const strokeInner = circInner - (Math.min(sleepPct, 100) / 100) * circInner;

  // Estado del ACWR según la literatura científica deportiva (Tim Gabbett)
  const acwrValue = acwr !== null ? Number(acwr.toFixed(2)) : 1.0;
  const isAcwrSweetSpot = acwrValue >= 0.8 && acwrValue <= 1.3;
  const isAcwrOverload = acwrValue > 1.5;
  const isAcwrUnderload = acwrValue < 0.8;

  const acwrStatusText = isAcwrSweetSpot
    ? "Óptimo (Sweet Spot 0.8–1.3)"
    : isAcwrOverload
    ? "Sobrecarga Alta (>1.5)"
    : isAcwrUnderload
    ? "Infracarga / Descarga (<0.8)"
    : "Atención (1.3–1.5)";

  const acwrColor = isAcwrSweetSpot
    ? "#30d158"
    : isAcwrOverload
    ? "#ff453a"
    : isAcwrUnderload
    ? "#0a84ff"
    : "#ff9f0a";

  // Algoritmo recomendador diario
  let recommendationBadge = "Óptimo para entrenar";
  let recommendationTone = "#30d158";
  let recommendationDetail = "Equilibrio neuro-vegetativo excelente. Puedes tolerar alta intensidad (R3/R4 o series de umbral) sin riesgo de sobreentrenamiento.";

  if (readinessScore < 60 || isAcwrOverload) {
    recommendationBadge = "Precaución · Fatiga Alta";
    recommendationTone = "#ff453a";
    recommendationDetail = "Fatiga sistémica acumulada. Se recomienda rodaje regenerativo suave en R0 (< 140 lpm) o descanso total para regenerar reservas.";
  } else if (readinessScore < 75 || (!isAcwrSweetSpot && acwrValue > 1.3)) {
    recommendationBadge = "Carga Moderada";
    recommendationTone = "#ff9f0a";
    recommendationDetail = "Capacidad funcional estándar. Cumple con el volumen programado en R1 manteniendo hidratación y descanso nocturno prioritario.";
  }

  return (
    <div className="ios-card p-4 sm:p-4.5 w-full overflow-hidden border border-white/10">
      {/* Cabecera estilo Apple Fitness */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158]">
            <Activity size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8e8e93]">
              Apple Fitness & Health Telemetry
            </div>
            <div className="text-base font-extrabold text-white tracking-tight">
              Estado Fisiológico Diario
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: recommendationTone, boxShadow: `0 0 6px ${recommendationTone}` }} />
          <span className="text-xs font-bold font-mono" style={{ color: recommendationTone }}>
            {readinessScore}/100
          </span>
        </div>
      </div>

      {/* Grid: Anillos Concéntricos Apple Fitness + Métricas Clave */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Visualización de los 3 Anillos Concéntricos */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/5 relative">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
              {/* Fondo Anillo Exterior (Rojo Carga) */}
              <circle cx="70" cy="70" r={rOuter} stroke="rgba(255, 69, 58, 0.2)" strokeWidth="10" fill="none" />
              {/* Progreso Anillo Exterior */}
              <circle
                cx="70"
                cy="70"
                r={rOuter}
                stroke="#ff453a"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circOuter}
                strokeDashoffset={strokeOuter}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />

              {/* Fondo Anillo Medio (Verde Readiness) */}
              <circle cx="70" cy="70" r={rMid} stroke="rgba(48, 209, 88, 0.2)" strokeWidth="10" fill="none" />
              {/* Progreso Anillo Medio */}
              <circle
                cx="70"
                cy="70"
                r={rMid}
                stroke="#30d158"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circMid}
                strokeDashoffset={strokeMid}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />

              {/* Fondo Anillo Interior (Cian Sueño) */}
              <circle cx="70" cy="70" r={rInner} stroke="rgba(100, 210, 255, 0.2)" strokeWidth="10" fill="none" />
              {/* Progreso Anillo Interior */}
              <circle
                cx="70"
                cy="70"
                r={rInner}
                stroke="#64d2ff"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circInner}
                strokeDashoffset={strokeInner}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />
            </svg>

            {/* Centro de los anillos con icono inteligente */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-black font-mono text-white">{readinessScore}%</span>
              <span className="text-[9px] uppercase tracking-wider text-[#8e8e93] font-bold">Estado</span>
            </div>
          </div>

          {/* Leyenda táctil compacta */}
          <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-white/10 text-center">
            <button
              onClick={() => { haptics.light(); setActiveMetric("load"); }}
              className={`ios-press flex flex-col items-center p-1 rounded-lg ${activeMetric === "load" ? "bg-white/10" : ""}`}
            >
              <span className="text-[10px] font-bold text-[#ff453a]">Carga</span>
              <span className="text-xs font-mono font-extrabold text-white">{loadPct}%</span>
            </button>
            <button
              onClick={() => { haptics.light(); setActiveMetric("readiness"); }}
              className={`ios-press flex flex-col items-center p-1 rounded-lg ${activeMetric === "readiness" ? "bg-white/10" : ""}`}
            >
              <span className="text-[10px] font-bold text-[#30d158]">Forma</span>
              <span className="text-xs font-mono font-extrabold text-white">{readinessScore}</span>
            </button>
            <button
              onClick={() => { haptics.light(); setActiveMetric("sleep"); }}
              className={`ios-press flex flex-col items-center p-1 rounded-lg ${activeMetric === "sleep" ? "bg-white/10" : ""}`}
            >
              <span className="text-[10px] font-bold text-[#64d2ff]">Sueño</span>
              <span className="text-xs font-mono font-extrabold text-white">{sleepHours.toFixed(1)}h</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de métricas interactivas */}
        <div className="md:col-span-8 grid grid-cols-2 gap-2.5">
          {/* Card 1: ACWR Ratio */}
          <div
            onClick={() => { haptics.selection(); setActiveMetric("acwr"); }}
            className={`ios-press p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeMetric === "acwr" ? "bg-white/[0.08] border-[#30d158]/50" : "bg-black/30 border-white/5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#8e8e93]">
              <span className="font-bold flex items-center gap-1">
                <TrendingUp size={13} className="text-[#30d158]" />
                Ratio ACWR
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${acwrColor}22`, color: acwrColor }}>
                {acwrValue.toFixed(2)}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1.5">
              {acwrValue.toFixed(2)} <span className="text-xs font-normal text-[#8e8e93]">aguda:crónica</span>
            </div>
            <div className="text-[11px] font-semibold mt-1 truncate" style={{ color: acwrColor }}>
              {acwrStatusText}
            </div>
          </div>

          {/* Card 2: Carga de Entrenamiento (TSS/UA) */}
          <div
            onClick={() => { haptics.selection(); setActiveMetric("load"); }}
            className={`ios-press p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeMetric === "load" ? "bg-white/[0.08] border-[#ff453a]/50" : "bg-black/30 border-white/5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#8e8e93]">
              <span className="font-bold flex items-center gap-1">
                <Flame size={13} className="text-[#ff453a]" />
                Carga Semanal
              </span>
              <span className="text-[10px] font-mono text-[#ff453a] font-bold">
                {loadPct}%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1.5">
              {loadTss} <span className="text-xs font-normal text-[#8e8e93]">TSS</span>
            </div>
            <div className="text-[11px] text-[#8e8e93] mt-1 truncate">
              Meta: {targetLoadTss} TSS · RPE medio {rpeAvg ? rpeAvg.toFixed(1) : "—"}
            </div>
          </div>

          {/* Card 3: Recuperación Cardíaca (HRV & RHR) */}
          <div
            onClick={() => { haptics.selection(); setActiveMetric("readiness"); }}
            className={`ios-press p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeMetric === "readiness" ? "bg-white/[0.08] border-[#30d158]/50" : "bg-black/30 border-white/5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#8e8e93]">
              <span className="font-bold flex items-center gap-1">
                <HeartPulse size={13} className="text-[#30d158]" />
                VFC / Pulso Reposo
              </span>
              <span className="text-[10px] text-[#30d158] font-bold">
                {hrvMs ? `${hrvMs} ms` : "Normal"}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1.5">
              {rhrBpm ? `${rhrBpm} lpm` : "52 lpm"} <span className="text-xs font-normal text-[#8e8e93]">RHR</span>
            </div>
            <div className="text-[11px] text-[#8e8e93] mt-1 truncate">
              Variabilidad VFC: {hrvMs ? `${hrvMs} ms` : "Estable"}
            </div>
          </div>

          {/* Card 4: Descanso & Zepp Sleep */}
          <div
            onClick={() => { haptics.selection(); setActiveMetric("sleep"); }}
            className={`ios-press p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
              activeMetric === "sleep" ? "bg-white/[0.08] border-[#64d2ff]/50" : "bg-black/30 border-white/5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#8e8e93]">
              <span className="font-bold flex items-center gap-1">
                <Moon size={13} className="text-[#64d2ff]" />
                Sueño & Recuperación
              </span>
              <span className="text-[10px] text-[#64d2ff] font-bold">
                {sleepPct}%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1.5">
              {sleepHours.toFixed(1)} <span className="text-xs font-normal text-[#8e8e93]">horas</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-[#8e8e93] truncate">
                Descanso reparador
              </span>
              <Link
                href="/sueno"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold text-[#64d2ff] hover:underline flex items-center gap-0.5"
              >
                <span>Detalle</span>
                <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Prescripción Inteligente del Entrenador */}
      <div
        className="mt-4 p-3.5 rounded-2xl border flex items-start gap-3 transition-colors"
        style={{
          backgroundColor: `${recommendationTone}10`,
          borderColor: `${recommendationTone}35`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${recommendationTone}25`, color: recommendationTone }}
        >
          <Sparkles size={16} strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: recommendationTone }}>
              Prescripción Inteligente del Entrenador
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
              {recommendationBadge}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {recommendationDetail}
          </p>
        </div>
      </div>
    </div>
  );
}
