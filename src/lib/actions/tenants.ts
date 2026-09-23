"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTenant, rotateTenantKeys, updateTenant } from "@/lib/api/resources";
import { conflictOn, toFormResult, type FormResult } from "@/lib/api/errors";
import { tenantCreateSchema, tenantUpdateSchema } from "@/lib/schemas/tenant";
import { requireSuper, setFlashCredentials } from "@/lib/session/session";

export async function createTenantAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireSuper();

  const slugInput = String(formData.get("slug") ?? "").trim();
  const parsed = tenantCreateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    ...(slugInput ? { slug: slugInput } : {}),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, fieldErrors: { [issue.path.join(".")]: issue.message } };
  }

  try {
    const tenant = await createTenant(parsed.data);
    await setFlashCredentials({
      name: tenant.name,
      slug: tenant.slug,
      siteKey: tenant.site_key,
      adminKey: tenant.admin_key,
    });
  } catch (error) {
    // 409 is always a slug collision.
    return conflictOn("slug", toFormResult(error));
  }

  revalidatePath("/artists");
  redirect("/artists/credentials");
}

export async function rotateKeysAction(formData: FormData) {
  await requireSuper();

  const id = String(formData.get("id") ?? "");
  const alsoSiteKey = formData.get("site_key") === "on";
  if (!id) redirect("/artists");

  const tenant = await rotateTenantKeys(id, alsoSiteKey);
  await setFlashCredentials({
    name: tenant.name,
    slug: tenant.slug,
    siteKey: tenant.site_key,
    adminKey: tenant.admin_key,
  });

  revalidatePath("/artists");
  redirect("/artists/credentials");
}

export async function setTenantActiveAction(formData: FormData) {
  await requireSuper();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  const parsed = tenantUpdateSchema.parse({ is_active: isActive });
  await updateTenant(id, parsed);
  revalidatePath("/artists");
}

export async function renameTenantAction(
  _prev: FormResult<null>,
  formData: FormData,
): Promise<FormResult<null>> {
  await requireSuper();

  const id = String(formData.get("id") ?? "");
  const parsed = tenantUpdateSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { name: parsed.error.issues[0].message } };
  }

  try {
    await updateTenant(id, parsed.data);
  } catch (error) {
    return toFormResult(error);
  }

  revalidatePath("/artists");
  return { ok: true, data: null };
}
