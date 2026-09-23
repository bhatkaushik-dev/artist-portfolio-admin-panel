import "server-only";

/**
 * Google's OAuth authorization-code flow, written out directly.
 *
 * This is deliberately not Auth.js: the panel already has its own session
 * (iron-session) and the *backend* verifies Google's ID token, so all that is
 * needed here is the redirect dance — about eighty lines, with no library to
 * keep compatible with a very new Next.js.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const OAUTH_STATE_COOKIE = "ap_oauth";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) throw new Error("GOOGLE_CLIENT_ID is not set");
  return value;
}

/**
 * Must match a redirect URI registered in the Google console exactly. Derived
 * from the request so localhost and the deployed origin both work without a
 * second environment variable.
 */
export function redirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** PKCE: the verifier stays in a cookie, only its hash goes to Google. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function authorizeUrl(opts: {
  origin: string;
  state: string;
  verifier: string;
  loginHint?: string;
}): Promise<string> {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri(opts.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", await challengeFor(opts.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  // Always show the chooser: these machines are often shared, and silently
  // reusing whichever Google account is signed in is a confusing failure.
  url.searchParams.set("prompt", "select_account");
  if (opts.loginHint) url.searchParams.set("login_hint", opts.loginHint);
  return url.toString();
}

/** Exchange the one-time code for Google's ID token. */
export async function exchangeCode(opts: {
  code: string;
  verifier: string;
  origin: string;
}): Promise<string> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: clientId(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(opts.origin),
      grant_type: "authorization_code",
      code_verifier: opts.verifier,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Google token exchange failed:", response.status, detail.slice(0, 300));
    throw new Error("Google sign-in could not be completed");
  }

  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("Google did not return an identity token");
  // Not verified here on purpose — the backend checks the signature against
  // Google's keys, so the panel is never the thing vouching for an identity.
  return body.id_token;
}
