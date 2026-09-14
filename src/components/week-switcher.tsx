"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, todayISO, weekStartOf } from "@/lib/dates";

function formatRange(weekStart: string, weekEnd: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(weekStart + "T00:00:00Z").toLocaleDateString("es-ES", opts);
  const end = new Date(weekEnd + "T00:00:00Z").toLocaleDateString("es-ES", opts);
  return `${start} — ${end}`;
}

export default function WeekSwitcher({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (newWeekStart: string) => void;
}) {
  const weekEnd = addDays(weekStart, 6);
  const isCurrent = weekStart <= todayISO() && todayISO() <= weekEnd;
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-5)" }}>
      <button
        className="btn btn-secondary btn-icon"
        aria-label="Semana anterior"
        onClick={() => onChange(addDays(weekStart, -7))}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="surface-raised flex items-center gap-2" style={{ padding: "0.4rem 0.85rem" }}>
        <span className="text-sm font-medium">{formatRange(weekStart, weekEnd)}</span>
        {isCurrent && (
          <span className="badge badge-brand" style={{ padding: "0.1rem 0.45rem" }}>
            Actual
          </span>
        )}
      </div>
      <button
        className="btn btn-secondary btn-icon"
        aria-label="Semana siguiente"
        onClick={() => onChange(addDays(weekStart, 7))}
      >
        <ChevronRight size={16} />
      </button>
      {!isCurrent && (
        <button className="btn btn-ghost text-sm" onClick={() => onChange(weekStartOf(todayISO()))}>
          Ir a hoy
        </button>
      )}
    </div>
  );
}
