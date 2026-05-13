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
        {Array.from({ length: 9 }).map((_, i) => (
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
          <div className="max-w-screen-xl mx-auto space-y-5">
            {/* Page header */}
            <Skeleton className="h-7 w-52 rounded-lg" />

            {/* Metric strip */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="flex divide-x divide-border/40">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-1 flex items-center gap-3 px-5 py-4">
                    <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-6 w-10" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-44 rounded-xl" />
              <Skeleton className="h-9 w-40 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex gap-6">
                {["Date", "Employee", "Category", "Title", "Hours", "Status"].map((h) => (
                  <Skeleton key={h} className="h-3 w-16" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0">
                  <Skeleton className="h-3.5 w-20 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-36" />
                  </div>
                  <Skeleton className="h-3.5 w-20 hidden lg:block" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3.5 w-8 ml-auto" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
