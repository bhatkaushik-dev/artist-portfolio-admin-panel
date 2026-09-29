import { Skeleton } from "@/components/ui/base";

/**
 * Overview lives in a route group only so it can have this boundary of its
 * own. Every sibling (Gallery, Pages, …) has one too: a single boundary at
 * `/studio` never showed when moving *between* studio pages, because it was
 * already on screen — so those clicks waited on the server with no feedback.
 */
export default function OverviewLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="card px-4 py-3.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-[10px]" />
        <Skeleton className="h-48 rounded-[10px]" />
      </div>
    </div>
  );
}
