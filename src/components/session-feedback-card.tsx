"use client";

import React, { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Heart,
  Shield,
  Activity,
  Flame,
  Timer,
  Route,
  Target,
  ChevronRight,
  Sparkles,
  Watch,
  Award,
  TrendingUp,
} from "lucide-react";
import type { SessionRow } from "@/lib/repo/sessions";
import {
  buildStructuredFitDiagnostics,
  ComplianceVerdict,
  TechnicalBulletItem,
  FitStructuredFeedback,
} from "@/lib/fit-feedback";

interface SessionFeedbackCardProps {
  session: SessionRow;
  onOpenDetail?: (sessionId: number) => void;
  compact?: boolean;
}

export function SessionFeedbackCard({
  session,
  onOpenDetail,
  compact = false,
}: SessionFeedbackCardProps) {
  const isCompleted = session.status === "realizada" || session.status === "parcial";
  const isRest = session.discipline === "descanso";

  // Extraer o generar el feedback estructurado de la sesión
  const feedbackData = useMemo<{
    verdict: ComplianceVerdict;
    tone: "success" | "warning" | "danger" | "brand";
    summary: string;
    bullets: Array<{
      icon: "heart" | "zap" | "shield" | "activity" | "target";
      title: string;
      badge?: string;
      badgeTone?: "success" | "warning" | "danger" | "brand";
      text: string;
    }>;
    suunto: {
      pte?: number | null;
      epoc?: number | null;
      recoveryTimeHours?: number | null;
      recoveryTimeFormatted?: string;
      deviceModel?: string | null;
      feeling?: number | null;
      tss?: number | null;
    } | null;
    sourceType: "suunto_fit" | "fit_data" | "manual_realizada" | "pendiente";
  }>(() => {
    // 1. Caso con telemetría .FIT / Suunto en la sesión
    if (session.fit_data) {
      try {
        const parsed = JSON.parse(session.fit_data);
        const diag: FitStructuredFeedback = buildStructuredFitDiagnostics(parsed, session);
        const suuntoMetrics =
          parsed.deepAnalysis?.suuntoMetrics ||
          (parsed.suuntoMetrics
            ? parsed.suuntoMetrics
            : parsed.epoc || parsed.pte
            ? {
                epoc: parsed.epoc,
                pte: parsed.pte,
                recoveryTimeHours: parsed.recoveryTimeHours,
                deviceModel: parsed.deviceModel,
              }
            : null);

        const suunto = suuntoMetrics
          ? {
              pte: suuntoMetrics.pte ?? diag.suuntoReport?.pte ?? null,
              epoc: suuntoMetrics.epoc ?? diag.suuntoReport?.epoc ?? null,
              recoveryTimeHours:
                suuntoMetrics.recoveryTimeHours ?? diag.suuntoReport?.recoveryTimeHours ?? null,
              recoveryTimeFormatted:
                diag.suuntoReport?.recoveryTimeFormatted ??
                (suuntoMetrics.recoveryTimeHours
                  ? `${suuntoMetrics.recoveryTimeHours.toFixed(1)}h`
                  : undefined),
              deviceModel: suuntoMetrics.deviceModel || diag.suuntoReport?.deviceModel || "Suunto",
              feeling: suuntoMetrics.feeling ?? null,
              tss: suuntoMetrics.tss ?? null,
            }
          : diag.suuntoReport
          ? {
              pte: diag.suuntoReport.pte,
              epoc: diag.suuntoReport.epoc,
              recoveryTimeHours: diag.suuntoReport.recoveryTimeHours,
              recoveryTimeFormatted: diag.suuntoReport.recoveryTimeFormatted,
              deviceModel: diag.suuntoReport.deviceModel,
            }
          : null;

        return {
          verdict: diag.complianceVerdict || "Cumplido",
          tone: diag.complianceTone || "success",
          summary:
            diag.summary ||
            `Sesión analizada con telemetría. Cumplimiento fisiológico validado frente a la prescripción.`,
          bullets: diag.technicalBullets && diag.technicalBullets.length > 0 ? diag.technicalBullets : [],
          suunto,
          sourceType: suunto ? "suunto_fit" : "fit_data",
        };
      } catch (e) {
        console.error("Error interpretando fit_data en SessionFeedbackCard:", e);
      }
    }

    // 2. Caso completada sin FIT (manual, natación, Zepp, crossfit)
    if (isCompleted) {
      if (isRest) {
        return {
          verdict: "Cumplido",
          tone: "success",
          summary: "Día de asimilación y regeneración neuromuscular completado según planificación.",
          bullets: [
            {
              icon: "heart",
              title: "Tono Nervioso Parasimpático",
              badge: "Regeneración",
              badgeTone: "success",
              text: "La ausencia de carga física permite recomponer el glucógeno y reducir la fatiga residual.",
            },
            {
              icon: "shield",
              title: "Reparación Miofascial",
              badge: "Adaptación",
              badgeTone: "brand",
              text: "El tejido conectivo y articulaciones asimilan los impactos acumulados de la semana.",
            },
            {
              icon: "zap",
              title: "Preparación para la Siguiente Carga",
              badge: "Luz Verde",
              badgeTone: "success",
              text: "Hidratación y descanso listos para afrontar los entrenamientos de mayor intensidad.",
            },
          ],
          suunto: null,
          sourceType: "manual_realizada",
        };
      }

      const dur = session.duration_min ? `${session.duration_min} min` : "completada";
      const dist = session.distance_km ? ` · ${session.distance_km} km` : "";
      const rpe = session.rpe ? ` · RPE ${session.rpe}/10` : "";

      let bullets: TechnicalBulletItem[] = [];

      if (session.discipline === "natacion") {
        bullets = [
          {
            icon: "heart",
            title: "Cardio & Descarga Articular",
            badge: "Impacto Cero",
            badgeTone: "success",
            text: `Sesión acuática de ${dur}${dist}. Retorno venoso optimizado sin carga axial en tendones y columna.`,
          },
          {
            icon: "activity",
            title: "Cadena Posterior & Hombros",
            badge: "Compensatorio",
            badgeTone: "brand",
            text: "Trabajo fluido de tracción dorsal y movilidad de cintura escapular ideal para corredores.",
          },
          {
            icon: "shield",
            title: "Recomendación de Asimilación",
            badge: "Post-Nado",
            badgeTone: "success",
            text: "Mantén buena hidratación con sales minerales; tren inferior libre de sobrecarga para correr.",
          },
        ];
      } else if (session.discipline === "crossfit" || session.discipline === "gimnasio") {
        bullets = [
          {
            icon: "zap",
            title: "Potencia & Reclutamiento Neuromuscular",
            badge: `RPE ${session.rpe ?? 7}`,
            badgeTone: "brand",
            text: `Trabajo de fuerza completado (${dur}${rpe}). Reclutamiento eficiente de fibras rápidas tipo II.`,
          },
          {
            icon: "activity",
            title: "Estabilidad Central & Blindaje",
            badge: "Fuerza Útil",
            badgeTone: "success",
            text: "Activación de glúteos, sóleos y core anti-rotación para blindar la zancada en carrera.",
          },
          {
            icon: "shield",
            title: "Prescripción de Descanso",
            badge: "Recuperación",
            badgeTone: "warning",
            text: "Ingesta proteica adecuada y estiramiento de tren superior para no arrastrar rigidez muscular.",
          },
        ];
      } else {
        // Carrera o general
        bullets = [
          {
            icon: "heart",
            title: "Respuesta Aeróbica & Volumen",
            badge: "Asimilado",
            badgeTone: "success",
            text: `Rodaje ejecutado con éxito (${dur}${dist}${rpe}). Kilómetros sumados al motor aeróbico.`,
          },
          {
            icon: "activity",
            title: "Economía de Carrera & Elasticidad",
            badge: "Mecánica",
            badgeTone: "brand",
            text: "Consistencia en la cadencia y activación del ciclo estiramiento-acortamiento de la fascia.",
          },
          {
            icon: "shield",
            title: "Recomendación para Siguiente Estímulo",
            badge: "Continuidad",
            badgeTone: "success",
            text: "Masaje miofascial en sóleos/gemelos y descanso reparador para asimilar el kilometraje.",
          },
        ];
      }

      return {
        verdict: "Cumplido",
        tone: "success",
        summary: `Sesión de ${session.discipline} completada con volumen objetivo (${dur}${dist}${rpe}).`,
        bullets,
        suunto: null,
        sourceType: "manual_realizada",
      };
    }

    // 3. Caso sesión pendiente
    return {
      verdict: "Cumplido",
      tone: "brand" as any,
      summary: `Sesión programada según plan. Revisa la receta y objetivos antes de iniciar.`,
      bullets: [
        {
          icon: "target",
          title: "Objetivo del Entrenamiento",
          badge: "Planificado",
          badgeTone: "brand",
          text: `Prescripción: ${session.planned_code || session.discipline}. Mantén el ritmo en la zona marcada.`,
        },
        {
          icon: "shield",
          title: "Pauta Fisiológica Recomendada",
          badge: "Estrategia",
          badgeTone: "success",
          text: "Calienta de forma progresiva y dosifica la intensidad para cumplir el objetivo del bloque.",
        },
      ],
      suunto: null,
      sourceType: "pendiente",
    };
  }, [session, isCompleted, isRest]);

  const verdictStyles = {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      badgeBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      text: "text-emerald-400",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      badgeBg: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
      icon: <AlertTriangle size={16} className="text-amber-400" />,
      text: "text-amber-400",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
    },
    danger: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      badgeBg: "bg-rose-500/20 text-rose-400 border border-rose-500/40",
      icon: <ShieldAlert size={16} className="text-rose-400" />,
      text: "text-rose-400",
      glow: "shadow-[0_0_20px_rgba(244,63,94,0.12)]",
    },
    brand: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      badgeBg: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
      icon: <Target size={16} className="text-blue-400" />,
      text: "text-blue-400",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.12)]",
    },
  }[feedbackData.tone] || {
    bg: "bg-slate-800/20",
    border: "border-slate-800",
    badgeBg: "bg-slate-800 text-slate-300",
    icon: <Sparkles size={16} className="text-slate-400" />,
    text: "text-slate-300",
    glow: "",
  };

  return (
    <div
      className={`mt-3 rounded-xl border p-3.5 sm:p-4 bg-slate-950/70 transition-all ${verdictStyles.border} ${verdictStyles.glow}`}
    >
      {/* 1. Header con Veredicto & Telemetría */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
            {verdictStyles.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Análisis & Feedback
              </span>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${verdictStyles.badgeBg}`}>
                {isCompleted ? feedbackData.verdict : "Prescripción Planificada"}
              </span>
              {feedbackData.suunto?.deviceModel && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1 font-semibold">
                  <Watch size={11} className="text-emerald-400" />
                  <span>{feedbackData.suunto.deviceModel}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
              {feedbackData.summary}
            </p>
          </div>
        </div>

        {onOpenDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail(session.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all flex-shrink-0 self-start sm:self-auto cursor-pointer"
            title="Ver analítica exhaustiva, curvas de pulso y zonas"
          >
            <span>Ver telemetría completa</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* 2. Ribbon de Métricas Suunto & Carga (si están disponibles) */}
      {feedbackData.suunto && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 pb-2">
          {feedbackData.suunto.pte != null && (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Zap size={11} className="text-emerald-400" />
                <span>PTE (Firstbeat)</span>
              </div>
              <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {feedbackData.suunto.pte.toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                {feedbackData.suunto.pte >= 3.5 ? "Impacto alto" : feedbackData.suunto.pte >= 2.0 ? "Mantenimiento" : "Recuperación"}
              </div>
            </div>
          )}

          {feedbackData.suunto.epoc != null && (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Flame size={11} className="text-amber-400" />
                <span>EPOC Pico</span>
              </div>
              <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                {feedbackData.suunto.epoc} <span className="text-xs text-slate-500 font-normal">ml/kg</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">Demanda oxígeno post-ejercicio</div>
            </div>
          )}

          {feedbackData.suunto.recoveryTimeFormatted && (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Timer size={11} className="text-cyan-400" />
                <span>Recuperación</span>
              </div>
              <div className="text-base font-extrabold text-cyan-400 font-mono mt-0.5 truncate">
                {feedbackData.suunto.recoveryTimeFormatted}
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">Estimado por reloj</div>
            </div>
          )}

          {session.rpe != null && (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Activity size={11} className="text-indigo-400" />
                <span>Esfuerzo RPE</span>
              </div>
              <div className="text-base font-extrabold text-indigo-400 font-mono mt-0.5">
                {session.rpe} <span className="text-xs text-slate-500 font-normal">/ 10</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">Carga percibida</div>
            </div>
          )}
        </div>
      )}

      {/* 3. Viñetas de Diagnóstico Técnico & Fisiológico */}
      {feedbackData.bullets && feedbackData.bullets.length > 0 && (
        <div className="mt-2.5 space-y-2">
          {feedbackData.bullets.map((b, idx) => {
            const iconComp =
              b.icon === "heart" ? (
                <Heart size={13} className="text-rose-400 flex-shrink-0" />
              ) : b.icon === "zap" ? (
                <Zap size={13} className="text-amber-400 flex-shrink-0" />
              ) : b.icon === "shield" ? (
                <Shield size={13} className="text-emerald-400 flex-shrink-0" />
              ) : b.icon === "target" ? (
                <Target size={13} className="text-blue-400 flex-shrink-0" />
              ) : (
                <Activity size={13} className="text-cyan-400 flex-shrink-0" />
              );

            const badgeBg =
              b.badgeTone === "danger"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : b.badgeTone === "warning"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : b.badgeTone === "brand"
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 text-xs"
              >
                <div className="mt-0.5">{iconComp}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200">{b.title}</span>
                    {b.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${badgeBg}`}>
                        {b.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px] sm:text-xs">
                    {b.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
