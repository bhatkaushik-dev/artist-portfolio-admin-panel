"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Field, FormError, Input, NativeSelect } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { ConfirmButton, Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/overlays";
import { deletePhotoAction, updatePhotoAction } from "@/lib/actions/photos";
import type { FormResult } from "@/lib/api/errors";
import { PHOTO_ROLES, type Photo, type PhotoRole } from "@/lib/schemas/media";

export function PhotoDetails({ photo, role }: { photo: Photo; role: PhotoRole }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormResult<null>>({ ok: true, data: null });
  const errors = state.ok ? undefined : state.fieldErrors;

  async function formAction(formData: FormData) {
    const result = await updatePhotoAction({ ok: true, data: null }, formData);
    setState(result);
    if (result.ok) {
      toast.success("Photo updated");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Edit ${photo.alt}`}>
          <Pencil size={12} />
        </Button>
      </DialogTrigger>

      <DialogContent title="Photo details">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={photo.id} />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            alt={photo.alt}
            className="max-h-48 w-full rounded-lg border border-border object-contain"
          />

          <Field label="Alt text" required error={errors?.alt}>
            <Input name="alt" defaultValue={photo.alt} aria-invalid={Boolean(errors?.alt)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Caption" error={errors?.caption}>
              <Input name="caption" defaultValue={photo.caption ?? ""} />
            </Field>
            <Field label="Credit" error={errors?.credit}>
              <Input name="credit" defaultValue={photo.credit ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Set"
              hint={photo.role === role ? undefined : "Moving this changes which page shows it"}
              error={errors?.role}
            >
              <NativeSelect name="role" defaultValue={photo.role}>
                {PHOTO_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Visible">
              <NativeSelect name="is_active" defaultValue={String(photo.is_active)}>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </NativeSelect>
            </Field>
          </div>

          <p className="text-[12px] text-faint">
            {photo.width}×{photo.height} ·{" "}
            <a href={photo.download_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Download original
            </a>
          </p>

          {!state.ok && <FormError>{state.formError}</FormError>}

          <DialogFooter>
            <ConfirmButton
              title="Delete this photo?"
              confirmLabel="Delete"
              body={<p>It will be removed from the site and from storage. This cannot be undone.</p>}
              onConfirm={() => {
                const fd = new FormData();
                fd.set("id", photo.id);
                void deletePhotoAction(fd);
                setOpen(false);
              }}
            >
              <Button type="button" variant="ghost" size="sm">
                <Trash2 size={13} />
                Delete
              </Button>
            </ConfirmButton>
            <SubmitButton>Save</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
