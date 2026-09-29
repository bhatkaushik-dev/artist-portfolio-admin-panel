import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession, type IronSession } from "iron-session";

import {
  type ActiveTenant,
  FLASH_COOKIE,
  type SessionData,
  flashOptions,
  isLoggedIn,
  sessionOptions,
} from "./config";

/**
 * Memoised per request. A single render reaches this from the layout, the page
 * and every `apiFetch` credential lookup — a dozen cookie unseals on the
 * dashboard alone — and they all want the same object. Writes still go through
 * the one instance, so a save is seen by anything that reads after it.
 */
export const getSession = cache(
  async (): Promise<IronSession<SessionData>> =>
    getIronSession<SessionData>(await cookies(), sessionOptions()),
);

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

/**
 * Everything a sign-out has to remove: the session and any credentials still
 * waiting to be shown. Only callable where cookies are writable — a Server
 * Action or Route Handler, never a server component render.
 */
export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
  const store = await cookies();
  if (store.has(FLASH_COOKIE)) store.delete(FLASH_COOKIE);
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
