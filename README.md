# Portfolio Admin

Content administration for the multi-tenant portfolio backend at `../backend`.

One panel serves two kinds of user:

- **Super admin** — signs in with `SUPER_ADMIN_KEY`, manages the artist roster, and can edit any artist's content on their behalf.
- **Artist** — signs in with their own admin key and goes straight to their own content.

## Running it

```bash
cp .env.example .env.local     # then fill in the values
yarn install
yarn dev
```

| Variable | What it is |
|---|---|
| `API_BASE_URL` | The FastAPI backend, including `/api` — e.g. `http://127.0.0.1:8000/api` |
| `SESSION_SECRET` | At least 32 characters; seals the session cookie |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client; leave blank to hide the Google button |
| `IMPERSONATION_TTL_MINUTES` | How long a super admin may act as an artist. Default 60 |

No admin key belongs in the environment. A leaked environment exposes no access
to any artist's content.

## Signing in

**Google is the normal path.** You click one button; nothing is typed or stored.

1. The panel redirects to Google with PKCE and a sealed CSRF state.
2. Google returns a one-time code, which the panel exchanges for an ID token.
3. The panel forwards that token to `POST /api/auth/google`. **The backend
   verifies the signature itself** against Google's public keys and checks the
   audience, issuer and that the address is verified — the panel is never the
   thing vouching for an identity.
4. The `users` table decides whether that address is allowed and which artist it
   belongs to. There is no self sign-up.
5. The backend returns a short-lived token, which the panel keeps in its
   encrypted cookie and sends as `Authorization: Bearer`.

Tokens last `JWT_TTL_MINUTES` (60) and are renewed in `proxy.ts` — the only
point in a navigation where Next allows a cookie write. `SESSION_MAX_HOURS` (12)
caps how long a session can be extended, however often it is refreshed.

Manage who may sign in from the backend:

```bash
python manage_users.py add you@gmail.com --super
python manage_users.py add artist@gmail.com --tenant kaushik-bhat
python manage_users.py list
python manage_users.py disable artist@gmail.com
```

**Admin keys still work**, behind "Use an admin key instead" on the sign-in page.
That path exists for recovery (if Google or the allowlist is misconfigured) and
for scripts. It takes one field and works out which kind of key it is:
`GET /api/tenants` succeeds only for the super key, `GET /api/me` only for an
artist key.

### How each session talks to the backend

| Session | Reads | Writes |
|---|---|---|
| Google, artist | `Bearer` token | same token |
| Google, super admin | `Bearer` token + `X-Tenant-Slug` | same |
| Key, artist | their site key | their admin key |
| Key, super admin | the artist's site key | `SUPER_ADMIN_KEY` + `X-Tenant-Slug` |

A token resolves its own tenant, so a Google session never handles a site key at
all. Because every backend call happens server-side, the browser never talks to
FastAPI and no CORS configuration is needed.

### Setting up the Google client

Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID →
Web application. Add these **Authorised redirect URIs**, exactly:

```
http://localhost:3000/api/auth/google/callback
https://<your-vercel-domain>/api/auth/google/callback
```

Put the client ID and secret in the panel's `.env.local`, and the **same client
ID** in the backend's `.env` as `GOOGLE_CLIENT_ID` — the backend needs it to
check the token's audience.

`src/proxy.ts` (Next 16's replacement for `middleware.ts`) redirects
unauthenticated navigation, but it is **not** the security boundary — every
server action and data fetch independently calls `requireSession`,
`requireSuper` or `requireTenantContext`.

## Things worth knowing

**Photo uploads are resized in the browser first.** Vercel caps a function
request body at 4.5 MB and the backend accepts 15 MiB, so a phone photo cannot
transit a Vercel function untouched. The backend downscales everything to a
2560 px long edge anyway, so the client resizes to exactly that — the stored
result is identical. HEIC files are converted first, with `heic2any` loaded on
demand so it stays out of the main bundle.

**Pages cannot be created here.** The API has no `POST /api/pages`; page rows
appear when an artist is created (`about`, `classes`, `contact`, unpublished) or
via the backend's `seed.py`.

**`blocks` is schemaless.** The page editor exposes it as raw JSON, validated
locally, with a key-level diff before saving because the whole object is
replaced and a removed key cannot be recovered.

**Reordering trusts the server.** `PATCH /api/photos/{id}/order` renumbers the
whole role bucket and returns it; the grid replaces its list with that response
rather than keeping the optimistic order.

**Rotating a key locks out whoever holds the old one**, and deactivating an
artist takes their public site down immediately. Both ask for confirmation and
say so.

## Layout

```
src/
  app/
    login/              Google button, with an admin-key fallback
    artists/            super admin: roster, create, rotate, deactivate
    studio/             content editors, same tree for both modes
    api/auth/google/    OAuth start + callback (excluded from proxy.ts)
    api/photos/upload/  multipart proxy (authorises itself; excluded from proxy.ts)
  components/{ui,forms,nav}/
  lib/
    api/                server-only fetch wrapper, resources, error mapping
    schemas/            zod mirrors of every backend contract
    session/            iron-session config and narrowing
    actions/            server actions
  proxy.ts
```

`src/lib/api/client.ts` is the only place a key is attached to a request.
`src/lib/schemas/` mirrors the Pydantic models — if the backend contract changes,
change it there first and the type errors will point at the rest.

> **Next 16 differs from earlier versions** in ways that matter here (`proxy.ts`,
> async `cookies()`). See `AGENTS.md` and the bundled docs in
> `node_modules/next/dist/docs/`.
