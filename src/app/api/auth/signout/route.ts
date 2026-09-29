import { NextResponse, type NextRequest } from "next/server";

import { clearSession } from "@/lib/session/session";

export const runtime = "nodejs";

/**
 * Where a request lands when the backend rejects the session mid-render — a
 * revoked account, a rotated key. A server component cannot delete cookies, so
 * `apiFetch` redirects here and this clears them before going to sign-in.
 *
 * Under `api/auth`, so the proxy never intercepts it. It only ever removes
 * this browser's own cookies (they are `SameSite=Lax`, so another site cannot
 * trigger it with an embedded request).
 */
export async function GET(request: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/login?reason=expired", request.url));
}
