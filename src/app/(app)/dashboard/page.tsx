/* Recipe thumbnails may point to arbitrary upload URLs */
/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, ChefHat, Flame } from "lucide-react";

import { auth } from "@/auth";
import { DashboardDraftButton } from "@/components/dashboard-draft-button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { MEAL_LABEL_UK, MEAL_ORDER } from "@/lib/i18n/meals";
import {
  calculateDailyNutritionFromItems,
  compareNutritionToGoals,
} from "@/lib/nutrition/aggregate";
import { addDays, startOfWeekMonday, toDateOnly } from "@/lib/week";
import { cn } from "@/lib/utils";

const MEAL_SLOT_TOTAL = 35; /* 7 днів × 5 прийомів їжі */

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role as HouseholdRole | undefined;
  const canManage = role ? isManager(role) : false;
  const householdId = session?.user?.householdId;
  if (!householdId) {
    return (
      <p className="text-sm text-muted-foreground">{uk.dashboard.noHousehold}</p>
    );
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });
  const recipeCount = await prisma.recipe.count({
    where: { householdId, isArchived: false },
  });

  const weekStart = toDateOnly(startOfWeekMonday());
  const plan = await prisma.weeklyPlan.findFirst({
    where: { householdId, weekStartDate: weekStart },
    include: {
      items: {
        include: { recipe: true },
      },
    },
  });

  const today = toDateOnly(new Date());
  const todayNutrition = plan
    ? calculateDailyNutritionFromItems(plan.items, today)
    : null;
  const cmp =
    todayNutrition && household
      ? compareNutritionToGoals(todayNutrition, household)
      : null;

  const weekItemCount = plan?.items.length ?? 0;

  const todayItems =
    plan?.items.filter(
      (it) => toDateOnly(it.date).getTime() === today.getTime(),
    ) ?? [];
  todayItems.sort((a, b) => {
    const ia = MEAL_ORDER.indexOf(a.mealType);
    const ib = MEAL_ORDER.indexOf(b.mealType);
    if (ia !== ib) return ia - ib;
    return a.sortOrder - b.sortOrder;
  });

  const favorites = await prisma.recipe.findMany({
    where: { householdId, isArchived: false, isFavorite: true },
    take: 4,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      totalTimeMinutes: true,
      kcalPerServing: true,
    },
  });

  const weekEnd = addDays(weekStart, 6);
  const fromDay = weekStart.toLocaleDateString("uk-UA", { day: "numeric" });
  const toDay = weekEnd.toLocaleDateString("uk-UA", { day: "numeric" });
  const monthName = weekStart.toLocaleDateString("uk-UA", { month: "long" });
  const todayLong = today.toLocaleDateString("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="space-y-2">
        {household?.name ? (
          <p className="text-xs font-medium uppercase tracking-[0.07em] text-[#6b7280]">
            {household.name}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight text-[#001f3f] md:text-[32px] md:leading-10">
          {uk.dashboard.todayFocusTitle}
        </h1>
        <p className="text-base capitalize text-[#4b5563] md:text-lg">
          {todayLong}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/plan"
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-h-12 touch-manipulation px-6",
            )}
          >
            {uk.navShort.plan}
          </Link>
          <Link
            href="/shopping"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "min-h-12 touch-manipulation px-6",
            )}
          >
            {uk.navShort.shopping}
          </Link>
        </div>
      </section>

      {recipeCount === 0 ? (
        <Card className="border border-[#eff6ff] bg-[#eff6ff]/40 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg text-[#001f3f]">
              {uk.dashboard.emptyRecipesBannerTitle}
            </CardTitle>
            <CardDescription className="text-[#4b5563]">
              {uk.dashboard.emptyRecipesBannerBody}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Link href="/recipes/new" className={cn(buttonVariants())}>
              {uk.recipes.new}
            </Link>
            {canManage ? (
              <Link
                href="/recipes/import-ai"
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                {uk.recipes.newAi}
              </Link>
            ) : null}
            <Link
              href="/plan"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {uk.plan.ctaCreateMenu}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#001f3f]">
          {uk.dashboard.todayMenuTitle}
        </h2>
        {!plan || plan.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {uk.dashboard.emptyPlanHint}
          </p>
        ) : todayItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {uk.dashboard.todayEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {todayItems.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/recipes/${it.recipe.slug}`}
                  className="surface-card flex min-h-14 touch-manipulation items-center justify-between gap-3 px-4 py-3 transition-transform duration-150 active:scale-[0.99] md:min-h-16 md:py-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                      {MEAL_LABEL_UK[it.mealType]}
                    </p>
                    <p className="truncate text-base font-semibold text-[#001f3f]">
                      {it.recipe.title}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-5 shrink-0 text-[#cbd5e1]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/plan"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[#ff8a00] hover:underline"
        >
          {uk.dashboard.openPlan}
        </Link>
      </section>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10">
        <div className="space-y-8 lg:col-span-8">
          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              iconWrapClass="bg-[#eff6ff]"
              icon={<BookOpen className="size-[14px] text-[#2563eb]" />}
              value={recipeCount}
              label={uk.dashboard.statRecipesCountCaption}
            />
            <StatCard
              iconWrapClass="bg-[#f0fdf4]"
              icon={<Calendar className="size-[14px] text-[#16a34a]" />}
              value={
                <span className="flex items-baseline gap-1">
                  <span className="tabular-nums">{weekItemCount}</span>
                  <span className="text-base font-normal text-[#9ca3af]">
                    /{MEAL_SLOT_TOTAL}
                  </span>
                </span>
              }
              label={uk.dashboard.statSlotsCaption}
            />
            <StatCard
              iconWrapClass="bg-[#fff7ed]"
              icon={<Flame className="size-[14px] text-[#ea580c]" />}
              value={
                cmp ? (
                  <span className="tabular-nums">
                    {Math.round(cmp.kcal.actual)}
                  </span>
                ) : (
                  "—"
                )
              }
              label={uk.dashboard.statTodayKcalCaption}
            />
          </div>

          <div className="relative overflow-hidden rounded-[20px] border border-[#f9fafb] bg-white p-6 shadow-[var(--shadow-card)]">
            <div
              className="pointer-events-none absolute right-0 top-0 size-32 rounded-bl-[100px] bg-[#f0f4f8] opacity-50"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#ff8a00]">
                  <ChefHat className="size-4" aria-hidden />
                  {uk.dashboard.currentPlanPill}
                </div>
                <h2 className="text-2xl font-bold text-[#001f3f]">
                  {uk.dashboard.weekPlanCardTitle(fromDay, toDay, monthName)}
                </h2>
                <p className="text-sm text-[#6b7280]">
                  {uk.dashboard.weekPlanFilledLine(weekItemCount, MEAL_SLOT_TOTAL)}
                </p>
              </div>
              <Link
                href="/plan"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex min-h-12 shrink-0 touch-manipulation items-center gap-2 self-start lg:self-center",
                )}
              >
                {uk.dashboard.openPlan}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="hidden flex-wrap gap-2 md:flex">
            <Link href="/recipes/new" className={cn(buttonVariants())}>
              {uk.recipes.new}
            </Link>
            <Link
              href="/recipes/import-ai"
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              {uk.recipes.newAi}
            </Link>
            <Link
              href="/plan"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {uk.nav.plan}
            </Link>
            <Link
              href="/shopping"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {uk.nav.shopping}
            </Link>
            {canManage && recipeCount > 0 ? <DashboardDraftButton /> : null}
          </div>
        </div>

        <aside className="mt-10 space-y-8 lg:col-span-4 lg:mt-0">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#001f3f]">
                {uk.dashboard.favoritesSidebarTitle}
              </h2>
              <Link
                href="/recipes?favorite=1"
                className="text-sm font-semibold text-[#ff8a00] hover:underline"
              >
                {uk.dashboard.allRecipesLink}
              </Link>
            </div>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {uk.dashboard.noSuggestions}
              </p>
            ) : (
              <ul className="space-y-3">
                {favorites.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recipes/${r.slug}`}
                      className="flex min-h-14 touch-manipulation gap-3 rounded-2xl border border-[#f9fafb] bg-white p-3 shadow-[var(--shadow-card)] transition-colors hover:border-[#e2e8f0] md:min-h-0"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f0f4f8]">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <ChefHat className="absolute inset-0 m-auto size-6 text-[#94a3b8]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#001f3f] line-clamp-2">
                          {r.title}
                        </p>
                        <p className="mt-1 text-xs text-[#6b7280]">
                          {r.totalTimeMinutes != null
                            ? `${r.totalTimeMinutes} ${uk.recipes.min}`
                            : "—"}
                          {r.kcalPerServing != null
                            ? ` · ${Math.round(r.kcalPerServing)} ${uk.dashboard.kcal}`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap gap-2 md:hidden">
        <Link
          href="/plan"
          className={cn(buttonVariants({ size: "sm" }), "min-h-10")}
        >
          {uk.navShort.plan}
        </Link>
        <Link
          href="/shopping"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "min-h-10",
          )}
        >
          {uk.navShort.shopping}
        </Link>
        <Link
          href="/recipes/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10")}
        >
          {uk.recipes.new}
        </Link>
        {canManage && recipeCount > 0 ? (
          <DashboardDraftButton className="min-h-10 text-sm" />
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconWrapClass,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconWrapClass: string;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-[#f9fafb] bg-white p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-150 active:scale-[0.99] md:min-h-[134px] md:active:scale-100">
      <div className="pb-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            iconWrapClass,
          )}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-[#001f3f]">
          {value}
        </div>
        <p className="mt-1 text-sm font-medium text-[#6b7280]">{label}</p>
      </div>
    </div>
  );
}
