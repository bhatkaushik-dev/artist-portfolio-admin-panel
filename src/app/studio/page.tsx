import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/base";
import {
  getHealth,
  listEnquiries,
  listFaqs,
  listPages,
  listPhotos,
  listVideos,
} from "@/lib/api/resources";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Overview · Portfolio Admin" };

export default async function StudioDashboard() {
  // One failing panel should not blank the whole dashboard.
  const [health, pages, photos, videos, faqs, enquiries] = await Promise.all([
    getHealth().catch(() => null),
    listPages().catch(() => []),
    listPhotos({ includeInactive: true }).catch(() => []),
    listVideos({ includeInactive: true }).catch(() => []),
    listFaqs({ includeInactive: true }).catch(() => []),
    listEnquiries({ limit: 5 }).catch(() => null),
  ]);

  const unpublished = pages.filter((p) => !p.is_published);
  const pending = enquiries?.items.filter((e) => e.status === "pending") ?? [];

  const stats = [
    { label: "Pages", value: pages.length, href: "/studio/pages" },
    { label: "Photos", value: photos.length, href: "/studio/gallery" },
    { label: "Videos", value: videos.length, href: "/studio/videos" },
    { label: "FAQs", value: faqs.length, href: "/studio/faqs" },
    { label: "Enquiries", value: enquiries?.total ?? 0, href: "/studio/enquiries" },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="A snapshot of everything on the public site."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card px-4 py-3.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
          >
            <p className="text-[12px] text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Link>
        ))}
      </div>

      {unpublished.length > 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="text-[13px] font-medium text-text">
                {unpublished.length} page{unpublished.length === 1 ? "" : "s"} not published yet
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {unpublished.map((p) => p.slug).join(", ")} — these stay hidden from the
                public site until you publish them.
              </p>
              <Link
                href="/studio/pages"
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
              >
                Review pages <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent enquiries"
            description={pending.length ? `${pending.length} awaiting a reply` : undefined}
            action={
              <Link
                href="/studio/enquiries"
                className="text-[12px] font-medium text-accent hover:underline"
              >
                View all
              </Link>
            }
          />
          {enquiries && enquiries.items.length > 0 ? (
            <ul className="divide-y divide-border">
              {enquiries.items.map((enquiry) => (
                <li key={enquiry.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{enquiry.name}</p>
                    <p className="truncate text-[12px] text-muted">
                      {enquiry.subject || enquiry.message}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={enquiry.status === "pending" ? "accent" : "neutral"}>
                      {enquiry.status}
                    </Badge>
                    <span className="text-[11px] text-faint">
                      {formatDateTime(enquiry.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No enquiries yet" />
          )}
        </Card>

        <Card>
          <CardHeader title="API status" />
          <div className="px-5 py-4">
            {health ? (
              <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                <dt className="text-muted">Status</dt>
                <dd>
                  <Badge tone={health.status === "ok" ? "success" : "warning"}>
                    {health.status}
                  </Badge>
                </dd>
                <dt className="text-muted">Database</dt>
                <dd>
                  <Badge tone={health.database === "up" ? "success" : "danger"}>
                    {health.database}
                  </Badge>
                </dd>
                <dt className="text-muted">Latency</dt>
                <dd>{health.db_latency_ms.toFixed(0)} ms</dd>
                <dt className="text-muted">Environment</dt>
                <dd>{health.environment}</dd>
              </dl>
            ) : (
              <p className="text-[13px] text-danger">Could not reach the API.</p>
            )}
            {health?.detail && (
              <p className="mt-3 text-[12px] text-muted">{health.detail}</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
