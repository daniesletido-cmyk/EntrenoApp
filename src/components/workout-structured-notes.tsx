"use client";

import React, { useState, useMemo } from "react";
import {
  Flame,
  Zap,
  Wind,
  Apple,
  Brain,
  ChevronDown,
  ChevronUp,
  Activity,
  Timer,
  Navigation,
  Gauge,
  Dumbbell,
  Clock,
  MapPin,
  UtensilsCrossed,
  Target,
  CheckCircle2,
  Award,
  Sparkles,
  Waves,
  ArrowRight,
  ShieldCheck,
  Footprints,
} from "lucide-react";

interface WorkoutStructuredNotesProps {
  notes: string;
  discipline: string;
  themeColor?: string;
  distanceKm?: number | null;
  durationMin?: number | null;
  className?: string;
}

interface NutritionTimelineItem {
  time?: string;
  label: string;
  text: string;
  isPreWorkout?: boolean;
  isIntra?: boolean;
  isPost?: boolean;
}

interface CrossfitBlock {
  type: "schedule" | "warmup" | "strength" | "wod" | "pacing" | "nutrition" | "general";
  title: string;
  badge?: string;
  items?: string[];
  exercises?: { name: string; reps?: string; details?: string }[];
  scoreNote?: string;
  text?: string;
  timeline?: NutritionTimelineItem[];
}

function parseNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  const clean = str.replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function extractMetricsFromText(text: string | undefined): { dist: number | null; time: number | null; pace: string | null } {
  let dist: number | null = null;
  let time: number | null = null;
  let pace: string | null = null;

  if (!text) return { dist, time, pace };

  const paceExplicitMatch = text.match(/Ritmo:?\s*([^):]+)/i);
  if (paceExplicitMatch) {
    pace = paceExplicitMatch[1].trim();
  } else {
    const pacePatternMatch = text.match(/(\d:\d{2}\s*[-–]\s*\d:\d{2}\s*(?:min\/km|\/km)?(?:\s*\([^)]*\))?)/i);
    if (pacePatternMatch) {
      pace = pacePatternMatch[1].trim();
    }
  }

  const distMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kms)\b/i);
  if (distMatch) {
    dist = parseNumber(distMatch[1]);
  } else {
    const mMatch = text.match(/(\d{3,4})\s*(?:m|metros)\b/i);
    if (mMatch) {
      const meters = parseNumber(mMatch[1]);
      if (meters) dist = Number((meters / 1000).toFixed(2));
    }
  }

  const timeRangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:min|minutos)/i);
  if (timeRangeMatch) {
    const min1 = parseNumber(timeRangeMatch[1]);
    const min2 = parseNumber(timeRangeMatch[2]);
    if (min1 && min2) time = Math.round((min1 + min2) / 2);
  } else {
    const timeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:min|minutos)\b/i);
    if (timeMatch) {
      time = Math.round(parseNumber(timeMatch[1]) || 0);
    }
  }

  return { dist, time, pace };
}

// ==========================================
// PARSER ESPECÍFICO PARA CROSSFIT Y FUERZA
// ==========================================
function parseCrossfitNotes(notes: string): {
  header: string;
  schedule: string | null;
  blocks: CrossfitBlock[];
  nutritionTimeline: NutritionTimelineItem[];
  mentalPacing: string | null;
  extraTrailing: string[];
} {
  const blocks: CrossfitBlock[] = [];
  const nutritionTimeline: NutritionTimelineItem[] = [];
  const extraTrailing: string[] = [];
  let schedule: string | null = null;
  let mentalPacing: string | null = null;
  let header = "";

  let text = notes;
  const lines = notes.split("\n");
  if (lines.length > 0 && (lines[0].startsWith("CROSSFIT") || lines[0].startsWith("GIMNASIO") || lines[0].endsWith(":"))) {
    header = lines[0].replace(/:$/, "").trim();
    text = lines.slice(1).join("\n").trim();
  }

  // Dividir por bloques mayores indicados por "- " al inicio de línea
  const rawSections = text.split(/\n(?=-\s*)/g).map((s) => s.trim()).filter(Boolean);

  for (const sec of rawSections) {
    const cleanSec = sec.replace(/^-\s*/, "").trim();

    // 1. Horario de sesión
    if (/^Horario de Sesión:/i.test(cleanSec)) {
      schedule = cleanSec.replace(/^Horario de Sesión:\s*/i, "").trim();
      continue;
    }

    // 2. Calentamiento específico
    if (/^Calentamiento/i.test(cleanSec)) {
      const firstLine = cleanSec.split("\n")[0];
      const timeMatch = firstLine.match(/\(([^)]+)\)/);
      const items = cleanSec
        .split("\n")
        .slice(1)
        .map((l) => l.trim().replace(/^[•*\-\s]+/, ""))
        .filter(Boolean);

      blocks.push({
        type: "warmup",
        title: "Calentamiento Específico & Movilidad",
        badge: timeMatch ? timeMatch[1] : "10-12 min",
        items: items.length > 0 ? items : [cleanSec.replace(/^Calentamiento[^:]*:\s*/i, "")],
      });
      continue;
    }

    // 3. Bloque de Fuerza / STRENGTH / SKILL
    if (/^(?:STRENGTH|Fuerza|SKILL|Halterofilia)/i.test(cleanSec)) {
      const firstLine = cleanSec.split("\n")[0];
      const setsMatch = firstLine.match(/\(([^)]+)\)/);
      const items = cleanSec
        .split("\n")
        .slice(1)
        .map((l) => l.trim().replace(/^[•*\-\s]+/, ""))
        .filter(Boolean);

      blocks.push({
        type: "strength",
        title: "Bloque de Fuerza · STRENGTH",
        badge: setsMatch ? setsMatch[1] : "Fuerza Principal",
        items: items.length > 0 ? items : [cleanSec.replace(/^(?:STRENGTH|Fuerza|SKILL)[^:]*:\s*/i, "")],
      });
      continue;
    }

    // 4. Bloque WOD / FREEDOM / METCON / AMRAP / FOR TIME / EMOM
    if (/^(?:FREEDOM|WOD|AMRAP|FOR TIME|EMOM|METCON|Rondas)/i.test(cleanSec)) {
      const linesInWod = cleanSec.split("\n");
      const titleLine = linesInWod[0];
      let scoreNote = "";

      // Extraer duración / formato (ej: 20:00 AMRAP)
      const formatMatch = titleLine.match(/(?:-\s*)?(\d+:\d{2}\s*AMRAP|\d+\s*min\s*AMRAP|FOR TIME|EMOM\s*\d+|AMRAP)/i);
      const formatBadge = formatMatch ? formatMatch[1].trim() : "WOD Clave";

      const exercises: { name: string; reps?: string; details?: string }[] = [];
      const nonExItems: string[] = [];

      for (const line of linesInWod.slice(1)) {
        const tr = line.trim();
        if (!tr) continue;
        if (tr.startsWith("* Puntuación:") || tr.toLowerCase().includes("puntuación:")) {
          scoreNote = tr.replace(/^\*\s*/, "").trim();
          continue;
        }

        const cleanLine = tr.replace(/^[•*\-\s]+/, "");
        // Detectar si empieza por repeticiones (ej: 15/12 Cal, 15 Box, 100 Double Unders)
        const repMatch = cleanLine.match(/^(\d+(?:\/\d+)?(?:\s*Cal|\s*Calorie)?)\s+(.*)/i);
        if (repMatch) {
          let reps = repMatch[1].trim();
          if (/^\d+$/.test(reps)) reps = `${reps} Reps`;
          const rest = repMatch[2];
          const parenMatch = rest.match(/\(([^)]+)\)/);
          const name = rest.replace(/\([^)]+\)/g, "").replace(/[\s.,]+$/, "").trim();
          const details = parenMatch ? parenMatch[1].replace(/[\s.,]+$/, "").trim() : undefined;
          exercises.push({
            name,
            reps,
            details,
          });
        } else {
          nonExItems.push(cleanLine);
        }
      }

      blocks.push({
        type: "wod",
        title: titleLine.replace(/-\s*\d+:\d{2}.*$/, "").replace(/:$/, "").trim() || "WOD Freedom (Metcon)",
        badge: formatBadge,
        exercises: exercises.length > 0 ? exercises : undefined,
        items: nonExItems.length > 0 ? nonExItems : undefined,
        scoreNote: scoreNote || undefined,
      });
      continue;
    }

    // 5. Enfoque Psicológico & Pacing
    if (/^Enfoque Psicológico/i.test(cleanSec) || /^Pacing/i.test(cleanSec)) {
      mentalPacing = cleanSec.replace(/^Enfoque Psicológico(?:\s*&\s*Pacing)?:\s*/i, "").trim();
      continue;
    }

    // 6. Estrategia Nutrición Adaptada al Horario Laboral
    if (/^ESTRATEGIA NUTRICIÓN/i.test(cleanSec) || /^Nutrición/i.test(cleanSec)) {
      const mealLines = cleanSec.split("\n").slice(1);
      for (const ml of mealLines) {
        const tr = ml.trim().replace(/^[•*\-\s]+/, "");
        if (!tr) continue;
        // Detectar formato: 07:30h - 08:00h (Desayuno): Tostadas...
        const timeMatch = tr.match(/^(\d{1,2}:\d{2}h?\s*[-–]\s*\d{1,2}:\d{2}h?)\s*\(([^)]+)\):\s*(.*)/i);
        if (timeMatch) {
          const time = timeMatch[1].trim();
          const label = timeMatch[2].trim();
          const text = timeMatch[3].trim();
          const isPre = /merienda|pre-workout|pre\s*entreno/i.test(label);
          const isIntra = /intra/i.test(label);
          const isPost = /cena|post/i.test(label);
          nutritionTimeline.push({ time, label, text, isPreWorkout: isPre, isIntra, isPost });
        } else {
          // Otro formato
          const colonIdx = tr.indexOf(":");
          if (colonIdx > -1) {
            nutritionTimeline.push({
              label: tr.slice(0, colonIdx).trim(),
              text: tr.slice(colonIdx + 1).trim(),
            });
          } else {
            nutritionTimeline.push({ label: "Pauta", text: tr });
          }
        }
      }
      continue;
    }

    // Metadatos residuales
    if (cleanSec.includes("Importado desde") || cleanSec.includes("DATOS REALES") || cleanSec.includes("[Suunto Cloud]")) {
      extraTrailing.push(cleanSec);
      continue;
    }

    // Bloque general
    const subLines = cleanSec.split("\n").map((l) => l.trim().replace(/^[•*\-\s]+/, "")).filter(Boolean);
    if (subLines.length === 0) continue;
    if (subLines.length === 1 && header && subLines[0].toLowerCase().includes(header.toLowerCase())) continue;
    blocks.push({
      type: "general",
      title: subLines[0] || "Detalle de Ejecución",
      items: subLines.slice(1),
    });
  }

  return { header, schedule, blocks, nutritionTimeline, mentalPacing, extraTrailing };
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export function WorkoutStructuredNotes({
  notes,
  discipline,
  themeColor = "var(--color-brand)",
  distanceKm,
  durationMin,
  className = "",
}: WorkoutStructuredNotesProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [showMental, setShowMental] = useState(true);

  const isCrossfit = discipline === "crossfit" || /crossfit|wod|strength deadlift|amrap/i.test(notes);

  // 1. RENDERIZADO ESPECIAL PARA CROSSFIT / BOX WODS
  const cfData = useMemo(() => {
    if (!isCrossfit) return null;
    return parseCrossfitNotes(notes);
  }, [notes, isCrossfit]);

  if (isCrossfit && cfData && (cfData.blocks.length > 0 || cfData.schedule)) {
    return (
      <div className={`w-full flex flex-col gap-3 text-xs sm:text-sm ${className}`}>
        {/* Cabecera & Badge de Horario */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dumbbell size={15} />
            </div>
            <div>
              <div className="text-xs font-black text-foreground uppercase tracking-wide">
                {cfData.header || "CrossFit Box & WOD Freedom"}
              </div>
              <div className="text-[10px] text-muted">Sesión dirigida · Trabajo de alta demanda neuromuscular</div>
            </div>
          </div>

          {cfData.schedule && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
              <Clock size={12} className="text-amber-400" />
              <span>{cfData.schedule}</span>
            </div>
          )}
        </div>

        {/* Bloques Estructurados (Calentamiento, Strength, WOD) */}
        <div className="space-y-3">
          {cfData.blocks.map((b, idx) => {
            if (b.type === "warmup") {
              return (
                <div key={idx} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-black text-xs text-emerald-400 uppercase tracking-wider">
                      <Flame size={15} className="text-emerald-400" />
                      <span>{b.title}</span>
                    </div>
                    {b.badge && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {b.badge}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {b.items?.map((it, itIdx) => (
                      <div key={itIdx} className="flex items-start gap-2 text-xs text-slate-200">
                        <CheckCircle2 size={13} className="text-emerald-400/80 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{it}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (b.type === "strength") {
              return (
                <div key={idx} className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-black text-xs text-purple-400 uppercase tracking-wider">
                      <Dumbbell size={15} className="text-purple-400" />
                      <span>{b.title}</span>
                    </div>
                    {b.badge && (
                      <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/35">
                        {b.badge}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {b.items?.map((it, itIdx) => {
                      let mainPart = it.trim();
                      let detailPart = "";
                      if (it.includes("·")) {
                        const parts = it.split("·");
                        mainPart = parts[0].replace(/\($/, "").trim();
                        detailPart = parts.slice(1).join("·").replace(/\)$/, "").trim();
                      }
                      return (
                        <div key={itIdx} className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-slate-100">
                          <div className="font-bold text-sm text-purple-200 mb-1 flex items-center gap-1.5">
                            <Dumbbell size={15} className="text-purple-400 shrink-0" />
                            <span>{mainPart}</span>
                          </div>
                          {detailPart && (
                            <div className="text-[11px] text-purple-300/80 leading-relaxed font-sans pt-1 border-t border-purple-500/15">
                              {detailPart}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (b.type === "wod") {
              return (
                <div key={idx} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-black text-xs text-amber-400 uppercase tracking-wider">
                      <Zap size={15} className="text-amber-400" />
                      <span>{b.title}</span>
                    </div>
                    {b.badge && (
                      <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        ⚡ {b.badge}
                      </span>
                    )}
                  </div>

                  {/* Rejilla de Estaciones / Ejercicios del WOD */}
                  {b.exercises && b.exercises.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {b.exercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
                        >
                          <div>
                            <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">
                              {ex.reps}
                            </div>
                            <div className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">
                              {ex.name}
                            </div>
                          </div>
                          {ex.details && (
                            <div className="text-[11px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800 leading-tight">
                              {ex.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Puntuación / Objetivo */}
                  {b.scoreNote && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <Award size={14} className="text-amber-400 shrink-0" />
                      <span>{b.scoreNote}</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-1">{b.title}</div>
                {b.items?.map((it, itIdx) => (
                  <div key={itIdx} className="text-muted leading-relaxed">• {it}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Enfoque Psicológico & Pacing (Card Violeta) */}
        {cfData.mentalPacing && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 mt-0.5">
              <Brain size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-purple-400 mb-0.5">
                Enfoque Psicológico & Pacing
              </div>
              <p className="text-xs leading-relaxed text-purple-100/90 font-sans">
                {cfData.mentalPacing}
              </p>
            </div>
          </div>
        )}

        {/* Crononutrición Adaptada al Horario Laboral (Timeline) */}
        {cfData.nutritionTimeline.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="w-full flex items-center justify-between p-3.5 text-xs text-foreground font-bold hover:bg-emerald-500/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <UtensilsCrossed size={15} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                    Crononutrición Adaptada a tu Horario Laboral
                  </div>
                  <div className="text-[10px] text-muted font-normal">
                    Pautas de comidas e hidratación para entrenar con el depósito lleno a las 19:00h
                  </div>
                </div>
              </div>
              <span className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-muted">
                {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {showNutrition && (
              <div className="p-4 pt-1 border-t border-emerald-500/20 space-y-2.5">
                {cfData.nutritionTimeline.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 text-xs leading-relaxed ${
                      item.isPreWorkout
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-100"
                        : item.isIntra
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-100"
                        : "bg-slate-900/70 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      {item.time && (
                        <span className="font-mono font-bold text-emerald-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          {item.time}
                        </span>
                      )}
                      <span className="font-bold text-slate-100">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-sans">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. RENDERIZADO PARA RUNNING (CARRERA A PIE) Y RESTO DE DISCIPLINAS
  const parsed = parseWorkoutNotes(notes, discipline);
  const metrics = calculateRunningMetrics(parsed, notes, discipline, distanceKm, durationMin);

  return (
    <div
      className={`w-full flex flex-col gap-3 rounded-2xl overflow-hidden text-xs sm:text-sm ${className}`}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `4px solid ${themeColor}`,
        padding: "14px 16px",
      }}
    >
      {/* 0. Cabecera con Título y Barra de Volumen Total de la Sesión */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-muted">
          <Activity size={14} style={{ color: themeColor }} />
          <span>{parsed.header || "Estructura del Entrenamiento"}</span>
        </div>
        {metrics.totalDur && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 font-mono text-[11px] font-bold text-slate-200">
            <span className="text-slate-400 font-sans font-medium text-[10px]">Total sesión:</span>
            {metrics.totalDist && <span className="text-emerald-400">{metrics.totalDist}</span>}
            {metrics.totalDist && <span className="text-slate-500">·</span>}
            <span className="text-cyan-400">{metrics.totalDur} min</span>
          </div>
        )}
      </div>

      {/* BLOQUES ESTRUCTURADOS CON DISTANCIA, TIEMPO Y RITMO OBJETIVO */}
      <div className="flex flex-col gap-3 pt-1">
        {/* 1. CALENTAMIENTO */}
        {parsed.warmup && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-emerald-400 uppercase tracking-wider">
                <Flame size={14} className="text-emerald-400 shrink-0" />
                <span>1. Calentamiento & Activación</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-mono text-[11px] font-extrabold">
                <Timer size={11} className="opacity-80" />
                <span>{metrics.warmup.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DEL CALENTAMIENTO */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400/90 mb-2 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/25">
              <Gauge size={12} className="shrink-0 text-emerald-400" />
              <span>Ritmo objetivo: {metrics.warmup.pace}</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {parsed.warmup}
            </div>
          </div>
        )}

        {/* 2. PARTE PRINCIPAL (TRABAJO CLAVE ESPECÍFICO) */}
        {parsed.mainPart && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-brand/10 border border-brand/35 text-slate-100 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-black text-[11px] sm:text-xs text-brand uppercase tracking-wider">
                <Zap size={14} className="text-brand shrink-0" />
                <span>2. Parte Principal (Trabajo Clave)</span>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-md bg-brand/25 text-brand border border-brand/45 font-mono text-[11px] font-black">
                <Navigation size={11} className="opacity-80" />
                <span>{metrics.main.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DE LA PARTE PRINCIPAL */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 mb-2 bg-brand/20 px-2.5 py-1 rounded-lg border border-brand/30">
              <Gauge size={12} className="shrink-0 text-cyan-400" />
              <span>Ritmo objetivo: {metrics.main.pace}</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
              {parsed.mainPart}
            </div>
          </div>
        )}

        {/* 3. VUELTA A LA CALMA */}
        {parsed.cooldown && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-cyan-400 uppercase tracking-wider">
                <Wind size={14} className="text-cyan-400 shrink-0" />
                <span>3. Vuelta a la Calma & Recuperación</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 font-mono text-[11px] font-extrabold">
                <Timer size={11} className="opacity-80" />
                <span>{metrics.cooldown.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DE LA VUELTA A LA CALMA */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400/90 mb-2 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/25">
              <Gauge size={12} className="shrink-0 text-cyan-400" />
              <span>Ritmo objetivo: {metrics.cooldown.pace}</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {parsed.cooldown}
            </div>
          </div>
        )}
      </div>

      {/* Clave estratégica o Hidratación */}
      {parsed.strategy && (
        <div className="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 leading-relaxed">
          <strong>Clave estratégica:</strong> {parsed.strategy}
        </div>
      )}

      {parsed.hydration && (
        <div className="text-xs p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-200 leading-relaxed">
          <strong>Hidratación:</strong> {parsed.hydration}
        </div>
      )}

      {/* SECCIÓN DESPLEGABLE: NUTRICIÓN */}
      {parsed.nutrition && (
        <div className="rounded-xl border border-border/70 overflow-hidden bg-surface-raised/40">
          <button
            type="button"
            onClick={() => setShowNutrition(!showNutrition)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted hover:text-foreground font-medium transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Apple size={14} className="text-emerald-400" />
              <span>Pautas de Nutrición (Media mañana / Pre-entreno)</span>
            </div>
            {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showNutrition && (
            <div className="px-3.5 py-2.5 text-xs text-slate-300 border-t border-border/50 leading-relaxed bg-surface/60 whitespace-pre-line">
              {parsed.nutrition}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN DESPLEGABLE: ENFOQUE MENTAL */}
      {parsed.mentalTip && (
        <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-purple-950/15">
          <button
            type="button"
            onClick={() => setShowMental(!showMental)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-purple-300 hover:text-purple-200 font-bold transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Brain size={14} className="text-purple-400" />
              <span>Enfoque Psicológico & Tip Mental</span>
            </div>
            {showMental ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showMental && (
            <div className="px-3.5 py-2.5 text-xs text-purple-100/90 border-t border-purple-500/20 leading-relaxed bg-surface/60 whitespace-pre-line">
              {parsed.mentalTip}
            </div>
          )}
        </div>
      )}

      {/* Metadatos extra (Suunto, adaptación, datos reales) */}
      {parsed.extraTrailing && parsed.extraTrailing.length > 0 && (
        <div className="text-[11px] text-muted flex flex-col gap-1 pt-1 border-t border-border/40">
          {parsed.extraTrailing.map((t, idx) => (
            <div key={idx} className="leading-snug opacity-90 whitespace-pre-line">
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper para running
function parseWorkoutNotes(notes: string, discipline: string) {
  if (!notes || !notes.trim()) {
    return { isStructured: false, header: "", warmup: "", mainPart: "", cooldown: "", strategy: "", hydration: "", nutrition: "", mentalTip: "", extraTrailing: [] };
  }

  let text = notes.trim();
  const extraTrailing: string[] = [];

  const suuntoMatch = text.match(/\|\s*\[Suunto Cloud\][^\n]*/);
  if (suuntoMatch) {
    extraTrailing.push(suuntoMatch[0].trim());
    text = text.replace(suuntoMatch[0], "").trim();
  }
  const adaptMatch = text.match(/---\s*\n\[Adaptación Automática[\s\S]*$/);
  if (adaptMatch) {
    extraTrailing.push(adaptMatch[0].trim());
    text = text.substring(0, adaptMatch.index).trim();
  }
  const fitImportMatch = text.match(/--\s*\nImportado desde \.fit[\s\S]*$/);
  if (fitImportMatch) {
    extraTrailing.push(fitImportMatch[0].trim());
    text = text.substring(0, fitImportMatch.index).trim();
  }
  const datosRealesMatch = text.match(/DATOS REALES REGISTRADOS[\s\S]*$/);
  if (datosRealesMatch) {
    extraTrailing.push(datosRealesMatch[0].trim());
    text = text.substring(0, datosRealesMatch.index).trim();
  }

  let mentalTip = "";
  const mentalMatch = text.match(/-\s*Enfoque Psicológico & Tip Mental:[^\n]*(?:\n\s+•[^\n]*|\n(?!\s*-)[^\n]*)*/i);
  if (mentalMatch) {
    mentalTip = mentalMatch[0].replace(/^-\s*Enfoque Psicológico & Tip Mental:\s*/i, "").trim();
    text = text.replace(mentalMatch[0], "").trim();
  }

  let nutrition = "";
  const nutMatch = text.match(/-\s*(?:Estrategia )?Nutrición[^\n]*(?:\n\s+•[^\n]*|\n(?!\s*-)[^\n]*)*/i);
  if (nutMatch) {
    nutrition = nutMatch[0].replace(/^-\s*(?:Estrategia )?Nutrición(?:\s*\([^)]*\))?:\s*/i, "").trim();
    text = text.replace(nutMatch[0], "").trim();
  }

  let hydration = "";
  const hydMatch = text.match(/-\s*(?:Nutrición\/)?Hidratación:[^\n]*/i);
  if (hydMatch) {
    hydration = hydMatch[0].replace(/^-\s*(?:Nutrición\/)?Hidratación:\s*/i, "").trim();
    text = text.replace(hydMatch[0], "").trim();
  }

  let strategy = "";
  const stratMatch = text.match(/-\s*Clave estratégica:[^\n]*/i);
  if (stratMatch) {
    strategy = stratMatch[0].replace(/^-\s*Clave estratégica:\s*/i, "").trim();
    text = text.replace(stratMatch[0], "").trim();
  }

  let header = "";
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (rawLines.length > 0 && (rawLines[0].startsWith("RUNNING") || rawLines[0].startsWith("NATACIÓN") || rawLines[0].startsWith("GIMNASIO") || rawLines[0].endsWith(":"))) {
    header = rawLines[0].replace(/:$/, "").trim();
    text = rawLines.slice(1).join("\n").trim();
  }

  let warmup = "";
  let mainPart = "";
  let cooldown = "";
  const otherParts: string[] = [];

  const blocks = text.split(/\n(?=-\s*|\b(?:Calentamiento|Cuerpo|Bloque|Vuelta a la calma|Técnica|Rectas|Base aeróbica)\b)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const clean = block.replace(/^-\s*/, "").trim();
    if (/calentamiento/i.test(clean) && !/vuelta a la calma/i.test(clean)) {
      const wClean = clean.replace(/^calentamiento(?:\s*\([^)]*\))?:?\s*/i, "").trim();
      warmup = warmup ? `${warmup} · ${wClean}` : wClean;
    } else if (/vuelta a la calma/i.test(clean)) {
      const cClean = clean.replace(/^vuelta a la calma(?:\s*\([^)]*\))?:?\s*/i, "").trim();
      cooldown = cooldown ? `${cooldown} · ${cClean}` : cClean;
    } else if (/^(?:bloque principal|parte principal|cuerpo|bloque de volumen|bloque tempo|bloque de cuestas|rodaje continuo|base aeróbica)/i.test(clean)) {
      const mClean = clean.replace(/^(?:bloque principal|parte principal|cuerpo(?:\s*\([^)]*\))?|bloque de volumen|bloque tempo|bloque de cuestas|rodaje continuo|base aeróbica)(?:\s*\([^)]*\))?:?\s*/i, "").trim();
      mainPart = mainPart ? `${mainPart} · ${mClean}` : mClean;
    } else if (/^(?:técnica|rectas de activación|bloque específico de ritmo|objetivo)/i.test(clean)) {
      const mClean = clean.replace(/^(?:técnica|rectas de activación|bloque específico de ritmo|objetivo)(?:\s*\([^)]*\))?:?\s*/i, "").trim();
      mainPart = mainPart ? `${mainPart} · ${mClean}` : mClean;
    } else {
      otherParts.push(clean);
    }
  }

  if (otherParts.length > 0) {
    if (!mainPart) {
      mainPart = otherParts.join(" · ");
    } else {
      mainPart = `${mainPart} · ${otherParts.join(" · ")}`;
    }
  }

  if (discipline === "carrera" || warmup || cooldown) {
    if (!warmup && discipline === "carrera") {
      warmup = "Trote suave progresivo en zona R0 (>5:30/km) + movilidad articular activa de tobillos y cadera.";
    }
    if (!mainPart && discipline === "carrera") {
      mainPart = text || "Rodaje a ritmo objetivo planificado con cadencia ágil y pulso controlado.";
    }
    if (!cooldown && discipline === "carrera") {
      cooldown = "Trote regenerativo muy suave o caminata + estiramientos completos de tren inferior.";
    }
  }

  return {
    header,
    warmup,
    mainPart,
    cooldown,
    strategy,
    hydration,
    nutrition,
    mentalTip,
    extraTrailing,
    isStructured: !!(warmup || mainPart || cooldown),
  };
}

function calculateRunningMetrics(
  parsed: any,
  notes: string,
  discipline: string,
  distanceKm?: number | null,
  durationMin?: number | null
) {
  const wRaw = extractMetricsFromText(parsed.warmup);
  const mRaw = extractMetricsFromText(parsed.mainPart);
  const cRaw = extractMetricsFromText(parsed.cooldown);

  if (discipline === "carrera") {
    let mDist = mRaw.dist;
    if (mDist === null) {
      mDist = distanceKm && distanceKm >= 4 ? distanceKm : 8.0;
    }

    let wDist = wRaw.dist;
    if (wDist === null) {
      wDist = mDist >= 15 ? 2.0 : mDist >= 10 ? 1.5 : 1.0;
    }
    let wTime = wRaw.time ?? Math.round(wDist * 5.75);

    let cDist = cRaw.dist;
    if (cDist === null) {
      cDist = mDist >= 15 ? 1.5 : 1.0;
    }
    let cTime = cRaw.time ?? Math.round(cDist * 6.0);

    const wPace = wRaw.pace || "5:45 - 5:30 min/km (Zona R0 trote suave)";
    const cPace = cRaw.pace || "> 6:00 min/km (Trote suave / Caminata)";
    let mPace = mRaw.pace;
    if (!mPace) {
      const full = `${notes} ${parsed.header || ""}`.toLowerCase();
      if (full.includes("r3") || full.includes("series") || full.includes("umbral")) {
        mPace = "4:18 - 4:20 min/km (Zona R3/R4 Umbral · Recup: 6:00/km)";
      } else if (full.includes("cuestas")) {
        mPace = "Aceleración elástica en subida (RPE 8-9) · Bajada al paso";
      } else if (full.includes("r2") || full.includes("tempo") || full.includes("progresivo")) {
        mPace = "4:59 - 4:35 min/km (Zona R2 Tempo crucero)";
      } else if (full.includes("r5") || full.includes("tirada") || full.includes("larga")) {
        mPace = "5:25 - 5:10 min/km (Cierre últimos 3 km a 5:05/km Ritmo Maratón)";
      } else if (full.includes("r0") || full.includes("regenerativo")) {
        mPace = "> 5:25 - 5:45 min/km (Zona R0 regenerativa · FC < 140 lpm)";
      } else {
        mPace = "5:25 - 4:59 min/km (Zona R1 aeróbica conversacional)";
      }
    }

    let mTime = mRaw.time;
    if (mTime === null) {
      let paceNum = 5.15;
      if (mPace.includes("4:18") || mPace.includes("4:20")) paceNum = 4.3;
      else if (mPace.includes("4:59") || mPace.includes("4:35")) paceNum = 4.75;
      else if (mPace.includes("5:25") || mPace.includes("5:10")) paceNum = 5.2;
      else if (mPace.includes("5:45")) paceNum = 5.5;
      mTime = Math.round(mDist * paceNum);
    }

    const totDist = Number((wDist + mDist + cDist).toFixed(1));
    const totDur = wTime + mTime + cTime;

    return {
      totalDist: `${totDist.toFixed(1)} km`,
      totalDur: totDur,
      warmup: { badgeLabel: `${wDist.toFixed(1)} km · ${wTime} min`, pace: wPace },
      main: { badgeLabel: `${mDist.toFixed(1)} km · ${mTime} min`, pace: mPace },
      cooldown: { badgeLabel: `${cDist.toFixed(1)} km · ${cTime} min`, pace: cPace },
    };
  }

  // Fallback genérico
  return {
    totalDist: distanceKm ? `${distanceKm} km` : null,
    totalDur: durationMin ?? 50,
    warmup: { badgeLabel: "10 min", pace: "Activación dinámica" },
    main: { badgeLabel: `${durationMin ?? 40} min`, pace: "Intensidad objetivo" },
    cooldown: { badgeLabel: "5 min", pace: "Vuelta a la calma" },
  };
}
