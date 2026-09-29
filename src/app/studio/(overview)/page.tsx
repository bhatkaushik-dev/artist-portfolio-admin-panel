import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton } from "@/components/ui/base";
import {
  getHealth,
  listEnquiries,
  listFaqs,
  listPages,
  listPhotos,
  listVideos,
} from "@/lib/api/resources";
import { orElse } from "@/lib/api/errors";
import type { EnquiryList } from "@/lib/schemas/enquiry";
import type { Health } from "@/lib/schemas/tenant";
import type { Page } from "@/lib/schemas/page";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Overview · Portfolio Admin" };

/**
 * Every request starts at once, and each panel streams in as soon as its own
 * data lands. Awaiting them together made the whole screen wait on the slowest
 * one — listing every photo just to count them.
 *
 * Each promise swallows its own failure, so one failing panel never blanks the
 * dashboard and none of them can reject unobserved.
 */
export default function StudioDashboard() {
  const health = getHealth().catch(orElse(null));
  const pages = listPages().catch(orElse<Page[]>([]));
  const photos = listPhotos({ includeInactive: true }).catch(orElse([]));
  const videos = listVideos({ includeInactive: true }).catch(orElse([]));
  const faqs = listFaqs({ includeInactive: true }).catch(orElse([]));
  const enquiries = listEnquiries({ limit: 5 }).catch(orElse(null));

  const stats = [
    { label: "Pages", value: pages.then((p) => p.length), href: "/studio/pages" },
    { label: "Photos", value: photos.then((p) => p.length), href: "/studio/gallery" },
    { label: "Videos", value: videos.then((v) => v.length), href: "/studio/videos" },
    { label: "FAQs", value: faqs.then((f) => f.length), href: "/studio/faqs" },
    { label: "Enquiries", value: enquiries.then((e) => e?.total ?? 0), href: "/studio/enquiries" },
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
            <Suspense fallback={<Skeleton className="mt-2 h-7 w-10" />}>
              <StatValue value={stat.value} />
            </Suspense>
          </Link>
        ))}
      </div>

      <Suspense>
        <UnpublishedNotice pages={pages} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<PanelSkeleton title="Recent enquiries" />}>
          <RecentEnquiries enquiries={enquiries} />
        </Suspense>
        <Suspense fallback={<PanelSkeleton title="API status" />}>
          <ApiStatus health={health} />
        </Suspense>
      </div>
    </>
  );
}

async function StatValue({ value }: { value: Promise<number> }) {
  return <p className="mt-1 text-2xl font-semibold tracking-tight">{await value}</p>;
}

async function UnpublishedNotice({ pages }: { pages: Promise<Page[]> }) {
  const unpublished = (await pages).filter((p) => !p.is_published);
  if (unpublished.length === 0) return null;

  return (
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
  );
}

async function RecentEnquiries({ enquiries }: { enquiries: Promise<EnquiryList | null> }) {
  const data = await enquiries;
  const pending = data?.items.filter((e) => e.status === "pending") ?? [];

  return (
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
      {data && data.items.length > 0 ? (
        <ul className="divide-y divide-border">
          {data.items.map((enquiry) => (
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
  );
}

async function ApiStatus({ health: healthPromise }: { health: Promise<Health | null> }) {
  const health = await healthPromise;

  return (
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
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}
