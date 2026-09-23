import { Shell } from "@/components/nav/shell";
import { getSession, requireTenantContext } from "@/lib/session/session";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireTenantContext();
  const session = await getSession();

  return (
    <Shell
      tenantName={context.tenant.name}
      actingAsSuper={context.actingAsSuper}
      isSuper={session.mode === "super"}
      user={session.user}
    >
      {children}
    </Shell>
  );
}
