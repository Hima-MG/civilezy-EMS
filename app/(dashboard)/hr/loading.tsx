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
        {Array.from({ length: 6 }).map((_, i) => (
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
            <Skeleton className="h-7 w-44 hidden md:block rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>

        <div className="flex-1 py-4 md:py-6 px-4 md:px-6">
          <div className="max-w-screen-xl mx-auto space-y-5">
            {/* Tab bar */}
            <Skeleton className="h-9 w-full max-w-2xl rounded-xl" />
            {/* Hero */}
            <Skeleton className="h-20 w-full rounded-2xl" />
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
            {/* Attendance strip */}
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
