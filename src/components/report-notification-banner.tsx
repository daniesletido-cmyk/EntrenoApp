"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, BarChart3, ChevronRight, X, Sparkles, Award } from "lucide-react";
import { PushNotificationBanner } from "@/components/push/push-notification-banner";

export function ReportNotificationBanner() {
  const [reportData, setReportData] = useState<{
    isTodayComplete: boolean;
    isWeekComplete: boolean;
    todaySessionId: number | null;
    weekStart: string;
    todayDate: string;
    coachTitle?: string;
  } | null>(null);

  const [dismissedDaily, setDismissedDaily] = useState(true);
  const [dismissedWeekly, setDismissedWeekly] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkReports() {
      try {
        const res = await fetch("/api/weekly-report");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const today = new Date().toISOString().split("T")[0];
        const isDailyDismissed = localStorage.getItem(`entrenoapp_dismiss_daily_${today}`) === "1";
        const isWeeklyDismissed = localStorage.getItem(`entrenoapp_dismiss_weekly_${data.weekStart}`) === "1";

        setReportData({
          isTodayComplete: !!data.isTodayComplete,
          isWeekComplete: !!data.isWeekComplete,
          todaySessionId: data.todaySessionId ?? null,
          weekStart: data.weekStart,
          todayDate: today,
          coachTitle: data.coachWeeklyConclusion?.verdictTitle,
        });
        setDismissedDaily(isDailyDismissed);
        setDismissedWeekly(isWeeklyDismissed);
      } catch (err) {
        // Silencioso en caso de error de red
      }
    }

    checkReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismissDaily = () => {
    if (reportData) {
      localStorage.setItem(`entrenoapp_dismiss_daily_${reportData.todayDate}`, "1");
    }
    setDismissedDaily(true);
  };

  const handleDismissWeekly = () => {
    if (reportData) {
      localStorage.setItem(`entrenoapp_dismiss_weekly_${reportData.weekStart}`, "1");
    }
    setDismissedWeekly(true);
  };

  return (
    <>
      {/* Banner de activación/prueba de Notificaciones Push en el móvil */}
      <PushNotificationBanner variant="banner" />

      {/* 1. Banner Semanal si la semana está completada y no se ha descartado */}
      {reportData?.isWeekComplete && !dismissedWeekly && (
        <div className="w-full max-w-5xl mx-auto mb-4 px-3 sm:px-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-slate-900/90 border border-purple-500/30 p-3.5 sm:p-4 shadow-xl shadow-purple-950/30 backdrop-blur-md">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-inner mt-0.5 sm:mt-0">
                  <BarChart3 size={20} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Semana Finalizada
                    </span>
                    <span className="text-xs text-purple-200/60 font-medium">Balance disponible</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
                    📊 Tu informe semanal está listo
                  </h4>
                  <p className="text-xs text-purple-200/80 line-clamp-2 mt-0.5">
                    Balance de carga semanal, métricas de sueño Zepp y conclusiones del entrenador preparadas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-500/20">
                <Link
                  href="/informe-semanal"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-purple-500/20 active:scale-95"
                >
                  <span>Ver informe</span>
                  <ChevronRight size={14} />
                </Link>
                <button
                  onClick={handleDismissWeekly}
                  className="p-1.5 rounded-lg text-purple-300/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Cerrar notificación"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Banner Diario si el entreno de hoy está completado y no se ha descartado */}
      {reportData?.isTodayComplete && !dismissedDaily && (
        <div className="w-full max-w-5xl mx-auto mb-4 px-3 sm:px-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-slate-900/90 border border-emerald-500/30 p-3.5 sm:p-4 shadow-xl shadow-emerald-950/30 backdrop-blur-md">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner mt-0.5 sm:mt-0">
                  <CheckCircle2 size={20} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Entreno Completado
                    </span>
                    <span className="text-xs text-emerald-200/60 font-medium">Análisis listo</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
                    🎯 Tu informe del entreno de hoy está listo
                  </h4>
                  <p className="text-xs text-emerald-200/80 line-clamp-2 mt-0.5">
                    Conclusiones fisiológicas del entrenador, zonas de pulso y adaptaciones generadas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-500/20">
                <Link
                  href={reportData.todaySessionId ? `/entrenos/${reportData.todaySessionId}` : "/hoy"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <span>Ver análisis</span>
                  <ChevronRight size={14} />
                </Link>
                <button
                  onClick={handleDismissDaily}
                  className="p-1.5 rounded-lg text-emerald-300/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Cerrar notificación"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
