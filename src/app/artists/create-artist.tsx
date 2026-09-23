"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button, Field, FormError, Input } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/overlays";
import { createTenantAction } from "@/lib/actions/tenants";
import type { FormResult } from "@/lib/api/errors";

export function CreateArtistDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormResult<null>, FormData>(
    createTenantAction,
    { ok: true, data: null },
  );
  const errors = state.ok ? undefined : state.fieldErrors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus size={14} />
          New artist
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Add an artist"
        description="They get their own content, storage folder and keys."
      >
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="name" required error={errors?.name}>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Kaushik Bhat"
              autoFocus
              aria-invalid={Boolean(errors?.name)}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            hint="Optional — derived from the name if left blank. Used in storage paths."
            error={errors?.slug}
          >
            <Input
              id="slug"
              name="slug"
              placeholder="kaushik-bhat"
              className="font-mono"
              aria-invalid={Boolean(errors?.slug)}
            />
          </Field>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create artist</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
