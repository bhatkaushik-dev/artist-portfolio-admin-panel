import { z } from "zod";

/**
 * Empty form inputs arrive as `""`, but the API types most optional fields as
 * `EmailStr | None`, a patterned string, or similar — and `""` fails all of
 * them with a 422. Every optional string on a write schema goes through this.
 */
export const optionalString = (max?: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || max === undefined || v.length <= max, {
      message: max ? `Must be ${max} characters or fewer` : undefined,
    });

/** A required string with the API's own length bounds. */
export const boundedString = (min: number, max: number, label = "This field") =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Backend accepts anything; we drop blanks so the API never sees `[""]`. */
export const stringList = z
  .array(z.string().trim())
  .transform((xs) => xs.filter((x) => x !== ""));

/**
 * The wire name is always `order`; the database column is `sort_order`. The
 * API's `AliasChoices` accepts both on input but only ever emits `order`.
 */
export const orderField = z.number().int().min(0);

export const isoDateTime = z.string();

/**
 * Read schemas are loose on purpose: a field added to the backend should never
 * break the panel. A parse *failure* is still loud, because that means a field
 * we rely on changed shape.
 */
export const looseObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).loose();
