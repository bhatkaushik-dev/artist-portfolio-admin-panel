"use server";

import { revalidatePath } from "next/cache";

import { createFaq, deleteFaq, updateFaq } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { faqCreateSchema, faqUpdateSchema } from "@/lib/schemas/faq";
import { requireTenantContext } from "@/lib/session/session";

const PATH = "/studio/faqs";

function readForm(formData: FormData) {
  return {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    page_slug: String(formData.get("page_slug") ?? ""),
    order: Number(formData.get("order") ?? 0),
    is_active: formData.get("is_active") !== "false",
  };
}

function firstIssue(error: { issues: { path: PropertyKey[]; message: string }[] }): FormResult<null> {
  const issue = error.issues[0];
  return { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } };
}

export async function createFaqAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const parsed = faqCreateSchema.safeParse(readForm(formData));
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await createFaq(parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath(PATH);
  return { ok: true, data: null };
}

export async function updateFaqAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const id = String(formData.get("id") ?? "");
  const parsed = faqUpdateSchema.safeParse(readForm(formData));
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await updateFaq(id, parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath(PATH);
  return { ok: true, data: null };
}

export async function deleteFaqAction(formData: FormData) {
  await requireTenantContext();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteFaq(id);
  revalidatePath(PATH);
}
