"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * `icon` is an already-rendered element, not a component. A component function
 * cannot be serialised across the server/client boundary, but its output can.
 */
export function NavLink({
  href,
  label,
  icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition-colors md:py-2 md:text-[13px]",
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-hover hover:text-text",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <Pending />
    </Link>
  );
}

/**
 * Answers the tap straight away when the destination was not prefetched yet
 * (a drawer link on a phone is off-screen until the drawer opens). Always
 * rendered and faded in after a beat, so fast navigations show nothing and
 * the row never shifts.
 */
function Pending() {
  const { pending } = useLinkStatus();
  return (
    <Loader2
      size={13}
      aria-hidden
      className={cn(
        "shrink-0 animate-spin opacity-0 transition-opacity",
        pending && "opacity-60 delay-100",
      )}
    />
  );
}
