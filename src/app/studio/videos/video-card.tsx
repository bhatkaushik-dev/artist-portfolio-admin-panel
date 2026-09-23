"use client";

import { useActionState, useState, useTransition } from "react";
import { ExternalLink, RefreshCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge, Button, Field, FormError, Input, NativeSelect, Textarea } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { ConfirmButton } from "@/components/ui/overlays";
import { deleteVideoAction, syncVideoAction, updateVideoAction } from "@/lib/actions/videos";
import type { FormResult } from "@/lib/api/errors";
import type { Video } from "@/lib/schemas/media";

export function VideoCard({ video }: { video: Video }) {
  const [open, setOpen] = useState(false);
  const [syncing, startSync] = useTransition();
  const [state, formAction] = useActionState<FormResult<null>, FormData>(updateVideoAction, {
    ok: true,
    data: null,
  });
  const errors = state.ok ? undefined : state.fieldErrors;

  function sync() {
    const fd = new FormData();
    fd.set("id", video.id);
    startSync(async () => {
      const result = await syncVideoAction(fd);
      if (result.ok) toast.success("Metadata refreshed from YouTube");
      else toast.error(result.formError ?? "Could not sync");
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        {video.thumbnail_url ? (
          // Plain <img>: dimensions are known and these are already-optimised
          // remote thumbnails, so next/image would only burn Vercel quota.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt=""
            width={128}
            height={72}
            className="h-[72px] w-32 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="h-[72px] w-32 shrink-0 rounded-md border border-border bg-elevated" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-[13px] font-medium">{video.title}</p>
            {video.featured && (
              <Badge tone="accent">
                <Star size={10} className="mr-1" />
                featured
              </Badge>
            )}
            {!video.is_active && <Badge>hidden</Badge>}
          </div>
          <p className="mt-1 font-mono text-[11px] text-faint">{video.youtube_id}</p>
          {video.duration && <p className="mt-0.5 text-[12px] text-muted">{video.duration}</p>}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <a href={video.watch_url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" title="Open on YouTube">
              <ExternalLink size={13} />
            </Button>
          </a>
          <Button variant="ghost" size="sm" onClick={sync} disabled={syncing} title="Refresh from YouTube">
            <RefreshCw size={13} className={syncing ? "animate-spin" : undefined} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Edit"}
          </Button>
        </div>
      </div>

      {open && (
        <form action={formAction} className="flex flex-col gap-4 border-t border-border px-4 py-4">
          <input type="hidden" name="id" value={video.id} />

          <Field label="Title" error={errors?.title}>
            <Input name="title" defaultValue={video.title} aria-invalid={Boolean(errors?.title)} />
          </Field>

          <Field label="Description" error={errors?.description}>
            <Textarea name="description" rows={3} defaultValue={video.description ?? ""} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Order" error={errors?.order}>
              <Input name="order" type="number" min={0} defaultValue={video.order} />
            </Field>
            <Field label="Featured" hint="Sorts above the rest">
              <NativeSelect name="featured" defaultValue={video.featured ? "on" : ""}>
                <option value="">No</option>
                <option value="on">Yes</option>
              </NativeSelect>
            </Field>
            <Field label="Visible">
              <NativeSelect name="is_active" defaultValue={String(video.is_active)}>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </NativeSelect>
            </Field>
          </div>

          <p className="text-[12px] text-faint">
            The YouTube ID cannot be changed. Remove the video and add it again to point
            at a different one.
          </p>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <div className="flex items-center justify-between">
            <ConfirmButton
              title="Remove this video?"
              confirmLabel="Remove"
              body={<p>“{video.title}” will be removed from the site.</p>}
              onConfirm={() => {
                const fd = new FormData();
                fd.set("id", video.id);
                void deleteVideoAction(fd);
              }}
            >
              <Button type="button" variant="ghost" size="sm">
                <Trash2 size={13} />
                Remove
              </Button>
            </ConfirmButton>
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
