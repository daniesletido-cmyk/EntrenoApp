"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Clock,
  Activity,
  Heart,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Waves,
  Footprints,
  Flame,
  Dumbbell,
  Compass,
  ArrowRight,
  Zap,
  Info,
  ShieldCheck,
  RefreshCw,
  Share2,
} from "lucide-react";
import { WeeklyReportData, DailyReportItem } from "@/lib/weekly-report-generator";

const DISCIPLINE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  carrera: Footprints,
  natacion: Waves,
  crossfit: Flame,
  gimnasio: Dumbbell,
  caminata: Compass,
  descanso: Moon,
};

const DISCIPLINE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  carrera: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  natacion: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  crossfit: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  gimnasio: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  caminata: { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  descanso: { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

export default function InformeSemanalPage() {
  const [selectedWeek, setSelectedWeek] = useState("2026-10-26"); // Inicia mostrando la semana completada
  const [data, setData] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadReport = async (week: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-report?week=${week}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(selectedWeek);
  }, [selectedWeek]);

  const changeWeek = (direction: -1 | 1) => {
    const current = new Date(selectedWeek);
    current.setDate(current.getDate() + direction * 7);
    const newIso = current.toISOString().split("T")[0];
    setSelectedWeek(newIso);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-5 sm:py-8 px-3.5 sm:px-6 space-y-6 sm:space-y-8">
      {/* 1. Header con selector de semana y badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Análisis Profesional del Entrenador
            </span>
            {data?.isWeekComplete ? (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center gap-1">
                <CheckCircle2 size={12} /> Semana 100% Completada
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                <Activity size={12} /> Semana en Curso
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1.5">
            Informe Semanal de Rendimiento
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Balance integral de carga neuromuscular, telemetría de carrera, descanso Zepp y conclusiones tácticas.
          </p>
        </div>

        {/* Selector de semana */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 border border-white/10 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 text-center min-w-[130px]">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semana</div>
            <div className="text-xs sm:text-sm font-bold text-white font-mono">
              {data ? `${data.weekStart.slice(5)} al ${data.weekEnd.slice(5)}` : selectedWeek}
            </div>
          </div>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Semana siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={28} className="animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Analizando métricas de la semana...</p>
        </div>
      ) : data ? (
        <>
          {/* 2. Tarjeta Ejecutiva del Entrenador */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-white/10 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-white/10 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
                  <Award size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                      Veredicto del Entrenador
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs text-slate-400 font-medium">Evaluación Fisiológica</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                    {data.coachWeeklyConclusion.verdictTitle}
                  </h2>
                </div>
              </div>

              {/* Score de Asimilación */}
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 px-4 py-2.5 rounded-2xl self-stretch md:self-auto justify-between md:justify-start">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Asimilación Semanal</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono leading-none mt-0.5">
                    {data.coachWeeklyConclusion.score}<span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {data.coachWeeklyConclusion.score >= 90 ? "TOP" : "OK"}
                </div>
              </div>
            </div>

            {/* Narrativa del Entrenador */}
            <div className="relative mt-5 text-sm sm:text-base text-slate-200 leading-relaxed space-y-4">
              <p>{data.coachWeeklyConclusion.executiveSummary}</p>

              {/* Grid de Puntos Fuertes y Puntos a Vigilar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Sparkles size={14} /> Puntos Fuertes Conseguidos
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                    {data.coachWeeklyConclusion.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <AlertTriangle size={14} /> Alertas & Puntos a Vigilar
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                    {data.coachWeeklyConclusion.watchOuts.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Estrategia siguiente */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
                <TrendingUp size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Estrategia recomendada: </span>
                  {data.coachWeeklyConclusion.nextWeekStrategy}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Grid de KPIs de Alto Rendimiento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Carga Semanal</span>
                <Zap size={15} className="text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {data.stats.totalLoad}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>UA Foster</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-medium">Óptimo</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Volumen Total</span>
                <Footprints size={15} className="text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {data.stats.totalKm} <span className="text-xs font-normal text-slate-400">km</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {data.stats.totalHours} horas activas
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Sueño Zepp</span>
                <Moon size={15} className="text-sky-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {data.sleep.avgHours} <span className="text-xs font-normal text-slate-400">h/noche</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Score medio: <span className="text-sky-400 font-bold">{data.sleep.avgScore}/100</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Adherencia al Plan</span>
                <CheckCircle2 size={15} className="text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {data.stats.compliancePct}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {data.stats.completedSessions} de {data.stats.plannedSessions} sesiones
                </div>
              </div>
            </div>
          </div>

          {/* 4. Desglose Ultra Detallado Día a Día */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Desglose y Conclusiones Día a Día
                </h3>
                <p className="text-xs text-slate-400">
                  Análisis exhaustivo del trabajo ejecutado y veredicto diario individual.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {data.days.map((day) => {
                const Icon = DISCIPLINE_ICONS[day.discipline] || Activity;
                const colors = DISCIPLINE_COLORS[day.discipline] || DISCIPLINE_COLORS.carrera;
                const isRealizada = day.status === "realizada";

                return (
                  <div
                    key={day.id}
                    className="rounded-2xl bg-slate-900/70 border border-white/10 p-4 sm:p-6 space-y-4 hover:border-white/20 transition-all duration-150"
                  >
                    {/* Fila superior: Fecha, disciplina, badges y métricas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text} flex-shrink-0`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {day.dayName} {day.date.slice(5)}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-xs text-slate-400 capitalize">{day.discipline}</span>
                            {isRealizada ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Completado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Planificado
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                            {day.plannedCode || day.discipline}
                          </h4>
                        </div>
                      </div>

                      {/* Métricas del día */}
                      <div className="flex items-center gap-4 text-xs font-mono self-start sm:self-auto">
                        {day.distanceKm ? (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Distancia</div>
                            <div className="text-white font-bold">{day.distanceKm.toFixed(2)} km</div>
                          </div>
                        ) : null}
                        {day.durationMin ? (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Duración</div>
                            <div className="text-white font-bold">{day.durationMin.toFixed(0)} min</div>
                          </div>
                        ) : null}
                        {day.rpe ? (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">RPE</div>
                            <div className="text-amber-400 font-bold">{day.rpe.toFixed(1)}/10</div>
                          </div>
                        ) : null}
                        {day.load > 0 ? (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Carga</div>
                            <div className="text-emerald-400 font-bold">{day.load} UA</div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Telemetría FIT si está disponible */}
                    {day.fitSummary && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                        {day.fitSummary.avgPace && (
                          <div>
                            <span className="text-[10px] text-slate-500 block font-sans">Ritmo Medio</span>
                            <span className="text-white font-bold">{day.fitSummary.avgPace}</span>
                          </div>
                        )}
                        {day.fitSummary.avgHr && (
                          <div>
                            <span className="text-[10px] text-slate-500 block font-sans">FC Media / Máx</span>
                            <span className="text-rose-400 font-bold">
                              {day.fitSummary.avgHr} / {day.fitSummary.maxHr ?? "—"} lpm
                            </span>
                          </div>
                        )}
                        {day.fitSummary.elevationGainM !== null && day.fitSummary.elevationGainM !== undefined && (
                          <div>
                            <span className="text-[10px] text-slate-500 block font-sans">Desnivel (+)</span>
                            <span className="text-teal-400 font-bold">+{Math.round(day.fitSummary.elevationGainM)} m</span>
                          </div>
                        )}
                        {day.fitSummary.cadence && (
                          <div>
                            <span className="text-[10px] text-slate-500 block font-sans">Cadencia</span>
                            <span className="text-purple-400 font-bold">{day.fitSummary.cadence} ppm</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CAJA DESTACADA: Conclusión Diaria del Entrenador */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400 flex-shrink-0" />
                        <h5 className="text-xs sm:text-sm font-bold text-emerald-400">
                          {day.coachConclusion.title}
                        </h5>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {day.coachConclusion.analysis}
                      </p>
                      <div className="pt-1 text-[11px] sm:text-xs text-emerald-300/90 font-medium flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">💡 Clave:</span>
                        <span>{day.coachConclusion.takeaway}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
