"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Flame, TrendingUp, Info } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface TrainingLoadPoint {
  date: string;
  dayLabel: string;
  atl: number; // Fatiga Aguda (7d)
  ctl: number; // Forma Crónica (28d / 42d)
  tsb: number; // Balance Forma (CTL - ATL)
  loadTss: number;
}

interface TrainingLoadChartProps {
  currentWeekTss?: number;
  acwr?: number | null;
}

export function TrainingLoadChart({ currentWeekTss = 410, acwr = 1.05 }: TrainingLoadChartProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "14d">("14d");

  // Mock baseline data calibrated to Dani's marathon preparation curve
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#101726] to-[#0b0f19] border border-white/[0.08] p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <TrendingUp size={15} strokeWidth={2.4} />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Curva de Fatiga & Forma · Banister Modelo
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            ATL (Fatiga 7d) vs CTL (Carga acumulada) vs TSB (Frescura)
          </p>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setTimeRange("7d");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === "7d"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            7 Días
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setTimeRange("14d");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeRange === "14d"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            14 Días
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Fatiga (ATL)
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-cyan-400 mt-1">
            {latest.atl}
          </div>
          <div className="text-[10px] text-slate-400">Carga aguda 7 días</div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Forma (CTL)
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-emerald-400 mt-1">
            {latest.ctl}
          </div>
          <div className="text-[10px] text-slate-400">Base aeróbica 42d</div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Frescura (TSB)
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-amber-400 mt-1">
            {latest.tsb > 0 ? `+${latest.tsb}` : latest.tsb}
          </div>
          <div className="text-[10px] text-slate-400">Ventana adaptativa</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="atlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00d2ff" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="ctlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e599" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00e599" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dayLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 5", "dataMax + 10"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as TrainingLoadPoint;
                return (
                  <div className="p-3 rounded-xl bg-[#090d16] border border-white/20 shadow-2xl backdrop-blur-md text-xs">
                    <div className="font-bold text-white mb-1.5 font-mono">
                      {d.date} ({d.dayLabel}) · TSS {d.loadTss}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-cyan-400">
                        <span>Fatiga (ATL):</span>
                        <span className="font-mono font-bold">{d.atl}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <span>Forma (CTL):</span>
                        <span className="font-mono font-bold">{d.ctl}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-amber-400">
                        <span>Frescura (TSB):</span>
                        <span className="font-mono font-bold">{d.tsb}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="atl"
              stroke="#00d2ff"
              strokeWidth={2.4}
              fillOpacity={1}
              fill="url(#atlGradient)"
              name="Fatiga (ATL)"
            />
            <Area
              type="monotone"
              dataKey="ctl"
              stroke="#00e599"
              strokeWidth={2.4}
              fillOpacity={1}
              fill="url(#ctlGradient)"
              name="Forma (CTL)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-slate-500" />
          Progresión atlética lineal dentro del Sweet Spot
        </span>
        <span className="font-mono text-[11px] text-emerald-400 font-semibold">
          ACWR actual: {acwr !== null ? acwr.toFixed(2) : "1.05"} (Óptimo)
        </span>
      </div>
    </div>
  );
}
