import { NextResponse, type NextRequest } from "next/server";

import { apiFetch } from "@/lib/api/client";
import { toFormResult } from "@/lib/api/errors";
import { photoReadSchema, photoUploadMetaSchema } from "@/lib/schemas/media";
import { getTenantContext } from "@/lib/session/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel caps a function request body at 4.5 MB regardless of any Next config,
 * while the backend accepts 15 MiB. The client downscales before posting here
 * (see upload-dropzone.tsx); this is the backstop for anything that slips past.
 */
const MAX_BYTES = 4_400_000;

export async function POST(request: NextRequest) {
  // This route is excluded from the proxy matcher on purpose, so it authorises
  // itself rather than appearing to inherit protection from somewhere else.
  const context = await getTenantContext();
  if (!context) {
    return NextResponse.json({ ok: false, formError: "Not signed in" }, { status: 401 });
  }

  // Route Handlers get none of the CSRF protection Server Actions have built in.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ ok: false, formError: "Bad origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, formError: "Bad origin" }, { status: 403 });
    }
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, fieldErrors: { file: "Choose an image to upload" } },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: {
          file: "That image is still too large to send. Try a smaller one.",
        },
      },
      { status: 413 },
    );
  }

  // The client is never trusted; re-validate the metadata with the same schema.
  const orderRaw = String(incoming.get("order") ?? "");
  const meta = photoUploadMetaSchema.safeParse({
    alt: String(incoming.get("alt") ?? ""),
    caption: String(incoming.get("caption") ?? ""),
    credit: String(incoming.get("credit") ?? ""),
    role: String(incoming.get("role") ?? "gallery"),
    order: orderRaw === "" ? null : Number(orderRaw),
  });
  if (!meta.success) {
    const issue = meta.error.issues[0];
    return NextResponse.json(
      { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } },
      { status: 400 },
    );
  }

  const outgoing = new FormData();
  outgoing.set("file", file, file.name || "upload.jpg");
  outgoing.set("alt", meta.data.alt);
  outgoing.set("role", meta.data.role);
  if (meta.data.caption) outgoing.set("caption", meta.data.caption);
  if (meta.data.credit) outgoing.set("credit", meta.data.credit);
  if (meta.data.order != null) outgoing.set("order", String(meta.data.order));

  try {
    const photo = await apiFetch("/photos/upload", {
      auth: "admin",
      method: "POST",
      body: outgoing,
      schema: photoReadSchema,
      timeoutMs: 60_000,
    });
    return NextResponse.json({ ok: true, data: photo });
  } catch (error) {
    const result = toFormResult(error);
    return NextResponse.json(result, { status: 400 });
  }
}
