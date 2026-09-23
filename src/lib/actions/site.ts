"use server";

import { revalidatePath } from "next/cache";

import { updateSiteProfile } from "@/lib/api/resources";
import { toFormResult, type FormResult } from "@/lib/api/errors";
import { siteProfileUpdateSchema } from "@/lib/schemas/site";
import { requireTenantContext } from "@/lib/session/session";

/**
 * Takes the already-validated object from the client rather than FormData: the
 * profile form has four arrays of objects, which do not survive a flat FormData
 * round-trip cleanly. The payload is re-parsed here with the same schema, so
 * the client's validation is a convenience and this is the real gate.
 */
export async function updateSiteProfileAction(
  payload: unknown,
): Promise<FormResult<null>> {
  await requireTenantContext();

  const parsed = siteProfileUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  // Nothing changed — don't send an empty PUT.
  if (Object.keys(parsed.data).length === 0) {
    return { ok: true, data: null };
  }

  try {
    await updateSiteProfile(parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath("/studio/profile");
  revalidatePath("/studio");
  return { ok: true, data: null };
}
