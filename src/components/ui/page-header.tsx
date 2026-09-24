import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4"
      style={{ marginBottom: "var(--space-5)", flexWrap: "wrap" }}
    >
      <div>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)" }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted" style={{ marginTop: "4px", lineHeight: 1.45 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
