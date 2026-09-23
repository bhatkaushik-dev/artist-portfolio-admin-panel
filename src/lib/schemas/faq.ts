import { z } from "zod";

import { boundedString, optionalString, orderField } from "./common";

export const faqReadSchema = z
  .object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    page_slug: z.string().nullable(),
    order: orderField,
    is_active: z.boolean(),
  })
  .loose();

export type Faq = z.infer<typeof faqReadSchema>;

export const faqCreateSchema = z.strictObject({
  question: boundedString(1, 320, "Question"),
  answer: z.string().trim().min(1, "Answer is required"),
  page_slug: optionalString(80).optional(),
  order: orderField.optional(),
  is_active: z.boolean().optional(),
});

export type FaqCreate = z.input<typeof faqCreateSchema>;

export const faqUpdateSchema = z.strictObject({
  question: boundedString(1, 320, "Question").optional(),
  answer: z.string().trim().min(1, "Answer is required").optional(),
  page_slug: optionalString(80).optional(),
  order: orderField.optional(),
  is_active: z.boolean().optional(),
});

export type FaqUpdate = z.input<typeof faqUpdateSchema>;
