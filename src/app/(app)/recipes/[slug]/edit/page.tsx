import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import type { HouseholdRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { isManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const householdId = session?.user?.householdId;
  const role = session?.user?.role as HouseholdRole | undefined;
  if (!householdId || !role || !isManager(role)) {
    redirect(`/recipes/${slug}`);
  }

  const recipe = await prisma.recipe.findFirst({
    where: { householdId, slug },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      recipeTags: true,
    },
  });
  if (!recipe) notFound();

  const [categories, tags, catalog, preparations] = await Promise.all([
    prisma.category.findMany({
      where: { householdId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
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

  const steps = Array.isArray(recipe.instructionSteps)
    ? (recipe.instructionSteps as string[])
    : [];

  const ingredientRows = recipe.ingredients.map((i) => ({
    ingredientId: i.ingredientId ?? "",
    preparationRecipeId: i.preparationRecipeId ?? "",
    customName: i.customName ?? "",
    quantity: i.quantity != null ? String(i.quantity) : "",
    unit: i.unit ?? "",
    note: i.note ?? "",
    toTaste: i.isToTaste,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {uk.recipeEditor.editPageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{recipe.title}</p>
      </div>
      <RecipeEditor
        mode="edit"
        recipeId={recipe.id}
        categories={categories}
        tags={tags}
        catalog={catalog}
        preparations={preparations}
        initial={{
          title: recipe.title,
          summary: recipe.summary,
          imageUrl: recipe.imageUrl ?? "",
          imagePublicId: recipe.imagePublicId ?? "",
          categoryId: recipe.categoryId ?? "",
          tagIds: recipe.recipeTags.map((t) => t.tagId),
          baseServings: recipe.baseServings,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          totalTimeMinutes: recipe.totalTimeMinutes,
          instructionSteps: steps,
          kcalPerServing: recipe.kcalPerServing,
          proteinPerServing: recipe.proteinPerServing,
          fatPerServing: recipe.fatPerServing,
          carbsPerServing: recipe.carbsPerServing,
          nutritionSource: recipe.nutritionSource ?? undefined,
          nutritionConfidence: recipe.nutritionConfidence ?? undefined,
          sourceType: recipe.sourceType,
          isFavorite: recipe.isFavorite,
          hiddenFromSuggestions: recipe.hiddenFromSuggestions,
          isPreparation: recipe.isPreparation,
          ingredientRows,
        }}
      />
    </div>
  );
}
