import "server-only";

import { z } from "zod";

import { enquiryListSchema, type EnquiryStatus, enquiryReadSchema } from "@/lib/schemas/enquiry";
import { faqReadSchema } from "@/lib/schemas/faq";
import { photoReadSchema, videoReadSchema, type PhotoRole } from "@/lib/schemas/media";
import { pageReadSchema } from "@/lib/schemas/page";
import { siteProfileReadSchema } from "@/lib/schemas/site";
import { healthSchema, tenantCredentialsSchema, tenantReadSchema } from "@/lib/schemas/tenant";
import { sessionTokenSchema, type SessionTokenResponse } from "@/lib/schemas/auth";
import { apiFetch } from "./client";

// --- Sign-in ----------------------------------------------------------------

/**
 * Hands Google's ID token to the backend, which verifies the signature itself
 * and decides whether that person is allowed in.
 *
 * Returns the failure message rather than throwing, because the sign-in page
 * needs to show it ("you are not on the allowlist" is the common case).
 */
export async function signInWithGoogle(
  idToken: string,
): Promise<{ ok: true; data: SessionTokenResponse } | { ok: false; message: string }> {
  const base = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.detail;
      return {
        ok: false,
        message: typeof detail === "string" ? detail : "Sign-in was refused.",
      };
    }
    const parsed = sessionTokenSchema.safeParse(body);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, message: "The server sent an unexpected sign-in response." };
  } catch {
    return { ok: false, message: "Could not reach the server. Please try again." };
  }
}

// --- Identity ---------------------------------------------------------------

/** Probe used by key sign-in: succeeds only for a tenant admin key. */
export const whoAmI = (key: string) =>
  rawWithKey("/me", key, tenantReadSchema);

/** Probe used at login: succeeds only for the super-admin key. */
export const listTenantsWithKey = (key: string) =>
  rawWithKey("/tenants?include_inactive=true", key, z.array(tenantReadSchema));

/**
 * The login probes run *before* a session exists, so they cannot go through
 * `apiFetch`'s session-based credential resolution.
 */
async function rawWithKey<T>(path: string, key: string, schema: z.ZodType<T>): Promise<T | null> {
  const base = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "X-Admin-Key": key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// --- Health -----------------------------------------------------------------

export const getHealth = () =>
  apiFetch("/health", { auth: "none", schema: healthSchema });

// --- Site profile -----------------------------------------------------------

export const getSiteProfile = () =>
  apiFetch("/site", { auth: "site", schema: siteProfileReadSchema });

export const updateSiteProfile = (body: unknown) =>
  apiFetch("/site", { auth: "admin", method: "PUT", body, schema: siteProfileReadSchema });

// --- Pages ------------------------------------------------------------------

export const listPages = () =>
  apiFetch("/pages", { auth: "site", schema: z.array(pageReadSchema) });

export const getPage = (slug: string) =>
  apiFetch(`/pages/${slug}`, { auth: "site", schema: pageReadSchema });

export const updatePage = (slug: string, body: unknown) =>
  apiFetch(`/pages/${slug}`, { auth: "admin", method: "PUT", body, schema: pageReadSchema });

// --- Photos -----------------------------------------------------------------

export const listPhotos = (opts: { role?: PhotoRole; includeInactive?: boolean } = {}) =>
  apiFetch("/photos", {
    auth: "site",
    query: { role: opts.role, include_inactive: opts.includeInactive },
    schema: z.array(photoReadSchema),
  });

export const updatePhoto = (id: string, body: unknown) =>
  apiFetch(`/photos/${id}`, { auth: "admin", method: "PATCH", body, schema: photoReadSchema });

/** Returns the whole renumbered role bucket — treat it as authoritative. */
export const reorderPhoto = (id: string, order: number) =>
  apiFetch(`/photos/${id}/order`, {
    auth: "admin",
    method: "PATCH",
    body: { order },
    schema: z.array(photoReadSchema),
  });

export const deletePhoto = (id: string) =>
  apiFetch(`/photos/${id}`, { auth: "admin", method: "DELETE" });

// --- Videos -----------------------------------------------------------------

export const listVideos = (opts: { includeInactive?: boolean } = {}) =>
  apiFetch("/videos", {
    auth: "site",
    query: { include_inactive: opts.includeInactive },
    schema: z.array(videoReadSchema),
  });

export const createVideo = (body: unknown) =>
  apiFetch("/videos", { auth: "admin", method: "POST", body, schema: videoReadSchema });

export const updateVideo = (id: string, body: unknown) =>
  apiFetch(`/videos/${id}`, { auth: "admin", method: "PUT", body, schema: videoReadSchema });

/** YouTube lookups are slow and 503 when no API key is configured. */
export const syncVideo = (id: string) =>
  apiFetch(`/videos/${id}/sync`, {
    auth: "admin",
    method: "POST",
    schema: videoReadSchema,
    timeoutMs: 60_000,
  });

export const deleteVideo = (id: string) =>
  apiFetch(`/videos/${id}`, { auth: "admin", method: "DELETE" });

// --- FAQs -------------------------------------------------------------------

export const listFaqs = (opts: { includeInactive?: boolean } = {}) =>
  apiFetch("/faqs", {
    auth: "site",
    query: { include_inactive: opts.includeInactive },
    schema: z.array(faqReadSchema),
  });

export const createFaq = (body: unknown) =>
  apiFetch("/faqs", { auth: "admin", method: "POST", body, schema: faqReadSchema });

export const updateFaq = (id: string, body: unknown) =>
  apiFetch(`/faqs/${id}`, { auth: "admin", method: "PUT", body, schema: faqReadSchema });

export const deleteFaq = (id: string) =>
  apiFetch(`/faqs/${id}`, { auth: "admin", method: "DELETE" });

// --- Enquiries --------------------------------------------------------------

export const listEnquiries = (opts: {
  status?: EnquiryStatus;
  source?: string;
  limit?: number;
  offset?: number;
} = {}) =>
  apiFetch("/enquiries", {
    auth: "admin",
    query: {
      status: opts.status,
      source: opts.source,
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
    },
    schema: enquiryListSchema,
  });

export const updateEnquiry = (id: string, body: unknown) =>
  apiFetch(`/enquiries/${id}`, {
    auth: "admin",
    method: "PATCH",
    body,
    schema: enquiryReadSchema,
  });

// --- Tenants (super admin only) ---------------------------------------------

export const listTenants = (includeInactive = false) =>
  apiFetch("/tenants", {
    auth: "super",
    query: { include_inactive: includeInactive },
    schema: z.array(tenantReadSchema),
  });

export const createTenant = (body: unknown) =>
  apiFetch("/tenants", {
    auth: "super",
    method: "POST",
    body,
    schema: tenantCredentialsSchema,
  });

export const updateTenant = (id: string, body: unknown) =>
  apiFetch(`/tenants/${id}`, { auth: "super", method: "PATCH", body, schema: tenantReadSchema });

export const rotateTenantKeys = (id: string, alsoSiteKey: boolean) =>
  apiFetch(`/tenants/${id}/rotate-keys`, {
    auth: "super",
    method: "POST",
    query: { site_key: alsoSiteKey },
    schema: tenantCredentialsSchema,
  });
