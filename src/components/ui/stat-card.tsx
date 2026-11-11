import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_STYLES: Record<Tone, { color: string; bg: string; border: string }> = {
  neutral: {
    color: "var(--color-text)",
    bg: "var(--color-surface-raised)",
    border: "var(--color-border)",
  },
  success: {
    color: "var(--color-success)",
    bg: "var(--color-success-bg)",
    border: "rgba(22, 163, 74, 0.25)",
  },
  warning: {
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    border: "rgba(217, 119, 6, 0.25)",
  },
  danger: {
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    border: "rgba(220, 38, 38, 0.25)",
  },
  info: {
    color: "var(--color-text-muted)",
    bg: "var(--color-surface-raised)",
    border: "var(--color-border)",
  },
  brand: {
    color: "var(--color-brand)",
    bg: "var(--color-brand-subtle)",
    border: "rgba(220, 38, 38, 0.22)",
  },
};

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  sublabel,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: Tone;
  sublabel?: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className="surface relative flex flex-col justify-between w-full overflow-hidden p-4 sm:p-5 transition-colors duration-150"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-semibold truncate" style={{ color: "var(--color-text-muted)" }}>
            {label}
          </span>
          {icon && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: t.bg,
                color: t.color,
                border: `1px solid ${t.border}`,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        <div
          className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight truncate"
          style={{
            color: tone === "neutral" ? "var(--color-text)" : t.color,
            lineHeight: 1.15,
          }}
        >
          {value}
        </div>
      </div>

      {sublabel && (
        <div className="text-xs mt-2 leading-snug line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
