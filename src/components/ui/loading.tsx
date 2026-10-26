interface LoadingProps {
  label?: string;
  rows?: number;
  className?: string;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-white/5 border border-white/10 ${className}`}
    />
  );
}

export function Loading({ rows = 3, className = "" }: LoadingProps) {
  return (
    <div
      className={`w-full space-y-4 animate-pulse py-4 ${className}`}
      role="status"
      aria-label="Cargando contenido"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 rounded-lg bg-white/10" />
        <div className="h-4 w-20 rounded-lg bg-white/5" />
      </div>

      {/* Main card skeleton */}
      <div className="surface p-5 space-y-3 shadow-lg">
        <div className="h-4 w-1/3 rounded bg-white/10" />
        <div className="h-8 w-2/3 rounded-lg bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-28 surface p-4 flex flex-col justify-between shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="h-4 w-4 rounded-full bg-white/10" />
            </div>
            <div className="h-7 w-20 rounded bg-white/10" />
            <div className="h-3 w-12 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
