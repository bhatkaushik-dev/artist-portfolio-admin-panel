import { z } from "zod";

import { isoDateTime } from "./common";

export const ENQUIRY_STATUSES = ["pending", "contacted", "closed", "spam"] as const;
export const enquiryStatusSchema = z.enum(ENQUIRY_STATUSES);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

export const enquiryReadSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    subject: z.string().nullable(),
    message: z.string(),
    // Free-form on the wire (max 64 chars), NOT an enum — do not constrain it.
    source: z.string(),
    status: enquiryStatusSchema,
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    referer: z.string().nullable(),
    notified: z.boolean(),
    notified_at: z.string().nullable(),
    admin_notes: z.string().nullable(),
    created_at: isoDateTime,
  })
  .loose();

export type Enquiry = z.infer<typeof enquiryReadSchema>;

export const enquiryListSchema = z
  .object({
    items: z.array(enquiryReadSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .loose();

export type EnquiryList = z.infer<typeof enquiryListSchema>;

/**
 * `status` is required by the API. Sending `admin_notes: null` does *not* clear
 * the note server-side — it is only written when non-null.
 */
export const enquiryStatusUpdateSchema = z.strictObject({
  status: enquiryStatusSchema,
  admin_notes: z.string().nullable().optional(),
});

export type EnquiryStatusUpdate = z.input<typeof enquiryStatusUpdateSchema>;
