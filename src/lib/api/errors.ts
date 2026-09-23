/**
 * FastAPI reports failures two different ways, and the panel has to tell them
 * apart to put a message on the right input:
 *
 *   HTTPException  ->  { "detail": "Photo not found" }
 *   422 validation ->  { "detail": [{ "loc": ["body","awards",0,"title"], ... }] }
 *
 * `Array.isArray(detail)` is the discriminator, not the status code — the photo
 * upload route emits a string detail for 400/502 and an array for 422.
 */

export type FieldErrors = Record<string, string>;

export type FormResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; formError?: string; fieldErrors?: FieldErrors };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown on 401 so a rotated-out key lands on the login page, not a stack trace. */
export class UnauthorizedError extends ApiError {
  constructor(detail: unknown) {
    super(401, detail, "Your credentials are no longer valid");
    this.name = "UnauthorizedError";
  }
}

/** A read whose shape no longer matches the schema — a real drift signal. */
export class ContractError extends Error {
  constructor(path: string, readonly issues: unknown) {
    super(`Response from ${path} did not match the expected shape`);
    this.name = "ContractError";
  }
}

type PydanticIssue = { loc?: (string | number)[]; msg?: string; type?: string };

/**
 * `["body", "social_links", 0, "url"]` -> `"social_links.0.url"`.
 *
 * Dot paths are chosen because that is exactly React Hook Form's field-name
 * convention, so a server error can be handed to `setError` untranslated.
 */
export function locToPath(loc: (string | number)[] = []): string {
  return loc
    .filter((part, i) => !(i === 0 && (part === "body" || part === "query" || part === "path")))
    .join(".");
}

function isPydanticIssues(detail: unknown): detail is PydanticIssue[] {
  return Array.isArray(detail) && detail.every((d) => typeof d === "object" && d !== null);
}

export function toFormResult(error: unknown): FormResult<never> {
  if (error instanceof ApiError) {
    const { status, detail } = error;

    if (isPydanticIssues(detail)) {
      const fieldErrors: FieldErrors = {};
      let formError: string | undefined;

      for (const issue of detail) {
        const path = locToPath(issue.loc);
        const message = issue.msg ?? "Invalid value";

        if (issue.type === "extra_forbidden") {
          // Always a panel bug: we sent a key the API does not model.
          formError = `The panel sent a field the API does not accept (${path}). This is a bug.`;
          continue;
        }
        if (path === "") formError = message;
        else fieldErrors[path] ??= message;
      }

      return {
        ok: false,
        ...(formError ? { formError } : {}),
        ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
        ...(!formError && !Object.keys(fieldErrors).length
          ? { formError: "That could not be saved." }
          : {}),
      };
    }

    const message = typeof detail === "string" ? detail : error.message;

    if (status === 502 || status === 503) {
      return { ok: false, formError: `${message} Please try again in a moment.` };
    }
    return { ok: false, formError: message };
  }

  console.error("Unexpected error during a mutation:", error);
  return { ok: false, formError: "Something went wrong. Please try again." };
}

/** Route a 409 onto the field that actually collided. */
export function conflictOn(field: string, result: FormResult<never>): FormResult<never> {
  if (result.ok || !result.formError) return result;
  return { ok: false, fieldErrors: { [field]: result.formError } };
}
