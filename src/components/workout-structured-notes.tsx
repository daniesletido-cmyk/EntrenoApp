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
  UtensilsCrossed,
  CheckCircle2,
  Award,
  Waves,
  HeartPulse,
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

interface WodStep {
  kind: "exercise" | "note";
  reps?: string;
  name: string;
  details?: string;
}

interface CrossfitBlock {
  type: "schedule" | "warmup" | "strength" | "wod" | "nutrition" | "general";
  title: string;
  badge?: string;
  items?: string[];
  steps?: WodStep[];
  scoreNote?: string;
}

function parseNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  const clean = str.replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function extractMetricsFromText(text: string | undefined): {
  dist: number | null;
  meters: number | null;
  time: number | null;
  pace: string | null;
} {
  let dist: number | null = null;
  let meters: number | null = null;
  let time: number | null = null;
  let pace: string | null = null;

  if (!text) return { dist, meters, time, pace };

  const paceExplicitMatch = text.match(/Ritmo:?\s*([^\n)]+(?:\([^)]*\))?)/i);
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
  }

  const mMatch = text.match(/(\d+(?:\.\d{3})?)\s*(?:m|metros)\b/i);
  if (mMatch) {
    const cleanM = parseFloat(mMatch[1].replace(/\./g, ""));
    if (!isNaN(cleanM)) {
      meters = cleanM;
      if (dist === null) dist = Number((cleanM / 1000).toFixed(2));
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

  return { dist, meters, time, pace };
}

function splitBullets(rawText: string): string[] {
  return rawText
    .split("\n")
    .map((l) => l.trim().replace(/^[•*\-\s]+/, "").trim())
    .filter(Boolean);
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

  let text = notes.trim();
  const lines = text.split("\n");
  if (lines.length > 0 && (lines[0].startsWith("CROSSFIT") || lines[0].startsWith("GIMNASIO") || lines[0].endsWith(":"))) {
    header = lines[0].replace(/:$/, "").trim();
    text = lines.slice(1).join("\n").trim();
  }

  // Dividir por bloques mayores indicados por "- " al inicio de línea
  const rawSections = text
    .split(/\n(?=-\s*)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sec of rawSections) {
    const cleanSec = sec.replace(/^-\s*/, "").trim();

    // 1. Horario de sesión
    if (/^Horario de Sesión:/i.test(cleanSec)) {
      schedule = cleanSec.replace(/^Horario de Sesión:\s*/i, "").trim();
      continue;
    }

    // 2. Calentamiento y movilidad
    if (/^Calentamiento/i.test(cleanSec)) {
      const secLines = cleanSec.split("\n");
      const firstLine = secLines[0];
      const timeMatch = firstLine.match(/\(([^)]+)\)/);
      const subItems = secLines
        .slice(1)
        .map((l) => l.trim().replace(/^[•*\-\s]+/, ""))
        .filter(Boolean);

      const inlineDesc = firstLine.replace(/^Calentamiento(?:\s*(?:y|&)\s*movilidad(?:\s+articular)?(?:\s+dinámica)?)?:?\s*/i, "").trim();
      const items = subItems.length > 0 ? subItems : [inlineDesc || firstLine];

      blocks.push({
        type: "warmup",
        title: "Calentamiento & Movilidad",
        badge: timeMatch ? timeMatch[1] : "Activación",
        items,
      });
      continue;
    }

    // 3. Bloque de Fuerza / STRENGTH / SKILL / ACCESORIOS
    if (/^(?:STRENGTH|FUERZA|SKILL|Halterofilia|POST-WORKOUT)/i.test(cleanSec)) {
      const secLines = cleanSec.split("\n");
      const firstLine = secLines[0];
      const parenMatch = firstLine.match(/\(([^)]+)\)/);
      const subItems = secLines
        .slice(1)
        .map((l) => l.trim().replace(/^[•*\-\s]+/, ""))
        .filter(Boolean);

      const inlineAfterColon = firstLine.includes(":")
        ? firstLine.slice(firstLine.indexOf(":") + 1).trim()
        : "";
      const items =
        subItems.length > 0
          ? subItems
          : inlineAfterColon
          ? [inlineAfterColon]
          : [firstLine];

      const cleanTitle = firstLine.replace(/\([^)]*\)/g, "").replace(/:$/, "").trim();

      blocks.push({
        type: "strength",
        title: cleanTitle || "Fuerza / Técnica",
        badge: parenMatch ? parenMatch[1] : "Fuerza Principal",
        items,
      });
      continue;
    }

    // 4. Bloque WOD / FREEDOM / METCON / AMRAP / FOR TIME / EMOM
    if (/^(?:FREEDOM|WOD|AMRAP|FOR TIME|EMOM|METCON|Rondas)/i.test(cleanSec)) {
      const linesInWod = cleanSec.split("\n");
      const titleLine = linesInWod[0];
      let scoreNote = "";

      const parenInfo = titleLine.match(/\(([^)]+)\)/g)?.map((p) => p.replace(/[()]/g, "")) ?? [];
      const formatMatch = titleLine.match(/(\d+\s*Rondas[^(:]*|3-3-3-4:00\s*AMRAP|\d+:\d{2}\s*AMRAP|\d+\s*min\s*AMRAP|Por Tiempo|FOR TIME|EMOM\s*\d+|AMRAP)/i);
      const formatBadge = formatMatch
        ? formatMatch[1].trim()
        : parenInfo.find((p) => !/^RX$/i.test(p)) || "WOD Clave";

      const steps: WodStep[] = [];

      for (const line of linesInWod.slice(1)) {
        const tr = line.trim();
        if (!tr) continue;

        const cleanLine = tr.replace(/^[•*\-\s]+/, "").trim();
        if (!cleanLine) continue;

        if (/^Puntuación:/i.test(cleanLine)) {
          scoreNote = cleanLine;
          continue;
        }

        // Capturar: "800m Carrera", "50 GHD Sit-ups", "21/16 Cal Air Bike", "3 Trepas de cuerda", "Max ..."
        const distOrRepMatch = cleanLine.match(
          /^(\d+(?:\/\d+)?(?:\.\d{3})?\s*(?:m|km|Calorías|Calorias|Cal|Kcal|Reps)?)\s+(.*)/i
        );
        const isInstructionLine = /^(?:Descanso|En el tiempo|Nota|Escala|Ritmo)/i.test(cleanLine);

        if (distOrRepMatch && !isInstructionLine) {
          let reps = distOrRepMatch[1].trim();
          const rest = distOrRepMatch[2].trim();

          // Normalizar badge de medida
          if (/^\d+(?:\/\d+)?$/.test(reps)) {
            reps = `${reps} Reps`;
          } else if (/^(\d+(?:\.\d{3})?)(m|km)$/i.test(reps)) {
            reps = reps.replace(/(m|km)$/i, " $1");
          }

          const parenMatch = rest.match(/\(([^)]+)\)/);
          const bracketMatch = rest.match(/\[([^\]]+)\]/);
          const name = rest
            .replace(/\([^)]+\)/g, "")
            .replace(/\[[^\]]+\]/g, "")
            .replace(/[\s.,]+$/, "")
            .trim();
          const detailsParts = [
            parenMatch ? parenMatch[1].trim() : "",
            bracketMatch ? bracketMatch[1].trim() : "",
          ].filter(Boolean);

          steps.push({
            kind: "exercise",
            reps,
            name: name || cleanLine,
            details: detailsParts.length > 0 ? detailsParts.join(" · ") : undefined,
          });
        } else {
          steps.push({
            kind: "note",
            name: cleanLine,
          });
        }
      }

      const cleanWodTitle = titleLine
        .replace(/-\s*(?:Por Tiempo|\d+\s*Rondas|\d+:\d{2}).*$/i, "")
        .replace(/:$/, "")
        .trim();

      blocks.push({
        type: "wod",
        title: cleanWodTitle || "WOD Freedom (RX)",
        badge: formatBadge,
        steps,
        scoreNote: scoreNote || undefined,
      });
      continue;
    }

    // 5. Enfoque Psicológico & Pacing
    if (/^Enfoque Psicológico/i.test(cleanSec) || /^Pacing/i.test(cleanSec)) {
      mentalPacing = cleanSec.replace(/^Enfoque Psicológico(?:\s*&\s*(?:Pacing|Tip Mental))?:\s*/i, "").trim();
      continue;
    }

    // 6. Estrategia Nutrición / Nutrición (soporta tanto 1 línea como multi-línea)
    if (/^(?:ESTRATEGIA )?NUTRICIÓN/i.test(cleanSec)) {
      const nutLines = cleanSec.split("\n");
      const firstLine = nutLines[0];
      const subLines = nutLines.slice(1).map((l) => l.trim().replace(/^[•*\-\s]+/, "")).filter(Boolean);

      if (subLines.length === 0) {
        const inlineText = firstLine.replace(/^(?:Estrategia\s+)?Nutrición(?:\s*\([^)]*\))?:\s*/i, "").trim();
        if (inlineText) {
          nutritionTimeline.push({ label: "Pauta Nutricional", text: inlineText, isPost: true });
        }
      } else {
        for (const tr of subLines) {
          const timeMatch = tr.match(/^(\d{1,2}:\d{2}h?\s*[-–]\s*\d{1,2}:\d{2}h?)\s*\(([^)]+)\):\s*(.*)/i);
          if (timeMatch) {
            const label = timeMatch[2].trim();
            nutritionTimeline.push({
              time: timeMatch[1].trim(),
              label,
              text: timeMatch[3].trim(),
              isPreWorkout: /merienda|pre-workout|pre\s*entreno/i.test(label),
              isIntra: /intra/i.test(label),
              isPost: /cena|post/i.test(label),
            });
          } else {
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
      }
      continue;
    }

    // 7. Metadatos residuales
    if (cleanSec.includes("Importado desde") || cleanSec.includes("DATOS REALES") || cleanSec.includes("[Suunto Cloud]")) {
      extraTrailing.push(cleanSec);
      continue;
    }

    // 8. Bloque general (nunca perder texto)
    const subLines = splitBullets(cleanSec);
    if (subLines.length === 0) continue;
    if (subLines.length === 1 && header && subLines[0].toLowerCase() === header.toLowerCase()) continue;
    blocks.push({
      type: "general",
      title: subLines.length > 1 ? subLines[0] : "Detalle Adicional",
      items: subLines.length > 1 ? subLines.slice(1) : subLines,
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
  const [showNutrition, setShowNutrition] = useState(true);
  const [showMental, setShowMental] = useState(true);

  const isCrossfit = discipline === "crossfit" || /crossfit|wod|tabata|amrap|ghd|toes to bar|rope climb/i.test(notes);

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
              <div className="text-[10px] text-muted">Sesión completa · Fuerza + Acondicionamiento Metabólico</div>
            </div>
          </div>

          {cfData.schedule && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
              <Clock size={12} className="text-amber-400" />
              <span>{cfData.schedule}</span>
            </div>
          )}
        </div>

        {/* Bloques Estructurados (Calentamiento, Fuerza, WOD) */}
        <div className="space-y-3">
          {cfData.blocks.map((b, idx) => {
            if (b.type === "warmup") {
              return (
                <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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
                      <div key={itIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                        <CheckCircle2 size={14} className="text-emerald-400/80 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{it}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (b.type === "strength") {
              return (
                <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-purple-500/5 border border-purple-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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
                    {b.items?.map((it, itIdx) => (
                      <div key={itIdx} className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs sm:text-sm text-slate-100 leading-relaxed flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">•</span>
                        <span>{it}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (b.type === "wod") {
              const exerciseSteps = b.steps?.filter((s) => s.kind === "exercise") ?? [];
              const noteSteps = b.steps?.filter((s) => s.kind === "note") ?? [];

              return (
                <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-black text-xs text-amber-400 uppercase tracking-wider">
                      <Zap size={15} className="text-amber-400" />
                      <span>{b.title}</span>
                    </div>
                    {b.badge && (
                      <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ⚡ {b.badge}
                      </span>
                    )}
                  </div>

                  {/* Secuencia completa de Estaciones del WOD en orden exacto */}
                  {exerciseSteps.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {exerciseSteps.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">
                                {ex.reps}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-bold">
                                #{exIdx + 1}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-100 mt-1 leading-snug">
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

                  {/* Indicaciones / Tiempo restante / Descansos dentro del WOD */}
                  {noteSteps.length > 0 && (
                    <div className="space-y-1.5">
                      {noteSteps.map((ns, nIdx) => (
                        <div
                          key={nIdx}
                          className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-2"
                        >
                          <span className="text-amber-400 font-bold shrink-0">→</span>
                          <span>{ns.name}</span>
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
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm">
                <div className="font-bold text-slate-200 mb-1">{b.title}</div>
                {b.items?.map((it, itIdx) => (
                  <div key={itIdx} className="text-muted leading-relaxed">• {it}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Enfoque Psicológico & Pacing */}
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

        {/* Nutrición / Hidratación (Completa y visible) */}
        {cfData.nutritionTimeline.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="w-full flex items-center justify-between p-3 text-xs text-foreground font-bold hover:bg-emerald-500/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <UtensilsCrossed size={14} />
                </div>
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Nutrición & Hidratación
                </span>
              </div>
              <span className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-muted">
                {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {showNutrition && (
              <div className="px-3.5 pb-3 pt-1 border-t border-emerald-500/20 space-y-2">
                {cfData.nutritionTimeline.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                    {item.time && (
                      <span className="font-mono font-bold text-emerald-400 mr-2">{item.time}</span>
                    )}
                    <span className="font-bold text-emerald-300">{item.label}: </span>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. RENDERIZADO PARA RUNNING, NATACIÓN, DESCANSO Y OTRAS DISCIPLINAS
  const parsed = parseWorkoutNotes(notes, discipline);
  const metrics = calculateSessionMetrics(parsed, notes, discipline, distanceKm, durationMin);
  const isSwim = discipline === "natacion";
  const isRest = discipline === "descanso";

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
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-muted">
          {isSwim ? (
            <Waves size={14} style={{ color: themeColor }} />
          ) : isRest ? (
            <HeartPulse size={14} style={{ color: themeColor }} />
          ) : (
            <Activity size={14} style={{ color: themeColor }} />
          )}
          <span>{parsed.header || "Estructura del Entrenamiento"}</span>
        </div>
        {metrics.totalBadge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 font-mono text-[11px] font-bold text-slate-200">
            <span className="text-slate-400 font-sans font-medium text-[10px]">Total sesión:</span>
            <span className="text-emerald-400">{metrics.totalBadge}</span>
          </div>
        )}
      </div>

      {/* Bloques Estructurados */}
      <div className="flex flex-col gap-3 pt-0.5">
        {/* 1. CALENTAMIENTO */}
        {parsed.warmupLines.length > 0 && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-emerald-400 uppercase tracking-wider">
                <Flame size={14} className="text-emerald-400 shrink-0" />
                <span>1. Calentamiento & Activación</span>
              </div>
              {metrics.warmup.badgeLabel && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-mono text-[11px] font-extrabold">
                  <Timer size={11} className="opacity-80" />
                  <span>{metrics.warmup.badgeLabel}</span>
                </div>
              )}
            </div>

            {metrics.warmup.pace && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400/90 mb-2 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                <Gauge size={12} className="shrink-0 text-emerald-400" />
                <span>Ritmo objetivo: {metrics.warmup.pace}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {parsed.warmupLines.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {parsed.warmupLines.length > 1 && <span className="text-emerald-400 font-bold">•</span>}
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. PARTE PRINCIPAL / MOVILIDAD / BLOQUE CLAVE */}
        {parsed.mainLines.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-brand/10 border border-brand/35 text-slate-100 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-black text-[11px] sm:text-xs text-brand uppercase tracking-wider">
                {isRest ? (
                  <HeartPulse size={14} className="text-brand shrink-0" />
                ) : (
                  <Zap size={14} className="text-brand shrink-0" />
                )}
                <span>
                  {isRest
                    ? "Movilidad & Recuperación Activa"
                    : isSwim
                    ? "2. Bloque Principal & Técnica en Agua"
                    : "2. Parte Principal (Trabajo Clave)"}
                </span>
              </div>
              {metrics.main.badgeLabel && (
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-md bg-brand/25 text-brand border border-brand/45 font-mono text-[11px] font-black">
                  <Navigation size={11} className="opacity-80" />
                  <span>{metrics.main.badgeLabel}</span>
                </div>
              )}
            </div>

            {metrics.main.pace && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 mb-2 bg-brand/20 px-2.5 py-1 rounded-lg border border-brand/30">
                <Gauge size={12} className="shrink-0 text-cyan-400" />
                <span>{isSwim ? "Objetivo técnico:" : "Ritmo objetivo:"} {metrics.main.pace}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
              {parsed.mainLines.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {parsed.mainLines.length > 1 && <span className="text-brand font-bold">•</span>}
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. VUELTA A LA CALMA */}
        {parsed.cooldownLines.length > 0 && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-cyan-400 uppercase tracking-wider">
                <Wind size={14} className="text-cyan-400 shrink-0" />
                <span>3. Vuelta a la Calma & Recuperación</span>
              </div>
              {metrics.cooldown.badgeLabel && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 font-mono text-[11px] font-extrabold">
                  <Timer size={11} className="opacity-80" />
                  <span>{metrics.cooldown.badgeLabel}</span>
                </div>
              )}
            </div>

            {metrics.cooldown.pace && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400/90 mb-2 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/25">
                <Gauge size={12} className="shrink-0 text-cyan-400" />
                <span>Ritmo objetivo: {metrics.cooldown.pace}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {parsed.cooldownLines.map((l, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {parsed.cooldownLines.length > 1 && <span className="text-cyan-400 font-bold">•</span>}
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clave estratégica */}
      {parsed.strategy && (
        <div className="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 leading-relaxed">
          <strong>Clave estratégica:</strong> {parsed.strategy}
        </div>
      )}

      {/* Hidratación */}
      {parsed.hydration && (
        <div className="text-xs p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-200 leading-relaxed">
          <strong>Hidratación:</strong> {parsed.hydration}
        </div>
      )}

      {/* Nutrición (abierta por defecto para que salga completa sin esconder nada) */}
      {parsed.nutrition && (
        <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-emerald-950/10">
          <button
            type="button"
            onClick={() => setShowNutrition(!showNutrition)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-emerald-300 hover:text-emerald-200 font-bold transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Apple size={14} className="text-emerald-400" />
              <span>Nutrición & Estrategia Energética</span>
            </div>
            {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showNutrition && (
            <div className="px-3.5 py-2.5 text-xs text-slate-300 border-t border-emerald-500/20 leading-relaxed bg-surface/60 whitespace-pre-line">
              {parsed.nutrition}
            </div>
          )}
        </div>
      )}

      {/* Enfoque Mental */}
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

      {/* Metadatos extra */}
      {parsed.extraTrailing.length > 0 && (
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

// ==========================================
// PARSER UNIVERSAL DE NOTAS (RUNNING / NATACIÓN / DESCANSO)
// ==========================================
function stripEmojiAndLabel(line: string, labelRegex: RegExp): string {
  const noLeadingEmoji = line.replace(/^[🟢⚡🔵🟡🟣🔴🏊🏃🏋️🧘•*\-\s]+/u, "").trim();
  return noLeadingEmoji.replace(labelRegex, "").trim();
}

function parseWorkoutNotes(notes: string, discipline: string) {
  if (!notes || !notes.trim()) {
    return {
      isStructured: false,
      header: "",
      warmupLines: [] as string[],
      mainLines: [] as string[],
      cooldownLines: [] as string[],
      strategy: "",
      hydration: "",
      nutrition: "",
      mentalTip: "",
      extraTrailing: [] as string[],
    };
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
  const mentalMatch = text.match(/-\s*Enfoque Psicológico[^:\n]*:[^\n]*(?:\n\s+•[^\n]*)*/i);
  if (mentalMatch) {
    mentalTip = mentalMatch[0].replace(/^-\s*Enfoque Psicológico[^:]*:\s*/i, "").trim();
    text = text.replace(mentalMatch[0], "").trim();
  }

  let nutrition = "";
  const nutMatch = text.match(/-\s*(?:Estrategia\s+)?Nutrición(?:\s*\([^)]*\))?:[^\n]*(?:\n\s+•[^\n]*)*/i);
  if (nutMatch) {
    nutrition = nutMatch[0].replace(/^-\s*(?:Estrategia\s+)?Nutrición(?:\s*\([^)]*\))?:\s*/i, "").trim();
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
  if (
    rawLines.length > 0 &&
    (rawLines[0].startsWith("RUNNING") ||
      rawLines[0].startsWith("NATACIÓN") ||
      rawLines[0].startsWith("DESCANSO") ||
      rawLines[0].startsWith("GIMNASIO") ||
      rawLines[0].endsWith(":"))
  ) {
    header = rawLines[0].replace(/:$/, "").trim();
    text = rawLines.slice(1).join("\n").trim();
  }

  const warmupLines: string[] = [];
  const mainLines: string[] = [];
  const cooldownLines: string[] = [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const rawLine of lines) {
    const clean = rawLine.replace(/^[-•*]\s*/, "").trim();
    const noEmoji = clean.replace(/^[🟢⚡🔵🟡🟣🔴🏊🏃🏋️🧘\s]+/u, "").trim();

    if (/calentamiento/i.test(noEmoji) && !/vuelta a la calma/i.test(noEmoji)) {
      const stripped = stripEmojiAndLabel(clean, /^calentamiento(?:\s*\([^)]*\))?:?\s*/i);
      warmupLines.push(stripped || noEmoji);
    } else if (/vuelta a la calma/i.test(noEmoji)) {
      const stripped = stripEmojiAndLabel(clean, /^vuelta a la calma(?:\s*\([^)]*\))?:?\s*/i);
      cooldownLines.push(stripped || noEmoji);
    } else if (
      /^(?:bloque principal|parte principal|cuerpo|bloque de volumen|bloque tempo|bloque de cuestas|rodaje continuo|base aeróbica)/i.test(
        noEmoji
      )
    ) {
      const stripped = stripEmojiAndLabel(
        clean,
        /^(?:bloque principal|parte principal|cuerpo|bloque de volumen|bloque tempo|bloque de cuestas|rodaje continuo|base aeróbica)(?:\s*\([^)]*\))?:?\s*/i
      );
      mainLines.push(stripped || noEmoji);
    } else {
      mainLines.push(noEmoji);
    }
  }

  if (discipline === "carrera") {
    if (warmupLines.length === 0) {
      warmupLines.push("Trote suave progresivo en zona R0 (5:45 - 5:30/km) + movilidad articular dinámica.");
    }
    if (mainLines.length === 0) {
      mainLines.push(text || "Rodaje a ritmo objetivo planificado con cadencia ágil y pulso controlado.");
    }
    if (cooldownLines.length === 0) {
      cooldownLines.push("Trote regenerativo muy suave o caminata + estiramientos completos de tren inferior.");
    }
  }

  return {
    header,
    warmupLines,
    mainLines,
    cooldownLines,
    strategy,
    hydration,
    nutrition,
    mentalTip,
    extraTrailing,
    isStructured: warmupLines.length > 0 || mainLines.length > 0 || cooldownLines.length > 0,
  };
}

function calculateSessionMetrics(
  parsed: ReturnType<typeof parseWorkoutNotes>,
  notes: string,
  discipline: string,
  distanceKm?: number | null,
  durationMin?: number | null
) {
  const warmupText = parsed.warmupLines.join(" ");
  const mainText = parsed.mainLines.join(" ");
  const cooldownText = parsed.cooldownLines.join(" ");

  const wRaw = extractMetricsFromText(warmupText);
  const mRaw = extractMetricsFromText(mainText);
  const cRaw = extractMetricsFromText(cooldownText);

  if (discipline === "carrera") {
    let mDist = mRaw.dist;
    if (mDist === null) {
      mDist = distanceKm && distanceKm >= 4 ? distanceKm : 8.0;
    }

    const wDist = wRaw.dist ?? (mDist >= 15 ? 2.0 : mDist >= 10 ? 1.5 : 1.0);
    const wTime = wRaw.time ?? Math.round(wDist * 5.75);
    const cDist = cRaw.dist ?? (mDist >= 15 ? 1.5 : 1.0);
    const cTime = cRaw.time ?? Math.round(cDist * 6.0);

    const wPace = wRaw.pace || "5:45 - 5:30 min/km (Zona R0 suave)";
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
        mPace = "5:25 - 5:10 min/km (Cierre últimos 3-4 km a 5:05/km Ritmo Maratón)";
      } else if (full.includes("r0") || full.includes("regenerativo")) {
        mPace = "> 5:25 - 5:45 min/km (Zona R0 regenerativa)";
      } else {
        mPace = "5:25 - 4:59 min/km (Zona R1 aeróbica)";
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

    const totDist = distanceKm ? distanceKm : Number((wDist + mDist + cDist).toFixed(1));
    const totDur = durationMin ? durationMin : wTime + mTime + cTime;

    return {
      totalBadge: `${totDist.toFixed(1)} km · ${totDur} min`,
      warmup: { badgeLabel: `${wDist.toFixed(1)} km · ${wTime} min`, pace: wPace },
      main: { badgeLabel: `${mDist.toFixed(1)} km · ${mTime} min`, pace: mPace },
      cooldown: { badgeLabel: `${cDist.toFixed(1)} km · ${cTime} min`, pace: cPace },
    };
  }

  if (discipline === "natacion") {
    const totalMeters = distanceKm ? Math.round(distanceKm * 1000) : 1900;
    const wBadge = wRaw.meters ? `${wRaw.meters}m` : "350m";
    const cBadge = cRaw.meters ? `${cRaw.meters}m` : "Suave";
    const mainM = totalMeters - (wRaw.meters || 350);

    return {
      totalBadge: `${totalMeters.toLocaleString("es-ES")}m · ${durationMin ?? 45} min`,
      warmup: { badgeLabel: wBadge, pace: "Suave crol / espalda" },
      main: { badgeLabel: `${mainM > 0 ? mainM : 1200}m`, pace: "Pull-buoy · Descarga piernas + Técnica" },
      cooldown: { badgeLabel: cBadge, pace: "Nado continuo relajado" },
    };
  }

  if (discipline === "descanso") {
    return {
      totalBadge: durationMin ? `${durationMin} min` : "20 min",
      warmup: { badgeLabel: "", pace: "" },
      main: { badgeLabel: `${durationMin ?? 20} min`, pace: "Cero impacto · Movilidad" },
      cooldown: { badgeLabel: "", pace: "" },
    };
  }

  return {
    totalBadge: `${distanceKm ? `${distanceKm} km · ` : ""}${durationMin ?? 50} min`,
    warmup: { badgeLabel: "10 min", pace: "Activación dinámica" },
    main: { badgeLabel: `${durationMin ?? 40} min`, pace: "Intensidad objetivo" },
    cooldown: { badgeLabel: "5 min", pace: "Vuelta a la calma" },
  };
}
