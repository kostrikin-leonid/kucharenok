import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CategoriesTagsPanel } from "@/components/settings/categories-tags-panel";
import { HouseholdForm } from "@/components/settings/household-form";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";

export default async function SettingsPage() {
  const session = await auth();
  const householdId = session?.user?.householdId;
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!householdId || !role || !isManager(role)) {
    redirect("/dashboard");
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });
  if (!household) redirect("/dashboard");

  const ingredients = await prisma.ingredient.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
    take: 30,
  });

  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  const tags = await prisma.tag.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-10">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
          {uk.settings.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {uk.settings.pageSubtitle}
        </p>
      </div>
      <HouseholdForm
        initial={{
          name: household.name,
          defaultServings: household.defaultServings,
          dailyKcalGoal: household.dailyKcalGoal,
          dailyProteinGoal: household.dailyProteinGoal,
          dailyFatGoal: household.dailyFatGoal,
          dailyCarbGoal: household.dailyCarbGoal,
        }}
      />
      <CategoriesTagsPanel categories={categories} tags={tags} />
      <section>
        <h2 className="text-sm font-medium">
          {uk.settings.ingredientCatalogTitle}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {uk.settings.ingredientCatalogHint}
        </p>
        <ul className="mt-3 max-h-48 overflow-auto text-xs text-muted-foreground">
          {ingredients.map((i) => (
            <li key={i.id}>{i.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
