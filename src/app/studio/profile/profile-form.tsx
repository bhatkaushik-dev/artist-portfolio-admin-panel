"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Card, Field, FormError, Input, Textarea } from "@/components/ui/base";
import {
  SubmitButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/controls";
import { Repeatable } from "@/components/forms/repeatable";
import { StringList } from "@/components/forms/string-list";
import { updateSiteProfileAction } from "@/lib/actions/site";
import type { SiteProfile } from "@/lib/schemas/site";
import { diffPayload } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type FormValues = {
  name: string;
  short_name: string;
  role: string;
  tagline: string;
  locale: string;
  email: string;
  phone: string;
  phone_display: string;
  website_url: string;
  address: {
    street_address: string;
    locality: string;
    region: string;
    postal_code: string;
    country: string;
  };
  bio_summary: string;
  price_range: string;
  area_served: string[];
  alternate_names: string[];
  knows_about: string[];
  knows_language: string[];
  currencies_accepted: string[];
  social_links: { platform: string; url: string; handle: string }[];
  training: { institution: string; teacher: string; gharana: string; years: string }[];
  awards: { title: string; awarded_by: string; year: string }[];
  opening_hours: { days: string[]; opens: string; closes: string }[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

function toFormValues(p: SiteProfile): FormValues {
  const address = (p.address ?? {}) as Record<string, unknown>;
  return {
    name: p.name ?? "",
    short_name: p.short_name ?? "",
    role: p.role ?? "",
    tagline: p.tagline ?? "",
    locale: p.locale ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    phone_display: p.phone_display ?? "",
    website_url: p.website_url ?? "",
    address: {
      street_address: str(address.street_address),
      locality: str(address.locality),
      region: str(address.region),
      postal_code: str(address.postal_code),
      country: str(address.country) || "IN",
    },
    bio_summary: p.bio_summary ?? "",
    price_range: p.price_range ?? "",
    area_served: p.area_served ?? [],
    alternate_names: p.alternate_names ?? [],
    knows_about: p.knows_about ?? [],
    knows_language: p.knows_language ?? [],
    currencies_accepted: p.currencies_accepted ?? [],
    social_links: (p.social_links ?? []).map((s) => {
      const o = s as Record<string, unknown>;
      return { platform: str(o.platform), url: str(o.url), handle: str(o.handle) };
    }),
    training: (p.training ?? []).map((t) => {
      const o = t as Record<string, unknown>;
      return {
        institution: str(o.institution),
        teacher: str(o.teacher),
        gharana: str(o.gharana),
        years: str(o.years),
      };
    }),
    awards: (p.awards ?? []).map((a) => {
      const o = a as Record<string, unknown>;
      return {
        title: str(o.title),
        awarded_by: str(o.awarded_by),
        year: o.year == null ? "" : String(o.year),
      };
    }),
    opening_hours: (p.opening_hours ?? []).map((h) => {
      const o = h as Record<string, unknown>;
      return {
        days: Array.isArray(o.days) ? (o.days as string[]) : [],
        opens: str(o.opens),
        closes: str(o.closes),
      };
    }),
  };
}

/** Empty strings must become null, or the API rejects them (`""` is not an email). */
const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

function toPayload(v: FormValues) {
  return {
    name: v.name.trim(),
    short_name: nullable(v.short_name),
    role: v.role.trim(),
    tagline: nullable(v.tagline),
    locale: nullable(v.locale),
    email: nullable(v.email),
    phone: nullable(v.phone),
    phone_display: nullable(v.phone_display),
    website_url: nullable(v.website_url),
    address: {
      street_address: nullable(v.address.street_address),
      locality: nullable(v.address.locality),
      region: nullable(v.address.region),
      postal_code: nullable(v.address.postal_code),
      country: v.address.country.trim() || "IN",
    },
    bio_summary: nullable(v.bio_summary),
    price_range: nullable(v.price_range),
    area_served: v.area_served,
    alternate_names: v.alternate_names,
    knows_about: v.knows_about,
    knows_language: v.knows_language,
    currencies_accepted: v.currencies_accepted,
    social_links: v.social_links
      .filter((s) => s.platform.trim() && s.url.trim())
      .map((s) => ({ platform: s.platform.trim(), url: s.url.trim(), handle: nullable(s.handle) })),
    training: v.training.map((t) => ({
      institution: nullable(t.institution),
      teacher: nullable(t.teacher),
      gharana: nullable(t.gharana),
      years: nullable(t.years),
    })),
    awards: v.awards
      .filter((a) => a.title.trim())
      .map((a) => ({
        title: a.title.trim(),
        awarded_by: nullable(a.awarded_by),
        year: a.year.trim() ? Number(a.year) : null,
      })),
    opening_hours: v.opening_hours.map((h) => ({
      days: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
  };
}

export function ProfileForm({ profile }: { profile: SiteProfile }) {
  const defaults = toFormValues(profile);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm<FormValues>({ defaultValues: defaults });
  const { control, register, handleSubmit, setError, formState, watch, setValue, reset } = form;
  const errors = formState.errors;

  const social = useFieldArray({ control, name: "social_links" });
  const training = useFieldArray({ control, name: "training" });
  const awards = useFieldArray({ control, name: "awards" });
  const hours = useFieldArray({ control, name: "opening_hours" });

  // This form is long; losing it to an accidental navigation would sting.
  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formState.isDirty]);

  const onSubmit = handleSubmit((values) => {
    setFormError(undefined);
    // Only send what changed: the API applies `exclude_unset`, and an unknown
    // or unchanged key is at best noise and at worst a 422.
    const payload = diffPayload(toPayload(defaults), toPayload(values));

    startTransition(async () => {
      const result = await updateSiteProfileAction(payload);
      if (result.ok) {
        toast.success("Profile saved");
        reset(values);
        return;
      }
      setFormError(result.formError);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        // Dot paths from the API line up with RHF's field names exactly.
        setError(path as keyof FormValues, { message });
      }
      if (result.formError) toast.error(result.formError);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Tabs defaultValue="identity">
        <TabsList className="mb-4">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card className="flex flex-col gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name?.message}>
                <Input {...register("name")} aria-invalid={Boolean(errors.name)} />
              </Field>
              <Field label="Short name" error={errors.short_name?.message}>
                <Input {...register("short_name")} />
              </Field>
              <Field label="Role" required hint="e.g. Tabla artist" error={errors.role?.message}>
                <Input {...register("role")} aria-invalid={Boolean(errors.role)} />
              </Field>
              <Field label="Locale" hint="e.g. en_IN" error={errors.locale?.message}>
                <Input {...register("locale")} />
              </Field>
            </div>
            <Field label="Tagline" error={errors.tagline?.message}>
              <Input {...register("tagline")} />
            </Field>
            <Field label="Short bio" hint="Used in structured data and previews.">
              <Textarea rows={4} {...register("bio_summary")} />
            </Field>
            <Controller
              control={control}
              name="alternate_names"
              render={({ field }) => (
                <Field label="Also known as">
                  <StringList value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="flex flex-col gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} aria-invalid={Boolean(errors.email)} />
              </Field>
              <Field
                label="Phone"
                hint="International format, e.g. +919876543210"
                error={errors.phone?.message}
              >
                <Input {...register("phone")} aria-invalid={Boolean(errors.phone)} />
              </Field>
              <Field label="Phone (display)" error={errors.phone_display?.message}>
                <Input {...register("phone_display")} />
              </Field>
              <Field label="Website" error={errors.website_url?.message}>
                <Input {...register("website_url")} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street" error={errors.address?.street_address?.message}>
                <Input {...register("address.street_address")} />
              </Field>
              <Field label="City" error={errors.address?.locality?.message}>
                <Input {...register("address.locality")} />
              </Field>
              <Field label="State" error={errors.address?.region?.message}>
                <Input {...register("address.region")} />
              </Field>
              <Field label="Postal code" error={errors.address?.postal_code?.message}>
                <Input {...register("address.postal_code")} />
              </Field>
              <Field label="Country" hint="Two-letter code" error={errors.address?.country?.message}>
                <Input {...register("address.country")} />
              </Field>
            </div>

            <Controller
              control={control}
              name="area_served"
              render={({ field }) => (
                <Field label="Areas served" hint="Cities or neighbourhoods">
                  <StringList value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />

            <Repeatable
              label="Social links"
              rows={social.fields}
              onAdd={() => social.append({ platform: "", url: "", handle: "" })}
              onRemove={social.remove}
              addLabel="Add link"
            >
              {(_row, i) => (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Platform" {...register(`social_links.${i}.platform`)} />
                  <Input placeholder="URL" {...register(`social_links.${i}.url`)} />
                  <Input placeholder="Handle" {...register(`social_links.${i}.handle`)} />
                </div>
              )}
            </Repeatable>
          </Card>
        </TabsContent>

        <TabsContent value="background">
          <Card className="flex flex-col gap-5 p-5">
            <Repeatable
              label="Training"
              hint="Where and with whom they studied."
              rows={training.fields}
              onAdd={() => training.append({ institution: "", teacher: "", gharana: "", years: "" })}
              onRemove={training.remove}
              addLabel="Add entry"
            >
              {(_row, i) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Institution" {...register(`training.${i}.institution`)} />
                  <Input placeholder="Teacher" {...register(`training.${i}.teacher`)} />
                  <Input placeholder="Gharana" {...register(`training.${i}.gharana`)} />
                  <Input placeholder="Years, e.g. 2005–2012" {...register(`training.${i}.years`)} />
                </div>
              )}
            </Repeatable>

            <Repeatable
              label="Awards"
              rows={awards.fields}
              onAdd={() => awards.append({ title: "", awarded_by: "", year: "" })}
              onRemove={awards.remove}
              addLabel="Add award"
            >
              {(_row, i) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px]">
                  <Input placeholder="Title" {...register(`awards.${i}.title`)} />
                  <Input placeholder="Awarded by" {...register(`awards.${i}.awarded_by`)} />
                  <Input placeholder="Year" type="number" {...register(`awards.${i}.year`)} />
                </div>
              )}
            </Repeatable>

            <Controller
              control={control}
              name="knows_about"
              render={({ field }) => (
                <Field label="Specialities">
                  <StringList value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="knows_language"
              render={({ field }) => (
                <Field label="Languages">
                  <StringList value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card className="flex flex-col gap-5 p-5">
            <Repeatable
              label="Opening hours"
              hint="A slot cannot cross midnight — split overnight hours into two entries."
              rows={hours.fields}
              onAdd={() => hours.append({ days: [], opens: "09:00", closes: "18:00" })}
              onRemove={hours.remove}
              addLabel="Add hours"
            >
              {(_row, i) => {
                const selected = watch(`opening_hours.${i}.days`) ?? [];
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      {DAYS.map((day) => {
                        const on = selected.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setValue(
                                `opening_hours.${i}.days`,
                                on ? selected.filter((d) => d !== day) : [...selected, day],
                                { shouldDirty: true },
                              )
                            }
                            className={
                              on
                                ? "rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] text-accent"
                                : "rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted hover:text-text"
                            }
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="time" className="w-32" {...register(`opening_hours.${i}.opens`)} />
                      <span className="text-[12px] text-faint">to</span>
                      <Input type="time" className="w-32" {...register(`opening_hours.${i}.closes`)} />
                    </div>
                    {errors.opening_hours?.[i] && (
                      <p className="text-[12px] text-danger">
                        {errors.opening_hours[i]?.closes?.message ??
                          errors.opening_hours[i]?.days?.message ??
                          "Check these hours"}
                      </p>
                    )}
                  </div>
                );
              }}
            </Repeatable>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price range" hint="e.g. ₹₹" error={errors.price_range?.message}>
                <Input {...register("price_range")} />
              </Field>
              <Controller
                control={control}
                name="currencies_accepted"
                render={({ field }) => (
                  <Field label="Currencies accepted">
                    <StringList value={field.value} onChange={field.onChange} placeholder="INR" />
                  </Field>
                )}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <FormError>{formError}</FormError>

      <div className="flex items-center justify-end gap-3">
        {formState.isDirty && (
          <span className="text-[12px] text-muted">Unsaved changes</span>
        )}
        <SubmitButton disabled={pending || !formState.isDirty}>
          {pending ? "Saving…" : "Save profile"}
        </SubmitButton>
      </div>
    </form>
  );
}
