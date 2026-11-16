"use client";

import { useState, useRef, useTransition } from "react";
import {
  X,
  Flame,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
  Dumbbell,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  CrossfitWeekAnalysisResult,
  CrossfitDayAnalysis,
} from "@/lib/crossfit-analyzer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { todayISO, weekStartOf } from "@/lib/dates";

interface CrossfitAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddedToCalendar?: () => void;
}

export function CrossfitAnalyzerModal({
  isOpen,
  onClose,
  onAddedToCalendar,
}: CrossfitAnalyzerModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CrossfitWeekAnalysisResult | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Martes", "Jueves"]);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear vista previa
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/crossfit/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.analysis) {
        setAnalysis(json.analysis);
        if (json.analysis.recommendedDays && json.analysis.recommendedDays.length > 0) {
          setSelectedDays(json.analysis.recommendedDays);
        }
        toast.push("success", "Programación de CrossFit analizada con éxito");
      } else {
        toast.push("error", json.error || "No se pudo analizar la imagen");
      }
    } catch (err) {
      console.error("Error al analizar:", err);
      toast.push("error", "Error de red al procesar la imagen de CrossFit");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleDay = (dayName: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayName) ? prev.filter((d) => d !== dayName) : [...prev, dayName]
    );
  };

  const handleAddToCalendar = async () => {
    if (!analysis || selectedDays.length === 0) return;
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/crossfit/add-to-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStartOf(todayISO()),
          selectedDays,
          dayDetails: analysis.days,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.push("success", `${selectedDays.join(" y ")} añadidos al calendario de entrenamientos`);
        if (onAddedToCalendar) onAddedToCalendar();
        onClose();
      } else {
        toast.push("error", json.error || "Error al añadir al calendario");
      }
    } catch {
      toast.push("error", "Error al añadir sesiones al calendario");
    } finally {
      setAddingToCalendar(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm shadow-red-500/20 shrink-0">
              <Flame size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                <span>Analizar Semana CrossFit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  Visión IA
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Criterio Preparador Físico + Fisioterapeuta · Evaluación 19:00h
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Zona de subida o foto */}
          {!analysis && !analyzing && (
            <div className="space-y-4 text-center py-6 sm:py-8">
              <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center mx-auto shadow-sm">
                <Camera size={30} />
              </div>

              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Foto o Captura de la Pizarra de CrossFit
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Sube la foto semanal con los bloques de Fuerza y WOD. La IA traducirá los ejercicios a español con pesos en kg y evaluará si te conviene ir <strong>Martes y Jueves a las 19:00h</strong> según tu objetivo de carrera.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 px-5 text-xs flex items-center gap-2 shadow-sm"
                >
                  <Camera size={14} />
                  <span>Hacer Foto o Subir Imagen</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Estado de carga / Análisis en curso */}
          {analyzing && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center mx-auto">
                <Flame size={28} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                  Analizando programación semanal con el Equipo Técnico...
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Traduciendo ejercicios a kg, analizando interferencia con las series de carrera y calculando los mejores días a las 19:00h.
                </p>
              </div>
            </div>
          )}

          {/* Resultados del Análisis */}
          {analysis && !analyzing && (
            <div className="space-y-4">
              {/* 1. RECOMENDACIÓN DESTACADA DE DÍAS ÓPTIMOS */}
              <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-red-700 dark:text-red-300">
                    <ShieldCheck size={16} />
                    <span>Veredicto del Preparador Físico: Días Óptimos</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                    Prioridad 19:00h
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/40 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                  {analysis.recommendationVerdict}
                </div>

                {/* Análisis específico de Martes y Jueves */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Clock size={13} className="text-zinc-500" />
                    <span>Análisis específico Martes & Jueves (19:00h):</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                    {analysis.tuesdayThursdayVerdict.analysis}
                  </p>
                </div>

                {/* Consejo Fisioterapeuta */}
                {analysis.physioAdvice && (
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white/60 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-start gap-2">
                    <Sparkles size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span>{analysis.physioAdvice}</span>
                  </div>
                )}
              </div>

              {/* 2. SELECTOR DE DÍAS PARA EL CALENDARIO */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Calendar size={13} className="text-red-600" />
                    <span>Selecciona los días a los que irás al box:</span>
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {selectedDays.length} {selectedDays.length === 1 ? "día elegido" : "días elegidos"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {analysis.days.map((d) => {
                    const isSelected = selectedDays.includes(d.dayName);
                    const isRec = analysis.recommendedDays.includes(d.dayName);
                    return (
                      <button
                        key={d.dayName}
                        type="button"
                        onClick={() => toggleDay(d.dayName)}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                        style={{ minHeight: 46 }}
                      >
                        <span className="font-bold">{d.dayName}</span>
                        {isRec && (
                          <span className={`text-[9px] font-bold ${isSelected ? "text-red-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                            ★ Óptimo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. DESGLOSE DÍA POR DÍA (TRADUCCIÓN EN KG Y MÚSCULOS) */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Desglose y Traducción Día por Día
                </h4>

                <div className="grid gap-2.5">
                  {analysis.days.map((day) => (
                    <div
                      key={day.dayName}
                      className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {day.dayName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              day.fatigueRisk === "alta"
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200"
                            }`}
                          >
                            Impacto piernas: {day.fatigueRisk}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          {day.musclesWorked.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Fuerza */}
                      {day.strengthPart && (
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <strong className="text-red-600 block mb-0.5 text-[11px] uppercase tracking-wider">
                            Parte de Fuerza (Strength):
                          </strong>
                          {day.strengthPart}
                        </div>
                      )}

                      {/* WOD / Metcon */}
                      {day.metconPart && (
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <strong className="text-amber-600 block mb-0.5 text-[11px] uppercase tracking-wider">
                            WOD / Metcon:
                          </strong>
                          {day.metconPart}
                        </div>
                      )}

                      {day.coachComment && (
                        <p className="text-[11px] text-zinc-500 italic">
                          Nota técnica: {day.coachComment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs h-9 rounded-xl"
          >
            Cerrar
          </Button>

          {analysis && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAnalysis(null);
                  setImagePreview(null);
                }}
                className="text-xs h-9 rounded-xl"
              >
                Analizar otra foto
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleAddToCalendar}
                loading={addingToCalendar}
                disabled={selectedDays.length === 0}
                className="text-xs h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Añadir {selectedDays.length} días al Calendario</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
