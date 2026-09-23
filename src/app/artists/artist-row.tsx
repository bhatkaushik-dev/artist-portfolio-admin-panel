"use client";

import { useTransition } from "react";
import { KeyRound, PencilLine, Power } from "lucide-react";

import { Badge, Button } from "@/components/ui/base";
import { ConfirmButton } from "@/components/ui/overlays";
import { actAsTenantAction } from "@/lib/actions/auth";
import { rotateKeysAction, setTenantActiveAction } from "@/lib/actions/tenants";
import type { Tenant } from "@/lib/schemas/tenant";

export function ArtistRow({ tenant, created }: { tenant: Tenant; created: string }) {
  const [pending, startTransition] = useTransition();

  const submit = (action: (fd: FormData) => Promise<unknown>, fields: Record<string, string>) => {
    const formData = new FormData();
    for (const [k, v] of Object.entries(fields)) formData.set(k, v);
    startTransition(() => {
      void action(formData);
    });
  };

  return (
    <tr className="text-[13px] transition-colors hover:bg-surface-hover">
      <td className="px-5 py-3 font-medium">{tenant.name}</td>
      <td className="px-5 py-3 font-mono text-[12px] text-muted">{tenant.slug}</td>
      <td className="px-5 py-3 text-muted">{created}</td>
      <td className="px-5 py-3">
        <Badge tone={tenant.is_active ? "success" : "neutral"}>
          {tenant.is_active ? "active" : "disabled"}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="primary"
            disabled={!tenant.is_active || pending}
            onClick={() =>
              submit(actAsTenantAction, {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                siteKey: tenant.site_key,
              })
            }
          >
            <PencilLine size={13} />
            Edit content
          </Button>

          <ConfirmButton
            title="Issue a new admin key?"
            confirmLabel="Rotate key"
            pending={pending}
            body={
              <>
                <p>
                  <strong className="text-text">{tenant.name}</strong> will get a brand new
                  admin key, and the current one stops working immediately.
                </p>
                <p className="mt-2">
                  If the artist has their key saved anywhere, they will be locked out
                  until you send them the new one. The site key is left alone, so their
                  public site keeps working.
                </p>
              </>
            }
            onConfirm={() => submit(rotateKeysAction, { id: tenant.id })}
          >
            <Button size="sm" variant="ghost" title="Rotate admin key">
              <KeyRound size={13} />
            </Button>
          </ConfirmButton>

          <ConfirmButton
            title={tenant.is_active ? "Disable this artist?" : "Re-enable this artist?"}
            confirmLabel={tenant.is_active ? "Disable" : "Enable"}
            pending={pending}
            body={
              tenant.is_active ? (
                <p>
                  Every key <strong className="text-text">{tenant.name}</strong> holds stops
                  working at once, so their public site goes down until you re-enable them.
                  No content is deleted.
                </p>
              ) : (
                <p>
                  <strong className="text-text">{tenant.name}</strong>&apos;s keys start
                  working again and their public site comes back.
                </p>
              )
            }
            onConfirm={() =>
              submit(setTenantActiveAction, {
                id: tenant.id,
                is_active: String(!tenant.is_active),
              })
            }
          >
            <Button size="sm" variant="ghost" title="Enable or disable">
              <Power size={13} />
            </Button>
          </ConfirmButton>
        </div>
      </td>
    </tr>
  );
}
