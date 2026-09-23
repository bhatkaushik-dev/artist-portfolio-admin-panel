import { NextResponse, type NextRequest } from "next/server";
import { sealData } from "iron-session";

import {
  OAUTH_STATE_COOKIE,
  authorizeUrl,
  googleConfigured,
  randomToken,
} from "@/lib/auth/google";

export const runtime = "nodejs";

/** Starts the Google redirect, stashing the CSRF state and PKCE verifier. */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", request.url));
  }

  const state = randomToken();
  const verifier = randomToken();
  const nextPath = request.nextUrl.searchParams.get("next");

  const response = NextResponse.redirect(
    await authorizeUrl({ origin: request.nextUrl.origin, state, verifier }),
  );

  // Sealed and short-lived — this only has to survive the round trip to Google.
  const sealed = await sealData(
    { state, verifier, next: nextPath?.startsWith("/") ? nextPath : undefined },
    { password: process.env.SESSION_SECRET!, ttl: 600 },
  );

  response.cookies.set(OAUTH_STATE_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
