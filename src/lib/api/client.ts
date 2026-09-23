import "server-only";

import type { ZodType } from "zod";

import { getSession, getTenantContext } from "@/lib/session/session";
import { redact } from "@/lib/session/config";
import { ApiError, ContractError, UnauthorizedError } from "./errors";

/**
 * Which credential a call needs.
 *
 * `site`  — public per-tenant reads (`X-Site-Key`)
 * `admin` — per-tenant writes (`X-Admin-Key`)
 * `super` — tenant management (`X-Admin-Key` holding SUPER_ADMIN_KEY)
 * `none`  — /health only
 */
export type Auth = "none" | "site" | "admin" | "super";

export type QueryValue = string | number | boolean | undefined | null;

type FetchOptions<T> = {
  auth: Auth;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  schema?: ZodType<T>;
  timeoutMs?: number;
  /** Responses keyed by a secret are never cached. */
  cache?: RequestCache;
};

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL is not set. See .env.example.");
  return url.replace(/\/$/, "");
}

/**
 * Resolves credentials for a call. Asking for an auth mode the session cannot
 * satisfy throws *here*, locally, rather than producing a confusing 401 from
 * the backend.
 */
async function authHeaders(auth: Auth): Promise<Record<string, string>> {
  if (auth === "none") return {};

  const session = await getSession();

  // Google sign-in. One bearer token covers reads and writes — the backend
  // resolves the tenant from the token itself, so no site key is involved. A
  // super admin additionally names the artist they are acting on.
  if (session.auth === "google") {
    if (!session.token) throw new UnauthorizedError("No session token");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.token}`,
    };

    if (auth === "super") {
      if (session.mode !== "super") {
        throw new Error("A super-admin call was attempted without a super-admin session");
      }
      return headers;
    }

    const context = await getTenantContext();
    if (!context) throw new UnauthorizedError("No active tenant");
    if (context.actingAsSuper) headers["X-Tenant-Slug"] = context.tenant.slug;
    return headers;
  }

  // Key sign-in (recovery and automation).
  if (auth === "super") {
    if (session.mode !== "super" || !session.key) {
      throw new Error("A super-admin call was attempted without a super-admin session");
    }
    return { "X-Admin-Key": session.key };
  }

  const context = await getTenantContext();
  if (!context) throw new UnauthorizedError("No active tenant");

  if (auth === "site") {
    if (!context.tenant.siteKey) throw new UnauthorizedError("No site key for this tenant");
    return { "X-Site-Key": context.tenant.siteKey };
  }

  // Writes. A super admin authenticates with their own key and names the target
  // tenant; an artist's key identifies its tenant by itself and ignores the
  // slug header entirely, so it can never be pointed at someone else's rows.
  return context.actingAsSuper
    ? { "X-Admin-Key": context.adminKey, "X-Tenant-Slug": context.tenant.slug }
    : { "X-Admin-Key": context.adminKey };
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions<T>,
): Promise<T> {
  const { auth, method = "GET", body, query, schema, timeoutMs = 15_000 } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(await authHeaders(auth)),
  };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // Let fetch set the multipart boundary.
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
      // Anything behind a credential is per-session data, never shared cache.
      cache: options.cache ?? "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new ApiError(0, null, `Could not reach the API (${reason})`);
  }

  if (response.status === 401) {
    const used = headers.Authorization
      ? `token ${redact(headers.Authorization.slice(7))}`
      : `key ${redact(headers["X-Admin-Key"])}`;
    console.warn(`401 from ${method} ${path} using ${used}`);
    throw new UnauthorizedError(await safeDetail(response));
  }

  if (!response.ok) {
    const detail = await safeDetail(response);
    throw new ApiError(
      response.status,
      detail,
      typeof detail === "string" ? detail : `${method} ${path} failed (${response.status})`,
    );
  }

  // 204 has no body at all; calling .json() on it throws.
  if (response.status === 204) return undefined as T;

  const data = await response.json();
  if (!schema) return data as T;

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(`Contract drift on ${path}:`, parsed.error.issues);
    throw new ContractError(path, parsed.error.issues);
  }
  return parsed.data;
}

async function safeDetail(response: Response): Promise<unknown> {
  try {
    const body = await response.json();
    return typeof body === "object" && body !== null && "detail" in body
      ? (body as { detail: unknown }).detail
      : body;
  } catch {
    return null;
  }
}
