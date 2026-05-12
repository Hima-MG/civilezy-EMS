import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 min-h-screen border-r bg-sidebar flex flex-col p-4 gap-4 shrink-0">
        <div className="flex items-center gap-3 h-8 mb-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b px-6 flex items-center gap-4">
          <Skeleton className="h-5 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Tab bar */}
          <Skeleton className="h-10 w-80 rounded-lg" />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>

          {/* Leads table */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-28" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
