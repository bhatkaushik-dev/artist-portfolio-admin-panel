/**
 * Kept free of `next/headers` and the API client on purpose: this runs inside
 * `proxy.ts`, where the request-scoped cookie helpers are not available.
 */

export type RenewedSession = { access_token: string; expires_at: string };

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
