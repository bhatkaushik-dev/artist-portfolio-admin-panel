import { PageSkeleton } from "@/components/ui/base";

/** Own boundary so navigating here from a sibling page shows at once. */
export default function Loading() {
  return <PageSkeleton rows={4} />;
}
