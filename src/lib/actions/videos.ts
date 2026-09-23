"use server";

import { revalidatePath } from "next/cache";

import { createVideo, deleteVideo, syncVideo, updateVideo } from "@/lib/api/resources";
import { conflictOn, toFormResult, type FormResult } from "@/lib/api/errors";
import { extractYoutubeId, videoCreateSchema, videoUpdateSchema } from "@/lib/schemas/media";
import { requireTenantContext } from "@/lib/session/session";

const PATH = "/studio/videos";

export async function createVideoAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  // People paste watch URLs far more often than bare IDs.
  const raw = String(formData.get("youtube_id") ?? "");
  const id = extractYoutubeId(raw);
  if (!id) {
    return {
      ok: false,
      fieldErrors: { youtube_id: "Paste a YouTube link or an 11-character video ID" },
    };
  }

  const parsed = videoCreateSchema.safeParse({
    youtube_id: id,
    featured: formData.get("featured") === "on",
    sync_metadata: true,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { youtube_id: parsed.error.issues[0].message } };
  }

  try {
    await createVideo(parsed.data);
  } catch (error) {
    return conflictOn("youtube_id", toFormResult(error));
  }

  revalidatePath(PATH);
  return { ok: true, data: null };
}

export async function updateVideoAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const id = String(formData.get("id") ?? "");
  const parsed = videoUpdateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    order: Number(formData.get("order") ?? 0),
    featured: formData.get("featured") === "on",
    is_active: formData.get("is_active") !== "false",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } };
  }

  try {
    await updateVideo(id, parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath(PATH);
  return { ok: true, data: null };
}

/** Re-fetches title, duration and thumbnail from YouTube. */
export async function syncVideoAction(formData: FormData): Promise<FormResult<null>> {
  await requireTenantContext();
  const id = String(formData.get("id") ?? "");

  try {
    await syncVideo(id);
  } catch (error) {
    // 503 here means the backend has no YouTube API key configured.
    return toFormResult(error);
  }

  revalidatePath(PATH);
  return { ok: true, data: null };
}

export async function deleteVideoAction(formData: FormData) {
  await requireTenantContext();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteVideo(id);
  revalidatePath(PATH);
}
