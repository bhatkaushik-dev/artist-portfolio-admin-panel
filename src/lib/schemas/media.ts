import { z } from "zod";

import { boundedString, isoDateTime, optionalString, orderField } from "./common";

// --- Photos -----------------------------------------------------------------

export const PHOTO_ROLES = ["gallery", "hero", "about", "classes"] as const;
export const photoRoleSchema = z.enum(PHOTO_ROLES);
export type PhotoRole = z.infer<typeof photoRoleSchema>;

export const photoReadSchema = z
  .object({
    id: z.string(),
    src: z.string(),
    download_url: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    alt: z.string(),
    caption: z.string().nullable(),
    credit: z.string().nullable(),
    order: orderField,
    role: photoRoleSchema,
    is_active: z.boolean(),
    created_at: isoDateTime,
  })
  .loose();

export type Photo = z.infer<typeof photoReadSchema>;

/** Sent as multipart form fields alongside the file, not as JSON. */
export const photoUploadMetaSchema = z.object({
  alt: boundedString(1, 320, "Alt text"),
  caption: optionalString(500),
  credit: optionalString(160),
  role: photoRoleSchema.default("gallery"),
  order: z.number().int().min(0).nullable().optional(),
});

export const photoUpdateSchema = z.strictObject({
  alt: boundedString(1, 320, "Alt text").optional(),
  caption: optionalString(500).optional(),
  credit: optionalString(160).optional(),
  role: photoRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

export type PhotoUpdate = z.input<typeof photoUpdateSchema>;

// --- Videos -----------------------------------------------------------------

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const videoReadSchema = z
  .object({
    id: z.string(),
    youtube_id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    upload_date: z.string().nullable(),
    duration: z.string().nullable(),
    thumbnail_url: z.string().nullable(),
    order: orderField,
    featured: z.boolean(),
    is_active: z.boolean(),
    watch_url: z.string(),
    embed_url: z.string(),
  })
  .loose();

export type Video = z.infer<typeof videoReadSchema>;

export const videoCreateSchema = z.strictObject({
  youtube_id: z
    .string()
    .trim()
    .regex(YOUTUBE_ID_PATTERN, "That is not an 11-character YouTube ID"),
  title: optionalString(300).optional(),
  description: optionalString().optional(),
  upload_date: z.string().nullable().optional(),
  duration: optionalString(32).optional(),
  thumbnail_url: optionalString(512).optional(),
  order: orderField.optional(),
  featured: z.boolean().optional(),
  sync_metadata: z.boolean().optional(),
});

export type VideoCreate = z.input<typeof videoCreateSchema>;

/** `youtube_id` is absent: the API does not allow changing it after create. */
export const videoUpdateSchema = z.strictObject({
  title: optionalString(300).optional(),
  description: optionalString().optional(),
  upload_date: z.string().nullable().optional(),
  duration: optionalString(32).optional(),
  thumbnail_url: optionalString(512).optional(),
  order: orderField.optional(),
  featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type VideoUpdate = z.input<typeof videoUpdateSchema>;

/**
 * People paste whole URLs far more often than bare IDs. Accepts watch, youtu.be,
 * embed and shorts forms, or an already-bare ID.
 */
export function extractYoutubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID_PATTERN.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery;

  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  return last && YOUTUBE_ID_PATTERN.test(last) ? last : null;
}
