"use server";

import { redirect } from "next/navigation";

import { listTenantsWithKey, whoAmI } from "@/lib/api/resources";
import { getSession } from "@/lib/session/session";
import { impersonationTtlMs } from "@/lib/session/config";

export type LoginState = { error?: string };

/** Flattens the timing difference between a fast reject and a full lookup. */
async function floor<T>(work: Promise<T>, ms = 400): Promise<T> {
  const [result] = await Promise.all([work, new Promise((r) => setTimeout(r, ms))]);
  return result;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const key = String(formData.get("key") ?? "").trim();
  if (key.length < 16) {
    await floor(Promise.resolve(null));
    return { error: "That key wasn't recognised." };
  }

  // Super first: it is a constant-time compare against an env value and never
  // touches the tenants table, so an artist key falls through cheaply.
  const tenants = await floor(listTenantsWithKey(key));
  if (tenants) {
    const session = await getSession();
    session.auth = "key";
    session.mode = "super";
    session.key = key;
    session.token = undefined;
    session.user = undefined;
    session.acting = undefined;
    await session.save();
    redirect("/artists");
  }

  const me = await whoAmI(key);
  if (me) {
    const session = await getSession();
    session.auth = "key";
    session.mode = "tenant";
    session.key = key;
    session.token = undefined;
    session.user = undefined;
    session.tenant = {
      id: me.id,
      slug: me.slug,
      name: me.name,
      siteKey: me.site_key,
    };
    await session.save();
    redirect("/studio");
  }

  // One message for every failure — never reveal which probe rejected the key.
  return { error: "That key wasn't recognised." };
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

/** Super admin picks an artist to work on. */
export async function actAsTenantAction(formData: FormData) {
  const session = await getSession();
  if (session.mode !== "super") redirect("/login");

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "");
  const siteKey = String(formData.get("siteKey") ?? "");
  if (!id || !slug || !siteKey) redirect("/artists");

  session.acting = { id, slug, name, siteKey, until: Date.now() + impersonationTtlMs() };
  await session.save();
  redirect("/studio");
}

export async function stopActingAction() {
  const session = await getSession();
  if (session.mode === "super") {
    session.acting = undefined;
    await session.save();
  }
  redirect("/artists");
}
