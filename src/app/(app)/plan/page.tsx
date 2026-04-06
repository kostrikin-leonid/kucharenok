import Link from "next/link";

import { auth } from "@/auth";
import { PlanAddForm } from "@/components/plan/plan-add-form";
import { PlanItemActions } from "@/components/plan/plan-item-actions";
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
  nutritionForSlot,
} from "@/lib/nutrition/aggregate";
import { getUsageCount } from "@/lib/usage/recipe-usage";
import { planWeekPath } from "@/lib/plan/href";
import {
  addDays,
  parsePlanWeekOffset,
  toDateOnly,
  weekMondayFromOffset,
} from "@/lib/week";
import { cn } from "@/lib/utils";
import { loadOrCreateWeeklyPlan } from "@/server/weekly-plan";

const MEALS: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "prep",
];

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; prep?: string }>;
}) {
  const sp = await searchParams;
  const weekOffset = parsePlanWeekOffset(sp.w);
  const showPreparationsInPlan = sp.prep === "1";
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
  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });
  const basePlanRecipes = await prisma.recipe.findMany({
    where: {
      householdId,
      isArchived: false,
      ...(showPreparationsInPlan ? {} : { isPreparation: false }),
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const byId = new Map(
    basePlanRecipes.map((r) => [r.id, r] as const),
  );
  for (const it of plan.items) {
    if (!byId.has(it.recipeId)) {
      byId.set(it.recipeId, {
        id: it.recipe.id,
        title: it.recipe.title,
      });
    }
  }
  const recipes = [...byId.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "uk"),
  );

  const days = Array.from({ length: 7 }, (_, i) =>
    toDateOnly(addDays(plan.weekStartDate, i)),
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
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <PlanWeekNav
              offset={weekOffset}
              weekRangeLabel={weekRangeLabel}
              showPreparations={showPreparationsInPlan}
            />
            <Link
              href={planWeekPath(weekOffset, {
                showPreparations: !showPreparationsInPlan,
              })}
              className="text-center text-xs font-medium text-[#64748b] underline-offset-2 hover:text-[#001f3f] hover:underline"
            >
              {showPreparationsInPlan
                ? uk.plan.hidePreparationsToggle
                : uk.plan.showPreparationsToggle}
            </Link>
          </div>
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
          <PlanWeekNav
            offset={weekOffset}
            weekRangeLabel={weekRangeLabel}
            showPreparations={showPreparationsInPlan}
          />
          <Link
            href={planWeekPath(weekOffset, {
              showPreparations: !showPreparationsInPlan,
            })}
            className="text-xs font-medium text-[#64748b] underline-offset-2 hover:text-[#001f3f] hover:underline"
          >
            {showPreparationsInPlan
              ? uk.plan.hidePreparationsToggle
              : uk.plan.showPreparationsToggle}
          </Link>
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
              {recipes.length === 0
                ? uk.plan.emptyWeekNoRecipes
                : uk.plan.emptyWeekHasRecipes}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Link href="/recipes" className={cn(buttonVariants({ variant: "outline" }))}>
              {uk.plan.ctaToRecipes}
            </Link>
            {canManage && recipes.length === 0 ? (
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
            {recipes.length > 0 ? (
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

      <div id="week-plan-grid" className="space-y-5 scroll-mt-6 md:space-y-8">
        {days.map((day) => {
          const dayItems = plan.items.filter(
            (it) => it.date.getTime() === day.getTime(),
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
              className="rounded-2xl border border-[#f1f5f9] bg-white p-3 shadow-[var(--shadow-card)] md:rounded-[20px] md:p-6"
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
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                {MEALS.map((meal) => {
                  const slotItems = dayItems.filter((x) => x.mealType === meal);
                  return (
                    <div
                      key={meal}
                      className="min-h-0 rounded-xl border border-[#f1f5f9] bg-white p-3 md:min-h-[112px] md:rounded-2xl md:p-4"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                        {MEAL_LABEL_UK[meal]}
                      </p>
                      <div className="mt-2 space-y-3 md:mt-3 md:space-y-4">
                        {slotItems.map((it) => (
                          <div
                            key={it.id}
                            className="rounded-lg border border-transparent py-0.5 text-sm transition-colors duration-150 hover:border-[#f1f5f9] hover:bg-[#fafafa]"
                          >
                            <Link
                              href={`/recipes/${it.recipe.slug}`}
                              className="font-semibold text-[#001f3f] hover:underline"
                            >
                              {it.recipe.title}
                            </Link>
                            <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">
                              {it.servings} {uk.plan.servingsShort} · ~
                              {Math.round(
                                nutritionForSlot(it.recipe, it.servings).kcal,
                              )}{" "}
                              {uk.plan.kcalThisSlot}
                            </p>
                            <UsageHint
                              householdId={householdId}
                              recipeId={it.recipeId}
                            />
                            {canManage ? (
                              <PlanItemActions
                                itemId={it.id}
                                servings={it.servings}
                                recipes={recipes}
                                currentRecipeId={it.recipeId}
                              />
                            ) : null}
                          </div>
                        ))}
                        {canManage ? (
                          <PlanAddForm
                            date={day}
                            mealType={meal}
                            recipes={recipes}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
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
