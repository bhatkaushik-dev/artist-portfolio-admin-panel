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
    venue: string;
    street_address: string;
    locality: string;
    area: string;
    city: string;
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
  // Numbers are edited as strings so an empty box can mean "not set".
  training: {
    start_age: string;
    years: string;
    teacher: string;
    father: string;
    grade: string;
    grading_body: string;
  };
  awards: { title: string; awarded_by: string; year: string }[];
  opening_hours: { days: string[]; opens: string; closes: string }[];
  school: {
    name: string;
    alternate_name: string;
    description: string;
    image_url: string;
    offer_catalog_name: string;
    offerings: string[];
  };
  default_image_url: string;
  image_credit_text: string;
  image_copyright_notice: string;
  image_license_url: string;
  image_acquire_license_url: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? String(v) : "");

function toFormValues(p: SiteProfile): FormValues {
  const address = (p.address ?? {}) as Record<string, unknown>;
  const training = (p.training ?? {}) as Record<string, unknown>;
  const school = (p.school ?? {}) as Record<string, unknown>;
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
      venue: str(address.venue),
      street_address: str(address.street_address),
      locality: str(address.locality),
      area: str(address.area),
      city: str(address.city),
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
    training: {
      start_age: num(training.start_age),
      years: num(training.years),
      teacher: str(training.teacher),
      father: str(training.father),
      grade: str(training.grade),
      grading_body: str(training.grading_body),
    },
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
    school: {
      name: str(school.name),
      alternate_name: str(school.alternate_name),
      description: str(school.description),
      image_url: str(school.image_url),
      offer_catalog_name: str(school.offer_catalog_name),
      offerings: Array.isArray(school.offerings) ? (school.offerings as string[]) : [],
    },
    default_image_url: p.default_image_url ?? "",
    image_credit_text: p.image_credit_text ?? "",
    image_copyright_notice: p.image_copyright_notice ?? "",
    image_license_url: p.image_license_url ?? "",
    image_acquire_license_url: p.image_acquire_license_url ?? "",
  };
}

/** Empty strings must become null, or the API rejects them (`""` is not an email). */
const nullable = (v: string) => (v.trim() === "" ? null : v.trim());
const nullableInt = (v: string) => (v.trim() === "" ? null : Number(v));

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
      venue: nullable(v.address.venue),
      street_address: nullable(v.address.street_address),
      locality: nullable(v.address.locality),
      area: nullable(v.address.area),
      city: nullable(v.address.city),
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
    training: {
      start_age: nullableInt(v.training.start_age),
      years: nullableInt(v.training.years),
      teacher: nullable(v.training.teacher),
      father: nullable(v.training.father),
      grade: nullable(v.training.grade),
      grading_body: nullable(v.training.grading_body),
    },
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
    school: {
      name: nullable(v.school.name),
      alternate_name: nullable(v.school.alternate_name),
      description: nullable(v.school.description),
      image_url: nullable(v.school.image_url),
      offer_catalog_name: nullable(v.school.offer_catalog_name),
      offerings: v.school.offerings,
    },
    default_image_url: nullable(v.default_image_url),
    image_credit_text: nullable(v.image_credit_text),
    image_copyright_notice: nullable(v.image_copyright_notice),
    image_license_url: nullable(v.image_license_url),
    image_acquire_license_url: nullable(v.image_acquire_license_url),
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
          <TabsTrigger value="business">Classes</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
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

            <p className="-mb-1 text-[12px] text-faint">
              Write the address exactly as the venue publishes it. The site, its
              structured data and directory listings all repeat it character for
              character.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Venue"
                hint="Building or school the classes are held in"
                error={errors.address?.venue?.message}
                className="sm:col-span-2"
              >
                <Input {...register("address.venue")} />
              </Field>
              <Field label="Street" error={errors.address?.street_address?.message}>
                <Input {...register("address.street_address")} />
              </Field>
              <Field
                label="Locality"
                hint="Neighbourhood, e.g. JP Nagar 1st Phase"
                error={errors.address?.locality?.message}
              >
                <Input {...register("address.locality")} />
              </Field>
              <Field
                label="Area (short)"
                hint="Used in running copy, e.g. JP Nagar"
                error={errors.address?.area?.message}
              >
                <Input {...register("address.area")} />
              </Field>
              <Field label="City" error={errors.address?.city?.message}>
                <Input {...register("address.city")} />
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
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[13px] font-medium text-text">Training</p>
                <p className="mt-0.5 text-[12px] text-faint">
                  The credentials shown in the home hero, the about page facts and the
                  classes intro — edit once here and every page follows.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Years of training" error={errors.training?.years?.message}>
                  <Input type="number" min={0} {...register("training.years")} />
                </Field>
                <Field label="Started at age" error={errors.training?.start_age?.message}>
                  <Input type="number" min={1} {...register("training.start_age")} />
                </Field>
                <Field label="Guru" error={errors.training?.teacher?.message}>
                  <Input {...register("training.teacher")} />
                </Field>
                <Field label="First teacher" hint="e.g. a parent" error={errors.training?.father?.message}>
                  <Input {...register("training.father")} />
                </Field>
                <Field label="Grade" hint="e.g. B-High" error={errors.training?.grade?.message}>
                  <Input {...register("training.grade")} />
                </Field>
                <Field
                  label="Graded by"
                  hint="e.g. All India Radio"
                  error={errors.training?.grading_body?.message}
                >
                  <Input {...register("training.grading_body")} />
                </Field>
              </div>
            </div>

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
            <div>
              <p className="text-[13px] font-medium text-text">Teaching practice</p>
              <p className="mt-0.5 text-[12px] text-faint">
                The school search engines list for local queries — its own name,
                description and courses.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School name" error={errors.school?.name?.message}>
                <Input {...register("school.name")} />
              </Field>
              <Field label="Also known as" error={errors.school?.alternate_name?.message}>
                <Input {...register("school.alternate_name")} />
              </Field>
            </div>
            <Field label="Description" error={errors.school?.description?.message}>
              <Textarea rows={3} {...register("school.description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Image URL" error={errors.school?.image_url?.message}>
                <Input {...register("school.image_url")} />
              </Field>
              <Field
                label="Course list name"
                hint="e.g. Tabla courses"
                error={errors.school?.offer_catalog_name?.message}
              >
                <Input {...register("school.offer_catalog_name")} />
              </Field>
            </div>
            <Controller
              control={control}
              name="school.offerings"
              render={({ field }) => (
                <Field label="Courses offered" hint="One entry per course">
                  <StringList value={field.value} onChange={field.onChange} />
                </Field>
              )}
            />
          </Card>

          <Card className="mt-4 flex flex-col gap-5 p-5">
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
                                ? "rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent transition-colors hover:border-accent/60 md:px-2 md:py-1 md:text-[11px]"
                                : "rounded-md border border-border bg-surface px-3 py-2 text-[12px] text-muted transition-colors hover:border-border-strong hover:text-text md:px-2 md:py-1 md:text-[11px]"
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

        <TabsContent value="images">
          <Card className="flex flex-col gap-4 p-5">
            <Field
              label="Profile image URL"
              hint="The artist's photo in search results and structured data."
              error={errors.default_image_url?.message}
            >
              <Input {...register("default_image_url")} />
            </Field>
            <div>
              <p className="text-[13px] font-medium text-text">Photo rights</p>
              <p className="mt-0.5 text-[12px] text-faint">
                Attached to every gallery photo so it can carry the licensable badge in
                image search. Links may be site paths, e.g. /gallery#licence.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Credit" hint="Who took the photos" error={errors.image_credit_text?.message}>
                <Input {...register("image_credit_text")} />
              </Field>
              <Field label="Copyright notice" error={errors.image_copyright_notice?.message}>
                <Input {...register("image_copyright_notice")} />
              </Field>
              <Field
                label="Licence terms link"
                hint="Where the usage terms are written"
                error={errors.image_license_url?.message}
              >
                <Input {...register("image_license_url")} />
              </Field>
              <Field
                label="Licensing enquiries link"
                hint="Where someone asks to use a photo"
                error={errors.image_acquire_license_url?.message}
              >
                <Input {...register("image_acquire_license_url")} />
              </Field>
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
