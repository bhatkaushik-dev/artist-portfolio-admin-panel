import { Shell } from "@/components/nav/shell";
import { getTenantContext, requireSuper } from "@/lib/session/session";

export default async function ArtistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuper();
  const context = await getTenantContext();

  return (
    <Shell
      isSuper
      showStudioNav={Boolean(context)}
      tenantName={context?.tenant.name}
      user={session.user}
    >
      {children}
    </Shell>
  );
}
