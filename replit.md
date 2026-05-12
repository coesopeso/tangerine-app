# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `node scripts/check-supabase.mjs` — verify Supabase connectivity (read + write probe) for Augusto's project
- Required env: `DATABASE_URL` — Postgres connection string

### Supabase secrets (Augusto's database)

The real app code lives in the GitHub repo `coesopeso/tangerine-app` and talks
to a Supabase project hosted at `hltqsophjzpofgvhgpjj.supabase.co`. The three
credentials needed to reach it are stored in Replit Secrets — never commit
them:

- `VITE_SUPABASE_URL` — project URL, exposed to the browser bundle
- `VITE_SUPABASE_ANON_KEY` — public "anon" key, used by the browser app
- `SUPABASE_SERVICE_ROLE_KEY` — server-side key with full DB access (Edge
  Functions, migrations, admin scripts only — never ship to the browser)

After populating those secrets, run `node scripts/check-supabase.mjs` to
confirm connectivity. The script lists all tables in the `public` schema with
row counts, then performs an insert/read/delete probe against `categorie` and
cleans up after itself. Confirmed on 2026-05-12: read + write OK; the 6 tables
present (`fiscal_config`, `categorie`, `uscite`, `entrate`,
`obiettivi_secchielli`, `secchielli`) hold only test data and the user has
authorized dropping them when the v5.2 schema migration runs.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
