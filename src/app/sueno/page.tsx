"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Moon,
  HeartPulse,
  Activity,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Clock,
  TrendingUp,
  ArrowRight,
  BedDouble,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { FallbackManualModal } from "@/components/suunto/fallback-manual-modal";
import { todayISO, addDays } from "@/lib/dates";
import { reconcileSleep, saveLocalSleep } from "@/lib/client-persistence";
import { haptics } from "@/lib/haptics";
import type { SleepRow } from "@/lib/repo/sleep";

const SLEEP_TARGET_HOURS = 8.0;

function formatDurationHM(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes <= 0) return "0m";
  const mins = Math.round(totalMinutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatHoursHM(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) return "0h 00m";
  return formatDurationHM(Math.round(hours * 60));
}

function formatSignedMinutes(deltaMin: number): string {
  const sign = deltaMin >= 0 ? "+" : "-";
  return `${sign}${formatDurationHM(Math.abs(Math.round(deltaMin)))}`;
}

function formatNightLabel(isoDate: string, today: string): string {
  const yesterday = addDays(today, -1);
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const short = new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(dt);
    if (isoDate === today) return `Anoche · ${short}`;
    if (isoDate === yesterday) return `Ayer · ${short}`;
    return short.charAt(0).toUpperCase() + short.slice(1);
  } catch {
    return isoDate;
  }
}

function getRecoveryVerdict(score: number, hours: number): {
  label: string;
  badgeClass: string;
} {
  if (score >= 82 && hours >= 7.2) {
    return {
      label: "Recuperación óptima · Listo para carga alta",
      badgeClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
    };
  }
  if (score >= 68 && hours >= 6.5) {
    return {
      label: "Recuperación sólida · Carga moderada/alta",
      badgeClass: "bg-zinc-100 border-zinc-200 text-zinc-800",
    };
  }
  if (score >= 52 || hours >= 5.5) {
    return {
      label: "Descanso justo · Moderar intensidad",
      badgeClass: "bg-amber-50 border-amber-200 text-amber-800",
    };
  }
  return {
    label: "Déficit de descanso · Priorizar descarga",
    badgeClass: "bg-red-50 border-red-200 text-red-700",
  };
}

export default function SuenoPage() {
  const toast = useToast();
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [logs, setLogs] = useState<SleepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  const [formData, setFormData] = useState({
    date: today,
    hours: "7.5",
    score: "82",
    deep_min: "95",
    rem_min: "110",
    light_min: "230",
    awake_min: "15",
    hrv_rmssd: "58",
    resting_hr: "58",
    sleep_start: "23:45",
    sleep_end: "07:15",
  });

  const loadSleepData = useCallback(async () => {
    try {
      setLoading(true);
      const from = addDays(todayISO(), -35);
      const to = addDays(todayISO(), 2);
      const res = await fetch(`/api/sleep?from=${from}&to=${to}`).catch(() => null);
      let serverLogs: SleepRow[] = [];
      if (res && res.ok) {
        const data = await res.json();
        serverLogs = data.logs || [];
      }
      const merged = await reconcileSleep(serverLogs, from, to);
      setLogs(merged);
    } catch {
      const local = await reconcileSleep([], addDays(todayISO(), -35), addDays(todayISO(), 2));
      setLogs(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get("date");
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        setSelectedDate(urlDate);
      }
    } catch {}
    loadSleepData();
    const onRefresh = () => loadSleepData();
    window.addEventListener("entrenoapp:refresh", onRefresh);
    return () => window.removeEventListener("entrenoapp:refresh", onRefresh);
  }, [loadSleepData]);

  const currentLog = useMemo(
    () => logs.find((l) => l.date === selectedDate) ?? null,
    [logs, selectedDate]
  );

  const latestAvailableLog = useMemo(() => {
    const valid = logs.filter((l) => l.hours != null && l.hours > 0);
    if (valid.length === 0) return null;
    return valid.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [logs]);

  // Métricas calculadas de la noche seleccionada (solo cuando existen datos reales)
  const nightView = useMemo(() => {
    if (!currentLog) return null;
    const hours = Number(currentLog.hours ?? 0);
    const totalMin = Math.round(hours * 60);
    const deep = currentLog.deep_min ?? 0;
    const rem = currentLog.rem_min ?? 0;
    const light = currentLog.light_min ?? 0;
    const awake = currentLog.awake_min ?? 0;
    const hasStages = deep + rem + light > 0;

    const stageSum = deep + rem + light + awake;
    const baseTotal = stageSum > 0 ? stageSum : totalMin || 1;
    const pct = (val: number) => Math.round((val / baseTotal) * 100);

    const score =
      currentLog.score ??
      Math.max(30, Math.min(100, Math.round((hours / SLEEP_TARGET_HOURS) * 85 + (currentLog.quality ?? 3) * 3)));

    return {
      hours,
      totalMin,
      score,
      deep,
      rem,
      light,
      awake,
      hasStages,
      deepPct: pct(deep),
      remPct: pct(rem),
      lightPct: pct(light),
      awakePct: pct(awake),
      rhr: currentLog.resting_hr ?? null,
      hrv: currentLog.hrv_rmssd ?? null,
      sleepStart: currentLog.sleep_start || null,
      sleepEnd: currentLog.sleep_end || null,
      verdict: getRecoveryVerdict(score, hours),
    };
  }, [currentLog]);

  // Comparativa 7d y deuda de sueño acumulada (últimos 7 días hasta selectedDate)
  const weeklyStats = useMemo(() => {
    const days: Array<{ date: string; dayLabel: string; hours: number; isSelected: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(selectedDate, -i);
      const found = logs.find((l) => l.date === d);
      const [yy, mm, dd] = d.split("-").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      const dayLabel = new Intl.DateTimeFormat("es-ES", { weekday: "narrow" })
        .format(dt)
        .toUpperCase();
      days.push({
        date: d,
        dayLabel,
        hours: found?.hours != null ? Number(found.hours.toFixed(2)) : 0,
        isSelected: d === selectedDate,
      });
    }

    const recordedDays = days.filter((d) => d.hours > 0);
    const avgHours =
      recordedDays.length > 0
        ? recordedDays.reduce((acc, d) => acc + d.hours, 0) / recordedDays.length
        : null;

    // Deuda de sueño sobre los días con registro de la semana (o saldo de la noche frente a 8h)
    const debtMinutes =
      recordedDays.length > 0
        ? Math.round(
            recordedDays.reduce((acc, d) => acc + (d.hours - SLEEP_TARGET_HOURS) * 60, 0)
          )
        : null;

    const consistencyDeltaMin =
      nightView && avgHours != null ? Math.round((nightView.hours - avgHours) * 60) : null;

    return {
      days,
      avgHours,
      debtMinutes,
      consistencyDeltaMin,
    };
  }, [logs, selectedDate, nightView]);

  const openManualModal = () => {
    setFormData({
      date: selectedDate,
      hours: currentLog?.hours != null ? String(currentLog.hours) : "7.5",
      score: currentLog?.score != null ? String(currentLog.score) : "82",
      deep_min: currentLog?.deep_min != null ? String(currentLog.deep_min) : "95",
      rem_min: currentLog?.rem_min != null ? String(currentLog.rem_min) : "110",
      light_min: currentLog?.light_min != null ? String(currentLog.light_min) : "230",
      awake_min: currentLog?.awake_min != null ? String(currentLog.awake_min) : "15",
      hrv_rmssd: currentLog?.hrv_rmssd != null ? String(currentLog.hrv_rmssd) : "58",
      resting_hr: currentLog?.resting_hr != null ? String(currentLog.resting_hr) : "58",
      sleep_start: currentLog?.sleep_start || "23:45",
      sleep_end: currentLog?.sleep_end || "07:15",
    });
    setIsManualOpen(true);
  };

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    setSavingManual(true);
    try {
      const payload = {
        date: formData.date,
        hours: Number(formData.hours),
        score: Number(formData.score),
        quality: Math.max(1, Math.min(5, Math.round(Number(formData.score) / 20))),
        deep_min: Number(formData.deep_min) || 0,
        rem_min: Number(formData.rem_min) || 0,
        light_min: Number(formData.light_min) || 0,
        awake_min: Number(formData.awake_min) || 0,
        hrv_rmssd: formData.hrv_rmssd ? Number(formData.hrv_rmssd) : null,
        resting_hr: formData.resting_hr ? Number(formData.resting_hr) : null,
        sleep_start: formData.sleep_start || null,
        sleep_end: formData.sleep_end || null,
        source: "manual",
      };

      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando registro");

      if (data.log) {
        await saveLocalSleep(data.log).catch(() => {});
      }
      toast.push("success", "Noche guardada correctamente");
      setIsManualOpen(false);
      setSelectedDate(formData.date);
      await loadSleepData();
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSavingManual(false);
    }
  }

  // Geometría del anillo limpio de puntuación (0-100)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = nightView
    ? circumference - (Math.max(0, Math.min(100, nightView.score)) / 100) * circumference
    : circumference;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden flex flex-col gap-3 sm:gap-4">
      <PageHeader
        title="Sueño & Recuperación"
        description="Análisis nocturno de fases, biometría HRV/RHR y balance semanal de descanso."
        actions={
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
          >
            <Upload size={14} />
            <span>+ Importar CSV Zepp</span>
          </button>
        }
      />

      {/* 1. SELECTOR COMPACTO DE FECHA / NOCHE + ACCESO DISCRETO ZEPP EN MÓVIL */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setSelectedDate((d) => addDays(d, -1));
            }}
            aria-label="Noche anterior"
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="px-2 min-w-0 flex items-center gap-1.5">
            <Moon size={14} className="text-red-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
              {formatNightLabel(selectedDate, today)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.light();
              if (selectedDate < today) setSelectedDate((d) => addDays(d, 1));
            }}
            disabled={selectedDate >= today}
            aria-label="Noche siguiente"
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDate !== today && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 cursor-pointer"
            >
              Anoche
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 cursor-pointer"
          >
            <Upload size={12} />
            <span>+ CSV Zepp</span>
          </button>
        </div>
      </div>

      {/* ESTADO CARGANDO */}
      {loading && logs.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex items-center justify-center gap-2 text-xs text-zinc-500">
          <div className="spinner" />
          <span>Cargando registros de sueño…</span>
        </div>
      ) : !nightView ? (
        /* ESTADO VACÍO LIMPIO SI NO HAY DATOS PARA LA FECHA */
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
            <BedDouble size={22} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900">
              Sin registro de sueño para esta fecha
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Sincroniza ZeppBridge en tu PC o importa directamente un archivo CSV/JSON exportado desde Zepp.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto pt-1">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
            >
              <Upload size={14} />
              <span>+ Importar CSV Zepp</span>
            </button>
            <button
              type="button"
              onClick={openManualModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Registrar manual</span>
            </button>
          </div>
          {latestAvailableLog && latestAvailableLog.date !== selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(latestAvailableLog.date)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 pt-1 cursor-pointer"
            >
              <span>Ver última noche registrada ({latestAvailableLog.date})</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 2. TARJETA PRINCIPAL: RESUMEN DE LA NOCHE Y PUNTUACIÓN */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between gap-3">
              {/* Anillo de puntuación */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke="#F4F4F5"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={nightView.score >= 70 ? "#18181B" : "#DC2626"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-zinc-900 leading-none tabular-nums">
                    {nightView.score}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mt-0.5">
                    Score
                  </span>
                </div>
              </div>

              {/* Dato central + horario */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Tiempo total dormido
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight tabular-nums mt-0.5">
                  {formatHoursHM(nightView.hours)}
                </div>
                {(nightView.sleepStart || nightView.sleepEnd) && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 mt-1">
                    <Clock size={12} className="text-zinc-400 shrink-0" />
                    <span className="tabular-nums">
                      {nightView.sleepStart || "—"} → {nightView.sleepEnd || "—"}
                    </span>
                  </div>
                )}
              </div>

              {/* Edición rápida discreta */}
              <button
                type="button"
                onClick={openManualModal}
                className="self-start px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 shrink-0 cursor-pointer"
              >
                Editar
              </button>
            </div>

            {/* Badge de estado de recuperación */}
            <div
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${nightView.verdict.badgeClass}`}
            >
              <span>{nightView.verdict.label}</span>
              <span className="text-[11px] opacity-80 shrink-0 tabular-nums">
                Obj: 8h 00m
              </span>
            </div>
          </div>

          {/* 3. DESGLOSE DE FASES DEL SUEÑO */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 uppercase tracking-wide">
                Fases del Sueño
              </h2>
              <span className="text-[11px] font-medium text-zinc-500">
                {nightView.hasStages ? "Reparto nocturno" : "Sin desglose detallado"}
              </span>
            </div>

            {nightView.hasStages ? (
              <>
                <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-zinc-100">
                  {nightView.deepPct > 0 && (
                    <div
                      style={{ width: `${nightView.deepPct}%`, backgroundColor: "#DC2626" }}
                      title={`Profundo ${nightView.deepPct}%`}
                    />
                  )}
                  {nightView.remPct > 0 && (
                    <div
                      style={{ width: `${nightView.remPct}%`, backgroundColor: "#52525B" }}
                      title={`REM ${nightView.remPct}%`}
                    />
                  )}
                  {nightView.lightPct > 0 && (
                    <div
                      style={{ width: `${nightView.lightPct}%`, backgroundColor: "#A1A1AA" }}
                      title={`Ligero ${nightView.lightPct}%`}
                    />
                  )}
                  {nightView.awakePct > 0 && (
                    <div
                      style={{ width: `${nightView.awakePct}%`, backgroundColor: "#E4E4E7" }}
                      title={`Despierto ${nightView.awakePct}%`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Profundo",
                      min: nightView.deep,
                      pct: nightView.deepPct,
                      color: "#DC2626",
                    },
                    {
                      label: "REM",
                      min: nightView.rem,
                      pct: nightView.remPct,
                      color: "#52525B",
                    },
                    {
                      label: "Ligero",
                      min: nightView.light,
                      pct: nightView.lightPct,
                      color: "#A1A1AA",
                    },
                    {
                      label: "Despierto",
                      min: nightView.awake,
                      pct: nightView.awakePct,
                      color: "#E4E4E7",
                    },
                  ].map((st) => (
                    <div
                      key={st.label}
                      className="min-w-0 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: st.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-zinc-500 truncate">
                          {st.label}
                        </div>
                        <div className="text-xs font-bold text-zinc-900 tabular-nums truncate">
                          {formatDurationHM(st.min)} · {st.pct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-500">
                Este registro no incluye minutos por fase (Profundo/REM/Ligero). Puedes editar la noche o importar el CSV completo de Zepp.
              </p>
            )}
          </div>

          {/* 4. BIOMETRÍA NOCTURNA (2x2 COMPACTO 390px) */}
          <div className="grid grid-cols-2 gap-2.5 min-w-0">
            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                <HeartPulse size={13} className="text-red-600 shrink-0" />
                <span className="truncate">FC en Reposo</span>
              </div>
              <div className="text-lg font-extrabold text-zinc-900 tabular-nums mt-1">
                {nightView.rhr != null ? `${nightView.rhr} lpm` : "—"}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">Mínima nocturna</div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                <Activity size={13} className="text-zinc-700 shrink-0" />
                <span className="truncate">HRV / VFC</span>
              </div>
              <div className="text-lg font-extrabold text-zinc-900 tabular-nums mt-1">
                {nightView.hrv != null ? `${nightView.hrv} ms` : "—"}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">Sistema nervioso</div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                <TrendingUp size={13} className="text-zinc-700 shrink-0" />
                <span className="truncate">Regularidad</span>
              </div>
              <div className="text-lg font-extrabold text-zinc-900 tabular-nums mt-1 truncate">
                {weeklyStats.consistencyDeltaMin != null
                  ? formatSignedMinutes(weeklyStats.consistencyDeltaMin)
                  : "—"}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">
                vs media 7d ({weeklyStats.avgHours ? formatHoursHM(weeklyStats.avgHours) : "—"})
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                <Moon size={13} className="text-zinc-700 shrink-0" />
                <span className="truncate">Deuda de Sueño</span>
              </div>
              <div
                className={`text-lg font-extrabold tabular-nums mt-1 truncate ${
                  weeklyStats.debtMinutes != null && weeklyStats.debtMinutes < -60
                    ? "text-red-600"
                    : "text-zinc-900"
                }`}
              >
                {weeklyStats.debtMinutes != null
                  ? formatSignedMinutes(weeklyStats.debtMinutes)
                  : "—"}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">Saldo 7d (obj. 8h)</div>
            </div>
          </div>
        </>
      )}

      {/* 5. TENDENCIA SEMANAL (ÚLTIMOS 7 DÍAS) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 uppercase tracking-wide">
              Tendencia Semanal (7 días)
            </h2>
            <p className="text-[11px] text-zinc-500">
              Horas dormidas · Línea roja en objetivo 8h
            </p>
          </div>
          {weeklyStats.avgHours != null && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-800 tabular-nums shrink-0">
              Media: {formatHoursHM(weeklyStats.avgHours)}
            </span>
          )}
        </div>

        <div className="w-full h-44 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats.days} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: "#71717A", fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 4, 8, 10]}
                tick={{ fill: "#71717A", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#F4F4F5" }}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E4E4E7",
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: "#18181B",
                }}
                formatter={(val) => [formatHoursHM(Number(val)), "Dormido"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
              />
              <ReferenceLine y={SLEEP_TARGET_HOURS} stroke="#DC2626" strokeDasharray="4 4" />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={28}>
                {weeklyStats.days.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={
                      entry.isSelected
                        ? "#DC2626"
                        : entry.hours >= SLEEP_TARGET_HOURS
                        ? "#18181B"
                        : "#71717A"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. PIE DISCRETO DE IMPORTACIÓN / REGISTRO */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-500">
        <button
          type="button"
          onClick={openManualModal}
          className="hover:text-zinc-800 font-medium underline underline-offset-2 cursor-pointer"
        >
          + Registrar noche manualmente
        </button>
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="hover:text-zinc-800 font-medium underline underline-offset-2 cursor-pointer"
        >
          + Importar CSV Zepp
        </button>
      </div>

      {/* MODAL IMPORTACIÓN ZEPP / FALLBACK */}
      <FallbackManualModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadSleepData}
      />

      {/* MODAL REGISTRO / EDICIÓN MANUAL */}
      {isManualOpen && (
        <Modal
          title={`Registrar Noche · ${formData.date}`}
          onClose={() => setIsManualOpen(false)}
        >
          <form onSubmit={handleSaveManual} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Fecha</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Horas</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="16"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Acostado</label>
                <Input
                  type="time"
                  value={formData.sleep_start}
                  onChange={(e) => setFormData({ ...formData, sleep_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Despertar</label>
                <Input
                  type="time"
                  value={formData.sleep_end}
                  onChange={(e) => setFormData({ ...formData, sleep_end: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Profundo (m)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.deep_min}
                  onChange={(e) => setFormData({ ...formData, deep_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">REM (m)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.rem_min}
                  onChange={(e) => setFormData({ ...formData, rem_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Ligero (m)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.light_min}
                  onChange={(e) => setFormData({ ...formData, light_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Despierto (m)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.awake_min}
                  onChange={(e) => setFormData({ ...formData, awake_min: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">Score</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">RHR (lpm)</label>
                <Input
                  type="number"
                  value={formData.resting_hr}
                  onChange={(e) => setFormData({ ...formData, resting_hr: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 uppercase">HRV (ms)</label>
                <Input
                  type="number"
                  value={formData.hrv_rmssd}
                  onChange={(e) => setFormData({ ...formData, hrv_rmssd: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <Button type="button" variant="ghost" onClick={() => setIsManualOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={savingManual}>
                Guardar Noche
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
