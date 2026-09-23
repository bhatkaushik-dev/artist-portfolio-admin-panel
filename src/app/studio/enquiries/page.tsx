import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listEnquiries } from "@/lib/api/resources";
import { ENQUIRY_STATUSES, enquiryStatusSchema } from "@/lib/schemas/enquiry";
import { cn, formatDateTime } from "@/lib/utils";
import { EnquiryRow } from "./enquiry-row";

export const metadata = { title: "Enquiries · Portfolio Admin" };

const PAGE_SIZE = 25;

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;

  // Filters live in the URL so the page stays a server component and any view
  // of the list is linkable.
  const status = enquiryStatusSchema.safeParse(params.status).data;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const data = await listEnquiries({ status, limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const href = (next: { status?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (next.status) sp.set("status", next.status);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const q = sp.toString();
    return q ? `/studio/enquiries?${q}` : "/studio/enquiries";
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`${data.total} total from the public contact form.`}
      />

      <div className="mb-4 flex items-center gap-1.5">
        <FilterTab href={href({})} active={!status} label="All" />
        {ENQUIRY_STATUSES.map((value) => (
          <FilterTab
            key={value}
            href={href({ status: value })}
            active={status === value}
            label={value}
          />
        ))}
      </div>

      <Card>
        {data.items.length === 0 ? (
          <EmptyState
            title={status ? `No ${status} enquiries` : "No enquiries yet"}
            description="Messages sent through the contact form appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((enquiry) => (
              <EnquiryRow
                key={enquiry.id}
                enquiry={enquiry}
                receivedAt={formatDateTime(enquiry.created_at)}
              />
            ))}
          </ul>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href({ status, page: page - 1 })}
                className="rounded-lg border border-border-strong bg-elevated px-3 py-1.5 transition-colors hover:bg-surface-hover"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={href({ status, page: page + 1 })}
                className="rounded-lg border border-border-strong bg-elevated px-3 py-1.5 transition-colors hover:bg-surface-hover"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
        active
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-border bg-surface text-muted hover:text-text",
      )}
    >
      {label}
    </Link>
  );
}
