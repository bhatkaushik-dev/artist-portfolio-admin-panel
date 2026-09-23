"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button, Field, FormError, Input, NativeSelect, Textarea } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/overlays";
import { createFaqAction } from "@/lib/actions/faqs";
import type { FormResult } from "@/lib/api/errors";

export function CreateFaq({ slugs, nextOrder }: { slugs: string[]; nextOrder: number }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormResult<null>>({ ok: true, data: null });
  const errors = state.ok ? undefined : state.fieldErrors;

  // Awaiting the action here — rather than reacting to `useActionState` in an
  // effect — lets the dialog close on success without a cascading render.
  async function formAction(formData: FormData) {
    const result = await createFaqAction({ ok: true, data: null }, formData);
    setState(result);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus size={14} />
          Add FAQ
        </Button>
      </DialogTrigger>
      <DialogContent title="Add an FAQ">
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Question" required error={errors?.question}>
            <Input name="question" autoFocus aria-invalid={Boolean(errors?.question)} />
          </Field>

          <Field label="Answer" required error={errors?.answer}>
            <Textarea name="answer" rows={4} aria-invalid={Boolean(errors?.answer)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Page" hint="Optional">
              <NativeSelect name="page_slug" defaultValue="">
                <option value="">All pages</option>
                {slugs.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Order">
              <Input name="order" type="number" min={0} defaultValue={nextOrder} />
            </Field>
          </div>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding…">Add FAQ</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
