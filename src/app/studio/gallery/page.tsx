import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listPhotos } from "@/lib/api/resources";
import { PHOTO_ROLES, photoRoleSchema, type PhotoRole } from "@/lib/schemas/media";
import { cn } from "@/lib/utils";
import { PhotoGrid } from "./photo-grid";
import { UploadDropzone } from "./upload-dropzone";

export const metadata = { title: "Gallery · Portfolio Admin" };

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role: PhotoRole = photoRoleSchema.safeParse(params.role).data ?? "gallery";

  // Ordering is per-role on the server, so the grid only ever shows one bucket.
  const photos = await listPhotos({ role, includeInactive: true });

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Drag to reorder. Order is saved per set."
        action={<UploadDropzone role={role} />}
      />

      <div className="mb-4 flex items-center gap-1.5">
        {PHOTO_ROLES.map((value) => (
          <Link
            key={value}
            href={`/studio/gallery?role=${value}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
              role === value
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-border bg-surface text-muted hover:text-text",
            )}
          >
            {value}
          </Link>
        ))}
      </div>

      {photos.length === 0 ? (
        <Card>
          <EmptyState
            title={`No photos in ${role}`}
            description="Large images are resized in your browser before upload, so phone photos are fine."
          />
        </Card>
      ) : (
        <PhotoGrid photos={photos} role={role} />
      )}
    </>
  );
}
