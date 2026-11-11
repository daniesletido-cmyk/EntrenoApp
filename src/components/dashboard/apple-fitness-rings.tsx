"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Flame, HeartPulse, Moon, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
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

  const loadPct = Math.min(Math.max(Math.round((loadTss / (targetLoadTss || 1)) * 100), 5), 150);
  const readinessPct = Math.min(Math.max(readinessScore, 5), 100);
  const sleepPct = Math.min(Math.max(Math.round((sleepHours / (targetSleepHours || 8)) * 100), 5), 130);

  const rOuter = 58;
  const circOuter = 2 * Math.PI * rOuter;
  const strokeOuter = circOuter - (Math.min(loadPct, 100) / 100) * circOuter;

  const rMid = 44;
  const circMid = 2 * Math.PI * rMid;
  const strokeMid = circMid - (readinessPct / 100) * circMid;

  const rInner = 30;
  const circInner = 2 * Math.PI * rInner;
  const strokeInner = circInner - (Math.min(sleepPct, 100) / 100) * circInner;

  const acwrValue = acwr !== null ? Number(acwr.toFixed(2)) : 1.0;
  const isAcwrSweetSpot = acwrValue >= 0.8 && acwrValue <= 1.3;
  const isAcwrOverload = acwrValue > 1.5;
  const isAcwrUnderload = acwrValue < 0.8;

  const acwrStatusText = isAcwrSweetSpot
    ? "Óptimo (0.8–1.3)"
    : isAcwrOverload
    ? "Sobrecarga Alta (>1.5)"
    : isAcwrUnderload
    ? "Descarga (<0.8)"
    : "Atención (1.3–1.5)";

  const acwrColor = isAcwrSweetSpot
    ? "#10b981"
    : isAcwrOverload
    ? "#ef4444"
    : isAcwrUnderload
    ? "#2563eb"
    : "#f59e0b";

  let recommendationBadge = "Óptimo para entrenar";
  let recommendationTone = "#10b981";
  let recommendationDetail =
    "Equilibrio neuro-vegetativo excelente. Puedes tolerar alta intensidad (R3/R4 o series de umbral) sin riesgo de sobreentrenamiento.";

  if (readinessScore < 60 || isAcwrOverload) {
    recommendationBadge = "Precaución · Fatiga Alta";
    recommendationTone = "#ef4444";
    recommendationDetail =
      "Fatiga sistémica acumulada. Se recomienda rodaje regenerativo suave en R0 (< 140 lpm) o descanso total.";
  } else if (readinessScore < 75 || (!isAcwrSweetSpot && acwrValue > 1.3)) {
    recommendationBadge = "Carga Moderada";
    recommendationTone = "#f59e0b";
    recommendationDetail =
      "Capacidad funcional estándar. Cumple con el volumen programado en R1 priorizando descanso e hidratación.";
  }

  return (
    <div className="surface p-4 sm:p-5 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}
          >
            <Activity size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Telemetría & Recuperación
            </div>
            <div className="text-base font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
              Estado Fisiológico Diario
            </div>
          </div>
        </div>

        <div
          className="badge"
          style={{
            background: `${recommendationTone}18`,
            color: recommendationTone,
            border: `1px solid ${recommendationTone}40`,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: recommendationTone }} />
          <span className="font-bold tabular-nums">{readinessScore}/100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Anillos Concéntricos */}
        <div
          className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={rOuter} stroke="rgba(245, 158, 11, 0.2)" strokeWidth="10" fill="none" />
              <circle
                cx="70"
                cy="70"
                r={rOuter}
                stroke="#f59e0b"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circOuter}
                strokeDashoffset={strokeOuter}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />

              <circle cx="70" cy="70" r={rMid} stroke="rgba(16, 185, 129, 0.2)" strokeWidth="10" fill="none" />
              <circle
                cx="70"
                cy="70"
                r={rMid}
                stroke="#10b981"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circMid}
                strokeDashoffset={strokeMid}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />

              <circle cx="70" cy="70" r={rInner} stroke="rgba(37, 99, 235, 0.2)" strokeWidth="10" fill="none" />
              <circle
                cx="70"
                cy="70"
                r={rInner}
                stroke="#2563eb"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circInner}
                strokeDashoffset={strokeInner}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {readinessScore}%
              </span>
              <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-text-muted)" }}>
                Forma
              </span>
            </div>
          </div>

          <div
            className="grid grid-cols-3 gap-1.5 w-full mt-3 pt-3 text-center"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <button
              onClick={() => {
                haptics.light();
                setActiveMetric("load");
              }}
              className="harbiz-press flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer"
              style={{
                minHeight: 44,
                background: activeMetric === "load" ? "var(--color-surface)" : "transparent",
              }}
            >
              <span className="text-[10px] font-bold text-amber-500">Carga</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {loadPct}%
              </span>
            </button>
            <button
              onClick={() => {
                haptics.light();
                setActiveMetric("readiness");
              }}
              className="harbiz-press flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer"
              style={{
                minHeight: 44,
                background: activeMetric === "readiness" ? "var(--color-surface)" : "transparent",
              }}
            >
              <span className="text-[10px] font-bold text-emerald-500">Forma</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {readinessScore}
              </span>
            </button>
            <button
              onClick={() => {
                haptics.light();
                setActiveMetric("sleep");
              }}
              className="harbiz-press flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer"
              style={{
                minHeight: 44,
                background: activeMetric === "sleep" ? "var(--color-surface)" : "transparent",
              }}
            >
              <span className="text-[10px] font-bold" style={{ color: "var(--color-brand)" }}>
                Sueño
              </span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: "var(--color-text)" }}>
                {sleepHours.toFixed(1)}h
              </span>
            </button>
          </div>
        </div>

        {/* Tarjetas métricas adaptativas */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => {
              haptics.selection();
              setActiveMetric("acwr");
            }}
            className="harbiz-press p-3.5 rounded-2xl transition-all cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              border: activeMetric === "acwr" ? `1.5px solid ${acwrColor}` : "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold flex items-center gap-1.5">
                <TrendingUp size={14} style={{ color: acwrColor }} />
                Ratio ACWR
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums"
                style={{ backgroundColor: `${acwrColor}18`, color: acwrColor }}
              >
                {acwrValue.toFixed(2)}
              </span>
            </div>
            <div className="text-xl font-bold tabular-nums mt-1.5" style={{ color: "var(--color-text)" }}>
              {acwrValue.toFixed(2)}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                aguda:crónica
              </span>
            </div>
            <div className="text-xs font-semibold mt-1 truncate" style={{ color: acwrColor }}>
              {acwrStatusText}
            </div>
          </div>

          <div
            onClick={() => {
              haptics.selection();
              setActiveMetric("load");
            }}
            className="harbiz-press p-3.5 rounded-2xl transition-all cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              border: activeMetric === "load" ? "1.5px solid #f59e0b" : "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold flex items-center gap-1.5">
                <Flame size={14} className="text-amber-500" />
                Carga Semanal
              </span>
              <span className="text-xs font-bold text-amber-500 tabular-nums">{loadPct}%</span>
            </div>
            <div className="text-xl font-bold tabular-nums mt-1.5" style={{ color: "var(--color-text)" }}>
              {loadTss}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                TSS
              </span>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: "var(--color-text-muted)" }}>
              Meta: {targetLoadTss} TSS · RPE {rpeAvg ? rpeAvg.toFixed(1) : "—"}
            </div>
          </div>

          <div
            onClick={() => {
              haptics.selection();
              setActiveMetric("readiness");
            }}
            className="harbiz-press p-3.5 rounded-2xl transition-all cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              border: activeMetric === "readiness" ? "1.5px solid #10b981" : "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold flex items-center gap-1.5">
                <HeartPulse size={14} className="text-emerald-500" />
                VFC / Pulso Reposo
              </span>
              <span className="text-xs font-bold text-emerald-500 tabular-nums">
                {hrvMs ? `${hrvMs} ms` : "Normal"}
              </span>
            </div>
            <div className="text-xl font-bold tabular-nums mt-1.5" style={{ color: "var(--color-text)" }}>
              {rhrBpm ? `${rhrBpm} lpm` : "52 lpm"}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                RHR
              </span>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: "var(--color-text-muted)" }}>
              Variabilidad VFC: {hrvMs ? `${hrvMs} ms` : "Estable"}
            </div>
          </div>

          <div
            onClick={() => {
              haptics.selection();
              setActiveMetric("sleep");
            }}
            className="harbiz-press p-3.5 rounded-2xl transition-all cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              border: activeMetric === "sleep" ? "1.5px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold flex items-center gap-1.5">
                <Moon size={14} style={{ color: "var(--color-brand)" }} />
                Sueño & Recuperación
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--color-brand)" }}>
                {sleepPct}%
              </span>
            </div>
            <div className="text-xl font-bold tabular-nums mt-1.5" style={{ color: "var(--color-text)" }}>
              {sleepHours.toFixed(1)}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                horas
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                Descanso reparador
              </span>
              <Link
                href="/sueno"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold hover:underline flex items-center gap-0.5"
                style={{ color: "var(--color-brand)" }}
              >
                <span>Detalle</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Prescripción Inteligente */}
      <div
        className="mt-4 p-3.5 rounded-2xl flex items-start gap-3"
        style={{
          backgroundColor: `${recommendationTone}12`,
          border: `1px solid ${recommendationTone}35`,
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${recommendationTone}22`, color: recommendationTone }}
        >
          <Sparkles size={16} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: recommendationTone }}>
              Estado del Entrenamiento
            </span>
            <span
              className="badge"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              {recommendationBadge}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {recommendationDetail}
          </p>
        </div>
      </div>
    </div>
  );
}
