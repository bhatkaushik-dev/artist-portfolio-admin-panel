"use server";

import { revalidatePath } from "next/cache";

import { updatePage } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { blocksJsonSchema, pageUpdateSchema } from "@/lib/schemas/page";
import { requireTenantContext } from "@/lib/session/session";

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
    intro: String(formData.get("intro") ?? ""),
    body: String(formData.get("body") ?? ""),
    blocks: rawBlocks.trim() ? JSON.parse(rawBlocks) : {},
    is_published: formData.get("is_published") === "on",
    seo_title: String(formData.get("seo_title") ?? ""),
    seo_description: String(formData.get("seo_description") ?? ""),
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
    return toFormResult(error);
  }

  revalidatePath("/studio/pages");
  revalidatePath(`/studio/pages/${slug}`);
  return { ok: true, data: null };
}
