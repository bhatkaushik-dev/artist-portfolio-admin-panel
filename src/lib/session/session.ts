import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession, type IronSession } from "iron-session";

import {
  type ActiveTenant,
  type SessionData,
  flashOptions,
  sessionOptions,
} from "./config";

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

/**
 * An absent or unsealable cookie yields an object with no fields, so a session
 * only counts as valid when it carries both a mode and the key that mode needs.
 */
function isLoggedIn(s: IronSession<SessionData>): boolean {
  const credential = s.auth === "google" ? s.token : s.key;
  if (!credential) return false;
  if (s.mode === "super") return true;
  return s.mode === "tenant" && Boolean(s.tenant);
}

export async function requireSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (!isLoggedIn(session)) redirect("/login");
  return session;
}

export async function requireSuper() {
  const session = await requireSession();
  if (session.mode !== "super") redirect("/studio");
  return session;
}

/**
 * The tenant whose content is being edited, in either mode.
 *
 * This is the single place that decides *whose* data a request touches, and it
 * is why every resource module can stay oblivious to which mode it is running
 * under.
 */
export type TenantContext = {
  tenant: ActiveTenant;
  /** Sent as `X-Admin-Key` on writes. */
  adminKey: string;
  /** Set only when a super admin is acting as this tenant. */
  actingAsSuper: boolean;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getSession();
  const credential = session.auth === "google" ? session.token : session.key;
  if (!credential) return null;

  if (session.mode === "tenant" && session.tenant) {
    return { tenant: session.tenant, adminKey: credential, actingAsSuper: false };
  }

  if (session.mode === "super" && session.acting) {
    const { id, slug, name, siteKey, until } = session.acting;
    if (until < Date.now()) return null;
    return {
      tenant: { id, slug, name, siteKey },
      adminKey: credential,
      actingAsSuper: true,
    };
  }

  return null;
}

export async function requireTenantContext(): Promise<TenantContext> {
  const session = await getSession();
  if (!isLoggedIn(session)) redirect("/login");

  const context = await getTenantContext();
  if (!context) {
    redirect(
      session.mode === "super"
        ? "/artists?reason=pick-artist"
        : "/login?reason=expired",
    );
  }
  return context;
}

// --- One-shot credential handoff -------------------------------------------
// Keys returned by create/rotate must be shown exactly once. Putting them in a
// short-lived sealed cookie keeps them out of the URL, out of history, and out
// of any cached RSC payload.

type FlashData = { credentials?: { name: string; slug: string; siteKey: string; adminKey: string } };

export async function setFlashCredentials(value: NonNullable<FlashData["credentials"]>) {
  const flash = await getIronSession<FlashData>(await cookies(), flashOptions());
  flash.credentials = value;
  await flash.save();
}

export async function takeFlashCredentials(): Promise<FlashData["credentials"] | null> {
  const flash = await getIronSession<FlashData>(await cookies(), flashOptions());
  const value = flash.credentials ?? null;
  if (value) flash.destroy();
  return value;
}
