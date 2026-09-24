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
    <div className="flex items-center gap-2" style={{ marginBottom: "var(--space-4)" }}>
      <div
        className="surface flex items-center justify-between"
        style={{
          padding: "4px",
          borderRadius: "var(--radius-full)",
          maxWidth: 380,
          flex: 1,
        }}
      >
        <button
          className="btn btn-ghost"
          aria-label="Semana anterior"
          onClick={() => onChange(addDays(weekStart, -7))}
          style={{
            width: 36,
            height: 36,
            minHeight: 36,
            minWidth: 36,
            padding: 0,
            borderRadius: "var(--radius-full)",
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2" style={{ padding: "0 8px" }}>
          <span className="text-xs sm:text-sm font-semibold tracking-tight">
            {formatRange(weekStart, weekEnd)}
          </span>
          {isCurrent ? (
            <span
              className="badge badge-brand"
              style={{ padding: "0.15rem 0.5rem", fontSize: "0.68rem" }}
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
            width: 36,
            height: 36,
            minHeight: 36,
            minWidth: 36,
            padding: 0,
            borderRadius: "var(--radius-full)",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {!isCurrent && (
        <button
          className="btn btn-secondary text-xs"
          onClick={() => onChange(weekStartOf(todayISO()))}
          style={{
            minHeight: 38,
            height: 38,
            borderRadius: "var(--radius-full)",
            padding: "0 14px",
          }}
        >
          Semana actual
        </button>
      )}
    </div>
  );
}
