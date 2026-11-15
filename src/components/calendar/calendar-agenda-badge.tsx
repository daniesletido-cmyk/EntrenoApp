"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { AdaptedSessionProposal, DayCalendarAnalysis } from "@/lib/adaptive_scheduler";
import type { ParsedCalendarEvent } from "@/lib/ical-parser";

interface CalendarAgendaBadgeProps {
  date: string;
  onSelectVersion?: (version: "express" | "original") => void;
  activeVersion?: "express" | "original";
  onAdaptationLoaded?: (proposal: AdaptedSessionProposal | null) => void;
}

export function CalendarAgendaBadge({
  date,
  onSelectVersion,
  activeVersion = "express",
  onAdaptationLoaded,
}: CalendarAgendaBadgeProps) {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<AdaptedSessionProposal | null>(null);
  const [events, setEvents] = useState<ParsedCalendarEvent[]>([]);
  const [analysis, setAnalysis] = useState<DayCalendarAnalysis | null>(null);
  const [showEventList, setShowEventList] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/calendar/adaptation?date=${date}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.ok) {
          setProposal(data.proposal || null);
          setEvents(data.events || []);
          setAnalysis(data.analysis || null);
          if (onAdaptationLoaded) {
            onAdaptationLoaded(data.proposal || null);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, onAdaptationLoaded]);

  if (loading || (!proposal && events.length === 0)) {
    return null;
  }

  // Si no hay propuesta pero hay eventos (ej. día de descanso con eventos)
  if (!proposal && events.length > 0) {
    return (
      <div
        className="p-3 rounded-2xl flex items-center justify-between gap-2.5 text-xs"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={15} style={{ color: "var(--color-brand)" }} />
          <span>
            {events.length} {events.length === 1 ? "evento" : "eventos"} en tu Calendario de iPhone hoy
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowEventList(!showEventList)}
          className="text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          style={{ color: "var(--color-text)" }}
        >
          {showEventList ? "Ocultar" : "Ver"}
          {showEventList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
    );
  }

  if (!proposal) return null;

  const isExpress = proposal.status === "adapted_express";
  const isBlocked = proposal.status === "blocked";
  const isCleared = proposal.status === "cleared";

  return (
    <div
      className="p-4 rounded-2xl border space-y-3 transition-all animate-in"
      style={{
        background: isBlocked
          ? "rgba(220, 38, 38, 0.08)"
          : isExpress
          ? "rgba(245, 158, 11, 0.08)"
          : "var(--color-surface-raised)",
        borderColor: isBlocked
          ? "rgba(220, 38, 38, 0.3)"
          : isExpress
          ? "rgba(245, 158, 11, 0.3)"
          : "var(--color-border)",
      }}
    >
      {/* Fila principal del badge */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: isBlocked
                ? "rgba(220, 38, 38, 0.2)"
                : isExpress
                ? "rgba(245, 158, 11, 0.2)"
                : "rgba(16, 185, 129, 0.15)",
              color: isBlocked
                ? "var(--color-brand)"
                : isExpress
                ? "#f59e0b"
                : "var(--color-success)",
            }}
          >
            {isBlocked ? (
              <AlertTriangle size={15} />
            ) : isExpress ? (
              <Zap size={15} />
            ) : (
              <CalendarDays size={15} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold leading-snug" style={{ color: "var(--color-text)" }}>
              {proposal.badgeLabel}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {isCleared
                ? `Mayor hueco continuo disponible: ${proposal.availableMinutes} min.`
                : isExpress
                ? `Hueco libre disponible de ${proposal.availableMinutes} min. Estímulo concentrado.`
                : `Día ocupado (< 25 min libres).`}
            </div>
          </div>
        </div>

        {events.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEventList(!showEventList)}
            className="text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-all cursor-pointer"
            style={{ color: "var(--color-text)" }}
          >
            <span>{events.length} {events.length === 1 ? "evento" : "eventos"}</span>
            {showEventList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Selector de versión (Express vs Original) si la sesión fue compactada */}
      {isExpress && onSelectVersion && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSelectVersion("express")}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: activeVersion === "express" ? "var(--color-brand)" : "var(--color-surface)",
              color: activeVersion === "express" ? "#ffffff" : "var(--color-text-muted)",
              border: activeVersion === "express" ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <Zap size={13} />
            <span>Versión Express ({proposal.adaptedSession.duration_min} min)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectVersion("original")}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: activeVersion === "original" ? "var(--color-surface-raised)" : "var(--color-surface)",
              color: activeVersion === "original" ? "var(--color-text)" : "var(--color-text-muted)",
              border: activeVersion === "original" ? "1.5px solid var(--color-brand)" : "1px solid var(--color-border)",
            }}
          >
            <Clock size={13} />
            <span>Original ({proposal.originalSession.duration_min || 50} min)</span>
          </button>
        </div>
      )}

      {/* Lista desplegable de eventos del día */}
      {showEventList && events.length > 0 && (
        <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2 text-xs animate-in">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Agenda de hoy (Calendario iPhone):
          </div>
          <div className="space-y-1.5">
            {events.map((ev) => {
              const startHhMm = ev.start_time.slice(11, 16);
              const endHhMm = ev.end_time.slice(11, 16);
              return (
                <div key={ev.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-white/90 truncate">{ev.title}</span>
                  <span className="font-mono text-white/60 flex-shrink-0">
                    {ev.all_day === 1 ? "Todo el día" : `${startHhMm} - ${endHhMm}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
