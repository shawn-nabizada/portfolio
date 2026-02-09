# Portfolio

Dynamic portfolio built with Next.js App Router, Supabase (DB/Auth/Storage), and a protected admin panel.

## Stack

- Next.js 16
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Tailwind CSS + shadcn/ui
- Framer Motion
- Vercel (primary production target)

## Documentation

- Local development: `docs/LocalDev.md`
- Production deployment: `docs/DeploymentManual.md`

The manuals above are the source of truth for setup and operations.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env.local
```

3. Link and migrate your Supabase dev project:

```bash
npx supabase login
npx supabase link --project-ref <dev-project-ref>
npx supabase db push
```

4. Run local app:

```bash
npm run dev
```

5. Open `http://localhost:3000/en` and `http://localhost:3000/fr`.

For admin bootstrap and troubleshooting, use `docs/LocalDev.md`.

## Production Release Pipeline

Production releases are automated by GitHub Actions workflow
`.github/workflows/prod-release.yml`.

Flow on every push to `main`:

1. `npm run lint`
2. `npm run build`
3. `supabase db push` against production via `SUPABASE_DB_URL` secret
4. Trigger Vercel production Deploy Hook

Required GitHub Actions secrets:

- `SUPABASE_DB_URL`
- `VERCEL_DEPLOY_HOOK_URL`

Required Vercel production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `REVALIDATION_SECRET`

Setup details and operational runbook are in `docs/DeploymentManual.md`.

## Scripts

- `npm run dev` - start dev server
- `npm run lint` - run ESLint
- `npm run build` - build production bundle
- `npm run start` - start production server

## Notes

- Admin write access requires `app_metadata.role = "admin"`.
- Revalidation endpoint requires `x-revalidation-secret`.
- Analytics counters include portfolio views and resume downloads.
