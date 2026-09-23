import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `PUT /api/site` and `PUT /api/pages/{slug}` apply `exclude_unset`, so sending
 * the whole object would overwrite fields the panel does not model, and any key
 * the API does not know is a 422 (`extra="forbid"`). Send only what changed.
 */
export function diffPayload<T extends Record<string, unknown>>(
  original: Partial<T>,
  next: T,
): Partial<T> {
  const payload: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const before = original[key];
    const after = next[key];
    if (after === undefined) continue;
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) {
      payload[key] = after;
    }
  }
  return payload;
}

/** Key-level summary of a `blocks` edit, so destructive saves are visible. */
export function diffKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);
  return {
    added: afterKeys.filter((k) => !beforeKeys.includes(k)),
    removed: beforeKeys.filter((k) => !afterKeys.includes(k)),
    changed: afterKeys.filter(
      (k) => beforeKeys.includes(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
    ),
  };
}
