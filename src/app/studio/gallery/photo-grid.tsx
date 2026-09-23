"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/base";
import { reorderPhotoAction } from "@/lib/actions/photos";
import type { Photo, PhotoRole } from "@/lib/schemas/media";
import { cn } from "@/lib/utils";
import { PhotoDetails } from "./photo-details";

export function PhotoGrid({ photos, role }: { photos: Photo[]; role: PhotoRole }) {
  const [items, setItems] = useState(photos);
  const [seen, setSeen] = useState(photos);
  const [saving, startSaving] = useTransition();

  // The server list wins whenever the page re-reads (role change, revalidate).
  // Adjusting during render rather than in an effect avoids rendering the stale
  // list for a frame first.
  if (photos !== seen) {
    setSeen(photos);
    setItems(photos);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = items.findIndex((p) => p.id === active.id);
    const to = items.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;

    const previous = items;
    setItems(arrayMove(items, from, to));

    startSaving(async () => {
      const result = await reorderPhotoAction(String(active.id), to);
      if (result.ok) {
        // The API clamps the index and renumbers the bucket, so its answer can
        // legitimately differ from the optimistic order. Take it verbatim.
        setItems(result.data);
      } else {
        setItems(previous);
        toast.error(result.formError ?? "Could not save the new order");
      }
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className={cn(
            "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
            saving && "opacity-70",
          )}
        >
          {items.map((photo) => (
            <SortablePhoto key={photo.id} photo={photo} role={role} disabled={saving} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortablePhoto({
  photo,
  role,
  disabled,
}: {
  photo: Photo;
  role: PhotoRole;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "card group relative overflow-hidden",
        isDragging && "z-10 opacity-80 ring-2 ring-accent",
      )}
    >
      <div className="relative aspect-[4/3] bg-bg">
        {/* Dimensions come from the API and these are already WebP, so
            next/image would add Vercel cost for no benefit. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${photo.alt}`}
          className="absolute left-2 top-2 cursor-grab rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <GripVertical size={13} />
        </button>
        {!photo.is_active && (
          <span className="absolute right-2 top-2">
            <Badge>hidden</Badge>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-[12px] text-muted">{photo.alt}</p>
        <PhotoDetails photo={photo} role={role} />
      </div>
    </div>
  );
}
