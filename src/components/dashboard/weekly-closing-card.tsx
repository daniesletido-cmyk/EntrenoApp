"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Footprints,
  Flame,
  Activity,
  ShieldCheck,
  Bell,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { WeeklyClosingSummary } from "@/lib/weekly-closing";

export function WeeklyClosingCard() {
  const [data, setData] = useState<WeeklyClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [sendingPush, setSendingPush] = useState(false);
  const toast = useToast();

  const loadClosing = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/weekly-closing");
      const json = await res.json();
      if (json.success && json.summary) {
        setData(json.summary);
      }
    } catch (err) {
      console.error("Error al cargar cierre semanal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClosing();
  }, []);

  const handleApplyDischarge = async () => {
    if (!data?.nextMonday) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/weekly-closing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply_discharge",
            nextMonday: data.nextMonday,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.push("success", "Sesión del lunes adaptada a descarga regenerativa R0");
          await loadClosing();
        } else {
          toast.push("error", json.error || "No se pudo adaptar la sesión");
        }
      } catch {
        toast.push("error", "Error de red al aplicar descarga");
      }
    });
  };

  const handleSendPush = async () => {
    if (!data) return;
    setSendingPush(true);
    try {
      const res = await fetch("/api/weekly-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "notify",
          weekStart: data.weekStart,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.push("success", "Notificación push 'Resumen semanal listo' enviada");
      } else {
        toast.push("error", "No se pudo enviar la notificación");
      }
    } catch {
      toast.push("error", "Error al enviar notificación push");
    } finally {
      setSendingPush(false);
    }
  };

  if (loading) {
    return (
      <div className="surface p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-pulse space-y-3">
        <div className="h-6 w-52 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
        <div className="h-16 w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const isOptimal = data.verdict.status === "asimilacion_optima";

  return (
    <div className="surface p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Cierre y Análisis Semanal
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                  isOptimal
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                {isOptimal ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {isOptimal ? "Semana Asimilada" : "Descarga Recomendada"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Evaluación de adherencia, carga total, sueño Zepp y sensaciones Suunto
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendPush}
          disabled={sendingPush}
          className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          title="Enviar notificación push 'Resumen semanal listo'"
        >
          <Bell size={13} className={sendingPush ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Push Resumen</span>
        </button>
      </div>

      {/* Grid de 4 KPIs Semanales Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Adherencia */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Adherencia al Plan</div>
          <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {data.stats.compliancePct}%
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {data.stats.completedSessions}/{data.stats.plannedSessions} sesiones
            {data.stats.adaptedSessions > 0 && ` · ${data.stats.adaptedSessions} adapt.`}
          </div>
        </div>

        {/* Carga & Kilometraje */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Volumen & Carga</div>
          <div className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-0.5">
            {data.stats.totalKm} km
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {data.stats.totalLoad} pts Foster
          </div>
        </div>

        {/* Sueño Zepp */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Sueño Zepp / Helio</div>
          <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
            {data.sleep.avgHours ? `${data.sleep.avgHours}h` : "—"}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {data.sleep.avgScore ? `Score: ${data.sleep.avgScore}/100` : "Media semana"}
          </div>
        </div>

        {/* Sensaciones Suunto */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Sensaciones Suunto</div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
            RPE {data.stats.avgRpe ?? "—"}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {data.suuntoSensations.reportedFatigue ? "Tensión / Fatiga" : "Buena asimilación"}
          </div>
        </div>
      </div>

      {/* Veredicto del Equipo Técnico Multidisciplinar */}
      <div
        className={`p-4 rounded-2xl border space-y-2.5 ${
          isOptimal
            ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
            : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <ShieldCheck size={16} className={isOptimal ? "text-emerald-600" : "text-amber-600"} />
            <span>Veredicto del Equipo Técnico (Preparador Físico + Fisioterapeuta)</span>
          </div>
        </div>

        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
          {data.verdict.summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="font-bold text-red-600 dark:text-red-400 text-[11px] mb-1">
              🏃 Preparador Físico de Élite
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
              {data.verdict.coachVerdict}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="font-bold text-sky-600 dark:text-sky-400 text-[11px] mb-1">
              🩺 Fisioterapeuta Deportivo
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
              {data.verdict.physioVerdict}
            </p>
          </div>
        </div>

        {/* Barra de Acción / Calibración del Lunes */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <div className="text-[11px] text-zinc-500">
            Semana entrante arranca: <strong>{data.nextMonday}</strong>
          </div>

          {data.verdict.dischargeRecommended ? (
            data.verdict.nextMondayAdjusted ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check size={14} />
                Descarga regenerativa R0 aplicada en el lunes
              </span>
            ) : (
              <Button
                variant="primary"
                onClick={handleApplyDischarge}
                loading={isPending}
                className="text-xs py-2 px-3.5 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <TrendingDown size={14} />
                <span>Aplicar descarga el lunes</span>
              </Button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check size={14} />
              Plan del lunes confirmado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
