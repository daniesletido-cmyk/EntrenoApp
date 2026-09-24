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
      style={{ marginBottom: "var(--space-4)", flexWrap: "wrap" }}
    >
      <div>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 1.85rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-xs sm:text-sm text-muted"
            style={{ marginTop: 4, lineHeight: 1.45, maxWidth: 600 }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
