"use client";

import { ImageOff } from "lucide-react";

import { NativeSelect } from "@/components/ui/base";
import { PHOTO_ROLES, type Photo } from "@/lib/schemas/media";

/**
 * Pages point at library photos by id. The select lists every photo grouped
 * by set; the thumbnail confirms the choice, since alt text alone is a poor way
 * to tell ten studio portraits apart.
 */
export function PhotoPicker({
  photos,
  value,
  onChange,
  id,
}: {
  photos: Photo[];
  value: string | null;
  onChange: (next: string | null) => void;
  id?: string;
}) {
  const selected = photos.find((p) => p.id === value);
  // A referenced photo that is no longer in the library (deleted elsewhere).
  const missing = value !== null && !selected;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.src} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={16} className="text-faint" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <NativeSelect
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={missing}
        >
          <option value="">No photo</option>
          {missing && <option value={value}>Missing photo ({value.slice(0, 8)}…)</option>}
          {PHOTO_ROLES.map((role) => {
            const inRole = photos.filter((p) => p.role === role);
            if (inRole.length === 0) return null;
            return (
              <optgroup key={role} label={role[0].toUpperCase() + role.slice(1)}>
                {inRole.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {photo.caption || photo.alt}
                    {photo.is_active ? "" : " (hidden)"}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </NativeSelect>
        <p className="mt-1 truncate text-[12px] text-faint">
          {missing
            ? "This photo was deleted from the library — pick another."
            : selected
              ? `${selected.width}×${selected.height} · ${selected.alt}`
              : "Upload photos in Gallery, then pick one here."}
        </p>
      </div>
    </div>
  );
}
