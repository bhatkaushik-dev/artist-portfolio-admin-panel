"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-[13px] font-semibold text-accent">
      ◈
    </div>
    <span className="text-[13px] font-semibold tracking-tight">Portfolio Admin</span>
  </div>
);

/**
 * Renders the sidebar as a static column on desktop and an off-canvas drawer
 * on mobile, plus the fixed top bar that opens it. `children` is the rest of
 * the sidebar (nav links, tenant badge, sign-out form) rendered server-side —
 * it can cross the client boundary as plain JSX, forms and all.
 */
export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [seenPathname, setSeenPathname] = useState(pathname);

  // Close the drawer on navigation. Adjusting during render (rather than in
  // an effect) avoids a spurious extra frame with the drawer still open.
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-text"
        >
          <Menu size={18} />
        </button>
        <Logo />
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] shrink-0 -translate-x-full flex-col overflow-y-auto border-r border-border bg-surface transition-transform duration-200 ease-out",
          "md:static md:z-auto md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-muted hover:text-text md:hidden"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
