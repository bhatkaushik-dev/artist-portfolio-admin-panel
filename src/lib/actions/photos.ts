"use server";

import { revalidatePath } from "next/cache";

import { deletePhoto, reorderPhoto, updatePhoto } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { photoReadSchema, photoUpdateSchema, type Photo } from "@/lib/schemas/media";
import { requireTenantContext } from "@/lib/session/session";

const PATH = "/studio/gallery";

export async function updatePhotoAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const id = String(formData.get("id") ?? "");
  const parsed = photoUpdateSchema.safeParse({
    alt: String(formData.get("alt") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    credit: String(formData.get("credit") ?? ""),
    role: String(formData.get("role") ?? "gallery"),
    is_active: formData.get("is_active") !== "false",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } };
  }

  try {
    await updatePhoto(id, parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  // A role change moves the photo between buckets without renumbering either,
  // so both lists have to be re-read.
  revalidatePath(PATH);
  return { ok: true, data: null };
}

/**
 * The API renumbers the whole role bucket and returns it. That response is the
 * authority — the caller replaces its list with this rather than merging.
 */
export async function reorderPhotoAction(
  id: string,
  order: number,
): Promise<FormResult<Photo[]>> {
  await requireTenantContext();

  try {
    const bucket = await reorderPhoto(id, order);
    revalidatePath(PATH);
    return { ok: true, data: photoReadSchema.array().parse(bucket) };
  } catch (error) {
    return toFormResult(error);
  }
}

export async function deletePhotoAction(formData: FormData) {
  await requireTenantContext();
  const id = String(formData.get("id") ?? "");
  if (id) await deletePhoto(id);
  revalidatePath(PATH);
}
