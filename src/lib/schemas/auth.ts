import { z } from "zod";

export const signedInUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable().optional(),
    picture_url: z.string().nullable().optional(),
    is_super: z.boolean(),
    tenant_id: z.string().nullable().optional(),
  })
  .loose();

export const sessionTokenSchema = z
  .object({
    access_token: z.string(),
    expires_at: z.string(),
    user: signedInUserSchema,
    // Absent for a super admin, who is not bound to one artist.
    tenant: z
      .object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        site_key: z.string(),
      })
      .loose()
      .nullable()
      .optional(),
  })
  .loose();

export type SessionTokenResponse = z.infer<typeof sessionTokenSchema>;
