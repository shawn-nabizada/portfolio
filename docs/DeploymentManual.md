# Deployment Manual

This guide covers production deployment of the portfolio to Vercel with Supabase Cloud.

## Table of Contents

- [1. Target Architecture](#1-target-architecture)
- [2. Prerequisites](#2-prerequisites)
- [3. Prepare Supabase Production Project](#3-prepare-supabase-production-project)
- [4. Configure Vercel Project (First-Time Setup)](#4-configure-vercel-project-first-time-setup)
- [5. Bootstrap Production Admin User](#5-bootstrap-production-admin-user)
- [6. Configure GitHub Repository Secrets](#6-configure-github-repository-secrets)
- [7. Automated Main-Branch Release Flow](#7-automated-main-branch-release-flow)
- [8. Deploy and Release Operations](#8-deploy-and-release-operations)
- [9. Post-Deployment Verification Checklist](#9-post-deployment-verification-checklist)
- [10. Revalidation Operations](#10-revalidation-operations)
- [11. Security and Operations](#11-security-and-operations)
- [12. Rollback Strategy](#12-rollback-strategy)
- [13. Optional: Self-Hosted App Runtime (Docker Compose)](#13-optional-self-hosted-app-runtime-docker-compose)

## 1. Target Architecture

- Frontend/API: Vercel-hosted Next.js app
- Backend services: Supabase Cloud (Postgres, Auth, Storage)
- Admin authz: `app_metadata.role = "admin"`
- Release automation: GitHub Actions workflow `.github/workflows/prod-release.yml`

Release order is enforced as:

1. `main` push
2. preflight checks (`lint`, `build`)
3. Supabase migration push (`db push`)
4. Vercel production deploy hook trigger

## 2. Prerequisites

- Access to production Supabase project
- Access to Vercel account/project
- Access to GitHub repository settings (for secrets)
- Ability to merge/push to `main`

## 3. Prepare Supabase Production Project

1. Create a Supabase Cloud project in your target region.
2. Copy credentials from Supabase Dashboard -> API:
   - Project URL
   - anon key
   - service_role key
3. Copy the direct Postgres connection string from Supabase (for CI migration job).
4. Apply baseline migration at least once:

```bash
npx supabase db push --db-url "<prod-db-url>" --yes
```

Expected migration set includes:

- `supabase/migrations/20260207000000_initial_schema.sql`

## 4. Configure Vercel Project (First-Time Setup)

1. Import/connect repository in Vercel.
2. Framework preset: Next.js.
3. Add production environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (for example `https://portfolio.example.com`)
   - `NEXT_PUBLIC_DEFAULT_LOCALE` (for example `en`)
   - `REVALIDATION_SECRET` (strong random secret)
   - `ADMIN_LOGIN_COMMAND` (secret single token, no spaces)
4. Run one manual production deploy from Vercel dashboard and verify it is healthy.
5. Create a Production Deploy Hook in Vercel project settings.
6. Disable automatic Git production deploys for `main` in Vercel so deployment is controlled by the migrate-first workflow.

## 5. Bootstrap Production Admin User

Use Supabase Dashboard (recommended):

1. Authentication -> Users -> Add user.
2. Confirm the email.
3. Set `app_metadata.role` to `admin`.
4. Ensure row exists in `public.profiles` for that user.

If needed, upsert profile from SQL editor (replace email):

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
where u.email = 'admin@example.com'
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

## 6. Configure GitHub Repository Secrets

In GitHub -> repository -> Settings -> Secrets and variables -> Actions, add:

- `SUPABASE_DB_URL`
  - Production Postgres connection string used by migration job.
- `VERCEL_DEPLOY_HOOK_URL`
  - Production deploy hook URL from Vercel.
- `NEXT_PUBLIC_SUPABASE_URL`
  - Public Supabase URL used during CI preflight build.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Public anon key used during CI preflight build.
- `NEXT_PUBLIC_SITE_URL`
  - Public production domain used during CI preflight build.
- `ADMIN_LOGIN_COMMAND`
  - Secret terminal admin login command used during CI preflight build.

Keep application runtime secrets in Vercel env settings, not GitHub Actions.

## 7. Automated Main-Branch Release Flow

Workflow file: `.github/workflows/prod-release.yml`

Trigger:

- `push` to `main`
- `workflow_dispatch` (manual run)

Execution order:

1. `preflight`: `npm ci`, `npm run lint`, `npm run build`
2. `migrate`: `npx supabase db push --db-url "$SUPABASE_DB_URL" --yes`
3. `deploy`: `POST $VERCEL_DEPLOY_HOOK_URL`

If migration fails, deploy is blocked.

## 8. Deploy and Release Operations

### Standard release

1. Merge approved changes into `main`.
2. Open GitHub Actions and monitor `Production Release` workflow.
3. Confirm `preflight`, `migrate`, and `deploy` all succeed.
4. Confirm Vercel deployment status is healthy.

### Manual re-run

Use one of:

- GitHub Actions -> failed workflow -> Re-run jobs
- GitHub Actions -> `Run workflow` (manual dispatch)

### Troubleshooting

- Migration failure: fix SQL or DB credentials and rerun workflow.
- Deploy hook failure: verify `VERCEL_DEPLOY_HOOK_URL` secret and rerun deploy job/workflow.

## 9. Post-Deployment Verification Checklist

1. Public pages load:
   - `/<locale>` for `en` and `fr`
2. Admin access works via terminal login:
   - Use the secret command configured in `ADMIN_LOGIN_COMMAND`
   - Unauthenticated/non-admin access to `/<locale>/admin/*` shows localized `403` page
3. Admin CRUD operations succeed:
   - skills, projects, experience, education, hobbies, testimonials, messages, settings
4. Resume upload/download works.
5. Revalidation endpoint works.
6. Dashboard counters render and update.

## 10. Revalidation Operations

Endpoint:

- `POST /api/revalidate`
- Header required: `x-revalidation-secret`

Example:

```bash
curl -X POST "https://your-domain.com/api/revalidate" \
  -H "x-revalidation-secret: $REVALIDATION_SECRET"
```

Expected successful response:

```json
{ "revalidated": true }
```

## 11. Security and Operations

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Restrict admin access to users with `app_metadata.role = "admin"`.
- Rotate `REVALIDATION_SECRET` periodically.
- Rotate Supabase keys if you suspect leakage.
- Rotate GitHub Actions secrets (`SUPABASE_DB_URL`, `VERCEL_DEPLOY_HOOK_URL`) if compromised.
- Use separate Supabase projects for dev and prod.

## 12. Rollback Strategy

### App rollback (Vercel)

1. Open previous successful deployment in Vercel.
2. Redeploy that version.

### Database rollback

Schema rollback is migration-specific. Prefer forward-fix migration unless emergency.

For data incidents:

- Use Supabase backup/PITR features available on your plan.
- Restore into a safe environment first, then promote.

## 13. Optional: Self-Hosted App Runtime (Docker Compose)

`docker-compose.prod.yml` runs the Next.js app in a container while using Supabase Cloud.

Run:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Required host env vars:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REVALIDATION_SECRET`
- `ADMIN_LOGIN_COMMAND`

Health check:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```
