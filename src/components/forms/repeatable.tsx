"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/base";

/**
 * Shared frame for the profile's four arrays of objects (social links,
 * training, awards, opening hours). The caller renders one row; this handles
 * add, remove and the empty state.
 */
export function Repeatable({
  label,
  hint,
  rows,
  onAdd,
  onRemove,
  addLabel = "Add",
  emptyLabel = "None added yet.",
  children,
}: {
  label: string;
  hint?: string;
  rows: { id: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  emptyLabel?: string;
  children: (row: { id: string }, index: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-text">{label}</p>
          {hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <Plus size={13} />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-faint">
          {emptyLabel}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-bg p-3"
            >
              <div className="min-w-0 flex-1">{children(row, index)}</div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="mt-1 shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label={`Remove ${label} entry ${index + 1}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
