"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, Field, FormError, Input, Textarea } from "@/components/ui/base";
import { SubmitButton, SwitchField, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { updatePageAction } from "@/lib/actions/pages";
import type { FormResult } from "@/lib/api/errors";
import type { Photo } from "@/lib/schemas/media";
import type { Page } from "@/lib/schemas/page";
import { blocksJsonSchema } from "@/lib/schemas/page";
import { diffKeys } from "@/lib/utils";
import { BLOCK_EDITORS } from "./block-editors";
import { PhotoPicker } from "./photo-picker";

export function PageEditor({ page, photos }: { page: Page; photos: Photo[] }) {
  const [state, formAction] = useActionState<FormResult<null>, FormData>(updatePageAction, {
    ok: true,
    data: null,
  });
  const errors = state.ok ? undefined : state.fieldErrors;

  const originalBlocks = useMemo(
    () => JSON.stringify(page.blocks ?? {}, null, 2),
    [page.blocks],
  );
  // The JSON text is the single source of truth; the Content tab edits it
  // through a parsed view, so the two can never disagree.
  const [blocks, setBlocks] = useState(originalBlocks);
  const [published, setPublished] = useState(page.is_published);
  const [noindex, setNoindex] = useState(page.noindex);
  const [headerPhoto, setHeaderPhoto] = useState<string | null>(page.header_photo_id);

  const blocksError = useMemo(() => {
    const result = blocksJsonSchema.safeParse(blocks);
    return result.success ? null : result.error.issues[0].message;
  }, [blocks]);

  const parsedBlocks = useMemo<Record<string, unknown> | null>(() => {
    if (blocksError) return null;
    return blocks.trim() ? JSON.parse(blocks) : {};
  }, [blocks, blocksError]);

  // Removing a key is the only irreversible edit here, so surface it up front.
  const blockDiff = useMemo(
    () =>
      parsedBlocks
        ? diffKeys((page.blocks ?? {}) as Record<string, unknown>, parsedBlocks)
        : null,
    [parsedBlocks, page.blocks],
  );

  const ContentEditor = BLOCK_EDITORS[page.slug];

  useEffect(() => {
    if (state.ok && state.data === null) toast.success("Page saved");
    else if (!state.ok && state.formError) toast.error(state.formError);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={page.slug} />
      <input type="hidden" name="is_published" value={published ? "on" : ""} />
      <input type="hidden" name="noindex" value={noindex ? "on" : ""} />
      <input type="hidden" name="header_photo_id" value={headerPhoto ?? ""} />

      <Tabs defaultValue="header">
        <TabsList className="mb-4">
          <TabsTrigger value="header">Header</TabsTrigger>
          {ContentEditor && (
            <TabsTrigger value="content">
              Content{errors?.blocks ? " ⚠" : ""}
            </TabsTrigger>
          )}
          <TabsTrigger value="blocks">
            JSON{blocksError ? " ⚠" : ""}
          </TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* forceMount keeps every uncontrolled input mounted, so a field on a
            tab that is not showing is still submitted with the form. */}
        <TabsContent value="header" forceMount className="data-[state=inactive]:hidden">
          <Card className="flex flex-col gap-4 p-5">
            <Field
              label="Page name"
              required
              hint="Used in navigation and breadcrumbs, not on the page itself."
              error={errors?.title}
            >
              <Input name="title" defaultValue={page.title} aria-invalid={Boolean(errors?.title)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Eyebrow" hint="Small caps above the heading" error={errors?.eyebrow}>
                <Input name="eyebrow" defaultValue={page.eyebrow ?? ""} />
              </Field>
              <Field label="Heading" hint="The page's main title" error={errors?.heading}>
                <Input name="heading" defaultValue={page.heading ?? ""} />
              </Field>
              <Field label="Highlight" hint="Trailing words, set in gold" error={errors?.highlight}>
                <Input name="highlight" defaultValue={page.highlight ?? ""} />
              </Field>
            </div>

            <Field label="Intro" error={errors?.intro}>
              <Textarea name="intro" rows={3} defaultValue={page.intro ?? ""} />
            </Field>

            <Field
              label="Header photo"
              hint="Shown beside the heading. Small scans are framed at their own size."
              error={errors?.header_photo_id}
            >
              <PhotoPicker photos={photos} value={headerPhoto} onChange={setHeaderPhoto} />
            </Field>

            <SwitchField
              label="Published"
              hint="Unpublished pages are hidden from the public site."
              checked={published}
              onCheckedChange={setPublished}
            />

            <details className="rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer text-[12px] text-muted">
                Older fields — not shown by the current site design
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                <Field label="Subtitle" error={errors?.subtitle}>
                  <Input name="subtitle" defaultValue={page.subtitle ?? ""} />
                </Field>
                <Field label="Body" error={errors?.body}>
                  <Textarea name="body" rows={6} defaultValue={page.body ?? ""} />
                </Field>
              </div>
            </details>
          </Card>
        </TabsContent>

        {ContentEditor && (
          <TabsContent value="content">
            <Card className="flex flex-col gap-5 p-5">
              {parsedBlocks ? (
                <ContentEditor
                  value={parsedBlocks}
                  onChange={(next) => setBlocks(JSON.stringify(next, null, 2))}
                  photos={photos}
                />
              ) : (
                <p className="text-[13px] text-danger">
                  The JSON tab has a syntax error — fix it there to edit the content here.
                </p>
              )}
              {errors?.blocks && <FormError>{errors.blocks}</FormError>}
            </Card>
          </TabsContent>
        )}

        <TabsContent value="blocks" forceMount className="data-[state=inactive]:hidden">
          <Card className="flex flex-col gap-3 p-5">
            <Field
              label="Blocks (JSON)"
              hint={
                ContentEditor
                  ? "The raw data behind the Content tab. Keys the form doesn't show are kept as they are."
                  : "Structured content the site renders. Saved as a whole — this replaces the entire object."
              }
              error={blocksError ?? errors?.blocks ?? undefined}
            >
              <Textarea
                name="blocks"
                value={blocks}
                onChange={(e) => setBlocks(e.target.value)}
                onBlur={() => {
                  if (!blocksError && blocks.trim()) {
                    setBlocks(JSON.stringify(JSON.parse(blocks), null, 2));
                  }
                }}
                rows={18}
                spellCheck={false}
                className="font-mono text-[12px]"
                aria-invalid={Boolean(blocksError)}
              />
            </Field>

            {blockDiff && (blockDiff.added.length || blockDiff.removed.length || blockDiff.changed.length) ? (
              <div className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]">
                <p className="mb-1 font-medium text-text">Pending changes</p>
                {blockDiff.added.length > 0 && (
                  <p className="text-success">added: {blockDiff.added.join(", ")}</p>
                )}
                {blockDiff.changed.length > 0 && (
                  <p className="text-muted">changed: {blockDiff.changed.join(", ")}</p>
                )}
                {blockDiff.removed.length > 0 && (
                  <p className="text-danger">
                    removed: {blockDiff.removed.join(", ")} — this cannot be undone
                  </p>
                )}
              </div>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
          <Card className="flex flex-col gap-4 p-5">
            <Field label="SEO title" error={errors?.seo_title}>
              <Input name="seo_title" defaultValue={page.seo_title ?? ""} />
            </Field>
            <Field label="Meta description" error={errors?.seo_description}>
              <Textarea name="seo_description" rows={3} defaultValue={page.seo_description ?? ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Social title" hint="Leave empty to reuse the SEO title" error={errors?.og_title}>
                <Input name="og_title" defaultValue={page.og_title ?? ""} />
              </Field>
              <Field
                label="Social description"
                hint="Leave empty to reuse the meta description"
                error={errors?.og_description}
              >
                <Textarea name="og_description" rows={2} defaultValue={page.og_description ?? ""} />
              </Field>
            </div>
            <Field label="Keywords" hint="Comma separated">
              <Input name="seo_keywords" defaultValue={page.seo_keywords.join(", ")} />
            </Field>
            <Field label="Canonical path" error={errors?.canonical_path}>
              <Input name="canonical_path" defaultValue={page.canonical_path ?? ""} />
            </Field>
            <Field label="Social image URL" error={errors?.og_image_url}>
              <Input name="og_image_url" defaultValue={page.og_image_url ?? ""} />
            </Field>
            <SwitchField
              label="Hide from search engines"
              hint="Adds a noindex tag."
              checked={noindex}
              onCheckedChange={setNoindex}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {!state.ok && <FormError>{state.formError}</FormError>}

      <div className="flex justify-end">
        <SubmitButton disabled={Boolean(blocksError)}>Save page</SubmitButton>
      </div>
    </form>
  );
}
