import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";

import { OAUTH_STATE_COOKIE, exchangeCode } from "@/lib/auth/google";
import { signInWithGoogle } from "@/lib/api/resources";
import { getSession } from "@/lib/session/session";

export const runtime = "nodejs";

type Pending = { state?: string; verifier?: string; next?: string };

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  // The user pressed cancel, or Google refused.
  if (url.searchParams.get("error")) return fail("cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const sealed = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !sealed) return fail("expired");

  let pending: Pending;
  try {
    pending = await unsealData<Pending>(sealed, { password: process.env.SESSION_SECRET! });
  } catch {
    return fail("expired");
  }

  // Constant-time-ish comparison of the CSRF state. A mismatch means this
  // callback did not originate from a redirect we started.
  if (!pending.state || !pending.verifier || pending.state !== state) {
    return fail("state");
  }

  let idToken: string;
  try {
    idToken = await exchangeCode({
      code,
      verifier: pending.verifier,
      origin: url.origin,
    });
  } catch {
    return fail("exchange");
  }

  // The backend — not this route — verifies the token and decides who may in.
  const result = await signInWithGoogle(idToken);
  if (!result.ok) {
    const response = NextResponse.redirect(
      new URL(`/login?error=denied&detail=${encodeURIComponent(result.message)}`, request.url),
    );
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const { data } = result;
  const session = await getSession();
  session.auth = "google";
  session.mode = data.user.is_super ? "super" : "tenant";
  session.token = data.access_token;
  session.tokenExpiresAt = new Date(data.expires_at).getTime();
  session.user = {
    email: data.user.email,
    name: data.user.name,
    pictureUrl: data.user.picture_url,
  };
  session.key = undefined;
  session.acting = undefined;
  session.tenant = data.tenant
    ? { id: data.tenant.id, slug: data.tenant.slug, name: data.tenant.name, siteKey: data.tenant.site_key }
    : undefined;
  await session.save();

  const destination =
    pending.next ?? (data.user.is_super ? "/artists" : "/studio");
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
