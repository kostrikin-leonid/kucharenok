# Recipe Collection — architecture (Phase 0)

Single Next.js App Router app: UI + server actions + route handlers. PostgreSQL is the source of truth; Prisma is the only DB access layer from application code.

## 1. Folder structure (target)

```text
src/
  app/
    (marketing)/           # public: landing, legal if needed
    (auth)/                # login, register
    (app)/                 # authenticated shell: nav, household context
      dashboard/
      recipes/
      recipes/[slug]/
      recipes/new/
      recipes/[slug]/edit/
      recipes/import-ai/
      plan/
      shopping/
      family/
      settings/
    api/                   # Auth.js + webhooks + AI upload if needed
  components/
    ui/                    # shadcn
    layout/                # app chrome, nav
    recipes/               # feature-specific (added in later phases)
  features/                # colocated modules (optional): recipe/, plan/, shopping/
  lib/
    db.ts                  # Prisma singleton
    auth/                  # session, password, Auth.js config (Phase 3)
    household/             # requireMembership, scope helpers (Phase 3)
    recipes/               # scaling, slug helpers (Phase 5–6)
    nutrition/             # daily aggregation (Phase 12)
    shopping/              # merge + breakdown (Phase 11)
    ai/                    # provider abstraction (Phase 13)
  server/                  # server-only queries/mutations used by actions
  actions/                 # server actions (thin: validate → service → revalidate)
  types/                   # shared TS types (DTOs, enums mirror)
  hooks/                   # client hooks (servings slider, etc.)
  generated/prisma/        # Prisma client (gitignored)
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/
  ARCHITECTURE.md
```

## 2. App route map

| Path | Area | Purpose |
|------|------|---------|
| `/` | marketing | Landing |
| `/login` | auth | Login |
| `/register` | auth | Register + create household |
| `/dashboard` | app | Summary, quick actions |
| `/recipes` | app | List + filters |
| `/recipes/new` | app | Create recipe |
| `/recipes/import-ai` | app | AI draft → confirm → save |
| `/recipes/[slug]` | app | Detail, servings control |
| `/recipes/[slug]/edit` | app | Edit |
| `/plan` | app | Weekly plan (Mon–Sun, slots incl. `prep`) |
| `/shopping` | app | List for active plan / regenerate |
| `/family` | app | Members, invites |
| `/settings` | app | Household + goals |

API routes (Phase 3+): e.g. `/api/auth/[...nextauth]` if using Auth.js.

## 3. Prisma model plan (Phase 2)

**Enums:** `HouseholdRole` (owner, admin, member), `MemberStatus` (active, invited), `WeeklyPlanStatus` (draft, active, archived), `MealType` (breakfast, lunch, dinner, snack, prep), `RecipeSourceType` (manual, ai_text, ai_image), optional `NutritionSource`, `NutritionConfidence`, `AIImportInputType`, `AIImportStatus`.

**Core relations:**

- `User` 1—N `HouseholdMember` N—1 `Household`
- `Household` 1—N `Category`, `Tag`, `Ingredient`, `Recipe`, `WeeklyPlan`, `ShoppingList`, `RecipeUsageLog`, optional `AIImportJob`
- `Recipe` N—1 `Category?`, N—M `Tag` via `RecipeTag`, 1—N `RecipeIngredient` (optional `Ingredient` or `customName`)
- `WeeklyPlan` 1—N `WeeklyPlanItem` (each links `Recipe`, `date`, `mealType`, `servings`)
- `ShoppingList` 1—N `ShoppingListItem` (`sourceBreakdownJson`, merge key: `ingredientId` + `unit` with fallback normalized name)
- `RecipeUsageLog` on plan item add (Phase 9)

**Indexes (representative):** unique `(householdId, slug)` on recipes/categories/tags/ingredients; `(householdId, weekStartDate)` on weekly plans; `(weeklyPlanId, date, mealType)` on plan items; `(shoppingListId, ingredientId, unit)` for upserts if needed.

## 4. Roles and permissions

| Capability | owner | admin | member |
|------------|-------|-------|--------|
| CRUD recipes, categories, tags, ingredients | ✓ | ✓ | — |
| Weekly plan edit | ✓ | ✓ | — |
| Regenerate / edit shopping list rows | ✓ | ✓ | — |
| View recipes, plan, shopping | ✓ | ✓ | ✓ |
| Toggle `ShoppingListItem.isChecked` | ✓ | ✓ | ✓ |
| Optional: member add manual list item | ✓ | ✓ | optional |

Enforcement: **server-only** — every query/mutation receives `householdId` from session membership, never from the client. Zod validates input; helpers assert role before writes.

## 5. Business-logic services (library modules)

| Module | Responsibility |
|--------|----------------|
| `lib/recipes/scaling.ts` | `scaleIngredients`, rounding, to-taste rules |
| `lib/recipes/suggestions.ts` | Replacement ranking (Phase 10) |
| `lib/nutrition/aggregate.ts` | Per-slot and per-day totals vs household goals |
| `lib/shopping/generate.ts` | Plan → scaled lines → merge → `sourceBreakdownJson` |
| `lib/usage/recipe-usage.ts` | `getLastUsed`, `getUsageCount`, log on plan change |
| `lib/ai/recipe-parser.ts` | `parseRecipeFromText`, `parseRecipeFromImage`, normalize, validate |

## 6. Server vs client components

- **Server by default:** layouts, lists that only fetch data, static marketing, recipe detail shell (metadata).
- **Client:** servings stepper, interactive filters, shopping checkboxes, RHF forms, AI import tabs, toast/sonner.
- **Pattern:** RSC page loads data → passes serializable props to small client islands.

## 7. Phased implementation (reference)

| Phase | Scope |
|-------|--------|
| 0 | This document |
| 1 | Next + Tailwind + shadcn + Prisma wiring + layout |
| 2 | Full Prisma schema + first migration |
| 3 | Auth.js credentials + household on signup + guards |
| 4 | Seed data |
| 5 | Recipe CRUD |
| 6 | Scaling utilities + recipe detail UX |
| 7 | Dashboard |
| 8 | Weekly plan |
| 9 | Usage log + UI hints |
| 10 | Replacement suggestions |
| 11 | Shopping list engine + UI |
| 12 | Nutrition aggregation |
| 13 | AI import abstraction + UI |
| 14 | Family members |
| 15 | Settings |
| 16 | Polish |
| 17 | Railway + README production |
| 18 | Final review |

## 8. Product rules (non-negotiable)

- Prep slot `mealType = prep` in UI and DB; prep recipes contribute to shopping list.
- Shopping list shows merged totals **and** per-recipe breakdown.
- AI output is always draft until user saves.
- Nutrition labeled approximate; prep recipes count toward daily totals (same as other meals) unless product later excludes them — **default: include prep in daily nutrition** for consistency with shopping.
