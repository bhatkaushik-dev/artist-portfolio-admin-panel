"use server";

import { revalidatePath } from "next/cache";

import { updateEnquiry } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { enquiryStatusUpdateSchema } from "@/lib/schemas/enquiry";
import { requireTenantContext } from "@/lib/session/session";

export async function updateEnquiryAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  const parsed = enquiryStatusUpdateSchema.safeParse({
    status: String(formData.get("status") ?? ""),
    // The API only writes this when non-null, so an empty box leaves the
    // existing note alone rather than clearing it.
    ...(notes ? { admin_notes: notes } : {}),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { status: parsed.error.issues[0].message } };
  }

  try {
    await updateEnquiry(id, parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath("/studio/enquiries");
  revalidatePath("/studio");
  return { ok: true, data: null };
}
