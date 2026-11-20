"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, ChevronRight, Activity, Clock } from "lucide-react";
import type { MarathonProjectionData } from "@/lib/marathon-projection";

export function MarathonCompactWidget() {
  const [data, setData] = useState<MarathonProjectionData | null>(null);

  useEffect(() => {
    fetch("/api/marathon-projection")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { targetRace, macrocycle, projection } = data;
  const currentPhase = macrocycle.currentPhase;

  return (
    <section className="surface p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-150">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--color-brand-subtle)",
              color: "var(--color-brand)",
            }}
          >
            <Target size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Maratón 26/04/2027
              </span>
              <span className="bg-red-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                {currentPhase.shortName}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums mt-0.5">
              {targetRace.weeksRemaining} sem restantes · Sem {macrocycle.currentWeekNumber}/{macrocycle.totalWeeks}
            </div>
          </div>
        </div>

        {/* Proyección y tiempo */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {projection.projectedTimeFormatted}
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            {projection.projectedPaceFormatted}
          </div>
        </div>
      </div>

      {/* Mini barra de progreso de preparación */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Preparación hacia el objetivo</span>
          <span className="font-mono font-bold text-red-600">
            {projection.preparationScorePct}%
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${projection.preparationScorePct}%`,
              background: "var(--color-brand)",
            }}
          />
        </div>
      </div>

      {/* Enlace directo a /progreso */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          VAM {projection.vamPace} · Tirada max {projection.maxRecentLongRunKm}k
        </span>
        <Link
          href="/progreso"
          className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors min-h-[32px] harbiz-press"
        >
          <span>Ver proyección completa</span>
          <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  );
}
