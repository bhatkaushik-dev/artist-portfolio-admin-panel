import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { nextProxyCookies } from "iron-session";

import { REFRESH_WINDOW_MS, type SessionData, sessionOptions } from "@/lib/session/config";
import { refreshSessionToken } from "@/lib/auth/refresh";

/**
 * Route protection for navigation only.
 *
 * This is UX, not security. Every server action and every data fetch calls
 * `requireSession` / `requireSuper` / `requireTenantContext` independently, so
 * a request that slipped past this file still cannot read or write anything.
 * Middleware must never be the only gate.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    sessionOptions(),
  );

  const { pathname, search } = request.nextUrl;
  const loggedIn = session.mode === "super" || session.mode === "tenant";
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!loggedIn) {
    if (pathname === "/login") return response;
    const next = encodeURIComponent(pathname + search);
    return to(pathname === "/" ? "/login" : `/login?next=${next}`);
  }

  // Server components cannot write cookies during a render, so a token nearing
  // expiry is renewed here — the one place in a navigation that can persist it.
  if (
    session.auth === "google" &&
    session.token &&
    (session.tokenExpiresAt ?? 0) - Date.now() < REFRESH_WINDOW_MS
  ) {
    const renewed = await refreshSessionToken(session.token);
    if (renewed) {
      session.token = renewed.access_token;
      session.tokenExpiresAt = new Date(renewed.expires_at).getTime();
      await session.save();
    } else if ((session.tokenExpiresAt ?? 0) <= Date.now()) {
      // Past its life and not renewable — a fresh sign-in is required.
      session.destroy();
      return to("/login?reason=expired");
    }
  }

  if (pathname === "/login") {
    return to(session.mode === "super" ? "/artists" : "/studio");
  }

  if (pathname === "/") {
    return to(session.mode === "super" ? "/artists" : "/studio");
  }

  if (pathname.startsWith("/artists") && session.mode !== "super") {
    return to("/studio");
  }

  if (pathname.startsWith("/studio") && session.mode === "super") {
    const acting = session.acting;
    if (!acting || acting.until < Date.now()) {
      return to("/artists?reason=pick-artist");
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Two deliberate exclusions:
    //   api/auth/*   — the sign-in routes themselves, which obviously cannot
    //                  require an existing session to reach.
    //   api/photos/upload — authorises itself, so it can never be mistaken for
    //                  something the proxy protects.
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/photos/upload).*)",
  ],
};
