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
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b px-6 flex items-center gap-4">
          <Skeleton className="h-5 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
