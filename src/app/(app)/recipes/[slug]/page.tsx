import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { getUsageCount } from "@/lib/usage/recipe-usage";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const householdId = session?.user?.householdId;
  if (!householdId) notFound();
  const role = session?.user?.role as HouseholdRole | undefined;
  const canManage = role ? isManager(role) : false;

  const recipe = await prisma.recipe.findFirst({
    where: { householdId, slug },
    include: {
      ingredients: {
        include: {
          ingredient: true,
          preparationRecipe: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!recipe) notFound();

  const usageCount14 = await getUsageCount(householdId, recipe.id, 14);
  const planSlotsCount = await prisma.weeklyPlanItem.count({
    where: {
      recipeId: recipe.id,
      weeklyPlan: { householdId },
    },
  });

  return (
    <RecipeDetail
      recipe={{
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        summary: recipe.summary,
        imageUrl: recipe.imageUrl,
        baseServings: recipe.baseServings,
        kcalPerServing: recipe.kcalPerServing,
        proteinPerServing: recipe.proteinPerServing,
        fatPerServing: recipe.fatPerServing,
        carbsPerServing: recipe.carbsPerServing,
        instructionSteps: recipe.instructionSteps,
        isArchived: recipe.isArchived,
        isFavorite: recipe.isFavorite,
        nutritionSource: recipe.nutritionSource,
        isPreparation: recipe.isPreparation,
      }}
      ingredients={recipe.ingredients.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        unit: i.unit,
        note: i.note,
        isToTaste: i.isToTaste,
        customName: i.customName,
        ingredient: i.ingredient ? { name: i.ingredient.name } : null,
        preparationRecipe: i.preparationRecipe,
      }))}
      canManage={canManage}
      usageCount14={usageCount14}
      planSlotsCount={planSlotsCount}
    />
  );
}
