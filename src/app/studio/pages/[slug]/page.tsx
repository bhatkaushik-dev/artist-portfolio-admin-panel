import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/ui/base";
import { getPage } from "@/lib/api/resources";
import { ApiError } from "@/lib/api/errors";
import { PageEditor } from "./page-editor";

export default async function PageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let page;
  try {
    page = await getPage(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <Link
        href="/studio/pages"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={13} />
        All pages
      </Link>

      <PageHeader title={page.title} description={`/${page.slug}`} />

      <PageEditor page={page} />
    </>
  );
}
