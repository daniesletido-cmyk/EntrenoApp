"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface TrainingLoadPoint {
  date: string;
  dayLabel: string;
  atl: number;
  ctl: number;
  tsb: number;
  loadTss: number;
}

interface TrainingLoadChartProps {
  currentWeekTss?: number;
  acwr?: number | null;
}

export function TrainingLoadChart({ acwr = 1.05 }: TrainingLoadChartProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "14d">("14d");

  const data: TrainingLoadPoint[] = useMemo(() => {
    const raw = [
      { date: "22/10", dayLabel: "Mié", atl: 58, ctl: 52, tsb: -6, loadTss: 65 },
      { date: "23/10", dayLabel: "Jue", atl: 62, ctl: 53, tsb: -9, loadTss: 70 },
      { date: "24/10", dayLabel: "Vie", atl: 55, ctl: 53, tsb: -2, loadTss: 30 },
      { date: "25/10", dayLabel: "Sáb", atl: 70, ctl: 54, tsb: -16, loadTss: 110 },
      { date: "26/10", dayLabel: "Dom", atl: 64, ctl: 55, tsb: -9, loadTss: 40 },
      { date: "27/10", dayLabel: "Lun", atl: 58, ctl: 55, tsb: -3, loadTss: 20 },
      { date: "28/10", dayLabel: "Mar", atl: 65, ctl: 56, tsb: -9, loadTss: 75 },
      { date: "29/10", dayLabel: "Mié", atl: 61, ctl: 56, tsb: -5, loadTss: 50 },
      { date: "30/10", dayLabel: "Jue", atl: 67, ctl: 57, tsb: -10, loadTss: 80 },
      { date: "31/10", dayLabel: "Vie", atl: 62, ctl: 57, tsb: -5, loadTss: 35 },
      { date: "01/11", dayLabel: "Sáb", atl: 76, ctl: 59, tsb: -17, loadTss: 120 },
      { date: "02/11", dayLabel: "Dom", atl: 69, ctl: 60, tsb: -9, loadTss: 45 },
      { date: "03/11", dayLabel: "Lun", atl: 60, ctl: 60, tsb: 0, loadTss: 0 },
      { date: "04/11", dayLabel: "Hoy", atl: 66, ctl: 61, tsb: -5, loadTss: 60 },
    ];

    return timeRange === "7d" ? raw.slice(-7) : raw;
  }, [timeRange]);

  const latest = data[data.length - 1];

  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={17} style={{ color: "var(--color-brand)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Evolución de Carga y Forma
            </h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Carga aguda (7d) vs base acumulada (42d)
          </p>
        </div>

        <div className="ios-segmented inline-flex items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setTimeRange("7d");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              minHeight: 36,
              background: timeRange === "7d" ? "var(--color-brand)" : "transparent",
              color: timeRange === "7d" ? "#ffffff" : "var(--color-text-muted)",
            }}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setTimeRange("14d");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              minHeight: 36,
              background: timeRange === "14d" ? "var(--color-brand)" : "transparent",
              color: timeRange === "14d" ? "#ffffff" : "var(--color-text-muted)",
            }}
          >
            14 días
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div
          className="p-3 rounded-xl"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Carga 7d
          </div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: "var(--color-brand)" }}>
            {latest.atl}
          </div>
        </div>

        <div
          className="p-3 rounded-xl"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Forma base
          </div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: "var(--color-success)" }}>
            {latest.ctl}
          </div>
        </div>

        <div
          className="p-3 rounded-xl"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            ACWR
          </div>
          <div className="text-xl font-bold tabular-nums mt-0.5" style={{ color: "var(--color-text)" }}>
            {acwr !== null ? acwr.toFixed(2) : "1.05"}
          </div>
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="harbizAtl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.14} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="harbizCtl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="dayLabel" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 10"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as TrainingLoadPoint;
                return (
                  <div
                    className="p-3 rounded-xl text-xs shadow-sm"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <div className="font-bold mb-1">
                      {d.date} ({d.dayLabel}) · {d.loadTss} TSS
                    </div>
                    <div className="flex justify-between gap-4" style={{ color: "#dc2626" }}>
                      <span>Carga 7d:</span>
                      <span className="font-semibold tabular-nums">{d.atl}</span>
                    </div>
                    <div className="flex justify-between gap-4" style={{ color: "#16a34a" }}>
                      <span>Forma base:</span>
                      <span className="font-semibold tabular-nums">{d.ctl}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="atl" stroke="#dc2626" strokeWidth={2.2} fillOpacity={1} fill="url(#harbizAtl)" />
            <Area type="monotone" dataKey="ctl" stroke="#16a34a" strokeWidth={2.2} fillOpacity={1} fill="url(#harbizCtl)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
