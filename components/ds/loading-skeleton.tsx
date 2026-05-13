import { cn } from "@/lib/utils";

// ── Base pulse block ──────────────────────────────────────────

function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-muted/60", className)} style={style} />
  );
}

// ── KpiCard skeleton ──────────────────────────────────────────

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 space-y-3", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Bone className="h-2.5 w-20 rounded-full" />
          <Bone className="h-7 w-28" />
          <Bone className="h-2 w-16 rounded-full" />
        </div>
        <Bone className="w-10 h-10 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

// ── KpiCard grid skeleton ─────────────────────────────────────

interface KpiGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KpiGridSkeleton({ count = 4, columns = 4, className }: KpiGridSkeletonProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-3", colClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── AnalyticsCard skeleton ────────────────────────────────────

export function AnalyticsCardSkeleton({
  height = 260,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-2.5 w-48" />
        </div>
        <Bone className="h-7 w-24 rounded-lg" />
      </div>
      <Bone className="w-full rounded-xl" style={{ height }} />
    </div>
  );
}

// ── DataTable skeleton ────────────────────────────────────────

export function DataTableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden", className)}>
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <Bone className="h-4 w-32" />
        <Bone className="h-7 w-24 rounded-lg" />
      </div>
      {/* col heads */}
      <div className="grid px-5 py-3 border-b border-border/30" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid px-5 py-3.5 border-b border-border/20 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Bone
              key={c}
              className="h-3"
              style={{ width: `${55 + ((r + c) % 4) * 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── ActivityFeed skeleton ─────────────────────────────────────

export function ActivityFeedSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-border/40">
        <Bone className="h-2.5 w-24" />
      </div>
      <ul className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-3.5">
            <Bone className="w-7 h-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3 w-3/4" />
              <Bone className="h-2.5 w-1/2" />
              <Bone className="h-2 w-20 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── HeroCard skeleton ─────────────────────────────────────────

export function HeroCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card px-6 py-5", className)}>
      <div className="flex items-center gap-4">
        <Bone className="w-11 h-11 rounded-xl shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Bone className="h-4 w-44" />
          <Bone className="h-2.5 w-64" />
        </div>
        <div className="flex gap-5 shrink-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Bone className="h-6 w-10 mx-auto" />
              <Bone className="h-2 w-12 mx-auto rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
