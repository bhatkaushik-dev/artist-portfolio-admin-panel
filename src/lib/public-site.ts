import "server-only";

import { after } from "next/server";

import { getTenantContext } from "@/lib/session/session";

/**
 * Tells the artist's public site that its content changed, so the edit shows
 * within seconds instead of at the site's next ISR interval (5 minutes).
 *
 * The site exposes `POST /api/revalidate`; which URL belongs to which artist
 * is configured, not stored, because the panel serves several artists:
 *
 *   PUBLIC_SITE_HOOKS={"kaushik-bhat":"https://kaushikbhat.in/api/revalidate"}
 *   PUBLIC_SITE_REVALIDATE_SECRET=<the site's REVALIDATE_SECRET>
 *
 * The ping runs after the response is sent, and a failure is only logged: the
 * save itself already succeeded, and the site catches up on its own anyway.
 */
function hookFor(slug: string): string | undefined {
  const raw = process.env.PUBLIC_SITE_HOOKS;
  if (!raw) return undefined;
  try {
    const hooks = JSON.parse(raw) as Record<string, unknown>;
    const url = hooks[slug];
    return typeof url === "string" ? url : undefined;
  } catch {
    console.error("PUBLIC_SITE_HOOKS is not valid JSON");
    return undefined;
  }
}

export async function refreshPublicSite(): Promise<void> {
  const secret = process.env.PUBLIC_SITE_REVALIDATE_SECRET;
  const context = await getTenantContext();
  const url = context && hookFor(context.tenant.slug);
  if (!url || !secret) return;

  after(async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        console.warn(`Public site refresh for ${context.tenant.slug} returned ${response.status}`);
      }
    } catch (error) {
      console.warn(`Public site refresh for ${context.tenant.slug} failed:`, error);
    }
  });
}
