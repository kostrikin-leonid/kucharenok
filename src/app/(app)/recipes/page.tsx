import Link from "next/link";

import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HouseholdRole, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import {
  daysSinceDate,
  getLastUsedDate,
  getUsageCount,
} from "@/lib/usage/recipe-usage";
import { RecipeGridCard } from "@/components/recipes/recipe-grid-card";
import { cn } from "@/lib/utils";

type Search = {
  q?: string;
  category?: string;
  tag?: string;
  favorite?: string;
  preps?: string;
};

function hasActiveRecipeFilters(sp: Search): boolean {
  return Boolean(
    sp.q ||
      sp.category ||
      sp.tag ||
      sp.favorite === "1" ||
      sp.preps === "1",
  );
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const householdId = session?.user?.householdId;
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!householdId) {
    return (
      <p className="text-sm text-muted-foreground">{uk.plan.noHousehold}</p>
    );
  }
  const canManage = role ? isManager(role) : false;

  const where: Prisma.RecipeWhereInput = {
    householdId,
    isArchived: false,
  };

  if (sp.q) {
    where.title = { contains: sp.q, mode: "insensitive" };
  }
  if (sp.category) {
    where.category = { slug: sp.category };
  }
  if (sp.tag) {
    where.recipeTags = { some: { tag: { slug: sp.tag } } };
  }
  if (sp.favorite === "1") {
    where.isFavorite = true;
  }
  if (sp.preps === "1") {
    where.isPreparation = true;
  }

  const recipes = await prisma.recipe.findMany({
    where,
    include: { category: true, recipeTags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });
  const tags = await prisma.tag.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });

  const usageMeta = await Promise.all(
    recipes.map(async (r) => {
      const last = await getLastUsedDate(householdId, r.id);
      const cnt = await getUsageCount(householdId, r.id, 30);
      const daysAgo = daysSinceDate(last);
      return { id: r.id, last, cnt, daysAgo };
    }),
  );
  const usageById = Object.fromEntries(usageMeta.map((m) => [m.id, m]));

  const recipesSorted = [...recipes].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      if (a.isFavorite) return -1;
      return 1;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="hidden md:flex md:flex-col md:gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
            {uk.recipes.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uk.recipes.listSubtitle}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/recipes/new" className={cn(buttonVariants())}>
              {uk.recipes.new}
            </Link>
            <Link
              href="/recipes/import-ai"
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              {uk.recipes.newAi}
            </Link>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2 md:hidden">
          <Link
            href="/recipes/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {uk.recipes.new}
          </Link>
          <Link
            href="/recipes/import-ai"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            {uk.recipes.newAi}
          </Link>
        </div>
      ) : null}

      <form
        method="get"
        className="flex flex-col gap-2.5 rounded-[20px] border border-[#f9fafb] bg-white p-3 shadow-[var(--shadow-card)] sm:gap-3 sm:p-4 md:flex-row md:flex-wrap md:items-end"
      >
        <input
          name="q"
          placeholder={uk.recipes.searchTitlePlaceholder}
          defaultValue={sp.q}
          className="min-h-12 min-w-0 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-[16px] text-[#001f3f] shadow-sm placeholder:text-[#94a3b8] focus-visible:border-[var(--interactive)] focus-visible:ring-3 focus-visible:ring-[var(--interactive)]/25 md:min-w-[11rem] md:flex-1 md:text-sm"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap md:items-end md:gap-2">
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className="min-h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-[15px] text-[#001f3f] shadow-sm md:min-w-[8.5rem] md:text-sm"
          >
            <option value="">{uk.recipes.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name?.trim() || uk.common.unnamed}
              </option>
            ))}
          </select>
          <select
            name="tag"
            defaultValue={sp.tag ?? ""}
            className="min-h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-[15px] text-[#001f3f] shadow-sm md:min-w-[8.5rem] md:text-sm"
          >
            <option value="">{uk.recipes.allTags}</option>
            {tags.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name?.trim() || uk.common.unnamed}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:contents">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#334155] md:min-h-12 md:gap-3 md:px-4">
            <input
              type="checkbox"
              name="favorite"
              value="1"
              defaultChecked={sp.favorite === "1"}
              className="size-4 shrink-0 rounded border-[#cbd5e1]"
            />
            <span className="leading-tight">{uk.recipes.favoritesOnly}</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[#f1f5f9] bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#334155] md:min-h-12 md:gap-3 md:px-4">
            <input
              type="checkbox"
              name="preps"
              value="1"
              defaultChecked={sp.preps === "1"}
              className="size-4 shrink-0 rounded border-[#cbd5e1]"
            />
            <span className="leading-tight">{uk.recipes.prepsOnlyFilter}</span>
          </label>
        </div>
        <button
          type="submit"
          className={cn(
            buttonVariants({ size: "default" }),
            "h-12 w-full touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:w-auto md:active:scale-100",
          )}
        >
          {uk.recipes.filterApply}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {recipesSorted.map((r) => {
          const u = usageById[r.id];
          const cnt = u?.cnt ?? 0;
          const lastLabel =
            u?.daysAgo != null
              ? uk.recipes.daysAgoShort(u.daysAgo)
              : uk.recipes.neverInPlan;
          return (
            <RecipeGridCard
              key={r.id}
              recipeId={r.id}
              slug={r.slug}
              title={r.title}
              imageUrl={r.imageUrl}
              categoryName={r.category?.name ?? null}
              baseServings={r.baseServings}
              kcalPerServing={r.kcalPerServing}
              isPreparation={r.isPreparation}
              isFavorite={r.isFavorite}
              lastInPlanLabel={lastLabel}
              usageCount30={cnt}
              className="h-full transition-[border-color,box-shadow,transform] duration-150 hover:z-[1] hover:border-[#dce3ec] hover:shadow-[0_6px_16px_rgba(0,31,63,0.08)] hover:scale-[1.02]"
            />
          );
        })}
      </div>

      {recipes.length === 0 ? (
        hasActiveRecipeFilters(sp) ? (
          <div className="surface-card border-dashed px-6 py-10 text-center">
            <p className="text-[15px] text-[#64748b]">{uk.recipes.noResults}</p>
          </div>
        ) : (
          <Card className="surface-card border-dashed">
            <CardHeader>
              <CardTitle className="text-base">
                {uk.recipes.emptyFirstTitle}
              </CardTitle>
              <CardDescription>{uk.recipes.emptyFirstBody}</CardDescription>
            </CardHeader>
            {canManage ? (
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Link href="/recipes/new" className={cn(buttonVariants())}>
                  {uk.recipes.new}
                </Link>
                <Link
                  href="/recipes/import-ai"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  {uk.recipes.newAi}
                </Link>
              </CardContent>
            ) : (
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {uk.recipes.listSubtitle}
              </CardContent>
            )}
          </Card>
        )
      ) : null}
    </div>
  );
}
