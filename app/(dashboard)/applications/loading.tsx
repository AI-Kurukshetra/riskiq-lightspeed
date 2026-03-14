import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-card" />
      <div className="rounded-card border border-border bg-surface p-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="mb-3 grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((__, jdx) => (
              <Skeleton key={jdx} className="h-6 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
