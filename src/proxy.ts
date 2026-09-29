import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { nextProxyCookies } from "iron-session";

import {
  SESSION_COOKIE,
  type SessionData,
  isLoggedIn,
  sessionOptions,
} from "@/lib/session/config";
import { renewIfDue } from "@/lib/auth/refresh";

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

  // iron-session writes cookies onto `response`, but a redirect is a different
  // response. Without copying them across, a cleared session was never
  // actually cleared in the browser: `/login?reason=expired` then saw the same
  // dead cookie, "expired" it again and redirected to itself until the browser
  // gave up with "too many redirects". A renewed token was lost the same way.
  const to = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of response.headers.getSetCookie()) {
      redirect.headers.append("set-cookie", cookie);
    }
    return redirect;
  };

  let loggedIn = isLoggedIn(session);
  let expired = false;

  // Server components cannot write cookies during a render, so a token nearing
  // expiry is renewed here — the one place in a navigation that can persist it.
  if (loggedIn && (await renewIfDue(session)) === "dead") {
    loggedIn = false;
    expired = true;
  }

  if (!loggedIn) {
    // Whatever is left in the cookie (lapsed token, stale shape, an old
    // secret) is unusable. Drop it so the next visit starts clean.
    if (request.cookies.has(SESSION_COOKIE)) session.destroy();

    if (pathname === "/login") return response;
    const params = new URLSearchParams();
    if (expired) params.set("reason", "expired");
    if (pathname !== "/") params.set("next", pathname + search);
    const query = params.toString();
    return to(query ? `/login?${query}` : "/login");
  }

  if (pathname === "/login" || pathname === "/") {
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
