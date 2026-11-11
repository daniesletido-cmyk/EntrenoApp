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
    border: "rgba(16, 185, 129, 0.28)",
  },
  warning: {
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    border: "rgba(245, 158, 11, 0.28)",
  },
  danger: {
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
    border: "rgba(239, 68, 68, 0.28)",
  },
  info: {
    color: "var(--color-info)",
    bg: "var(--color-info-bg)",
    border: "rgba(37, 99, 235, 0.28)",
  },
  brand: {
    color: "var(--color-brand)",
    bg: "var(--color-brand-subtle)",
    border: "rgba(37, 99, 235, 0.28)",
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
      className="surface relative flex flex-col justify-between w-full overflow-hidden p-4 sm:p-5 transition-all duration-150 group"
      style={{
        borderRadius: "var(--radius-lg)",
      }}
    >
      {tone !== "neutral" && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: t.color }}
        />
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </span>
          {icon && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
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
        <div
          className="text-xs mt-2 leading-snug line-clamp-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
