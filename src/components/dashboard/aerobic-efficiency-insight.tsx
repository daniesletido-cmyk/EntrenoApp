"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, TrendingUp, TrendingDown, ChevronRight, Activity, Stethoscope } from "lucide-react";
import type { AerobicEfficiencySummary } from "@/lib/aerobic-efficiency";

interface AerobicEfficiencyInsightProps {
  isCompleted?: boolean;
  discipline?: string;
}

export function AerobicEfficiencyInsight({ isCompleted, discipline }: AerobicEfficiencyInsightProps) {
  const [data, setData] = useState<AerobicEfficiencySummary | null>(null);

  useEffect(() => {
    fetch("/api/aerobic-efficiency")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const isImproving = data.trend === "improving";
  const isFatigued = data.trend === "fatigued";

  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: isImproving
                ? "rgba(22, 163, 74, 0.15)"
                : isFatigued
                ? "rgba(220, 38, 38, 0.15)"
                : "rgba(217, 119, 6, 0.15)",
              color: isImproving
                ? "var(--color-success)"
                : isFatigued
                ? "var(--color-danger)"
                : "var(--color-warning)",
            }}
          >
            <Heart size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Eficiencia Aeróbica & Desacople
              </span>
              <span
                className="badge text-[10px] py-0 px-1.5 font-medium"
                style={{
                  background: isImproving
                    ? "rgba(22, 163, 74, 0.15)"
                    : isFatigued
                    ? "rgba(220, 38, 38, 0.15)"
                    : "rgba(217, 119, 6, 0.15)",
                  color: isImproving
                    ? "#16a34a"
                    : isFatigued
                    ? "#dc2626"
                    : "#d97706",
                }}
              >
                {data.trendLabel}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              EF {data.currentEF} m/min/lpm · Desacople {data.avgDecouplingPct}% ({data.decouplingStatus === "optimo" ? "Óptimo" : "Vigilancia"})
            </div>
          </div>
        </div>

        <Link
          href="/progreso#eficiencia-aerobica"
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex-shrink-0 p-1 harbiz-press"
          title="Ver análisis completo en Progreso"
        >
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Resumen conciso de los especialistas */}
      <div className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Preparador & Fisio:</span>{" "}
        {isImproving
          ? "Tu corazón late con mayor economía para el mismo ritmo de rodaje. La base R1 se está consolidando sólidamente."
          : isFatigued
          ? "Se observa una ligera subida de pulso para el ritmo objetivo. Prioriza rodajes suaves en R0 y vigila el descanso."
          : "Relación ritmo/pulso estable en los últimos 30 días. La asimilación de volumen progresa según lo previsto."}
      </div>
    </div>
  );
}
