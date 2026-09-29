/**
 * Kept free of `next/headers` and the API client on purpose: this runs inside
 * `proxy.ts`, where the request-scoped cookie helpers are not available.
 */

import type { IronSession } from "iron-session";

import { REFRESH_WINDOW_MS, type SessionData } from "@/lib/session/config";

export type RenewedSession = { access_token: string; expires_at: string };

/**
 * Renews a Google session token that is close to expiry.
 *
 * `dead` means the token has lapsed and could not be renewed — the backend
 * never accepts an expired token — so the caller must clear the session. Key
 * sessions have no expiry and are always `live`.
 */
export async function renewIfDue(
  session: IronSession<SessionData>,
): Promise<"live" | "dead"> {
  if (session.auth !== "google" || !session.token) return "live";

  const expiresAt = session.tokenExpiresAt ?? 0;
  if (expiresAt - Date.now() >= REFRESH_WINDOW_MS) return "live";

  const renewed = await refreshSessionToken(session.token);
  if (renewed) {
    session.token = renewed.access_token;
    session.tokenExpiresAt = new Date(renewed.expires_at).getTime();
    await session.save();
    return "live";
  }
  // Not renewed but not yet expired (a network blip, or the backend's
  // SESSION_MAX_HOURS cap): keep using it until it actually runs out.
  return expiresAt <= Date.now() ? "dead" : "live";
}

/** Swaps a still-valid session token for a fresh one. Null means re-authenticate. */
export async function refreshSessionToken(
  token: string,
): Promise<RenewedSession | null> {
  const base = (process.env.API_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return null;

  try {
    const response = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as Partial<RenewedSession>;
    return body.access_token && body.expires_at
      ? { access_token: body.access_token, expires_at: body.expires_at }
      : null;
  } catch {
    // A transient network failure must not sign the person out; the caller
    // keeps the existing token until it actually expires.
    return null;
  }
}
