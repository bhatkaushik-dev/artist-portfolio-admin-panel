import { z } from "zod";

import { boundedString, isoDateTime } from "./common";
import { SLUG_PATTERN } from "./page";

export const tenantReadSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    site_key: z.string(),
    is_active: z.boolean(),
    created_at: isoDateTime,
  })
  .loose();

export type Tenant = z.infer<typeof tenantReadSchema>;

/** Returned only by create and rotate — the admin key is never shown again. */
export const tenantCredentialsSchema = tenantReadSchema.extend({
  admin_key: z.string(),
});

export type TenantCredentials = z.infer<typeof tenantCredentialsSchema>;

export const tenantCreateSchema = z.strictObject({
  name: boundedString(1, 200, "Name"),
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only")
    .nullable()
    .optional(),
});

export type TenantCreate = z.input<typeof tenantCreateSchema>;

export const tenantUpdateSchema = z.strictObject({
  name: boundedString(1, 200, "Name").optional(),
  is_active: z.boolean().optional(),
});

export type TenantUpdate = z.input<typeof tenantUpdateSchema>;

// --- Health -----------------------------------------------------------------

export const healthSchema = z
  .object({
    status: z.enum(["ok", "degraded"]),
    database: z.enum(["up", "down"]),
    db_latency_ms: z.number(),
    environment: z.string(),
    checked_at: isoDateTime,
    detail: z.string().nullable(),
  })
  .loose();

export type Health = z.infer<typeof healthSchema>;
