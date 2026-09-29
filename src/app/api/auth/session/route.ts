import { NextResponse } from "next/server";

import { renewIfDue } from "@/lib/auth/refresh";
import { isLoggedIn } from "@/lib/session/config";
import { clearSession, getSession } from "@/lib/session/session";

export const runtime = "nodejs";

/**
 * Keep-alive for an open tab (see `components/nav/session-keeper.tsx`).
 *
 * Tokens were only ever renewed by the proxy during a navigation, so a tab
 * left on one screen — a half-written page, a phone put to sleep — outlived
 * its token and the next save bounced. This renews it while the tab is in use,
 * and reports a dead session so the tab can go to sign-in straight away.
 */
export async function POST() {
  const session = await getSession();
  if (!isLoggedIn(session) || (await renewIfDue(session)) === "dead") {
    await clearSession();
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
