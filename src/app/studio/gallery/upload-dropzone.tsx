"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Field, FormError, Input } from "@/components/ui/base";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/overlays";
import { PHOTO_ROLES, type PhotoRole } from "@/lib/schemas/media";
import { formatBytes } from "@/lib/utils";

/**
 * The backend downscales every upload to a 2560px long edge before it stores
 * anything, so shrinking to exactly that here changes nothing about the stored
 * result — but it takes a 15MB phone photo under Vercel's hard 4.5MB request
 * limit, which is otherwise impossible to get past.
 */
const MAX_EDGE = 2560;
const TARGET_BYTES = 4_000_000;

type Prepared = { file: File; from: number; to: number; width: number; height: number };

export function UploadDropzone({ role }: { role: PhotoRole }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function prepare(file: File) {
    setError(undefined);
    setBusy(true);
    try {
      let source: Blob = file;

      // Browsers other than Safari cannot decode HEIC, which iPhones produce by
      // default. Loaded on demand so it stays out of the main bundle.
      if (/\.(heic|heif)$/i.test(file.name) || /heic|heif/.test(file.type)) {
        const heic2any = (await import("heic2any")).default as (o: {
          blob: Blob;
          toType?: string;
          quality?: number;
        }) => Promise<Blob | Blob[]>;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        source = Array.isArray(converted) ? converted[0] : converted;
      }

      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(
        new File([source], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
          type: source.type || "image/jpeg",
        }),
        {
          maxWidthOrHeight: MAX_EDGE,
          maxSizeMB: TARGET_BYTES / (1024 * 1024),
          useWebWorker: true,
          initialQuality: 0.92,
          fileType: "image/jpeg",
          // EXIF orientation is baked in here; the backend would otherwise
          // rotate an already-upright canvas.
          preserveExif: false,
        },
      );

      const bitmap = await createImageBitmap(compressed);
      setPrepared({
        file: compressed,
        from: file.size,
        to: compressed.size,
        width: bitmap.width,
        height: bitmap.height,
      });
      bitmap.close();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not read that image (${err.message})`
          : "Could not read that image",
      );
      setPrepared(null);
    } finally {
      setBusy(false);
    }
  }

  async function upload(formData: FormData) {
    if (!prepared) return;
    setBusy(true);
    setError(undefined);

    formData.set("file", prepared.file);
    formData.set("role", role);

    try {
      const response = await fetch("/api/photos/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.ok) {
        setError(result.formError ?? Object.values(result.fieldErrors ?? {})[0] ?? "Upload failed");
        return;
      }
      toast.success("Photo uploaded");
      setOpen(false);
      setPrepared(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPrepared(null);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary">
          <ImagePlus size={14} />
          Upload photo
        </Button>
      </DialogTrigger>

      <DialogContent title="Upload a photo" description={`Added to the ${role} set.`}>
        <form action={upload} className="flex flex-col gap-4">
          <Field label="Image" required>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void prepare(file);
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-[12px] file:text-text"
            />
          </Field>

          {busy && !prepared && (
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <Loader2 size={13} className="animate-spin" />
              Preparing image…
            </p>
          )}

          {prepared && (
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px] text-muted">
              {formatBytes(prepared.from)} → {formatBytes(prepared.to)} ·{" "}
              {prepared.width}×{prepared.height}
              {prepared.from > prepared.to && (
                <span className="mt-0.5 block text-faint">
                  Resized to {MAX_EDGE}px, which is what the server stores anyway.
                </span>
              )}
            </p>
          )}

          <Field label="Alt text" required hint="Describes the image for screen readers and search.">
            <Input name="alt" required maxLength={320} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Caption">
              <Input name="caption" maxLength={500} />
            </Field>
            <Field label="Credit">
              <Input name="credit" maxLength={160} />
            </Field>
          </div>

          <FormError>{error}</FormError>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!prepared || busy}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Roles are fixed by the API enum. */
export const ROLES = PHOTO_ROLES;
