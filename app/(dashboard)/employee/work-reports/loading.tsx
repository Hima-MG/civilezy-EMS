import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-60 h-screen border-r border-sidebar-border bg-sidebar flex-col shrink-0 p-2 gap-1">
        <div className="flex items-center gap-2.5 px-2 h-14 border-b border-sidebar-border mb-1">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-4 w-12 mx-2 rounded-md mt-2 mb-1" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
        <div className="mt-auto border-t border-sidebar-border pt-2 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="w-7 h-7 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 rounded-lg" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 border-b border-border/60 px-4 flex items-center justify-between shrink-0">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>

        <div className="flex-1 py-4 md:py-6 px-4 md:px-6">
          <div className="max-w-screen-xl mx-auto space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            {/* Metric strip + action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex gap-6">
                {["Date", "Title", "Sub-Category", "Hours", "Status"].map((h) => (
                  <Skeleton key={h} className="h-3 w-16" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0">
                  <Skeleton className="h-3.5 w-20 shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3.5 w-24 hidden md:block" />
                  <Skeleton className="h-3.5 w-8 ml-auto" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
