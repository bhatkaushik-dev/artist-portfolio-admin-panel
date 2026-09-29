import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listPages } from "@/lib/api/resources";
import { SITE_PAGE_ORDER } from "@/lib/schemas/page";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Pages · Portfolio Admin" };

/** Site pages in nav order, then anything else alphabetically (the API's order). */
const rank = (slug: string) => {
  const i = SITE_PAGE_ORDER.indexOf(slug);
  return i === -1 ? SITE_PAGE_ORDER.length : i;
};

export default async function PagesPage() {
  const pages = (await listPages()).sort((a, b) => rank(a.slug) - rank(b.slug));

  return (
    <>
      <PageHeader title="Pages" description="Header, content and SEO for each route." />

      <Card>
        {pages.length === 0 ? (
          <EmptyState
            title="No pages"
            description="Pages are created when an artist is set up, or by the seed script. They cannot be added from here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/studio/pages/${page.slug}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{page.title}</span>
                      <Badge tone={page.is_published ? "success" : "warning"}>
                        {page.is_published ? "published" : "draft"}
                      </Badge>
                      {page.noindex && <Badge>noindex</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-faint">
                      <span className="font-mono">{page.slug === "home" ? "/" : `/${page.slug}`}</span>
                      {page.heading && (
                        <span className="ml-2">
                          {page.heading} {page.highlight}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted">
                    {formatDateTime(page.updated_at)}
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        The API has no route for creating or renaming pages, so this list is fixed.
        New pages come from artist setup or the seed script.
      </p>
    </>
  );
}
