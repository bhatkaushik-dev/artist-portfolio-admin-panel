import { PageSkeleton } from "@/components/ui/base";

/**
 * Every studio route is dynamic, and without a loading boundary a tap on a nav
 * link did nothing visible until the next page's API calls had all returned.
 * Next prefetches this fallback, so navigation now swaps screens immediately
 * and the content streams in behind it. The sidebar layout stays put.
 */
export default function StudioLoading() {
  return <PageSkeleton />;
}
