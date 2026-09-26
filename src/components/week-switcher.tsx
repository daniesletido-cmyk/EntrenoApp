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
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full" style={{ marginBottom: "var(--space-4)" }}>
      <div
        className="surface flex items-center justify-between w-full sm:w-auto"
        style={{
          padding: "3px 4px",
          borderRadius: "var(--radius-full)",
          flex: "1 1 auto",
          maxWidth: "100%",
        }}
      >
        <button
          className="btn btn-ghost"
          aria-label="Semana anterior"
          onClick={() => onChange(addDays(weekStart, -7))}
          style={{
            width: 34,
            height: 34,
            minHeight: 34,
            minWidth: 34,
            padding: 0,
            borderRadius: "var(--radius-full)",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1 px-1">
          <span className="text-xs sm:text-sm font-semibold tracking-tight truncate">
            {formatRange(weekStart, weekEnd)}
          </span>
          {isCurrent ? (
            <span
              className="badge badge-brand flex-shrink-0"
              style={{ padding: "0.1rem 0.45rem", fontSize: "0.65rem" }}
            >
              Esta semana
            </span>
          ) : null}
        </div>

        <button
          className="btn btn-ghost"
          aria-label="Semana siguiente"
          onClick={() => onChange(addDays(weekStart, 7))}
          style={{
            width: 34,
            height: 34,
            minHeight: 34,
            minWidth: 34,
            padding: 0,
            borderRadius: "var(--radius-full)",
            flexShrink: 0,
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {!isCurrent && (
        <button
          className="btn btn-secondary text-xs w-full sm:w-auto"
          onClick={() => onChange(weekStartOf(todayISO()))}
          style={{
            minHeight: 36,
            height: 36,
            borderRadius: "var(--radius-full)",
            padding: "0 14px",
            justifyContent: "center",
          }}
        >
          Semana actual
        </button>
      )}
    </div>
  );
}
