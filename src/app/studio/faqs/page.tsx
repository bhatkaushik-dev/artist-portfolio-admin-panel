import { Card, EmptyState, PageHeader } from "@/components/ui/base";
import { listFaqs, listPages } from "@/lib/api/resources";
import { FaqEditor } from "./faq-editor";
import { CreateFaq } from "./create-faq";

export const metadata = { title: "FAQs · Portfolio Admin" };

export default async function FaqsPage() {
  const [faqs, pages] = await Promise.all([
    listFaqs({ includeInactive: true }),
    listPages().catch(() => []),
  ]);
  const slugs = pages.map((p) => p.slug);

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Shown on the public site and used for FAQ rich results."
        action={<CreateFaq slugs={slugs} nextOrder={faqs.length} />}
      />

      {faqs.length === 0 ? (
        <Card>
          <EmptyState
            title="No FAQs yet"
            description="Add the questions people ask most often."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {faqs.map((faq) => (
            <FaqEditor key={faq.id} faq={faq} slugs={slugs} />
          ))}
        </div>
      )}
    </>
  );
}
