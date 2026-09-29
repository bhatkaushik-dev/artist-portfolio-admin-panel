"use server";

import { revalidatePath } from "next/cache";

import { updatePage } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { blocksJsonSchema, pageUpdateSchema } from "@/lib/schemas/page";
import { requireTenantContext } from "@/lib/session/session";
import { refreshPublicSite } from "@/lib/public-site";

/**
 * The API validates each page's block shapes and reports e.g.
 * `blocks.chapters.0.id`. The editor has one error slot for blocks, so fold
 * those into it, keeping the path so the message says where to look.
 */
function foldBlockErrors(result: FormResult<never>): FormResult<never> {
  if (result.ok || !result.fieldErrors) return result;
  const fieldErrors: Record<string, string> = {};
  for (const [path, message] of Object.entries(result.fieldErrors)) {
    if (path.startsWith("blocks.")) {
      fieldErrors.blocks ??= `${path.slice("blocks.".length)}: ${message}`;
    } else {
      fieldErrors[path] = message;
    }
  }
  return { ...result, fieldErrors };
}

export async function updatePageAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { ok: false, formError: "Missing page slug" };

  const rawBlocks = String(formData.get("blocks") ?? "");
  const blocksCheck = blocksJsonSchema.safeParse(rawBlocks);
  if (!blocksCheck.success) {
    return { ok: false, fieldErrors: { blocks: blocksCheck.error.issues[0].message } };
  }

  const keywords = String(formData.get("seo_keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const parsed = pageUpdateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    eyebrow: String(formData.get("eyebrow") ?? ""),
    heading: String(formData.get("heading") ?? ""),
    highlight: String(formData.get("highlight") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    header_photo_id: String(formData.get("header_photo_id") ?? ""),
    body: String(formData.get("body") ?? ""),
    blocks: rawBlocks.trim() ? JSON.parse(rawBlocks) : {},
    is_published: formData.get("is_published") === "on",
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
    og_title: String(formData.get("og_title") ?? ""),
    og_description: String(formData.get("og_description") ?? ""),
    seo_keywords: keywords,
    canonical_path: String(formData.get("canonical_path") ?? ""),
    og_image_url: String(formData.get("og_image_url") ?? ""),
    noindex: formData.get("noindex") === "on",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } };
  }

  try {
    await updatePage(slug, parsed.data);
  } catch (error) {
    return foldBlockErrors(toFormResult(error));
  }

  revalidatePath("/studio/pages");
  revalidatePath(`/studio/pages/${slug}`);
  await refreshPublicSite();
  return { ok: true, data: null };
}
