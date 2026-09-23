import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listPages } from "@/lib/api/resources";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Pages · Portfolio Admin" };

export default async function PagesPage() {
  const pages = await listPages();

  return (
    <>
      <PageHeader title="Pages" description="Copy, structured blocks and SEO for each route." />

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
                    <p className="mt-0.5 font-mono text-[11px] text-faint">/{page.slug}</p>
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
