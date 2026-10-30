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
} from "lucide-react";

interface WorkoutStructuredNotesProps {
  notes: string;
  discipline: string;
  themeColor?: string;
  distanceKm?: number | null;
  durationMin?: number | null;
  className?: string;
}

interface ParsedWorkoutParts {
  header?: string;
  warmup?: string;
  mainPart?: string;
  cooldown?: string;
  strategy?: string;
  hydration?: string;
  nutrition?: string;
  mentalTip?: string;
  extraTrailing?: string[];
  isStructured: boolean;
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

  // 1. Extraer ritmo si existe explícitamente: "Ritmo: 5:25 - 5:10 min/km..." o similar
  const paceExplicitMatch = text.match(/Ritmo:?\s*([^):]+)/i);
  if (paceExplicitMatch) {
    pace = paceExplicitMatch[1].trim();
  } else {
    const pacePatternMatch = text.match(/(\d:\d{2}\s*[-–]\s*\d:\d{2}\s*(?:min\/km|\/km)?(?:\s*\([^)]*\))?)/i);
    if (pacePatternMatch) {
      pace = pacePatternMatch[1].trim();
    }
  }

  // 2. Distancia en km: ej "11.0 km", "1.5 km", "12k"
  const distMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kms)\b/i);
  if (distMatch) {
    dist = parseNumber(distMatch[1]);
  } else {
    // Buscar metros si son >= 150m (natación o carrera)
    const mMatch = text.match(/(\d{3,4})\s*(?:m|metros)\b/i);
    if (mMatch) {
      const meters = parseNumber(mMatch[1]);
      if (meters) dist = Number((meters / 1000).toFixed(2));
    }
  }

  // 3. Tiempo en minutos: ej "57 min", "15-20 min", "9 min"
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

export function parseWorkoutNotes(notes: string, discipline: string): ParsedWorkoutParts {
  if (!notes || !notes.trim()) {
    return { isStructured: false };
  }

  let text = notes.trim();

  // 1. Extraer colas o metadatos
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

  // 2. Extraer Enfoque Mental
  let mentalTip = "";
  const mentalMatch = text.match(/-\s*Enfoque Psicológico & Tip Mental:[^\n]*(?:\n\s+•[^\n]*|\n(?!\s*-)[^\n]*)*/);
  if (mentalMatch) {
    mentalTip = mentalMatch[0].replace(/^-\s*Enfoque Psicológico & Tip Mental:\s*/i, "").trim();
    text = text.replace(mentalMatch[0], "").trim();
  }

  // 3. Extraer Estrategia Nutrición
  let nutrition = "";
  const nutMatch = text.match(/-\s*Estrategia Nutrición[^\n]*(?:\n\s+•[^\n]*|\n(?!\s*-)[^\n]*)*/);
  if (nutMatch) {
    nutrition = nutMatch[0].replace(/^-\s*Estrategia Nutrición(?:\s*\([^)]*\))?:\s*/i, "").trim();
    text = text.replace(nutMatch[0], "").trim();
  }

  // 4. Extraer Hidratación
  let hydration = "";
  const hydMatch = text.match(/-\s*(?:Nutrición\/)?Hidratación:[^\n]*/i);
  if (hydMatch) {
    hydration = hydMatch[0].replace(/^-\s*(?:Nutrición\/)?Hidratación:\s*/i, "").trim();
    text = text.replace(hydMatch[0], "").trim();
  }

  // 5. Extraer Clave estratégica
  let strategy = "";
  const stratMatch = text.match(/-\s*Clave estratégica:[^\n]*/i);
  if (stratMatch) {
    strategy = stratMatch[0].replace(/^-\s*Clave estratégica:\s*/i, "").trim();
    text = text.replace(stratMatch[0], "").trim();
  }

  // 6. Extraer título / cabecera si existe
  let header = "";
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (rawLines.length > 0 && (rawLines[0].startsWith("RUNNING") || rawLines[0].startsWith("NATACIÓN") || rawLines[0].startsWith("CROSSFIT") || rawLines[0].startsWith("FUERZA") || rawLines[0].endsWith(":"))) {
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

  const isStructured = !!(warmup || mainPart || cooldown);

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
    isStructured,
  };
}

export function WorkoutStructuredNotes({
  notes,
  discipline,
  themeColor = "var(--color-brand)",
  distanceKm,
  durationMin,
  className = "",
}: WorkoutStructuredNotesProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [showMental, setShowMental] = useState(false);

  const parsed = useMemo(() => parseWorkoutNotes(notes, discipline), [notes, discipline]);

  // Cálculo riguroso: El trabajo especificado (ej. 12 km o 11 km) ES LA PARTE PRINCIPAL
  const metrics = useMemo(() => {
    const wRaw = extractMetricsFromText(parsed.warmup);
    const mRaw = extractMetricsFromText(parsed.mainPart);
    const cRaw = extractMetricsFromText(parsed.cooldown);

    if (discipline === "carrera") {
      // 1. La parte principal es el trabajo clave (ej. 11 km, 12 km, 8 km)
      let mDist = mRaw.dist;
      if (mDist === null) {
        mDist = distanceKm && distanceKm >= 4 ? distanceKm : 8.0;
      }

      // 2. Calentamiento (1.5 km o 2.0 km si >= 15k)
      let wDist = wRaw.dist;
      if (wDist === null) {
        wDist = mDist >= 15 ? 2.0 : mDist >= 10 ? 1.5 : 1.0;
      }
      let wTime = wRaw.time ?? Math.round(wDist * 5.75);

      // 3. Vuelta a la calma (1.0 km o 1.5 km si >= 15k)
      let cDist = cRaw.dist;
      if (cDist === null) {
        cDist = mDist >= 15 ? 1.5 : 1.0;
      }
      let cTime = cRaw.time ?? Math.round(cDist * 6.0);

      // Ritmos
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

      // Tiempo de la parte principal según ritmo medio
      let mTime = mRaw.time;
      if (mTime === null) {
        let paceNum = 5.15;
        if (mPace.includes("4:18") || mPace.includes("4:20")) paceNum = 4.3;
        else if (mPace.includes("4:59") || mPace.includes("4:35")) paceNum = 4.75;
        else if (mPace.includes("5:25") || mPace.includes("5:10")) paceNum = 5.2;
        else if (mPace.includes("5:45")) paceNum = 5.5;
        mTime = Math.round(mDist * paceNum);
      }

      // Total sesión real = Calentamiento + Trabajo Principal + Vuelta a la Calma
      const totDist = Number((wDist + mDist + cDist).toFixed(1));
      const totDur = wTime + mTime + cTime;

      return {
        totalDist: `${totDist.toFixed(1)} km`,
        totalDur: totDur,
        mainDistNum: mDist,
        warmup: {
          distLabel: `${wDist.toFixed(1)} km`,
          timeLabel: `${wTime} min`,
          badgeLabel: `${wDist.toFixed(1)} km · ${wTime} min`,
          pace: wPace,
        },
        main: {
          distLabel: `${mDist.toFixed(1)} km`,
          timeLabel: `${mTime} min`,
          badgeLabel: `${mDist.toFixed(1)} km · ${mTime} min`,
          pace: mPace,
        },
        cooldown: {
          distLabel: `${cDist.toFixed(1)} km`,
          timeLabel: `${cTime} min`,
          badgeLabel: `${cDist.toFixed(1)} km · ${cTime} min`,
          pace: cPace,
        },
      };
    }

    if (discipline === "natacion") {
      const totM = distanceKm ? Math.round(distanceKm * 1000) : 1800;
      const wM = wRaw.dist ? Math.round(wRaw.dist * 1000) : 350;
      const cM = cRaw.dist ? Math.round(cRaw.dist * 1000) : 200;
      const mM = Math.max(400, totM - wM - cM);

      const wT = wRaw.time ?? Math.round(wM / 50);
      const cT = cRaw.time ?? Math.round(cM / 45);
      const mT = Math.max(10, (durationMin ?? 45) - wT - cT);

      return {
        totalDist: `${totM}m`,
        totalDur: durationMin ?? 45,
        mainDistNum: mM,
        warmup: {
          distLabel: `${wM}m`,
          timeLabel: `${wT} min`,
          badgeLabel: `${wM}m · ${wT} min`,
          pace: "Nado suave y activación articular",
        },
        main: {
          distLabel: `${mM}m`,
          timeLabel: `${mT} min`,
          badgeLabel: `${mM}m · ${mT} min`,
          pace: "Ritmo crucero RPE 5-6 con pull-buoy",
        },
        cooldown: {
          distLabel: `${cM}m`,
          timeLabel: `${cT} min`,
          badgeLabel: `${cM}m · ${cT} min`,
          pace: "Espalda suave y descompresión",
        },
      };
    }

    // Disciplinas de tiempo (Gimnasio, CrossFit)
    const totMin = durationMin ?? 50;
    const wT = wRaw.time ?? 12;
    const cT = cRaw.time ?? 8;
    const mT = Math.max(15, totMin - wT - cT);

    return {
      totalDist: null,
      totalDur: totMin,
      mainDistNum: null,
      warmup: {
        distLabel: "",
        timeLabel: `${wT} min`,
        badgeLabel: `${wT} min`,
        pace: "Movilidad dinámica & activación neuromuscular",
      },
      main: {
        distLabel: "",
        timeLabel: `${mT} min`,
        badgeLabel: `${mT} min`,
        pace: "Intensidad programada RPE 7-8",
      },
      cooldown: {
        distLabel: "",
        timeLabel: `${cT} min`,
        badgeLabel: `${cT} min`,
        pace: "Estiramientos & descarga",
      },
    };
  }, [parsed, discipline, distanceKm, durationMin, notes]);

  // Si no se pudo estructurar, mostrar vista limpia
  if (!parsed.isStructured) {
    return (
      <div
        className={`w-full text-xs sm:text-sm ${className}`}
        style={{
          padding: "10px 12px",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: `4px solid ${themeColor}`,
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          color: "var(--color-text)",
        }}
      >
        {notes}
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-col gap-2 rounded-xl overflow-hidden text-xs sm:text-sm ${className}`}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `4px solid ${themeColor}`,
        padding: "12px 14px",
      }}
    >
      {/* 0. Cabecera con Título y Barra de Volumen Total de la Sesión */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-muted">
          <Activity size={13} style={{ color: themeColor }} />
          <span>{parsed.header || "Estructura del Entrenamiento"}</span>
        </div>
        {metrics.totalDur && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 font-mono text-[11px] font-bold text-slate-200">
            <span className="text-slate-400 font-sans font-medium text-[10px]">Total sesión:</span>
            {metrics.totalDist && <span className="text-emerald-400">{metrics.totalDist}</span>}
            {metrics.totalDist && <span className="text-slate-500">·</span>}
            <span className="text-cyan-400">{metrics.totalDur} min</span>
          </div>
        )}
      </div>

      {/* BLOQUES ESTRUCTURADOS CON DISTANCIA, TIEMPO Y RITMO OBJETIVO */}
      <div className="flex flex-col gap-2.5 pt-1">
        {/* 1. CALENTAMIENTO */}
        {parsed.warmup && (
          <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-emerald-400 uppercase tracking-wider">
                <Flame size={13} className="text-emerald-400 shrink-0" />
                <span>1. Calentamiento</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-mono text-[11px] font-extrabold">
                <Timer size={11} className="opacity-80" />
                <span>{metrics.warmup.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DEL CALENTAMIENTO */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400/90 mb-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
          <div className="p-2.5 sm:p-3 rounded-lg bg-brand/10 border border-brand/35 text-slate-100">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5 font-extrabold text-[11px] sm:text-xs text-brand uppercase tracking-wider">
                <Zap size={13} className="text-brand shrink-0" />
                <span>2. Parte Principal (Trabajo Clave)</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand/25 text-brand border border-brand/45 font-mono text-[11px] font-black">
                <Navigation size={11} className="opacity-80" />
                <span>{metrics.main.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DE LA PARTE PRINCIPAL */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 mb-1.5 bg-brand/15 px-2 py-0.5 rounded border border-brand/25">
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
          <div className="p-2.5 sm:p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs text-cyan-400 uppercase tracking-wider">
                <Wind size={13} className="text-cyan-400 shrink-0" />
                <span>3. Vuelta a la calma</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 font-mono text-[11px] font-extrabold">
                <Timer size={11} className="opacity-80" />
                <span>{metrics.cooldown.badgeLabel}</span>
              </div>
            </div>

            {/* RITMO OBJETIVO DE LA VUELTA A LA CALMA */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400/90 mb-1.5 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              <Gauge size={12} className="shrink-0 text-cyan-400" />
              <span>Ritmo objetivo: {metrics.cooldown.pace}</span>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {parsed.cooldown}
            </div>
          </div>
        )}
      </div>

      {/* Clave estratégica o Hidratación específica */}
      {parsed.strategy && (
        <div className="text-xs p-2 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-200 leading-relaxed">
          <strong>Clave estratégica:</strong> {parsed.strategy}
        </div>
      )}

      {parsed.hydration && (
        <div className="text-xs p-2 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-200 leading-relaxed">
          <strong>Hidratación:</strong> {parsed.hydration}
        </div>
      )}

      {/* SECCIÓN DESPLEGABLE: NUTRICIÓN */}
      {parsed.nutrition && (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-surface-raised/40">
          <button
            type="button"
            onClick={() => setShowNutrition(!showNutrition)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-muted hover:text-foreground font-medium transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Apple size={13} className="text-emerald-400" />
              <span>Pautas de Nutrición (Media mañana / Pre-entreno)</span>
            </div>
            {showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showNutrition && (
            <div className="px-3 py-2 text-xs text-slate-300 border-t border-border/50 leading-relaxed bg-surface/60 whitespace-pre-line">
              {parsed.nutrition}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN DESPLEGABLE: ENFOQUE MENTAL */}
      {parsed.mentalTip && (
        <div className="rounded-lg border border-border/70 overflow-hidden bg-surface-raised/40">
          <button
            type="button"
            onClick={() => setShowMental(!showMental)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-muted hover:text-foreground font-medium transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Brain size={13} className="text-purple-400" />
              <span>Enfoque Psicológico & Tip Mental</span>
            </div>
            {showMental ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showMental && (
            <div className="px-3 py-2 text-xs text-slate-300 border-t border-border/50 leading-relaxed bg-surface/60 whitespace-pre-line">
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
