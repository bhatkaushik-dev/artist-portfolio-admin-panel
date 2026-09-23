"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { Badge, Field, FormError, NativeSelect, Textarea } from "@/components/ui/base";
import { SubmitButton } from "@/components/ui/controls";
import { updateEnquiryAction } from "@/lib/actions/enquiries";
import type { FormResult } from "@/lib/api/errors";
import { ENQUIRY_STATUSES, type Enquiry, type EnquiryStatus } from "@/lib/schemas/enquiry";

const TONE: Record<EnquiryStatus, "accent" | "success" | "neutral" | "danger"> = {
  pending: "accent",
  contacted: "success",
  closed: "neutral",
  spam: "danger",
};

export function EnquiryRow({ enquiry, receivedAt }: { enquiry: Enquiry; receivedAt: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormResult<null>, FormData>(updateEnquiryAction, {
    ok: true,
    data: null,
  });

  useEffect(() => {
    if (state.ok && state.data === null) toast.success("Enquiry updated");
  }, [state]);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium">{enquiry.name}</span>
            <Badge tone={TONE[enquiry.status]}>{enquiry.status}</Badge>
            <Badge>{enquiry.source}</Badge>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {enquiry.subject ? `${enquiry.subject} — ` : ""}
            {enquiry.message}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-faint">{receivedAt}</span>
      </button>

      {open && (
        <div className="border-t border-border bg-bg/40 px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-4 text-[13px]">
            <a
              href={`mailto:${enquiry.email}`}
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
            >
              <Mail size={13} />
              {enquiry.email}
            </a>
            {enquiry.phone && (
              <a
                href={`tel:${enquiry.phone}`}
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                <Phone size={13} />
                {enquiry.phone}
              </a>
            )}
          </div>

          <p className="mb-4 whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed">
            {enquiry.message}
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={enquiry.id} />

            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <Field label="Status">
                <NativeSelect name="status" defaultValue={enquiry.status}>
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                label="Internal notes"
                hint="Only visible here. Leaving this blank keeps any existing note."
              >
                <Textarea name="admin_notes" rows={2} defaultValue={enquiry.admin_notes ?? ""} />
              </Field>
            </div>

            {!state.ok && <FormError>{state.formError}</FormError>}

            <div className="flex justify-end">
              <SubmitButton>Update</SubmitButton>
            </div>
          </form>

          <p className="mt-3 text-[11px] text-faint">
            Received {receivedAt}
            {enquiry.ip_address ? ` · ${enquiry.ip_address}` : ""}
            {enquiry.notified ? " · notification sent" : ""}
          </p>
        </div>
      )}
    </li>
  );
}
