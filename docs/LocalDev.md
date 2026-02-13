# Local Development Manual

This guide explains how to run the portfolio locally with a Supabase Cloud dev project.

## Table of Contents

- [1. Development Model](#1-development-model)
- [2. Prerequisites](#2-prerequisites)
- [3. Install Dependencies](#3-install-dependencies)
- [4. Configure Environment Variables](#4-configure-environment-variables)
- [5. Link Supabase CLI to Dev Project](#5-link-supabase-cli-to-dev-project)
- [6. Bootstrap Admin Account](#6-bootstrap-admin-account)
- [7. Run the App](#7-run-the-app)
- [8. Local Smoke Test Checklist](#8-local-smoke-test-checklist)
- [9. Day-to-Day Development Workflow](#9-day-to-day-development-workflow)
- [10. Troubleshooting](#10-troubleshooting)
- [11. Optional: Fully Local Supabase Containers](#11-optional-fully-local-supabase-containers)

## 1. Development Model

This repository uses:

- Next.js app running locally (`npm run dev`)
- Supabase Cloud dev project for database, auth, and storage

This is the recommended local setup. It avoids local Auth JWT/signing issues that can happen with fully local Supabase containers.

## 2. Prerequisites

- Node.js 20+ (LTS recommended)
- npm (comes with Node)
- Supabase account
- A dedicated Supabase Cloud **dev** project

Verify tools:

```bash
node -v
npm -v
npx supabase --version
```

## 3. Install Dependencies

From `portfolio/`:

```bash
npm install
```

## 4. Configure Environment Variables

Create local env file:

```bash
cp .env.example .env.local
```

Fill `.env.local` with values from your Supabase dev project.

Security requirement before continuing:

- Rotate the example admin credentials from `.env.example` immediately.
- Do **not** keep `admin@portfolio.dev` or `admin123`.
- Use a unique email and a strong password before creating any admin user.

| Variable | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard -> Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard -> API -> anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard -> API -> service_role key |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Yes | Usually `en` |
| `REVALIDATION_SECRET` | Yes | Any strong random secret |
| `ADMIN_EMAIL` | Yes | Admin login email for bootstrap |
| `ADMIN_PASSWORD` | Yes | Admin login password for bootstrap |
| `ADMIN_FULL_NAME` | Yes | Admin profile display name |
| `ADMIN_LOGIN_COMMAND` | Yes | Secret terminal command (single token, no spaces; escape `$` as `\\$` in `.env.local`) |

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` on the client.
- Keep `.env.local` out of source control.
- Never reuse the example admin credentials in any shared, remote, or internet-reachable environment.

## 5. Link Supabase CLI to Dev Project

Authenticate and link this repo:

```bash
npx supabase login
npx supabase link --project-ref <your-dev-project-ref>
```

Apply migrations to the linked dev database:

```bash
npx supabase db push
```

Current migration files:

- `supabase/migrations/20260207000000_initial_schema.sql`

## 6. Bootstrap Admin Account

Use one of the two methods below.

Mandatory security check:

- Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` are rotated (not example defaults) before creating the admin user.

### Method A (Recommended): Supabase Dashboard

1. Open Supabase Dashboard -> Authentication -> Users.
2. Create user with your rotated `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Set `app_metadata.role` to `admin`.
4. Confirm the user email (or create as confirmed).
5. Ensure a matching row exists in `public.profiles`.

If `public.profiles` row is missing, create one in SQL Editor:

```sql
insert into public.profiles (
  id,
  full_name,
  headline_en,
  headline_fr,
  bio_en,
  bio_fr,
  location
)
select
  u.id,
  'Admin',
  'Full-Stack Developer',
  'Developpeur Full-Stack',
  'Passionate full-stack developer specializing in modern web technologies.',
  'Developpeur full-stack passionne, specialise dans les technologies web modernes.',
  'Montreal, QC'
from auth.users u
where u.email = '<your-admin-email>'
on conflict (id) do update
set
  full_name = excluded.full_name,
  headline_en = excluded.headline_en,
  headline_fr = excluded.headline_fr,
  bio_en = excluded.bio_en,
  bio_fr = excluded.bio_fr,
  location = excluded.location,
  updated_at = now();
```

### Method B (Optional): Script

```bash
npx tsx scripts/seed-admin.ts
```

Use this only when your env keys are correct and your Supabase project accepts Admin API operations with the configured service role key.

## 7. Run the App

```bash
npm run dev
```

Open:

- Public page: `http://localhost:3000/en`
- French page: `http://localhost:3000/fr`
- Admin area (requires terminal login): `http://localhost:3000/en/admin/dashboard`
- Terminal admin auth command: value from `ADMIN_LOGIN_COMMAND` in `.env.local`

## 8. Local Smoke Test Checklist

1. Public page loads in EN and FR.
2. Terminal opens and accepts commands (`help`, `ls`, `cd`, `cat`).
3. Terminal admin login works with the command configured in `ADMIN_LOGIN_COMMAND`.
4. Admin can create/update content.
5. Public page reflects updates.

## 9. Day-to-Day Development Workflow

1. Pull latest changes.
2. Install deps if lockfile changed: `npm install`.
3. Apply schema changes: `npx supabase db push`.
4. Run app: `npm run dev`.
5. Build-check before push: `npm run build`.

## 10. Troubleshooting

### Invalid JWT / signing method errors

If you see errors like `signing method HS256 is invalid`, confirm:

- `SUPABASE_SERVICE_ROLE_KEY` belongs to the same project as `NEXT_PUBLIC_SUPABASE_URL`
- You are using Supabase Cloud project keys, not local CLI runtime keys

### Admin can log in but gets blocked from admin APIs

Admin API routes require `app_metadata.role = "admin"`.

Check user metadata in Supabase Auth and re-login after updating metadata.

### `npx supabase db push` applies unexpected migrations

Verify the linked project with:

```bash
npx supabase status
```

Re-link if needed:

```bash
npx supabase link --project-ref <correct-dev-ref>
```

### Public page does not refresh after admin updates

Check:

- `REVALIDATION_SECRET` is set correctly
- Revalidation endpoint is reachable

Manual trigger:

```bash
curl -X POST "http://localhost:3000/api/revalidate" \
  -H "x-revalidation-secret: $REVALIDATION_SECRET"
```

## 11. Optional: Fully Local Supabase Containers

This repo still includes Supabase CLI config (`supabase/config.toml`) for local container workflows, but the recommended day-to-day setup is Supabase Cloud dev.
