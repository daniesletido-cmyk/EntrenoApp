"use client";

import React, { useMemo } from "react";
import {
  ChevronRight,
  Sparkles,
  Watch,
  Heart,
  Shield,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Timer,
  UserCheck,
} from "lucide-react";
import type { SessionRow } from "@/lib/repo/sessions";
import {
  buildStructuredFitDiagnostics,
  buildCoachSessionFeedback,
  normalizeRecoveryTime,
  FitStructuredFeedback,
  type CoachSessionFeedback,
} from "@/lib/fit-feedback";
import { detectVamZoneForSession } from "@/lib/vam-zones";

interface SessionFeedbackCardProps {
  session: {
    id: number;
    date: string;
    discipline: string;
    planned_code: string | null;
    status: string;
    duration_min?: number | null;
    distance_km?: number | null;
    rpe?: number | null;
    notes?: string | null;
    fit_data?: string | null;
    [key: string]: any;
  };
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

  const coachFeedback: CoachSessionFeedback = useMemo(() => {
    return buildCoachSessionFeedback(session as unknown as SessionRow);
  }, [session]);

  const feedbackData = useMemo(() => {
    // 1. Caso con telemetría .FIT / Suunto en la sesión
    if (session.fit_data) {
      try {
        const parsed = JSON.parse(session.fit_data);
        const diag: FitStructuredFeedback = buildStructuredFitDiagnostics(parsed, session as unknown as SessionRow);
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

        const rawRec =
          suuntoMetrics?.recoveryTimeHours ??
          diag.suuntoReport?.recoveryTimeHours ??
          parsed.deepAnalysis?.recoveryTimeHours ??
          parsed.recoveryTimeHours;
        const normalizedRec = normalizeRecoveryTime(rawRec);

        const suunto =
          suuntoMetrics || diag.suuntoReport || normalizedRec.hours !== null
            ? {
                pte:
                  suuntoMetrics?.pte ??
                  diag.suuntoReport?.pte ??
                  parsed.deepAnalysis?.trainingEffect ??
                  null,
                epoc:
                  suuntoMetrics?.epoc ??
                  diag.suuntoReport?.epoc ??
                  parsed.deepAnalysis?.epoc ??
                  null,
                recoveryTimeHours: normalizedRec.hours,
                recoveryTimeFormatted: normalizedRec.formatted,
                deviceModel:
                  suuntoMetrics?.deviceModel ||
                  diag.suuntoReport?.deviceModel ||
                  "Suunto 9 Peak Pro",
                feeling: suuntoMetrics?.feeling ?? null,
                tss: suuntoMetrics?.tss ?? null,
              }
            : null;

        // Subtarjetas fisiológicas para completado con telemetría
        const objectiveText =
          diag.summary ||
          (session.discipline === "carrera"
            ? "Volumen y ritmos verificados frente a la prescripción del motor aeróbico."
            : "Estímulo completado con registro de telemetría.");

        const executionText =
          diag.technicalBullets && diag.technicalBullets.length > 0
            ? diag.technicalBullets.map((b) => b.text).slice(0, 2).join(" ")
            : "Cumplimiento verificado. Hidratación adecuada y recuperación para el próximo bloque de carga.";

        return {
          statusLabel: diag.complianceVerdict || "Completado",
          isAdapted: false,
          objective: objectiveText,
          executionCare: executionText,
          suunto,
        };
      } catch (e) {
        console.error("Error interpretando fit_data en SessionFeedbackCard:", e);
      }
    }

    // 2. Caso completada sin FIT
    if (isCompleted) {
      if (isRest) {
        return {
          statusLabel: "Completado",
          isAdapted: false,
          objective: "Favorecer la supercompensación fisiológica, recomponer los depósitos de glucógeno y reducir la fatiga neuromuscular acumulada.",
          executionCare: "Descanso activo o total, movilidad articular suave y nutrición rica en micronutrientes para regenerar tejidos.",
          suunto: null,
        };
      }

      const durStr = session.duration_min ? `${session.duration_min} min` : "sesión";
      const distStr = session.distance_km ? ` (${session.distance_km} km)` : "";

      if (session.discipline === "natacion") {
        return {
          statusLabel: "Completado",
          isAdapted: false,
          objective: "Optimizar el retorno venoso, estimular el flujo sanguíneo y descargar de impacto articular a sóleos, rodillas y columna.",
          executionCare: "Nado con técnica limpia y foco pull-buoy. Rehidrata con sales al salir del agua para no deshidratarte.",
          suunto: null,
        };
      }

      if (session.discipline === "crossfit" || session.discipline === "gimnasio") {
        return {
          statusLabel: "Completado",
          isAdapted: false,
          objective: "Reclutar unidades motoras de fuerza, estabilizar cadera/core y blindar tendones para resistir la zancada de carrera.",
          executionCare: "Cuida el rango de movimiento articular y asegura aporte proteico y descanso antes de la próxima sesión de carrera.",
          suunto: null,
        };
      }

      return {
        statusLabel: "Completado",
        isAdapted: false,
        objective: `Asimilar el volumen aeróbico programado de ${durStr}${distStr}, incrementando la densidad mitocondrial y la eficiencia cardiovascular.`,
        executionCare: "Hidratación post-entreno con carbohidratos ligeros, movilidad de tobillos y descarga miofascial de sóleos y gemelos.",
        suunto: null,
      };
    }

    // 3. Caso planificado / pendiente
    const notesLower = (session.notes || "").toLowerCase();
    const isAdapted =
      notesLower.includes("[ajuste inteligente]") ||
      notesLower.includes("adaptado") ||
      notesLower.includes("adaptada");

    // Derivar objetivo del Preparador Físico
    let objective = "";
    let executionCare = "";

    if (isRest) {
      objective = "Asimilar las cargas de los días previos, reducir el tono simpático y permitir la supercompensación miofascial y tendinosa.";
      executionCare = "Cero impacto articular. Prioriza descanso de calidad, hidratación abundante y aporte de magnesio y nutrientes limpios.";
    } else if (session.discipline === "natacion") {
      objective = "Regeneración activa cardiovascular y activación de la cadena posterior con descarga total del impacto gravitatorio en piernas.";
      executionCare = "Mantén brazada fluida y sin prisas; usa pull-buoy para aislar tren superior y bebe agua al terminar la sesión.";
    } else if (session.discipline === "crossfit") {
      objective = "Fortalecimiento neuromuscular de cadenas cruzadas, core y tren superior para proteger la postura y economía de carrera.";
      executionCare = "Ajusta las cargas en los levantamientos para no fatigar lumbares ni sobrecargar gemelos antes del fin de semana.";
    } else if (session.discipline === "gimnasio") {
      objective = "Trabajo de fuerza útil y propiocepción para blindar glúteos, isquiotibiales y tobillos contra lesiones en asfalto.";
      executionCare = "Foco en la ejecución técnica y fase excéntrica lenta; evita llegar al fallo muscular para preservar frescura.";
    } else {
      // Carrera
      const vz = detectVamZoneForSession(session);
      if (vz?.code === "R0") {
        objective = "Drenar lactato residual, favorecer la oxigenación muscular y acumular minutos de carrera en Zona R0 sin estrés cardiovascular.";
        executionCare = "Calienta 10 min suave, no mires el reloj ni aceleres en repechos; mantén sensaciones muy cómodas (RPE 3-4) y bebe agua.";
      } else if (vz?.code === "R1") {
        objective = "Consolidar la base aeróbica lipolítica y la economía de zancada en Zona R1, entrenando al cuerpo a optimizar el uso de grasas.";
        executionCare = "Comienza con calentamiento progresivo, mantén cadencia ágil y constante (~175-180 spm) y rueda en ritmo conversacional.";
      } else if (vz?.code === "R2") {
        objective = "Elevar el umbral aeróbico y mejorar el aclaramiento de lactato a ritmo medio progresivo (Zona R2).";
        executionCare = "Calienta 10-12 min a ritmo suave antes de entrar en ritmo tempo; hidrátate bien y consume carbohidratos al terminar.";
      } else if (vz?.code === "R5" || vz?.code === "R4" || vz?.code === "R3") {
        objective = "Desarrollar el consumo máximo de oxígeno (VO2max) y la tolerancia neuromuscular a ritmos específicos de competición.";
        executionCare = "Calentamiento y activación dinámica obligatorios; recupera al trote suave entre bloques y realiza 10 min de vuelta a la calma.";
      } else {
        objective = "Asimilar carga aeróbica de calidad, favorecer el flujo sanguíneo y mantener la continuidad del plan de entrenamiento.";
        executionCare = "Calienta 10 min de forma progresiva, mantén cadencia fluida sin forzar en subidas y prioriza hidratación + carbohidratos ligeros al terminar.";
      }
    }

    return {
      statusLabel: isAdapted ? "Adaptado" : "Planificado",
      isAdapted,
      objective,
      executionCare,
      suunto: null,
    };
  }, [session, isCompleted, isRest]);

  return (
    <div className="mt-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3.5 w-full min-w-0">
      {/* Cabecera limpia y directa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-red-600" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-zinc-900 tracking-tight uppercase">
              FEEDBACK DEL ENTRENADOR
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                coachFeedback.status === "completed"
                  ? coachFeedback.overallTone === "optimal"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : coachFeedback.overallTone === "overreached"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : coachFeedback.overallTone === "underloaded" || coachFeedback.overallTone === "mixed"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-zinc-100 text-zinc-700"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {coachFeedback.status === "completed" ? coachFeedback.overallBadge : feedbackData.statusLabel}
            </span>
            {feedbackData.suunto?.deviceModel && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-1 font-semibold">
                <Watch size={11} className="text-zinc-500" />
                <span>{feedbackData.suunto.deviceModel}</span>
              </span>
            )}
          </div>
        </div>

        {onOpenDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail(session.id)}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 self-start sm:self-auto cursor-pointer"
            title="Ver analítica exhaustiva, curvas de pulso y zonas"
          >
            <span>Ver telemetría →</span>
          </button>
        )}
      </div>

      {/* Ribbon de Métricas Suunto (solo si hay telemetría FIT disponible) */}
      {feedbackData.suunto && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 w-full min-w-0">
          {feedbackData.suunto.pte != null && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 min-w-0">
              <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                <Zap size={11} className="text-red-600 flex-shrink-0" />
                <span className="truncate">PTE</span>
              </div>
              <div className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
                {feedbackData.suunto.pte.toFixed(1)} <span className="text-[10px] text-zinc-400 font-normal">/ 5.0</span>
              </div>
            </div>
          )}

          {feedbackData.suunto.epoc != null && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 min-w-0">
              <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                <Flame size={11} className="text-amber-500 flex-shrink-0" />
                <span className="truncate">EPOC Pico</span>
              </div>
              <div className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
                {feedbackData.suunto.epoc} <span className="text-[10px] text-zinc-400 font-normal">ml/kg</span>
              </div>
            </div>
          )}

          {feedbackData.suunto.recoveryTimeFormatted && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 min-w-0">
              <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                <Timer size={11} className="text-blue-500 flex-shrink-0" />
                <span className="truncate">Recuperación</span>
              </div>
              <div className="text-sm font-bold text-zinc-900 font-mono mt-0.5 truncate">
                {feedbackData.suunto.recoveryTimeFormatted}
              </div>
            </div>
          )}

          {session.rpe != null && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 min-w-0">
              <div className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                <Activity size={11} className="text-purple-500 flex-shrink-0" />
                <span className="truncate">Esfuerzo RPE</span>
              </div>
              <div className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
                {session.rpe} <span className="text-[10px] text-zinc-400 font-normal">/ 10</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback del Entrenador basado en datos reales (cuando la sesión está completada o tiene telemetría) */}
      {coachFeedback.status === "completed" ? (
        <div className="space-y-2.5 w-full min-w-0">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
              <UserCheck size={14} className="text-red-600 flex-shrink-0" />
              <span>{coachFeedback.overallTitle}</span>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed break-words">
              {coachFeedback.summaryNarrative}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full min-w-0">
            {/* ¿Te has pasado? */}
            <div
              className={`rounded-xl p-3.5 space-y-1.5 min-w-0 border ${
                coachFeedback.overdidAnalysis.triggered
                  ? coachFeedback.overdidAnalysis.severity === "high"
                    ? "bg-red-50/70 border-red-200"
                    : "bg-amber-50/70 border-amber-200"
                  : "bg-zinc-50 border-zinc-200/80"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-zinc-900">
                <div className="flex items-center gap-1.5 min-w-0">
                  {coachFeedback.overdidAnalysis.triggered ? (
                    <AlertTriangle
                      size={13}
                      className={coachFeedback.overdidAnalysis.severity === "high" ? "text-red-600 flex-shrink-0" : "text-amber-600 flex-shrink-0"}
                    />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                  )}
                  <span className="truncate">{coachFeedback.overdidAnalysis.title}</span>
                </div>
                <span className="text-[10px] font-medium text-zinc-500 shrink-0">¿Te has pasado?</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed break-words">
                {coachFeedback.overdidAnalysis.detail}
              </p>
            </div>

            {/* ¿Podías haber apretado más? */}
            <div
              className={`rounded-xl p-3.5 space-y-1.5 min-w-0 border ${
                coachFeedback.pushMoreAnalysis.triggered
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-zinc-50 border-zinc-200/80"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-zinc-900">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap
                    size={13}
                    className={coachFeedback.pushMoreAnalysis.triggered ? "text-amber-600 flex-shrink-0" : "text-emerald-600 flex-shrink-0"}
                  />
                  <span className="truncate">{coachFeedback.pushMoreAnalysis.title}</span>
                </div>
                <span className="text-[10px] font-medium text-zinc-500 shrink-0">¿Apretar más?</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed break-words">
                {coachFeedback.pushMoreAnalysis.detail}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-700">
            <Shield size={13} className="text-red-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-zinc-900">Próximo paso:</strong> {coachFeedback.nextStepTip}
            </span>
          </div>
        </div>
      ) : (
        /* 2 Subtarjetas Limpias para sesión pendiente */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full min-w-0">
          {/* 1. Objetivo de la Sesión (Preparador Físico) */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
              <Heart size={13} className="text-red-600 flex-shrink-0" />
              <span>Objetivo de la Sesión</span>
              <span className="text-[10px] font-medium text-zinc-500 ml-auto">Preparador Físico</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-words">
              {feedbackData.objective}
            </p>
          </div>

          {/* 2. Pauta de Ejecución y Cuidado (Fisioterapeuta + Nutricionista) */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
              <Shield size={13} className="text-emerald-600 flex-shrink-0" />
              <span>Pauta de Ejecución y Cuidado</span>
              <span className="text-[10px] font-medium text-zinc-500 ml-auto">Fisio + Nutrición</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed break-words">
              {feedbackData.executionCare}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
