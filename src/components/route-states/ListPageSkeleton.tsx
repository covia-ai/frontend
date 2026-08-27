import { Skeleton } from "@/components/ui/skeleton";

type ListPageSkeletonProps = {
  label: string;
};

export function ListPageSkeleton({ label }: ListPageSkeletonProps) {
  return (
    <div className="w-full p-4 sm:p-6" role="status" aria-label={`Loading ${label}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-[60vw]" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-9 max-w-md flex-1" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading {label}</span>
    </div>
  );
}
