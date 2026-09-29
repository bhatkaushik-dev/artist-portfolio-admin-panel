"use client";

import { useEffect } from "react";

/** Well inside the 10-minute renewal window, so an active tab never lapses. */
const INTERVAL_MS = 4 * 60_000;

/**
 * Keeps the session alive while a tab is in use, and notices when it is not.
 *
 * Checks on a timer while visible, and again whenever the tab comes back —
 * unlocking a phone, switching back to the browser, or a page restored from
 * the back/forward cache, none of which makes a request on its own. A dead
 * session sends the person to sign in before they start typing into a form
 * that can no longer save.
 */
export function SessionKeeper() {
  useEffect(() => {
    let inFlight = false;

    async function check() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const response = await fetch("/api/auth/session", { method: "POST", cache: "no-store" });
        if (response.status === 401) {
          const next = window.location.pathname + window.location.search;
          window.location.assign(`/login?reason=expired&next=${encodeURIComponent(next)}`);
        }
      } catch {
        // Offline or a blip: try again on the next tick. The server still
        // checks the session on every real request.
      } finally {
        inFlight = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };

    const timer = window.setInterval(check, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
