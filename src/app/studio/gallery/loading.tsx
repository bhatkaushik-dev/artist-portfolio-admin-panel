import { Skeleton } from "@/components/ui/base";

/** Shaped like the photo grid, so the page does not jump when it arrives. */
export default function GalleryLoading() {
  return (
    <div role="status" aria-label="Loading photos">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-lg md:h-9" />
      </div>
      <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-lg md:h-8" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <Skeleton className="aspect-4/3 rounded-none" />
            <div className="px-3 py-2.5">
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
