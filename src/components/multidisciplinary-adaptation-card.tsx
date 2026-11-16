"use client";

import { Activity, ShieldAlert, Heart, Zap, Sparkles, UtensilsCrossed, Brain, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import type { MultidisciplinaryDiagnosis } from "@/lib/sensory-adaptation-engine";

export interface MultidisciplinaryAdaptationCardProps {
  adaptation: {
    timestamp?: string;
    triggerType?: string;
    triggerDescription?: string;
    feeling?: number | null;
    rpe?: number | null;
    fatigueScore?: number;
    multidisciplinary?: MultidisciplinaryDiagnosis;
    appliedModifications?: Array<{
      sessionId: number;
      date: string;
      discipline: string;
      originalPlannedCode: string | null;
      newPlannedCode: string;
      reason: string;
    }>;
  } | null;
  onViewSession?: (sessionId: number) => void;
}

export function MultidisciplinaryAdaptationCard({ adaptation, onViewSession }: MultidisciplinaryAdaptationCardProps) {
  if (!adaptation || !adaptation.multidisciplinary) return null;

  const multi = adaptation.multidisciplinary;
  const mods = adaptation.appliedModifications ?? [];

  return (
    <section
      className="surface p-4 sm:p-5 rounded-2xl animate-in space-y-4"
      style={{
        borderLeft: "4px solid #6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.04)",
        borderTop: "1px solid rgba(99, 102, 241, 0.25)",
        borderRight: "1px solid rgba(99, 102, 241, 0.25)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.25)",
      }}
    >
      {/* Cabecera del Equipo Técnico */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}
          >
            <Sparkles size={20} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-brand text-[10px] font-bold uppercase tracking-wider">
                Equipo Técnico Multidisciplinar
              </span>
              <span className="badge badge-warning text-[10px] font-bold">
                Plan adaptado por sensaciones
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-1">
              Ajuste Automático por Carga & Sensaciones
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {adaptation.triggerDescription || "Detección de fatiga o molestias en las sensaciones subjetivas post-entreno."}
            </p>
          </div>
        </div>
      </div>

      {/* Modificaciones de Sesiones Aplicadas */}
      {mods.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" />
            <span>Reajuste del Calendario Aplicado:</span>
          </div>
          <div className="grid gap-2">
            {mods.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex-wrap"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted">{m.date}:</span>
                  <span className="line-through text-slate-400">{m.originalPlannedCode || m.discipline}</span>
                  <ArrowRight size={12} className="text-indigo-400" />
                  <span className="font-bold text-emerald-400">{m.newPlannedCode}</span>
                </div>
                {onViewSession && (
                  <button
                    type="button"
                    onClick={() => onViewSession(m.sessionId)}
                    className="btn btn-ghost btn-xs text-[11px] text-indigo-400 hover:text-indigo-300 p-0"
                  >
                    Ver sesión
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desglose de los 4 Especialistas */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* 1. Preparador Físico */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Activity size={14} />
            <span>1. Preparador Físico de Élite</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed m-0">
            {multi.preparadorFisico}
          </p>
        </div>

        {/* 2. Fisioterapeuta Deportivo */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Heart size={14} />
            <span>2. Fisioterapeuta Deportivo (Descarga)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed m-0">
            {multi.fisioterapeuta}
          </p>
        </div>

        {/* 3. Nutricionista Deportivo */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <UtensilsCrossed size={14} />
            <span>3. Nutricionista Deportivo (Energía & Sales)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed m-0">
            {multi.nutricionista}
          </p>
        </div>

        {/* 4. Psicólogo Deportivo */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
            <Brain size={14} />
            <span>4. Psicólogo Deportivo (Foco & Confianza)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed m-0">
            {multi.psicologo}
          </p>
        </div>
      </div>
    </section>
  );
}
