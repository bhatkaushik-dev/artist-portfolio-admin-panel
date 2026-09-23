import type { SessionOptions } from "iron-session";

export const SESSION_COOKIE = "ap_session";
/** Credentials shown once after create/rotate, handed to the next render only. */
export const FLASH_COOKIE = "ap_flash";

export type ActiveTenant = {
  id: string;
  slug: string;
  name: string;
  /** Only needed for key-based sessions; a session token resolves its own tenant. */
  siteKey?: string;
};

/** Refresh this far ahead of expiry so a request never races the deadline. */
export const REFRESH_WINDOW_MS = 10 * 60_000;

/**
 * `key` is the pasted credential. It exists only inside the sealed cookie and
 * is read only in Node server context — it must never be returned to a client
 * component, logged, or placed in a `NEXT_PUBLIC_` variable.
 *
 * Every field is optional because iron-session hands back a `Partial` of this
 * type for a cookie that is absent or unsealable. Narrowing happens once, in
 * `session.ts`, rather than at every call site.
 */
export type SessionData = {
  mode?: "super" | "tenant";
  /**
   * How this session was established.
   *
   * `google` is the normal path: the backend verified a Google identity and
   * issued a short-lived token, so nothing long-lived is held here.
   * `key` is the fallback for recovery and automation — a pasted API key.
   */
  auth?: "google" | "key";

  /** Google sign-in: the backend's session token and when it lapses. */
  token?: string;
  tokenExpiresAt?: number;
  user?: { email: string; name?: string | null; pictureUrl?: string | null };

  /** Key sign-in: the pasted credential. Server-side only, always. */
  key?: string;

  /** Tenant mode: the artist this session belongs to. */
  tenant?: ActiveTenant;
  /** Super mode: the artist currently being acted upon. */
  acting?: ActiveTenant & { until: number };
};

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters. See .env.example.",
    );
  }
  return secret;
}

const EIGHT_HOURS = 60 * 60 * 8;

export function sessionOptions(): SessionOptions {
  return {
    password: requireSecret(),
    cookieName: SESSION_COOKIE,
    ttl: EIGHT_HOURS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // `strict` drops the cookie on the redirect back from the login POST in
      // some browsers; `lax` still blocks cross-site writes.
      sameSite: "lax",
      path: "/",
      maxAge: EIGHT_HOURS,
    },
  };
}

export function flashOptions(): SessionOptions {
  return {
    password: requireSecret(),
    cookieName: FLASH_COOKIE,
    ttl: 120,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 120,
    },
  };
}

export function impersonationTtlMs(): number {
  const minutes = Number(process.env.IMPERSONATION_TTL_MINUTES ?? 60);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60_000;
}

/** Never print a key. Enough tail to identify it, never enough to use it. */
export function redact(key: string | undefined | null): string {
  if (!key) return "<none>";
  return key.length <= 8 ? "<short>" : `…${key.slice(-4)}`;
}
