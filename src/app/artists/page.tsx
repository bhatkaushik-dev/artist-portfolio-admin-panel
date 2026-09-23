import { Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listTenants } from "@/lib/api/resources";
import { requireSuper } from "@/lib/session/session";
import { formatDate } from "@/lib/utils";
import { ArtistRow } from "./artist-row";
import { CreateArtistDialog } from "./create-artist";

export const metadata = { title: "Artists · Portfolio Admin" };

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  await requireSuper();
  const { reason } = await searchParams;
  const tenants = await listTenants(true);

  return (
    <>
      <PageHeader
        title="Artists"
        description="Every site served by this backend. Pick one to edit their content."
        action={<CreateArtistDialog />}
      />

      {reason === "pick-artist" && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-[13px] text-accent">
          Choose an artist to edit. Your editing session may have expired.
        </div>
      )}

      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            title="No artists yet"
            description="Create the first one to get started."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[12px] text-muted">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Slug</th>
                <th className="px-5 py-2.5 font-medium">Created</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((tenant) => (
                <ArtistRow key={tenant.id} tenant={tenant} created={formatDate(tenant.created_at)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        Creating an artist also sets up their profile and the three starter pages
        (about, classes, contact), unpublished. Deactivating one immediately stops
        every key they hold from working, which takes their public site offline.
      </p>
    </>
  );
}
