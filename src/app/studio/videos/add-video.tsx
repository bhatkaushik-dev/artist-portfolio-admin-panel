"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button, Field, FormError, Input } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/overlays";
import { createVideoAction } from "@/lib/actions/videos";
import type { FormResult } from "@/lib/api/errors";

export function AddVideo() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormResult<null>>({ ok: true, data: null });
  const errors = state.ok ? undefined : state.fieldErrors;

  async function formAction(formData: FormData) {
    const result = await createVideoAction({ ok: true, data: null }, formData);
    setState(result);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus size={14} />
          Add video
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Add a video"
        description="Title, duration and thumbnail are pulled from YouTube automatically."
      >
        <form action={formAction} className="flex flex-col gap-4">
          <Field
            label="YouTube link or ID"
            required
            hint="e.g. https://youtu.be/dQw4w9WgXcQ"
            error={errors?.youtube_id}
          >
            <Input
              name="youtube_id"
              autoFocus
              spellCheck={false}
              placeholder="https://www.youtube.com/watch?v=…"
              aria-invalid={Boolean(errors?.youtube_id)}
            />
          </Field>

          <label className="flex items-center gap-2 text-[13px] text-text">
            <input type="checkbox" name="featured" className="accent-[var(--accent)]" />
            Feature this video above the others
          </label>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding…">Add video</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
