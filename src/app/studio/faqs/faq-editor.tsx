"use client";

import { useActionState, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";

import { Badge, Button, Field, FormError, Input, NativeSelect, Textarea } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { ConfirmButton } from "@/components/ui/overlays";
import { deleteFaqAction, updateFaqAction } from "@/lib/actions/faqs";
import type { FormResult } from "@/lib/api/errors";
import type { Faq } from "@/lib/schemas/faq";
import { cn } from "@/lib/utils";

export function FaqEditor({ faq, slugs }: { faq: Faq; slugs: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormResult<null>, FormData>(updateFaqAction, {
    ok: true,
    data: null,
  });
  const errors = state.ok ? undefined : state.fieldErrors;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover"
      >
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{faq.question}</span>
        {faq.page_slug && <Badge>{faq.page_slug}</Badge>}
        {!faq.is_active && <Badge tone="neutral">hidden</Badge>}
      </button>

      {open && (
        <form action={formAction} className="flex flex-col gap-4 border-t border-border px-5 py-4">
          <input type="hidden" name="id" value={faq.id} />

          <Field label="Question" required error={errors?.question}>
            <Input
              name="question"
              defaultValue={faq.question}
              aria-invalid={Boolean(errors?.question)}
            />
          </Field>

          <Field label="Answer" required error={errors?.answer}>
            <Textarea
              name="answer"
              rows={4}
              defaultValue={faq.answer}
              aria-invalid={Boolean(errors?.answer)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Page" hint="Optional" error={errors?.page_slug}>
              <NativeSelect name="page_slug" defaultValue={faq.page_slug ?? ""}>
                <option value="">All pages</option>
                {slugs.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Order" error={errors?.order}>
              <Input name="order" type="number" min={0} defaultValue={faq.order} />
            </Field>

            <Field label="Visible" hint="Hidden FAQs stay off the public site">
              <NativeSelect name="is_active" defaultValue={String(faq.is_active)}>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </NativeSelect>
            </Field>
          </div>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <div className="flex items-center justify-between">
            <ConfirmButton
              title="Delete this FAQ?"
              confirmLabel="Delete"
              body={<p>“{faq.question}” will be removed permanently.</p>}
              onConfirm={() => {
                const fd = new FormData();
                fd.set("id", faq.id);
                void deleteFaqAction(fd);
              }}
            >
              <Button type="button" variant="ghost" size="sm">
                <Trash2 size={13} />
                Delete
              </Button>
            </ConfirmButton>

            <SubmitButton>Save changes</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
