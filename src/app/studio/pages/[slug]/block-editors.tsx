"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Field, Input, NativeSelect, Textarea } from "@/components/ui/base";
import { Repeatable } from "@/components/forms/repeatable";
import { StringList } from "@/components/forms/string-list";
import type { Photo } from "@/lib/schemas/media";
import { PhotoPicker } from "./photo-picker";

/**
 * Form views over `page.blocks` for the routes the portfolio renders. Each one
 * reads the blocks object and hands back a new one; the page editor keeps the
 * JSON tab in step, so anything these forms don't model is still reachable
 * there — and is carried through untouched, because every edit spreads the
 * existing object rather than rebuilding it.
 *
 * The shapes mirror app/schemas/page_blocks.py in the backend.
 */

type Obj = Record<string, unknown>;
type EditorProps = { value: Obj; onChange: (next: Obj) => void; photos: Photo[] };

const obj = (v: unknown): Obj =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === "string" ? v : "");
const photoId = (v: unknown) => (typeof v === "string" && v ? v : null);
/** Optional fields are stored as null when cleared, never as "". */
const orNull = (v: string) => (v.trim() === "" ? null : v);

const RICH_TEXT_HINT = "**bold** and [link text](/path) are supported.";

/** Only the portfolio's own routes have a form; other slugs get the JSON tab. */
export const BLOCK_EDITORS: Partial<Record<string, (props: EditorProps) => React.ReactNode>> = {
  home: HomeBlocks,
  about: AboutBlocks,
  performances: PerformancesBlocks,
  gallery: GalleryBlocks,
  classes: ClassesBlocks,
  contact: ContactBlocks,
};

// --- Building blocks --------------------------------------------------------

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-[13px] font-semibold text-text">{title}</h3>
        {hint && <p className="mt-0.5 text-[12px] text-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
  rows,
  required,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (next: string | null) => void;
  hint?: string;
  /** Renders a textarea. */
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const handle = (v: string) => onChange(required ? v : orNull(v));
  return (
    <Field label={label} hint={hint} required={required}>
      {rows ? (
        <Textarea
          rows={rows}
          value={text(value)}
          placeholder={placeholder}
          onChange={(e) => handle(e.target.value)}
        />
      ) : (
        <Input value={text(value)} placeholder={placeholder} onChange={(e) => handle(e.target.value)} />
      )}
    </Field>
  );
}

/** Eyebrow, heading, and the trailing words set in gold. */
function HeadingFields({
  value,
  onChange,
  multilineHeading,
}: {
  value: Obj;
  onChange: (next: Obj) => void;
  multilineHeading?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TextField
        label="Eyebrow"
        value={value.eyebrow}
        onChange={(v) => onChange({ ...value, eyebrow: v })}
      />
      <TextField
        label="Heading"
        required
        rows={multilineHeading ? 2 : undefined}
        hint={multilineHeading ? "Line breaks are kept." : undefined}
        value={value.heading}
        onChange={(v) => onChange({ ...value, heading: v })}
      />
      <TextField
        label="Highlight"
        hint="Trailing words, set in gold"
        value={value.highlight}
        onChange={(v) => onChange({ ...value, highlight: v })}
      />
    </div>
  );
}

/** `{label, href}`. With `optional`, clearing both removes the link. */
function LinkFields({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: unknown;
  onChange: (next: Obj | null) => void;
  optional?: boolean;
}) {
  const link = obj(value);
  const update = (patch: Obj) => {
    const next = { ...link, ...patch };
    onChange(optional && !text(next.label) && !text(next.href) ? null : next);
  };
  return (
    <Field label={label} hint={optional ? "Leave both empty for no button." : undefined}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Button text"
          value={text(link.label)}
          onChange={(e) => update({ label: e.target.value })}
        />
        <Input
          placeholder="/contact"
          value={text(link.href)}
          onChange={(e) => update({ href: e.target.value })}
        />
      </div>
    </Field>
  );
}

function PhotoField({
  label,
  hint,
  value,
  onChange,
  photos,
}: {
  label: string;
  hint?: string;
  value: unknown;
  onChange: (next: string | null) => void;
  photos: Photo[];
}) {
  return (
    <Field label={label} hint={hint}>
      <PhotoPicker photos={photos} value={photoId(value)} onChange={onChange} />
    </Field>
  );
}

function MoveButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  const cls =
    "rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex gap-0.5">
      <button type="button" className={cls} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move up">
        <ArrowUp size={13} />
      </button>
      <button
        type="button"
        className={cls}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label="Move down"
      >
        <ArrowDown size={13} />
      </button>
    </div>
  );
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Index keys are fine here: rows are controlled, so values never go stale. */
const rowIds = (items: unknown[]) => items.map((_, i) => ({ id: String(i) }));

// --- home -------------------------------------------------------------------

function HomeBlocks({ value, onChange, photos }: EditorProps) {
  const hero = obj(value.hero);
  const band = obj(value.about_band);
  const setBand = (next: Obj) => onChange({ ...value, about_band: next });

  return (
    <>
      <Section
        title="Hero"
        hint="The name comes from the Header tab (heading + highlight), the photo from its header photo."
      >
        <TextField
          label="Tagline"
          hint="Under the name, e.g. Tabla Artist | Percussionist"
          value={hero.tagline}
          onChange={(v) => onChange({ ...value, hero: { ...hero, tagline: v } })}
        />
      </Section>

      <Section title="About band" hint="The biography teaser under the hero.">
        <HeadingFields value={band} onChange={setBand} multilineHeading />
        <TextField
          label="Text"
          rows={3}
          hint={RICH_TEXT_HINT}
          value={band.body}
          onChange={(v) => setBand({ ...band, body: v })}
        />
        <LinkFields label="Link" optional value={band.link} onChange={(v) => setBand({ ...band, link: v })} />
        <PhotoField
          label="Photo"
          photos={photos}
          value={band.photo_id}
          onChange={(v) => setBand({ ...band, photo_id: v })}
        />
      </Section>
    </>
  );
}

// --- about ------------------------------------------------------------------

function AboutBlocks({ value, onChange, photos }: EditorProps) {
  const chapters = list(value.chapters).map(obj);
  const setChapters = (next: Obj[]) => onChange({ ...value, chapters: next });
  const setChapter = (i: number, patch: Obj) =>
    setChapters(chapters.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <>
      <Section
        title="Story"
        hint="The biography in reading order. A chapter with a photo becomes a two-column row, alternating sides; one without is a single text column."
      >
        <Repeatable
          label="Chapters"
          rows={rowIds(chapters)}
          addLabel="Add chapter"
          onAdd={() =>
            setChapters([
              ...chapters,
              { id: `chapter-${chapters.length + 1}`, title: null, photo_id: null, caption: null, paragraphs: [""] },
            ])
          }
          onRemove={(i) => setChapters(chapters.filter((_, j) => j !== i))}
        >
          {(_row, i) => {
            const chapter = chapters[i];
            const paragraphs = list(chapter.paragraphs).map(text);
            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-muted">Chapter {i + 1}</span>
                  <MoveButtons index={i} count={chapters.length} onMove={(a, b) => setChapters(move(chapters, a, b))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Title"
                    hint="Leave empty for a closing passage"
                    value={chapter.title}
                    onChange={(v) => setChapter(i, { title: v })}
                  />
                  <TextField
                    label="Anchor id"
                    required
                    hint="lowercase-with-dashes"
                    value={chapter.id}
                    onChange={(v) => setChapter(i, { id: v })}
                  />
                </div>
                <PhotoField
                  label="Photo"
                  photos={photos}
                  value={chapter.photo_id}
                  onChange={(v) => setChapter(i, { photo_id: v })}
                />
                {photoId(chapter.photo_id) && (
                  <TextField
                    label="Caption"
                    hint="Defaults to the photo's own caption"
                    value={chapter.caption}
                    onChange={(v) => setChapter(i, { caption: v })}
                  />
                )}
                <Field label="Paragraphs" hint={RICH_TEXT_HINT}>
                  <div className="flex flex-col gap-2">
                    {paragraphs.map((paragraph, p) => (
                      <div key={p} className="flex items-start gap-2">
                        <Textarea
                          rows={4}
                          value={paragraph}
                          onChange={(e) =>
                            setChapter(i, {
                              paragraphs: paragraphs.map((x, q) => (q === p ? e.target.value : x)),
                            })
                          }
                        />
                        <button
                          type="button"
                          disabled={paragraphs.length === 1}
                          onClick={() => setChapter(i, { paragraphs: paragraphs.filter((_, q) => q !== p) })}
                          className="mt-1 shrink-0 rounded-md px-2 py-1 text-[12px] text-faint hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setChapter(i, { paragraphs: [...paragraphs, ""] })}
                      className="self-start text-[12px] font-medium text-accent hover:underline"
                    >
                      + Add paragraph
                    </button>
                  </div>
                </Field>
              </div>
            );
          }}
        </Repeatable>
      </Section>

      <Section title="Print" hint="The printed bio hides the story photos and carries this portrait instead.">
        <PhotoField
          label="Print portrait"
          photos={photos}
          value={value.print_photo_id}
          onChange={(v) => onChange({ ...value, print_photo_id: v })}
        />
      </Section>
    </>
  );
}

// --- classes ----------------------------------------------------------------

/** lucide-react names the site maps to icons. */
const FORMAT_ICONS = ["map-pin", "monitor", "users", "calendar", "clock", "music", "graduation-cap"];

function ClassesBlocks({ value, onChange, photos }: EditorProps) {
  const formats = list(value.formats).map(obj);
  const setFormats = (next: Obj[]) => onChange({ ...value, formats: next });
  const setFormat = (i: number, patch: Obj) =>
    setFormats(formats.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const cta = obj(value.cta);
  const setCta = (next: Obj) => onChange({ ...value, cta: next });

  return (
    <>
      <Section title="Formats" hint="The strip under the header: where and how lessons run.">
        <Repeatable
          label="Formats"
          rows={rowIds(formats)}
          addLabel="Add format"
          onAdd={() => setFormats([...formats, { icon: "map-pin", title: "", body: "" }])}
          onRemove={(i) => setFormats(formats.filter((_, j) => j !== i))}
        >
          {(_row, i) => (
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label="Icon">
                <NativeSelect
                  value={text(formats[i].icon)}
                  onChange={(e) => setFormat(i, { icon: e.target.value || null })}
                >
                  <option value="">None</option>
                  {FORMAT_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <TextField label="Title" required value={formats[i].title} onChange={(v) => setFormat(i, { title: v })} />
              <div className="sm:col-span-2">
                <TextField label="Text" required rows={2} value={formats[i].body} onChange={(v) => setFormat(i, { body: v })} />
              </div>
            </div>
          )}
        </Repeatable>
      </Section>

      <Section title="FAQ heading" hint="The questions themselves are managed under FAQs.">
        <HeadingFields value={obj(value.faq_heading)} onChange={(v) => onChange({ ...value, faq_heading: v })} />
      </Section>

      <Section title="Closing call to action">
        <HeadingFields value={cta} onChange={setCta} />
        <TextField label="Text" required rows={2} value={cta.body} onChange={(v) => setCta({ ...cta, body: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <LinkFields label="Main button" value={cta.primary} onChange={(v) => setCta({ ...cta, primary: v })} />
          <LinkFields
            label="Second button"
            optional
            value={cta.secondary}
            onChange={(v) => setCta({ ...cta, secondary: v })}
          />
        </div>
        <PhotoField
          label="Photo"
          hint="Optional — with a photo the band splits, text on the left."
          photos={photos}
          value={cta.photo_id}
          onChange={(v) => setCta({ ...cta, photo_id: v })}
        />
      </Section>
    </>
  );
}

// --- contact ----------------------------------------------------------------

function ContactBlocks({ value, onChange }: EditorProps) {
  const location = obj(value.location);
  const types = list(value.enquiry_types).map(text);
  return (
    <>
      <Section title="Enquiry form" hint="The options under “Regarding”, in order.">
        <StringList value={types} onChange={(next) => onChange({ ...value, enquiry_types: next })} />
      </Section>
      <Section title="Location" hint="The address itself comes from Profile → Contact.">
        <TextField
          label="Heading"
          required
          value={location.heading}
          onChange={(v) => onChange({ ...value, location: { ...location, heading: v } })}
        />
        <TextField
          label="Note"
          rows={2}
          value={location.note}
          onChange={(v) => onChange({ ...value, location: { ...location, note: v } })}
        />
      </Section>
    </>
  );
}

// --- performances -----------------------------------------------------------

function PerformancesBlocks({ value, onChange }: EditorProps) {
  const closing = obj(value.closing);
  return (
    <>
      <Section title="Header button" hint="Links to the YouTube channel from Profile → Contact.">
        <TextField
          label="Button text"
          value={value.channel_button_label}
          onChange={(v) => onChange({ ...value, channel_button_label: v })}
        />
      </Section>
      <Section title="After the videos">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Heading"
            required
            value={closing.heading}
            onChange={(v) => onChange({ ...value, closing: { ...closing, heading: v } })}
          />
          <TextField
            label="Button text"
            required
            value={closing.button_label}
            onChange={(v) => onChange({ ...value, closing: { ...closing, button_label: v } })}
          />
        </div>
      </Section>
    </>
  );
}

// --- gallery ----------------------------------------------------------------

function GalleryBlocks({ value, onChange }: EditorProps) {
  return (
    <Section title="Gallery" hint="The photos are the Gallery set, in its order.">
      <TextField
        label="Note beside the count"
        placeholder="Free to download"
        value={value.count_note}
        onChange={(v) => onChange({ ...value, count_note: v })}
      />
      <TextField
        label="Licence note"
        rows={3}
        hint={`Shown under the photos and linked from each photo's licence data. ${RICH_TEXT_HINT}`}
        value={value.licence_note}
        onChange={(v) => onChange({ ...value, licence_note: v })}
      />
    </Section>
  );
}
