export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" style={{ padding: "var(--space-4) 0" }} role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
