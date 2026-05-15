import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
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
          <Skeleton className="h-9 w-full max-w-2xl rounded-xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    </>
  );
}
