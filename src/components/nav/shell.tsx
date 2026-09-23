import {
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Video,
} from "lucide-react";

import { logoutAction, stopActingAction } from "@/lib/actions/auth";
import { Badge, Button } from "@/components/ui/base";
import { NavLink } from "./nav-link";

const ICON = 15;

// Icons are rendered here, on the server, and handed to NavLink as elements —
// passing the component itself would not survive the client boundary.
const STUDIO_LINKS = [
  { href: "/studio", label: "Overview", icon: <LayoutDashboard size={ICON} />, exact: true },
  { href: "/studio/profile", label: "Profile", icon: <User size={ICON} /> },
  { href: "/studio/pages", label: "Pages", icon: <FileText size={ICON} /> },
  { href: "/studio/gallery", label: "Gallery", icon: <ImageIcon size={ICON} /> },
  { href: "/studio/videos", label: "Videos", icon: <Video size={ICON} /> },
  { href: "/studio/faqs", label: "FAQs", icon: <HelpCircle size={ICON} /> },
  { href: "/studio/enquiries", label: "Enquiries", icon: <Inbox size={ICON} /> },
];

export function Shell({
  children,
  tenantName,
  actingAsSuper,
  isSuper,
  showStudioNav = true,
  user,
}: {
  children: React.ReactNode;
  tenantName?: string;
  actingAsSuper?: boolean;
  isSuper?: boolean;
  showStudioNav?: boolean;
  user?: { email: string; name?: string | null; pictureUrl?: string | null };
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-[13px] font-semibold text-accent">
            ◈
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Portfolio Admin</span>
        </div>

        {tenantName && (
          <div className="mx-3 mb-3 rounded-lg border border-border bg-bg px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-faint">Editing</p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-text">{tenantName}</p>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {isSuper && (
            <NavLink href="/artists" icon={<Users size={ICON} />} label="Artists" />
          )}
          {showStudioNav &&
            STUDIO_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                exact={link.exact}
              />
            ))}
        </nav>

        <div className="border-t border-border p-3">
          {user && (
            <div className="mb-2 flex items-center gap-2.5 px-1">
              {user.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.pictureUrl}
                  alt=""
                  width={26}
                  height={26}
                  className="h-[26px] w-[26px] shrink-0 rounded-full border border-border"
                />
              ) : (
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold uppercase text-accent">
                  {user.email.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-text">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="truncate text-[11px] text-faint">{user.email}</p>
                )}
              </div>
            </div>
          )}
          {actingAsSuper && (
            <form action={stopActingAction} className="mb-2">
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                Stop editing
              </Button>
            </form>
          )}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut size={14} />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {actingAsSuper && (
          <div className="flex items-center gap-2 border-b border-accent/25 bg-accent-soft px-8 py-2 text-[12px] text-accent">
            <Badge tone="accent">Super admin</Badge>
            You are editing <strong className="font-semibold">{tenantName}</strong> on their behalf.
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
