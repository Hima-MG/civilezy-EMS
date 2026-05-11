import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8 gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="rounded-2xl border bg-card p-8 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
