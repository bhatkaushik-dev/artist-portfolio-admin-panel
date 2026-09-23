"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, Field, FormError, Input, Textarea } from "@/components/ui/base";
import { SubmitButton, SwitchField, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { updatePageAction } from "@/lib/actions/pages";
import type { FormResult } from "@/lib/api/errors";
import type { Page } from "@/lib/schemas/page";
import { blocksJsonSchema } from "@/lib/schemas/page";
import { diffKeys } from "@/lib/utils";

export function PageEditor({ page }: { page: Page }) {
  const [state, formAction] = useActionState<FormResult<null>, FormData>(updatePageAction, {
    ok: true,
    data: null,
  });
  const errors = state.ok ? undefined : state.fieldErrors;

  const originalBlocks = useMemo(
    () => JSON.stringify(page.blocks ?? {}, null, 2),
    [page.blocks],
  );
  const [blocks, setBlocks] = useState(originalBlocks);
  const [published, setPublished] = useState(page.is_published);
  const [noindex, setNoindex] = useState(page.noindex);

  const blocksError = useMemo(() => {
    const result = blocksJsonSchema.safeParse(blocks);
    return result.success ? null : result.error.issues[0].message;
  }, [blocks]);

  // Removing a key is the only irreversible edit here, so surface it up front.
  const blockDiff = useMemo(() => {
    if (blocksError) return null;
    try {
      return diffKeys(
        (page.blocks ?? {}) as Record<string, unknown>,
        blocks.trim() ? JSON.parse(blocks) : {},
      );
    } catch {
      return null;
    }
  }, [blocks, blocksError, page.blocks]);

  useEffect(() => {
    if (state.ok && state.data === null) toast.success("Page saved");
    else if (!state.ok && state.formError) toast.error(state.formError);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={page.slug} />
      <input type="hidden" name="is_published" value={published ? "on" : ""} />
      <input type="hidden" name="noindex" value={noindex ? "on" : ""} />

      <Tabs defaultValue="copy">
        <TabsList className="mb-4">
          <TabsTrigger value="copy">Copy</TabsTrigger>
          <TabsTrigger value="blocks">
            Blocks{blocksError ? " ⚠" : ""}
          </TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="copy">
          <Card className="flex flex-col gap-4 p-5">
            <Field label="Title" required error={errors?.title}>
              <Input name="title" defaultValue={page.title} aria-invalid={Boolean(errors?.title)} />
            </Field>
            <Field label="Subtitle" error={errors?.subtitle}>
              <Input name="subtitle" defaultValue={page.subtitle ?? ""} />
            </Field>
            <Field label="Intro" error={errors?.intro}>
              <Textarea name="intro" rows={3} defaultValue={page.intro ?? ""} />
            </Field>
            <Field label="Body" error={errors?.body}>
              <Textarea name="body" rows={12} defaultValue={page.body ?? ""} />
            </Field>
            <SwitchField
              label="Published"
              hint="Unpublished pages are hidden from the public site."
              checked={published}
              onCheckedChange={setPublished}
            />
          </Card>
        </TabsContent>

        <TabsContent value="blocks">
          <Card className="flex flex-col gap-3 p-5">
            <Field
              label="Blocks (JSON)"
              hint="Structured content the site renders. Saved as a whole — this replaces the entire object."
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

        <TabsContent value="seo">
          <Card className="flex flex-col gap-4 p-5">
            <Field label="SEO title" error={errors?.seo_title}>
              <Input name="seo_title" defaultValue={page.seo_title ?? ""} />
            </Field>
            <Field label="Meta description" error={errors?.seo_description}>
              <Textarea name="seo_description" rows={3} defaultValue={page.seo_description ?? ""} />
            </Field>
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
