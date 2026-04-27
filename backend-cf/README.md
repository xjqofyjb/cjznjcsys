# Cloudflare Backend

This workspace contains the rebuilt backend for the research data platform using Cloudflare-native services:

- `Workers` for API routing
- `R2` for file storage
- `D1` for metadata, upload sessions, and admin actions
- `Queues` for async asset processing

## Goals

- Remote multipart file uploads
- Admin monitoring dashboard data
- Admin actions such as archive, visibility updates, and session tracking
- A cleaner control plane for the frontend to integrate with

## Structure

- `src/index.ts`: Worker entry
- `src/routes/`: API route modules
- `src/services/`: upload, admin, and auth business logic
- `src/lib/`: helpers, types, and database utilities
- `migrations/`: D1 schema

## Setup

1. Create a D1 database, R2 bucket, and Queue in Cloudflare.
2. Replace placeholder IDs in [wrangler.toml](D:\research-data-platform\backend-cf\wrangler.toml).
3. Install dependencies:

```bash
npm install
```

4. Apply D1 migrations:

```bash
wrangler d1 execute research-data-platform --local --file migrations/0001_initial.sql
wrangler d1 execute research-data-platform --local --file migrations/0002_auth_upgrade.sql
wrangler d1 execute research-data-platform --remote --file migrations/0001_initial.sql
wrangler d1 execute research-data-platform --remote --file migrations/0002_auth_upgrade.sql
```

5. Start local development:

```bash
npm run dev
# or:
wrangler dev --local
```

## Local vs remote

- `wrangler dev --local` uses local D1 and local R2 state under `.wrangler/state/`
- `wrangler d1 execute ... --local` updates your local development database
- `wrangler d1 execute ... --remote` updates your real Cloudflare D1 database
- Use the same distinction for validation so you do not accidentally test local code against an empty local database after only migrating remote

## Suggested workflow

1. Run local migration
2. Start `wrangler dev --local`
3. Bootstrap the first admin password with `POST /api/v1/auth/bootstrap`
4. Validate auth, upload sessions, and admin APIs locally
5. Run remote migration
6. Deploy with `wrangler deploy --env production`

## Current API coverage

- `GET /healthz`
- `POST /api/v1/auth/bootstrap`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/sessions`
- `POST /api/v1/uploads/sessions`
- `GET /api/v1/uploads/sessions`
- `GET /api/v1/uploads/sessions/:sessionId`
- `GET /api/v1/uploads/assets`
- `PUT /api/v1/uploads/sessions/:sessionId/parts/:partNumber`
- `POST /api/v1/uploads/sessions/:sessionId/complete`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/uploads`
- `GET /api/v1/admin/assets`
- `GET /api/v1/admin/assets/:assetId`
- `PATCH /api/v1/admin/assets/:assetId`
- `POST /api/v1/admin/assets/:assetId/archive`
- `POST /api/v1/admin/assets/:assetId/delete`
- `POST /api/v1/admin/assets/:assetId/restore`
- `GET /api/v1/admin/actions`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/:userId`

## Notes

- Authentication now uses password-based login plus server-side session storage in D1.
- The first admin account is still bootstrapped intentionally, so the initial password should be configured through `POST /api/v1/auth/bootstrap` after applying `0002_auth_upgrade.sql`.
- `ADMIN_EMAIL_DOMAIN` is a policy hint for the next step, not the login identifier itself.
- The next step after this stage is to either layer Cloudflare Access over `/admin` or replace bootstrap login with your preferred identity provider.
- If terminal output shows garbled Chinese text on Windows, verify your shell encoding before assuming database corruption.
