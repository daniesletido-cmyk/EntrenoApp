"use client";

import { useState } from "react";
import { Zap, HeartPulse, Moon, Activity, ShieldCheck, Flame, Info } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface ReadinessDialProps {
  score?: number;
  level?: string;
  description?: string;
  hrvMs?: number | null;
  rhrBpm?: number | null;
  sleepHours?: number | null;
  acwr?: number | null;
  weeklyLoadUa?: number | null;
}

export function ReadinessDial({
  score = 85,
  level = "Óptimo para entrenar",
  description = "Equilibrio neuro-vegetativo excelente. Puedes tolerar alta intensidad sin riesgo de fatiga.",
  hrvMs = 56,
  rhrBpm = 52,
  sleepHours = 8.1,
  acwr = 1.05,
  weeklyLoadUa = 420,
}: ReadinessDialProps) {
  const [activeMetric, setActiveMetric] = useState<"readiness" | "hrv" | "rhr" | "sleep">("readiness");

  // Determine state tone
  const isPeak = score >= 85;
  const isGood = score >= 70 && score < 85;
  const isModerate = score >= 55 && score < 70;
  const isLow = score < 55;

  const toneColor = isPeak
    ? "#00e599" // Neon Volt
    : isGood
    ? "#00d2ff" // Garmin Cyan
    : isModerate
    ? "#ff8a00" // Strava Amber
    : "#ff3b30"; // Crimson Red

  const toneBg = isPeak
    ? "rgba(0, 229, 153, 0.12)"
    : isGood
    ? "rgba(0, 210, 255, 0.12)"
    : isModerate
    ? "rgba(255, 138, 0, 0.12)"
    : "rgba(255, 59, 48, 0.12)";

  const toneBorder = isPeak
    ? "rgba(0, 229, 153, 0.3)"
    : isGood
    ? "rgba(0, 210, 255, 0.3)"
    : isModerate
    ? "rgba(255, 138, 0, 0.3)"
    : "rgba(255, 59, 48, 0.3)";

  // Arc calculation for SVG circular gauge
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  // We use a 270 degree arc for an athletic speedometer look (3/4 circle)
  const arcLength = circumference * 0.75;
  const strokeOffset = arcLength - (Math.min(Math.max(score, 0), 100) / 100) * arcLength;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#101726] to-[#0b0f19] border border-white/[0.08] p-5 shadow-2xl transition-all duration-200 hover:border-white/[0.15]">
      {/* Top ambient glow based on readiness state */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-36 blur-3xl opacity-20 rounded-full"
        style={{ backgroundColor: toneColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: toneBg, borderColor: toneBorder, color: toneColor }}
          >
            <Zap size={15} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Disposición Diaria · BioCharge
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Algoritmo Autonómico Whoop/Oura</p>
          </div>
        </div>

        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all"
          style={{ backgroundColor: toneBg, borderColor: toneBorder, color: toneColor }}
        >
          {level}
        </span>
      </div>

      {/* Main Dial & Central Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center relative z-10">
        {/* Circular Speedometer Gauge */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 140 140">
              {/* Background Arc */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${circumference}`}
              />
              {/* Active Progress Arc */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={toneColor}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                style={{
                  transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)",
                  filter: `drop-shadow(0 0 8px ${toneColor})`,
                }}
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Readiness</span>
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-4xl font-black tracking-tight text-white font-mono tabular-nums">
                  {score}
                </span>
                <span className="text-xs font-bold text-slate-400">/100</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                Recuperado
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Matrix */}
        <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
          <p className="text-xs text-slate-300 leading-relaxed font-normal bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
            {description}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* HRV Card */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveMetric("hrv");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeMetric === "hrv"
                  ? "bg-white/[0.08] border-cyan-400/40"
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <span className="flex items-center gap-1">
                  <Activity size={12} className="text-cyan-400" />
                  VFC / HRV
                </span>
                <span className="text-[9px] text-cyan-400 font-semibold">Óptimo</span>
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                {hrvMs ?? 56} <span className="text-[11px] font-semibold text-slate-400">ms</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">Línea base: 52-58 ms</div>
            </button>

            {/* Resting Heart Rate */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveMetric("rhr");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeMetric === "rhr"
                  ? "bg-white/[0.08] border-emerald-400/40"
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <span className="flex items-center gap-1">
                  <HeartPulse size={12} className="text-emerald-400" />
                  FC Reposo
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold">-3 lpm</span>
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                {rhrBpm ?? 52} <span className="text-[11px] font-semibold text-slate-400">lpm</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">Recuperación parasimpática</div>
            </button>

            {/* Sleep Telemetry */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveMetric("sleep");
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeMetric === "sleep"
                  ? "bg-white/[0.08] border-indigo-400/40"
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <span className="flex items-center gap-1">
                  <Moon size={12} className="text-indigo-400" />
                  Sueño
                </span>
                <span className="text-[9px] text-indigo-400 font-semibold">96%</span>
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                {sleepHours ? sleepHours.toFixed(1) : "8.1"} <span className="text-[11px] font-semibold text-slate-400">h</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">Fase profunda: 84 min</div>
            </button>

            {/* ACWR & Strain */}
            <div className="p-2.5 rounded-xl border bg-white/[0.02] border-white/[0.05]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <span className="flex items-center gap-1">
                  <Flame size={12} className="text-amber-400" />
                  Ratio ACWR
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold">Sweet Spot</span>
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                {acwr !== null ? acwr.toFixed(2) : "1.05"}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                Carga: {weeklyLoadUa ?? 420} UA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
