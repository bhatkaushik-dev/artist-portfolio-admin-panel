import { z } from "zod";

import { boundedString, isoDateTime, optionalString, stringList } from "./common";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export const pageReadSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    intro: z.string().nullable(),
    body: z.string().nullable(),
    blocks: z.looseObject({}).catch({}),
    is_published: z.boolean(),
    updated_at: isoDateTime,
    seo_title: z.string().nullable(),
    seo_description: z.string().nullable(),
    seo_keywords: z.array(z.string()),
    canonical_path: z.string().nullable(),
    og_image_url: z.string().nullable(),
    noindex: z.boolean(),
  })
  .loose();

export type Page = z.infer<typeof pageReadSchema>;

/** `slug` is deliberately absent — the API does not allow renaming a page. */
export const pageUpdateSchema = z.strictObject({
  title: boundedString(1, 200, "Title").optional(),
  subtitle: optionalString(320).optional(),
  intro: optionalString().optional(),
  body: optionalString().optional(),
  blocks: z.record(z.string(), z.unknown()).optional(),
  is_published: z.boolean().optional(),
  seo_title: optionalString(200).optional(),
  seo_description: optionalString(400).optional(),
  seo_keywords: stringList.optional(),
  canonical_path: optionalString(255).optional(),
  og_image_url: optionalString(512).optional(),
  noindex: z.boolean().optional(),
});

export type PageUpdate = z.input<typeof pageUpdateSchema>;

/**
 * `blocks` is schemaless JSONB, so the only honest editor is raw JSON. Pydantic
 * types it `dict[str, Any]`, which a top-level array would fail — catch that
 * here rather than as a 422.
 */
export const blocksJsonSchema = z.string().superRefine((raw, ctx) => {
  const text = raw.trim();
  if (text === "") return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    ctx.addIssue({
      code: "custom",
      message: err instanceof Error ? err.message : "Invalid JSON",
    });
    return;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    ctx.addIssue({
      code: "custom",
      message: "Blocks must be a JSON object, not an array or a bare value",
    });
  }
});
