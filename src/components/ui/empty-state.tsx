import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface animate-in" style={{ padding: "var(--space-8) var(--space-6)", textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-raised)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-3)",
        }}
      >
        {icon}
      </div>
      <div className="font-semibold" style={{ fontSize: "var(--text-base)" }}>
        {title}
      </div>
      {description && (
        <p className="text-sm text-muted mt-1" style={{ maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
