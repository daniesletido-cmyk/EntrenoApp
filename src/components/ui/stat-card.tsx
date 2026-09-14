import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--color-text)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
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
  return (
    <div className="surface" style={{ padding: "var(--space-4)" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
        <span className="label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: "var(--color-text-faint)", display: "flex" }} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.02em", color: TONE_COLOR[tone], lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-muted" style={{ marginTop: "var(--space-1)" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
