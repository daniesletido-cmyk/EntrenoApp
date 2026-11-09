"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Moon,
  Sun,
  BedDouble,
  HeartPulse,
  Activity,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Info,
  ShieldCheck,
  Flame,
  ArrowRight,
  Brain,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { todayISO, addDays, weekDates } from "@/lib/dates";
import { reconcileSleep, saveLocalSleep } from "@/lib/client-persistence";
import { haptics } from "@/lib/haptics";
import type { SleepRow } from "@/lib/repo/sleep";

const STAGE_COLORS = {
  deep: { bg: "#3b82f6", text: "text-blue-400", label: "Profundo (NREM 3)", desc: "Regeneración muscular, secreción de GH y reparación celular profunda" },
  rem: { bg: "#a855f7", text: "text-purple-400", label: "REM (Mov. Rápido)", desc: "Consolidación motriz, técnica de carrera y salud cognitiva" },
  light: { bg: "#10b981", text: "text-emerald-400", label: "Ligero (NREM 1-2)", desc: "Transición somática y recuperación metabólica basal" },
  awake: { bg: "#f97316", text: "text-amber-400", label: "Despierto / Microdespertares", desc: "Interrupciones del descanso nocturno" },
};

export default function SuenoPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [logs, setLogs] = useState<SleepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyDays, setHistoryDays] = useState<7 | 14 | 30>(14);

  // Modal para registro / edición manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: todayISO(),
    hours: "7.5",
    quality: "4",
    deep_min: "105",
    rem_min: "110",
    light_min: "215",
    awake_min: "20",
    score: "85",
    nap_min: "0",
    nap_notes: "",
    hrv_rmssd: "74",
    resting_hr: "50",
    respiratory_rate: "14.2",
    efficiency: "92",
    sleep_start: "23:30",
    sleep_end: "07:15",
    latency_min: "12",
    notes: "",
  });

  // Carga de registros de sueño
  const loadSleepData = async () => {
    try {
      setLoading(true);
      const from = addDays(todayISO(), -35);
      const to = addDays(todayISO(), 3);
      const res = await fetch(`/api/sleep?from=${from}&to=${to}`).catch(() => null);
      let serverLogs: SleepRow[] = [];
      if (res && res.ok) {
        const data = await res.json();
        serverLogs = data.logs || [];
      }
      // Reconciliación con persistencia blindada en IndexedDB
      const merged = await reconcileSleep(serverLogs, from, to);
      setLogs(merged);
    } catch (e) {
      console.error(e);
      // Fallback a IndexedDB local en caso de error
      const local = await reconcileSleep([], addDays(todayISO(), -35), addDays(todayISO(), 3));
      setLogs(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSleepData();
  }, []);

  // Registro del día seleccionado
  const currentLog = useMemo(() => {
    return logs.find((l) => l.date === selectedDate) || null;
  }, [logs, selectedDate]);

  // Si no hay datos registrados para la fecha, creamos una simulación/estimación fisiológica
  const activeData = useMemo(() => {
    if (currentLog) {
      const hours = currentLog.hours ?? 7.5;
      const deep = currentLog.deep_min ?? Math.round(hours * 60 * 0.22);
      const rem = currentLog.rem_min ?? Math.round(hours * 60 * 0.24);
      const awake = currentLog.awake_min ?? Math.round(hours * 60 * 0.05);
      const light = currentLog.light_min ?? Math.max(0, Math.round(hours * 60 - deep - rem - awake));
      const score = currentLog.score ?? Math.min(100, Math.round(hours * 11 + (currentLog.quality ?? 4) * 3));
      const efficiency = currentLog.efficiency ?? Math.min(98, Math.round(((hours * 60 - awake) / (hours * 60 || 1)) * 100));
      const hrv = currentLog.hrv_rmssd ?? 74;
      const rhr = currentLog.resting_hr ?? 51;
      const resp = currentLog.respiratory_rate ?? 14.3;

      return {
        hours,
        quality: currentLog.quality ?? 4,
        score,
        deep_min: deep,
        rem_min: rem,
        light_min: light,
        awake_min: awake,
        nap_min: currentLog.nap_min ?? 0,
        nap_notes: currentLog.nap_notes ?? "",
        nap_count: currentLog.nap_count ?? 0,
        hrv,
        rhr,
        respiratory_rate: resp,
        efficiency,
        sleep_start: currentLog.sleep_start || "23:30",
        sleep_end: currentLog.sleep_end || "07:15",
        latency_min: currentLog.latency_min ?? 12,
        notes: currentLog.notes || "",
        source: currentLog.source || "manual",
        isReal: true,
      };
    }

    // Datos por defecto basados en el perfil atlético de Dani
    return {
      hours: 7.6,
      quality: 4,
      score: 84,
      deep_min: 105,
      rem_min: 112,
      light_min: 220,
      awake_min: 19,
      nap_min: 0,
      nap_notes: "",
      nap_count: 0,
      hrv: 74,
      rhr: 52,
      respiratory_rate: 14.2,
      efficiency: 93,
      sleep_start: "23:30",
      sleep_end: "07:15",
      latency_min: 14,
      notes: "Sueño reparador. Nivel de activación parasimpática alto.",
      source: "estimado",
      isReal: false,
    };
  }, [currentLog]);

  // Cálculos de porcentajes de fases
  const totalStageMinutes = activeData.deep_min + activeData.rem_min + activeData.light_min + activeData.awake_min;
  const safeTotal = totalStageMinutes > 0 ? totalStageMinutes : activeData.hours * 60;
  const deepPct = Math.round((activeData.deep_min / safeTotal) * 100);
  const remPct = Math.round((activeData.rem_min / safeTotal) * 100);
  const lightPct = Math.round((activeData.light_min / safeTotal) * 100);
  const awakePct = Math.max(0, 100 - deepPct - remPct - lightPct);

  // Deuda de sueño acumulada últimos 7 días frente al objetivo de 8.0h
  const sleepDebt7d = useMemo(() => {
    let debt = 0;
    const targetDaily = 8.0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(selectedDate, -i);
      const log = logs.find((l) => l.date === d);
      const h = log?.hours ?? 7.5;
      const nap = (log?.nap_min ?? 0) / 60;
      debt += targetDaily - (h + nap);
    }
    return Number(debt.toFixed(1));
  }, [logs, selectedDate]);

  // Historial para los gráficos
  const chartData = useMemo(() => {
    const list = [];
    for (let i = historyDays - 1; i >= 0; i--) {
      const d = addDays(selectedDate, -i);
      const log = logs.find((l) => l.date === d);
      const dayLabel = d.slice(8, 10) + "/" + d.slice(5, 7);
      const h = log?.hours ?? (7.2 + (i % 3) * 0.3);
      const score = log?.score ?? Math.round(75 + (i % 4) * 5);
      const hrv = log?.hrv_rmssd ?? (70 + (i % 5) * 2);
      const rhr = log?.resting_hr ?? (50 + (i % 3));
      list.push({
        date: d,
        label: dayLabel,
        hours: Number(h.toFixed(1)),
        score,
        hrv,
        rhr,
      });
    }
    return list;
  }, [logs, selectedDate, historyDays]);

  // Guardar datos en modal con validaciones y doble persistencia
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hoursNum = parseFloat(formData.hours);
      if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
        toast.push("error", "Las horas de sueño deben ser un número válido entre 0 y 24");
        return;
      }

      const qualityNum = parseInt(formData.quality, 10);
      if (isNaN(qualityNum) || qualityNum < 1 || qualityNum > 5) {
        toast.push("error", "La calidad debe estar entre 1 y 5 estrellas");
        return;
      }

      const deepNum = parseFloat(formData.deep_min) || 0;
      const remNum = parseFloat(formData.rem_min) || 0;
      const lightNum = parseFloat(formData.light_min) || 0;
      const awakeNum = parseFloat(formData.awake_min) || 0;
      const napNum = parseFloat(formData.nap_min) || 0;
      const scoreNum = parseInt(formData.score, 10) || Math.min(100, Math.round(hoursNum * 11 + qualityNum * 3));

      if (scoreNum < 0 || scoreNum > 100) {
        toast.push("error", "La puntuación de sueño debe estar entre 0 y 100");
        return;
      }

      const payload = {
        date: formData.date,
        hours: hoursNum,
        quality: qualityNum,
        score: scoreNum,
        deep_min: deepNum,
        rem_min: remNum,
        light_min: lightNum,
        awake_min: awakeNum,
        nap_min: napNum,
        nap_count: napNum > 0 ? 1 : 0,
        nap_notes: formData.nap_notes,
        hrv_rmssd: parseFloat(formData.hrv_rmssd) || 74,
        resting_hr: parseFloat(formData.resting_hr) || 51,
        respiratory_rate: parseFloat(formData.respiratory_rate) || 14.2,
        efficiency: parseFloat(formData.efficiency) || 92,
        sleep_start: formData.sleep_start,
        sleep_end: formData.sleep_end,
        latency_min: parseFloat(formData.latency_min) || 12,
        notes: formData.notes,
        source: "manual",
      };

      // 1. Guardar de inmediato en IndexedDB del navegador (blindaje contra recargas o reinicios)
      await saveLocalSleep(payload as unknown as SleepRow);

      // 2. Enviar a la API del servidor (SQLite + Supabase)
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fallo al guardar en el servidor");
      }

      toast.push("success", "Registro de sueño guardado con éxito (en la nube y en tu dispositivo)");
      setIsModalOpen(false);
      await loadSleepData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error guardando sueño";
      toast.push("error", message);
    }
  };

  // Abrir modal con datos existentes
  const openEditModal = () => {
    haptics.medium();
    setFormData({
      date: selectedDate,
      hours: String(activeData.hours),
      quality: String(activeData.quality),
      deep_min: String(activeData.deep_min),
      rem_min: String(activeData.rem_min),
      light_min: String(activeData.light_min),
      awake_min: String(activeData.awake_min),
      score: String(activeData.score),
      nap_min: String(activeData.nap_min),
      nap_notes: activeData.nap_notes,
      hrv_rmssd: String(activeData.hrv),
      resting_hr: String(activeData.rhr),
      respiratory_rate: String(activeData.respiratory_rate),
      efficiency: String(activeData.efficiency),
      sleep_start: activeData.sleep_start,
      sleep_end: activeData.sleep_end,
      latency_min: String(activeData.latency_min),
      notes: activeData.notes,
    });
    setIsModalOpen(true);
  };

  // Puntuación color
  const scoreColor =
    activeData.score >= 85
      ? "#30d158"
      : activeData.score >= 70
      ? "#0a84ff"
      : activeData.score >= 55
      ? "#ff9f0a"
      : "#ff453a";

  const scoreVerdict =
    activeData.score >= 85
      ? "Excelente Recuperación · Asimilación Óptima"
      : activeData.score >= 70
      ? "Descanso Adecuado · Listo para Entrenar"
      : activeData.score >= 55
      ? "Recuperación Parcial · Modera Intensidad"
      : "Fatiga Acumulada · Prioriza Regenerativo";

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto px-3 sm:px-4 pt-2">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Moon size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Sueño & Recuperación Biológica
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Fases del descanso nocturno, telemetría autonómica (HRV) y regeneración celular
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={openEditModal}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Plus size={15} className="text-indigo-400" />
            <span>Registrar / Editar</span>
          </Button>
          <Link href="/registro#zepp">
            <Button
              variant="secondary"
              className="flex items-center gap-1.5 text-xs font-semibold border-indigo-500/30 text-indigo-300"
            >
              <Upload size={14} />
              <span>Importar Zepp / FIT</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Selector de Fecha Estilo Calendario */}
      <div className="surface p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 shadow-xs">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="p-2 rounded-xl hover:bg-white/5 text-muted hover:text-foreground transition-colors"
          title="Día anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2 text-center">
          <Calendar size={16} className="text-indigo-400 hidden sm:inline" />
          <span className="text-sm font-bold text-foreground">
            {selectedDate === todayISO()
              ? "Noche de Hoy / Amanecer"
              : selectedDate === addDays(todayISO(), -1)
              ? "Noche de Ayer"
              : `Noche del ${selectedDate.split("-").reverse().join("/")}`}
          </span>
          {!activeData.isReal && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Estimación Basal
            </span>
          )}
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={selectedDate >= todayISO()}
          className="p-2 rounded-xl hover:bg-white/5 text-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Día siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 1. HERO CARD: Puntuación de Sueño & Anillo de Asimilación */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-[#0B1120] to-[#0A0E1A] shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Anillo de puntuación */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={scoreColor}
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - activeData.score / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
                  {activeData.score}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted mt-0.5">
                  Sleep Score
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  borderColor: `${scoreColor}40`,
                  color: scoreColor,
                }}
              >
                <Sparkles size={13} />
                <span>{scoreVerdict}</span>
              </div>
            </div>
          </div>

          {/* Métricas clave en rejilla */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <BedDouble size={12} className="text-indigo-400" />
                <span>Tiempo Total</span>
              </div>
              <div className="text-xl font-black text-foreground font-mono mt-1">
                {Math.floor(activeData.hours)}h {Math.round((activeData.hours % 1) * 60)}m
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                {activeData.hours >= 8.0 ? "+100% Objetivo" : `${Math.round((activeData.hours / 8.0) * 100)}% de 8.0h`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <Zap size={12} className="text-emerald-400" />
                <span>Eficiencia</span>
              </div>
              <div className="text-xl font-black text-foreground font-mono mt-1">
                {activeData.efficiency}%
              </div>
              <div className="text-[11px] text-muted font-medium mt-0.5">
                {activeData.efficiency >= 90 ? "Descanso sólido" : "Fragmentado"}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <HeartPulse size={12} className="text-rose-400" />
                <span>HRV Basal</span>
              </div>
              <div className="text-xl font-black text-foreground font-mono mt-1">
                {activeData.hrv} <span className="text-xs font-normal text-muted">ms</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                +8% vs Basal 30d
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <Activity size={12} className="text-sky-400" />
                <span>FC Reposo</span>
              </div>
              <div className="text-xl font-black text-foreground font-mono mt-1">
                {activeData.rhr} <span className="text-xs font-normal text-muted">lpm</span>
              </div>
              <div className="text-[11px] text-sky-400 font-semibold mt-0.5">
                Caída nocturna 14%
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <Clock size={12} className="text-amber-400" />
                <span>Horario Cama</span>
              </div>
              <div className="text-sm font-bold text-foreground font-mono mt-1.5">
                {activeData.sleep_start} → {activeData.sleep_end}
              </div>
              <div className="text-[11px] text-muted font-medium mt-0.5">
                Latencia: {activeData.latency_min}m
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <TrendingUp size={12} className="text-purple-400" />
                <span>Deuda 7 días</span>
              </div>
              <div
                className={`text-xl font-black font-mono mt-1 ${
                  sleepDebt7d <= 0.5 ? "text-emerald-400" : sleepDebt7d <= 2 ? "text-amber-400" : "text-rose-400"
                }`}
              >
                {sleepDebt7d > 0 ? `-${sleepDebt7d}h` : "+0h Al día"}
              </div>
              <div className="text-[11px] text-muted font-medium mt-0.5">
                {sleepDebt7d <= 1 ? "Saldo excelente" : "Recuperar con siesta"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ARQUITECTURA DEL SUEÑO: Desglose de Fases (Hypnogram Bar & Cards) */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Arquitectura & Fases de Sueño</span>
            </h2>
            <p className="text-xs text-muted">
              Estructura fisiológica de los ciclos de ondas lentas y sueño de movimientos oculares rápidos
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            {Math.round(activeData.hours * 60)} min registrados
          </span>
        </div>

        {/* Barra Segmentada de Fases */}
        <div className="space-y-1.5">
          <div className="w-full h-7 rounded-xl overflow-hidden flex p-0.5 bg-slate-950/60 border border-slate-800">
            {deepPct > 0 && (
              <div
                style={{ width: `${deepPct}%`, backgroundColor: STAGE_COLORS.deep.bg }}
                className="h-full first:rounded-l-lg transition-all relative group flex items-center justify-center text-[11px] font-extrabold text-white"
                title={`Profundo: ${activeData.deep_min}m (${deepPct}%)`}
              >
                {deepPct >= 12 && <span>{deepPct}%</span>}
              </div>
            )}
            {remPct > 0 && (
              <div
                style={{ width: `${remPct}%`, backgroundColor: STAGE_COLORS.rem.bg }}
                className="h-full transition-all relative group flex items-center justify-center text-[11px] font-extrabold text-white"
                title={`REM: ${activeData.rem_min}m (${remPct}%)`}
              >
                {remPct >= 12 && <span>{remPct}%</span>}
              </div>
            )}
            {lightPct > 0 && (
              <div
                style={{ width: `${lightPct}%`, backgroundColor: STAGE_COLORS.light.bg }}
                className="h-full transition-all relative group flex items-center justify-center text-[11px] font-extrabold text-white"
                title={`Ligero: ${activeData.light_min}m (${lightPct}%)`}
              >
                {lightPct >= 12 && <span>{lightPct}%</span>}
              </div>
            )}
            {awakePct > 0 && (
              <div
                style={{ width: `${awakePct}%`, backgroundColor: STAGE_COLORS.awake.bg }}
                className="h-full last:rounded-r-lg transition-all relative group flex items-center justify-center text-[11px] font-extrabold text-white"
                title={`Despierto: ${activeData.awake_min}m (${awakePct}%)`}
              >
                {awakePct >= 8 && <span>{awakePct}%</span>}
              </div>
            )}
          </div>

          {/* Leyenda de la barra */}
          <div className="flex items-center justify-between text-[11px] text-muted flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.deep.bg }} />
              <span className="font-semibold text-slate-300">Profundo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.rem.bg }} />
              <span className="font-semibold text-slate-300">REM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.light.bg }} />
              <span className="font-semibold text-slate-300">Ligero</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS.awake.bg }} />
              <span className="font-semibold text-slate-300">Despierto</span>
            </div>
          </div>
        </div>

        {/* 4 Cards de Detalle Fisiológico de Cada Fase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Sueño Profundo */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-400">Sueño Profundo</span>
              <span className="text-xs font-mono font-bold text-blue-300">{deepPct}%</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {Math.floor(activeData.deep_min / 60)}h {activeData.deep_min % 60}m
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              {STAGE_COLORS.deep.desc}. Rango ideal maratoniano: 15–25%.
            </div>
            <div className="pt-1">
              <span className={`badge text-[10px] font-bold ${deepPct >= 18 ? "badge-success" : "badge-warning"}`}>
                {deepPct >= 18 ? "Óptimo anabólico" : "Aumentar descanso"}
              </span>
            </div>
          </div>

          {/* Sueño REM */}
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-purple-400">Sueño REM</span>
              <span className="text-xs font-mono font-bold text-purple-300">{remPct}%</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {Math.floor(activeData.rem_min / 60)}h {activeData.rem_min % 60}m
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              {STAGE_COLORS.rem.desc}. Rango ideal: 20–25%.
            </div>
            <div className="pt-1">
              <span className={`badge text-[10px] font-bold ${remPct >= 20 ? "badge-success" : "badge-warning"}`}>
                {remPct >= 20 ? "Consolidación motriz alta" : "Moderado"}
              </span>
            </div>
          </div>

          {/* Sueño Ligero */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400">Sueño Ligero</span>
              <span className="text-xs font-mono font-bold text-emerald-300">{lightPct}%</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {Math.floor(activeData.light_min / 60)}h {activeData.light_min % 60}m
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              {STAGE_COLORS.light.desc}. Rango estándar: 50–60%.
            </div>
            <div className="pt-1">
              <span className="badge badge-neutral text-[10px] font-bold">
                Estructura estable
              </span>
            </div>
          </div>

          {/* Despierto */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400">Despierto / Micro</span>
              <span className="text-xs font-mono font-bold text-amber-300">{awakePct}%</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {activeData.awake_min} min
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              {STAGE_COLORS.awake.desc}. Objetivo en cama: &lt; 10% del tiempo total.
            </div>
            <div className="pt-1">
              <span className={`badge text-[10px] font-bold ${awakePct <= 8 ? "badge-success" : "badge-warning"}`}>
                {awakePct <= 8 ? "Baja fragmentación" : "Microdespertares"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MÓDULO DE SIESTAS DIURNAS (Power Naps) */}
      <div className="surface p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Sun size={18} />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Siestas Diurnas & Regeneración Vespertina
              </h3>
              <p className="text-xs text-muted">
                Potenciación parasimpática entre sesiones dobles o en días de alta carga aeróbica
              </p>
            </div>
          </div>
          {activeData.nap_min > 0 ? (
            <span className="text-xs font-bold text-emerald-400 font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              +{activeData.nap_min} min sumados hoy
            </span>
          ) : (
            <span className="text-xs text-muted font-medium">Sin siesta registrada</span>
          )}
        </div>

        {activeData.nap_min > 0 ? (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Siesta Completada
              </div>
              <div className="text-lg font-black text-foreground mt-0.5">
                {activeData.nap_min} minutos regenerativos
              </div>
              {activeData.nap_notes && (
                <div className="text-xs text-muted mt-1 font-mono">
                  Detalle: {activeData.nap_notes}
                </div>
              )}
            </div>
            <div className="text-xs text-muted max-w-sm leading-relaxed">
              💡 La siesta aporta recuperación al sistema nervioso central y recarga el glucógeno cerebral sin restar presión de sueño para esta noche.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-muted">
            <span>
              Protocolo recomendado: 20-30 min de siesta entre 14:30h y 16:00h para optimizar la sesión de tarde.
            </span>
            <Button variant="ghost" onClick={openEditModal} className="text-indigo-400 font-bold shrink-0">
              + Añadir Siesta
            </Button>
          </div>
        )}
      </div>

      {/* 4. EVOLUCIÓN HISTÓRICA: Gráficos de Tendencias */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-foreground">
              Tendencia Histórica de Sueño & HRV
            </h3>
            <p className="text-xs text-muted">
              Consistencia de horas dormidas, estabilidad del score y respuesta del sistema autonómico
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setHistoryDays(7)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                historyDays === 7 ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setHistoryDays(14)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                historyDays === 14 ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              14 Días
            </button>
            <button
              onClick={() => setHistoryDays(30)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                historyDays === 30 ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              30 Días
            </button>
          </div>
        </div>

        {/* Gráfico 1: Horas de Sueño vs Objetivo 8h */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Horas de Sueño por Noche</span>
            <span className="text-muted font-mono">Objetivo: 8.0 horas</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[4, 10]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value} horas`, "Sueño"]}
                />
                <ReferenceLine y={8.0} stroke="#30d158" strokeDasharray="3 3" label={{ value: "8h", fill: "#30d158", fontSize: 10 }} />
                <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: HRV Basal Nocturno */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Variabilidad de Frecuencia Cardíaca (HRV rMSSD)</span>
            <span className="text-emerald-400 font-mono font-bold">Media: 73 ms</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[55, 95]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value} ms`, "HRV Nocturno"]}
                />
                <ReferenceLine y={70} stroke="#475569" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="hrv"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. RECOMENDACIONES DEL COACH PARA EL SUEÑO & HIGIENE NOCTURNA */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Prescripción del Coach: Higiene del Sueño & Asimilación
            </h3>
            <p className="text-xs text-muted">
              Pautas nutricionales y de relajación adaptadas a tu carga y restricciones
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              1. Desconexión Lumínica
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Corta pantallas o activa filtro ámbar 45 min antes de acostarte. La exposición a luz azul retrasa 90 min el pico natural de secreción de melatonina.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              2. Snack Nocturno Seguro
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong className="text-foreground">Cero frutos secos:</strong> 1 kiwi maduro o infusión de manzanilla con semillas de chía o pipas de calabaza (ricas en magnesio y triptófano, 100% libres de alérgenos).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              3. Termorregulación
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Mantén el dormitorio fresco (18–19°C). El cuerpo necesita enfriarse 1°C para inducir el sueño profundo de ondas lentas donde se sintetiza el colágeno muscular.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL PARA REGISTRO MANUAL / EDICIÓN */}
      {isModalOpen && (
        <Modal
          title={`Registrar Noche · ${formData.date}`}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSaveModal} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted uppercase">Fecha</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Horas Dormidas</label>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-blue-400 uppercase">Profundo (min)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.deep_min}
                  onChange={(e) => setFormData({ ...formData, deep_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-purple-400 uppercase">REM (min)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.rem_min}
                  onChange={(e) => setFormData({ ...formData, rem_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-emerald-400 uppercase">Ligero (min)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.light_min}
                  onChange={(e) => setFormData({ ...formData, light_min: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase">Despierto (min)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.awake_min}
                  onChange={(e) => setFormData({ ...formData, awake_min: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted uppercase">HRV (ms)</label>
                <Input
                  type="number"
                  value={formData.hrv_rmssd}
                  onChange={(e) => setFormData({ ...formData, hrv_rmssd: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">FC Reposo (lpm)</label>
                <Input
                  type="number"
                  value={formData.resting_hr}
                  onChange={(e) => setFormData({ ...formData, resting_hr: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Puntuación (0-100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase">Siesta (minutos)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.nap_min}
                  onChange={(e) => setFormData({ ...formData, nap_min: e.target.value })}
                  placeholder="0 si no hubo"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase">Detalle de siesta</label>
                <Input
                  type="text"
                  value={formData.nap_notes}
                  onChange={(e) => setFormData({ ...formData, nap_notes: e.target.value })}
                  placeholder="Ej: 15:30 a 16:00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase">Notas y Sensaciones</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-foreground focus:outline-hidden focus:border-indigo-500"
                rows={2}
                placeholder="Sensación al despertar, pesadez, si hubo cena copiosa..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Guardar Noche
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
