import { z } from "zod";

import { boundedString, isoDateTime, optionalString, stringList } from "./common";

/** Mirrors `E164_PATTERN` in app/schemas/site.py. */
export const E164 = /^\+[1-9]\d{7,14}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Nested objects ---------------------------------------------------------
// These are `extra="ignore"` server-side, not `extra="forbid"` like the top
// level, so an unknown key inside one is dropped rather than rejected.

export const addressSchema = z.object({
  street_address: optionalString(),
  locality: optionalString(),
  region: optionalString(),
  postal_code: optionalString(),
  country: z.string().trim().default("IN"),
});

export const socialLinkSchema = z.object({
  platform: boundedString(1, 80, "Platform"),
  url: boundedString(1, 512, "URL"),
  handle: optionalString(),
});

export const trainingEntrySchema = z.object({
  institution: optionalString(),
  teacher: optionalString(),
  gharana: optionalString(),
  years: optionalString(),
});

export const awardSchema = z.object({
  title: boundedString(1, 200, "Award title"),
  awarded_by: optionalString(),
  year: z.number().int().min(1900).max(2200).nullable(),
});

export const openingHoursSchema = z
  .object({
    days: z.array(z.string()).min(1, "Pick at least one day"),
    opens: z.string().regex(HHMM, "Use 24-hour HH:MM"),
    closes: z.string().regex(HHMM, "Use 24-hour HH:MM"),
  })
  .refine((v) => v.opens < v.closes, {
    // The server compares these as plain strings, so a slot that wraps past
    // midnight is rejected outright. Fail here so the user sees it on the field.
    message: "Closing time must be later in the same day",
    path: ["closes"],
  });

// --- Read -------------------------------------------------------------------

export const siteProfileReadSchema = z
  .object({
    name: z.string(),
    short_name: z.string().nullable(),
    role: z.string(),
    tagline: z.string().nullable(),
    locale: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    phone_display: z.string().nullable(),
    website_url: z.string().nullable(),
    address: z.looseObject({}).catch({}),
    geo_lat: z.number().nullable(),
    geo_lng: z.number().nullable(),
    area_served: z.array(z.string()),
    social_links: z.array(z.looseObject({})),
    training: z.array(z.looseObject({})),
    alternate_names: z.array(z.string()),
    knows_about: z.array(z.string()),
    knows_language: z.array(z.string()),
    awards: z.array(z.looseObject({})),
    opening_hours: z.array(z.looseObject({})),
    price_range: z.string().nullable(),
    currencies_accepted: z.array(z.string()),
    image_license_url: z.string().nullable(),
    default_image_url: z.string().nullable(),
    logo_url: z.string().nullable(),
    bio_summary: z.string().nullable(),
    updated_at: isoDateTime,
  })
  .loose();

export type SiteProfile = z.infer<typeof siteProfileReadSchema>;

// --- Update -----------------------------------------------------------------
// Every field optional: the API applies `exclude_unset`, so only the keys we
// send are touched. The top level is `extra="forbid"`, so a stray key is a 422.

export const siteProfileUpdateSchema = z.strictObject({
  name: boundedString(1, 160, "Name").optional(),
  short_name: optionalString(80).optional(),
  role: boundedString(1, 160, "Role").optional(),
  tagline: optionalString(280).optional(),
  locale: optionalString(16).optional(),

  email: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone: z
    .union([z.literal(""), z.string().regex(E164, "Use international format, e.g. +919876543210")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone_display: optionalString(40).optional(),
  website_url: optionalString(512).optional(),

  address: addressSchema.optional(),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  area_served: stringList.optional(),

  social_links: z.array(socialLinkSchema).optional(),
  training: z.array(trainingEntrySchema).optional(),

  alternate_names: stringList.optional(),
  knows_about: stringList.optional(),
  knows_language: stringList.optional(),
  awards: z.array(awardSchema).optional(),

  opening_hours: z.array(openingHoursSchema).optional(),
  price_range: optionalString(40).optional(),
  currencies_accepted: stringList.optional(),

  image_license_url: optionalString(512).optional(),
  default_image_url: optionalString(512).optional(),
  logo_url: optionalString(512).optional(),

  bio_summary: optionalString().optional(),
});

export type SiteProfileUpdate = z.input<typeof siteProfileUpdateSchema>;
