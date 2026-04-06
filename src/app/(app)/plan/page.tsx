import Link from "next/link";

import { auth } from "@/auth";
import { PlanItemActions } from "@/components/plan/plan-item-actions";
import { PlanSlotPicker } from "@/components/plan/plan-slot-picker";
import { PlanToolbar } from "@/components/plan/plan-toolbar";
import { PlanWeekNav } from "@/components/plan/plan-week-nav";
import { SaveWeekButton } from "@/components/plan/save-week-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HouseholdRole, MealType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { MEAL_LABEL_UK } from "@/lib/i18n/meals";
import {
  calculateDailyNutritionFromItems,
  compareNutritionToGoals,
} from "@/lib/nutrition/aggregate";
import { getUsageCount } from "@/lib/usage/recipe-usage";
import {
  isSameUtcDateOnly,
  parsePlanWeekOffset,
  weekMondayFromOffset,
  weeklyPlanItemDate,
} from "@/lib/week";
import { recipeImageSrc } from "@/lib/images/recipe-image-src";
import { cn } from "@/lib/utils";
import { loadOrCreateWeeklyPlan } from "@/server/weekly-plan";
import type { PlanRecipePickerItem } from "@/types/plan-recipe-picker";

const MEALS_MAIN: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

type PlanRichRecipe = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  baseServings: number;
  kcalPerServing: number | null;
  isPreparation: boolean;
  isFavorite: boolean;
  category: { slug: string; name: string } | null;
  recipeTags: { tag: { slug: string; name: string } }[];
};

function toPickerItem(r: PlanRichRecipe): PlanRecipePickerItem {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    imageUrl: r.imageUrl,
    baseServings: r.baseServings,
    kcalPerServing: r.kcalPerServing,
    isPreparation: r.isPreparation,
    isFavorite: r.isFavorite,
    categorySlug: r.category?.slug ?? null,
    categoryName: r.category?.name ?? null,
    tagSlugs: r.recipeTags.map((rt) => rt.tag.slug),
  };
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const sp = await searchParams;
  const weekOffset = parsePlanWeekOffset(sp.w);
  const weekAnchor = weekMondayFromOffset(weekOffset);

  const session = await auth();
  const householdId = session?.user?.householdId;
  if (!householdId) {
    return (
      <p className="text-sm text-muted-foreground">{uk.plan.noHousehold}</p>
    );
  }
  const role = session?.user?.role as HouseholdRole | undefined;
  const canManage = role ? isManager(role) : false;

  const plan = await loadOrCreateWeeklyPlan(
    householdId,
    session.user!.id,
    weekAnchor,
  );
  const [household, categories, tags, basePlanRecipes] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    prisma.category.findMany({
      where: { householdId },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.tag.findMany({
      where: { householdId },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    prisma.recipe.findMany({
      where: {
        householdId,
        isArchived: false,
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        baseServings: true,
        kcalPerServing: true,
        isPreparation: true,
        isFavorite: true,
        category: { select: { slug: true, name: true } },
        recipeTags: {
          include: { tag: { select: { slug: true, name: true } } },
        },
      },
    }),
  ]);

  const byId = new Map<string, PlanRichRecipe>();
  for (const r of basePlanRecipes) byId.set(r.id, r);
  for (const it of plan.items) {
    if (!byId.has(it.recipeId)) {
      const r = it.recipe;
      byId.set(it.recipeId, {
        id: r.id,
        title: r.title,
        slug: r.slug,
        imageUrl: r.imageUrl,
        baseServings: r.baseServings,
        kcalPerServing: r.kcalPerServing,
        isPreparation: r.isPreparation,
        isFavorite: r.isFavorite,
        category: r.category
          ? { slug: r.category.slug, name: r.category.name }
          : null,
        recipeTags: r.recipeTags.map((rt) => ({
          tag: { slug: rt.tag.slug, name: rt.tag.name },
        })),
      });
    }
  }
  const pickerRecipes: PlanRecipePickerItem[] = [...byId.values()]
    .map(toPickerItem)
    .sort((a, b) => a.title.localeCompare(b.title, "uk"));

  const days = Array.from({ length: 7 }, (_, i) =>
    weeklyPlanItemDate(plan.weekStartDate, i),
  );

  const weekRangeLabel = `${plan.weekStartDate.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} — ${plan.weekEndDate.toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}`;
  const isSaved = plan.status === "active";

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="hidden md:block">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
                {uk.plan.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={isSaved ? "default" : "secondary"}
                  className="text-xs font-semibold"
                >
                  {isSaved ? uk.plan.statusSaved : uk.plan.statusDraft}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/shopping?w=${weekOffset}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {uk.plan.generateShopping}
              </Link>
              {canManage ? (
                <PlanToolbar weekStart={plan.weekStartDate.toISOString()} />
              ) : null}
            </div>
          </div>
          <PlanWeekNav offset={weekOffset} weekRangeLabel={weekRangeLabel} />
          {canManage ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <SaveWeekButton weekStartIso={plan.weekStartDate.toISOString()} />
              {!isSaved ? (
                <p className="max-w-xl text-sm text-muted-foreground sm:pt-2">
                  {uk.plan.saveWeekHint}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-[#001f3f]">{uk.plan.title}</h1>
          <Badge
            variant={isSaved ? "default" : "secondary"}
            className="shrink-0 text-[10px] font-semibold"
          >
            {isSaved ? uk.plan.statusSaved : uk.plan.statusDraft}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <PlanWeekNav offset={weekOffset} weekRangeLabel={weekRangeLabel} />
        </div>
        {canManage ? (
          <div className="space-y-2">
            <SaveWeekButton weekStartIso={plan.weekStartDate.toISOString()} />
            {!isSaved ? (
              <p className="text-xs text-muted-foreground">
                {uk.plan.saveWeekHint}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/shopping?w=${weekOffset}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {uk.plan.generateShopping}
          </Link>
          {canManage ? (
            <PlanToolbar weekStart={plan.weekStartDate.toISOString()} />
          ) : null}
        </div>
      </div>

      {plan.items.length === 0 ? (
        <Card className="border border-[#eff6ff] bg-[#eff6ff]/35 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">{uk.plan.emptyWeekTitle}</CardTitle>
            <CardDescription>
              {pickerRecipes.length === 0
                ? uk.plan.emptyWeekNoRecipes
                : uk.plan.emptyWeekHasRecipes}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Link href="/recipes" className={cn(buttonVariants({ variant: "outline" }))}>
              {uk.plan.ctaToRecipes}
            </Link>
            {canManage && pickerRecipes.length === 0 ? (
              <>
                <Link href="/recipes/new" className={cn(buttonVariants())}>
                  {uk.recipes.new}
                </Link>
                <Link
                  href="/recipes/import-ai"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  {uk.recipes.newAi}
                </Link>
              </>
            ) : null}
            {pickerRecipes.length > 0 ? (
              <a
                href="#week-plan-grid"
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                {uk.plan.ctaCreateMenu}
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div id="week-plan-grid" className="space-y-4 scroll-mt-6 md:space-y-6">
        {days.map((day, dayIndex) => {
          const dayItems = plan.items.filter((it) =>
            isSameUtcDateOnly(it.date, day),
          );
          const totals = calculateDailyNutritionFromItems(
            dayItems as Parameters<typeof calculateDailyNutritionFromItems>[0],
            day,
          );
          const cmp = household
            ? compareNutritionToGoals(totals, household)
            : null;
          return (
            <section
              key={day.toISOString()}
              className={cn(
                "rounded-2xl border p-2.5 shadow-[0_2px_12px_rgba(0,31,63,0.05)] md:rounded-[20px] md:p-4",
                dayItems.length === 0
                  ? "border-red-100/80 bg-[#fff5f5]"
                  : "border-emerald-100/80 bg-[#f0fdf4]",
              )}
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 md:mb-4">
                <h2 className="text-base font-bold capitalize leading-tight text-[#001f3f] md:text-xl">
                  {day.toLocaleDateString("uk-UA", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                {cmp ? (
                  <p className="hidden text-xs font-medium text-[#64748b] sm:block">
                    ~{Math.round(cmp.kcal.actual)} {uk.dashboard.kcal}
                    {cmp.kcal.goal != null
                      ? ` / ${uk.plan.goalShort} ${cmp.kcal.goal}`
                      : ""}{" "}
                    · Б {Math.round(cmp.protein.actual)}
                    {cmp.protein.goal != null
                      ? ` / ${cmp.protein.goal}`
                      : ""}
                  </p>
                ) : null}
                {cmp ? (
                  <p className="text-xs font-semibold text-[#64748b] sm:hidden">
                    ~{Math.round(cmp.kcal.actual)} {uk.dashboard.kcal}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
                {MEALS_MAIN.map((meal) => {
                  const slotItems = dayItems.filter(
                    (x) => x.mealType === meal,
                  );
                  return (
                    <div
                      key={meal}
                      className="min-h-0 rounded-xl border border-[#eef2f7] bg-white p-2 md:rounded-2xl md:p-2.5"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                        {MEAL_LABEL_UK[meal]}
                      </p>
                      <div className="mt-1.5 space-y-2 md:space-y-2">
                        {slotItems.map((it) => {
                          const img = recipeImageSrc(it.recipe.imageUrl);
                          return (
                            <div
                              key={it.id}
                              className="rounded-lg border border-transparent text-sm transition-colors duration-150 hover:border-[#eef2f7] hover:bg-[#fafafa]"
                            >
                              <Link
                                href={`/recipes/${it.recipe.slug}`}
                                className="flex items-center gap-2.5 rounded-lg p-0.5 outline-none ring-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
                              >
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-[#f1f5f9] ring-1 ring-[#e8edf3] md:size-[52px]">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={img}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center text-[#94a3b8]">
                                      <span className="text-[10px]">—</span>
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-semibold leading-snug text-[#001f3f] md:text-sm">
                                    {it.recipe.title}
                                  </p>
                                </div>
                              </Link>
                              <UsageHint
                                householdId={householdId}
                                recipeId={it.recipeId}
                              />
                              {canManage ? (
                                <PlanItemActions
                                  itemId={it.id}
                                  servings={it.servings}
                                  recipes={pickerRecipes}
                                  categories={categories}
                                  tags={tags}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                        {canManage ? (
                          <PlanSlotPicker
                            weeklyPlanId={plan.id}
                            weekStartIso={plan.weekStartDate.toISOString()}
                            dayOffset={dayIndex}
                            mealType={meal}
                            recipes={pickerRecipes}
                            categories={categories}
                            tags={tags}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 border-t border-dashed border-[#e2e8f0] pt-2.5">
                <p className="mb-2 max-w-xl text-[11px] leading-snug text-[#94a3b8]">
                  {uk.plan.prepSlotOptionalHint}
                </p>
                <div className="max-w-full sm:max-w-[240px]">
                  {(() => {
                    const meal: MealType = "prep";
                    const slotItems = dayItems.filter(
                      (x) => x.mealType === meal,
                    );
                    return (
                      <div className="min-h-0 rounded-xl border border-dashed border-[#cfd8e3] bg-[#f8fafc] p-2 md:rounded-2xl md:p-2.5">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                          {MEAL_LABEL_UK[meal]}
                        </p>
                        <div className="mt-1.5 space-y-2 md:space-y-2">
                          {slotItems.map((it) => {
                            const img = recipeImageSrc(it.recipe.imageUrl);
                            return (
                              <div
                                key={it.id}
                                className="rounded-lg border border-transparent text-sm transition-colors duration-150 hover:border-[#e2e8f0] hover:bg-white"
                              >
                                <Link
                                  href={`/recipes/${it.recipe.slug}`}
                                  className="flex items-center gap-2.5 rounded-lg p-0.5 outline-none ring-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--interactive)]"
                                >
                                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-[#e8edf3] md:size-[52px]">
                                    {img ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={img}
                                        alt=""
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-[#94a3b8]">
                                        <span className="text-[10px]">—</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold leading-snug text-[#001f3f] md:text-sm">
                                      {it.recipe.title}
                                    </p>
                                  </div>
                                </Link>
                                <UsageHint
                                  householdId={householdId}
                                  recipeId={it.recipeId}
                                />
                                {canManage ? (
                                  <PlanItemActions
                                    itemId={it.id}
                                    servings={it.servings}
                                    recipes={pickerRecipes}
                                    categories={categories}
                                    tags={tags}
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                          {canManage ? (
                            <PlanSlotPicker
                              weeklyPlanId={plan.id}
                              weekStartIso={plan.weekStartDate.toISOString()}
                              dayOffset={dayIndex}
                              mealType={meal}
                              recipes={pickerRecipes}
                              categories={categories}
                              tags={tags}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

async function UsageHint({
  householdId,
  recipeId,
}: {
  householdId: string;
  recipeId: string;
}) {
  const n = await getUsageCount(householdId, recipeId, 14);
  if (n < 3) return null;
  return (
    <Badge variant="secondary" className="mt-1 text-[10px]">
      {uk.plan.oftenBadge(n)}
    </Badge>
  );
}
