import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RecipeNewGate } from "@/components/recipes/recipe-new-gate";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";

export default async function NewRecipePage() {
  const session = await auth();
  const householdId = session?.user?.householdId;
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!householdId || !role || !isManager(role)) {
    redirect("/recipes");
  }
  const [categories, tags, catalog, preparations] = await Promise.all([
    prisma.category.findMany({
      where: { householdId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      where: { householdId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.ingredient.findMany({
      where: { householdId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 200,
    }),
    prisma.recipe.findMany({
      where: { householdId, isArchived: false, isPreparation: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {uk.recipeNew.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {uk.recipeEditor.newPageSubtitle}
        </p>
      </div>
      <RecipeNewGate
        categories={categories}
        tags={tags}
        catalog={catalog}
        preparations={preparations}
      />
    </div>
  );
}
