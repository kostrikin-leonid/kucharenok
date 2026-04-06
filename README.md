# Recipe Collection (Kucharenok)

Family meal-planning app with a **Ukrainian UI**: shared recipes, **weekly plan** (including a **prep** slot), **shopping list** with per-dish breakdown, and **approximate** nutrition by recipe and by day. The root URL `/` redirects to `/login` (guests) or `/dashboard` (signed in); there is no public marketing site.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Auth.js (NextAuth v5 beta) with credentials, React Hook Form–ready forms, Zod.

Architecture overview: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local or [Railway PostgreSQL](https://docs.railway.com/databases/postgresql))

## Local setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET in .env (openssl rand -base64 32)
docker compose up -d   # optional local Postgres
npm run db:migrate     # applies prisma/migrations (or db:push for quick dev sync)
npm run db:seed        # demo household, recipes, week plan, shopping list
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you land on the login screen.

### Recipe photos & HEIC

Recipe images are **user upload** or **external URL** only (no AI image generation). Uploads are handled by `POST /api/upload/recipe-image` (authenticated). Supported types: JPEG, PNG, WebP, GIF, HEIC/HEIF. HEIC/HEIF are converted server-side to **WebP** using `sharp` and `heic-convert` (max **10 MB**). Files are stored under `public/uploads/recipes/` (ignored by git except `.gitkeep`).

### Demo accounts (after seed)

| Email | Password | Role |
|--------|----------|------|
| `owner@demo.local` | `password123` | Owner |
| `member1@demo.local` | `password123` | Member |
| `member2@demo.local` | `password123` | Member |

The seed creates a **weekly plan for the current week** (Monday start) and a shopping list derived from it.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes (prod) | NextAuth secret |
| `AUTH_URL` | Production | Public site URL for callbacks, e.g. `https://your-app.up.railway.app` |
| `OPENAI_API_KEY` | No | **AI import** normalizes recipes into **Ukrainian** (text + optional photo OCR via vision). Without it, a local heuristic parser runs instead. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. For **image** import, use a **vision-capable** model (same variable; see `src/lib/ai/config.ts`). |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma Client |
| `npm run db:migrate` | Dev migrations |
| `npm run db:migrate:deploy` | Production migrations (CI / Railway) |
| `npm run db:push` | Push schema (dev only, no migration files) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed script |

## Railway deploy

1. Add **PostgreSQL** and copy `DATABASE_URL` into the web service.
2. Set `AUTH_SECRET` and `AUTH_URL` to the public HTTPS URL of the app.
3. **Build:** `npm run build`
4. **Start:** run `npx prisma migrate deploy` before or as part of release, then `npm run start` (e.g. release command: `npx prisma migrate deploy && npm run start`).

## Roles (MVP)

- **Owner / admin:** recipes, week plan, shopping list edits, regenerate list, settings, invites.
- **Member:** view recipes, plan, shopping list; **check/uncheck** items; add manual shopping lines.

## What’s intentionally out of scope (MVP)

Store discounts, pantry inventory, medical-grade nutrition, family comments/approvals, push notifications, additional locales beyond Ukrainian.

## Implementation status

Phases **0–18** are implemented in code: schema, auth + household isolation, seed, recipe CRUD + scaling, dashboard, weekly plan + usage sync, replacement suggestions, shopping generation + breakdown, nutrition aggregation, AI import (text + image stub / OpenAI text), family & settings, lint/build hygiene.
