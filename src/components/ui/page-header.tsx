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
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <div className="min-w-0 flex-1">
        <h1
          style={{
            fontSize: "clamp(1.35rem, 4vw, 1.85rem)",
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
      {actions && (
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
