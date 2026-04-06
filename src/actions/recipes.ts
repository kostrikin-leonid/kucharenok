"use server";

import { revalidatePath } from "next/cache";

import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { requireHouseholdContext, requireManager } from "@/lib/household/access";
import { uk } from "@/lib/i18n/uk";
import { serverErrorUk } from "@/lib/i18n/server-errors";
import { recipeBaseSchema } from "@/lib/recipes/recipe-schema";
import { revertActivePlanToDraftAndClearShopping } from "@/lib/plan/revert-active-plan";
import { uniqueIngredientSlug, uniqueRecipeSlug } from "@/lib/slug";
import { syncUsageLogsForPlan } from "@/lib/usage/recipe-usage";
import type { z } from "zod";

async function assertValidPreparationRecipe(
  householdId: string,
  preparationRecipeId: string,
  excludeRecipeId?: string,
) {
  if (excludeRecipeId && preparationRecipeId === excludeRecipeId) {
    throw new Error(serverErrorUk.invalidPreparation);
  }
  const p = await prisma.recipe.findFirst({
    where: {
      id: preparationRecipeId,
      householdId,
      isArchived: false,
      isPreparation: true,
    },
    select: { id: true },
  });
  if (!p) throw new Error(serverErrorUk.invalidPreparation);
}

async function findOrCreateIngredientId(
  householdId: string,
  name: string,
): Promise<string> {
  const clean = name.trim();
  if (!clean) {
    throw new Error(serverErrorUk.ingredientNameRequired);
  }
  const existing = await prisma.ingredient.findFirst({
    where: {
      householdId,
      name: { equals: clean, mode: "insensitive" },
    },
  });
  if (existing) return existing.id;
  const slug = await uniqueIngredientSlug(householdId, clean);
  const row = await prisma.ingredient.create({
    data: { householdId, name: clean, slug },
  });
  return row.id;
}

export async function createRecipeAction(data: z.infer<typeof recipeBaseSchema>) {
  const ctx = await requireManager();
  const parsed = recipeBaseSchema.parse(data);
  const slug = await uniqueRecipeSlug(ctx.householdId, parsed.title);
  const steps =
    parsed.instructionSteps.length > 0
      ? parsed.instructionSteps
      : [uk.recipes.defaultStepEnjoy];
  const recipe = await prisma.recipe.create({
    data: {
      householdId: ctx.householdId,
      authorId: ctx.userId,
      title: parsed.title,
      slug,
      summary: parsed.summary,
      imageUrl: parsed.imageUrl,
      imagePublicId: parsed.imagePublicId || null,
      categoryId: parsed.categoryId || null,
      baseServings: parsed.baseServings,
      prepTimeMinutes: parsed.prepTimeMinutes,
      cookTimeMinutes: parsed.cookTimeMinutes,
      totalTimeMinutes:
        parsed.totalTimeMinutes ??
        ((parsed.prepTimeMinutes ?? 0) + (parsed.cookTimeMinutes ?? 0) > 0
          ? (parsed.prepTimeMinutes ?? 0) + (parsed.cookTimeMinutes ?? 0)
          : null),
      difficulty: parsed.difficulty,
      instructionsText: null,
      instructionSteps: steps,
      kcalPerServing: parsed.kcalPerServing,
      proteinPerServing: parsed.proteinPerServing,
      fatPerServing: parsed.fatPerServing,
      carbsPerServing: parsed.carbsPerServing,
      nutritionSource: parsed.nutritionSource ?? undefined,
      nutritionConfidence: parsed.nutritionConfidence ?? undefined,
      sourceType: parsed.sourceType,
      isArchived: parsed.isArchived ?? false,
      isFavorite: parsed.isFavorite ?? false,
      hiddenFromSuggestions: parsed.hiddenFromSuggestions ?? false,
      isPreparation: parsed.isPreparation ?? false,
      recipeTags: {
        create: parsed.tagIds.map((tagId) => ({ tagId })),
      },
      ingredients: {
        create: await Promise.all(
          parsed.ingredients.map(async (ing, i) => {
            if (ing.preparationRecipeId) {
              await assertValidPreparationRecipe(
                ctx.householdId,
                ing.preparationRecipeId,
              );
              return {
                preparationRecipeId: ing.preparationRecipeId,
                ingredientId: null,
                customName: null,
                quantity: ing.quantity,
                unit: ing.unit,
                note: ing.note,
                isToTaste: ing.isToTaste ?? false,
                sortOrder: i,
              };
            }
            let ingredientId = ing.ingredientId ?? null;
            const custom = ing.customName?.trim() || null;
            if (!ingredientId && custom) {
              ingredientId = await findOrCreateIngredientId(
                ctx.householdId,
                custom,
              );
            }
            return {
              preparationRecipeId: null,
              ingredientId,
              customName: ingredientId ? null : custom,
              quantity: ing.quantity,
              unit: ing.unit,
              note: ing.note,
              isToTaste: ing.isToTaste ?? false,
              sortOrder: i,
            };
          }),
        ),
      },
    },
  });
  revalidatePath("/recipes");
  return recipe;
}

export async function updateRecipeAction(
  recipeId: string,
  data: z.infer<typeof recipeBaseSchema>,
) {
  const ctx = await requireManager();
  const parsed = recipeBaseSchema.parse(data);
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: ctx.householdId },
  });
  if (!existing) throw new Error(serverErrorUk.notFound);
  const slug = await uniqueRecipeSlug(
    ctx.householdId,
    parsed.title,
    recipeId,
  );
  const steps =
    parsed.instructionSteps.length > 0
      ? parsed.instructionSteps
      : [uk.recipes.defaultStepEnjoy];
  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.recipeTag.deleteMany({ where: { recipeId } }),
  ]);
  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      title: parsed.title,
      slug,
      summary: parsed.summary,
      imageUrl: parsed.imageUrl,
      imagePublicId: parsed.imagePublicId || null,
      categoryId: parsed.categoryId || null,
      baseServings: parsed.baseServings,
      prepTimeMinutes: parsed.prepTimeMinutes,
      cookTimeMinutes: parsed.cookTimeMinutes,
      totalTimeMinutes:
        parsed.totalTimeMinutes ??
        ((parsed.prepTimeMinutes ?? 0) + (parsed.cookTimeMinutes ?? 0) > 0
          ? (parsed.prepTimeMinutes ?? 0) + (parsed.cookTimeMinutes ?? 0)
          : null),
      difficulty: parsed.difficulty,
      instructionSteps: steps,
      kcalPerServing: parsed.kcalPerServing,
      proteinPerServing: parsed.proteinPerServing,
      fatPerServing: parsed.fatPerServing,
      carbsPerServing: parsed.carbsPerServing,
      nutritionSource: parsed.nutritionSource ?? undefined,
      nutritionConfidence: parsed.nutritionConfidence ?? undefined,
      sourceType: parsed.sourceType,
      isArchived: parsed.isArchived ?? false,
      isFavorite: parsed.isFavorite ?? false,
      hiddenFromSuggestions: parsed.hiddenFromSuggestions ?? false,
      isPreparation: parsed.isPreparation ?? false,
      recipeTags: {
        create: parsed.tagIds.map((tagId) => ({ tagId })),
      },
      ingredients: {
        create: await Promise.all(
          parsed.ingredients.map(async (ing, i) => {
            if (ing.preparationRecipeId) {
              await assertValidPreparationRecipe(
                ctx.householdId,
                ing.preparationRecipeId,
                recipeId,
              );
              return {
                preparationRecipeId: ing.preparationRecipeId,
                ingredientId: null,
                customName: null,
                quantity: ing.quantity,
                unit: ing.unit,
                note: ing.note,
                isToTaste: ing.isToTaste ?? false,
                sortOrder: i,
              };
            }
            let ingredientId = ing.ingredientId ?? null;
            const custom = ing.customName?.trim() || null;
            if (!ingredientId && custom) {
              ingredientId = await findOrCreateIngredientId(
                ctx.householdId,
                custom,
              );
            }
            return {
              preparationRecipeId: null,
              ingredientId,
              customName: ingredientId ? null : custom,
              quantity: ing.quantity,
              unit: ing.unit,
              note: ing.note,
              isToTaste: ing.isToTaste ?? false,
              sortOrder: i,
            };
          }),
        ),
      },
    },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${slug}`);
  revalidatePath(`/recipes/${existing.slug}`);
  return { slug };
}

export async function duplicateRecipeAction(recipeId: string) {
  const ctx = await requireManager();
  const r = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: ctx.householdId },
    include: { ingredients: true, recipeTags: true },
  });
  if (!r) throw new Error(serverErrorUk.notFound);
  const title = `${r.title}${uk.recipes.duplicateSuffix}`;
  const slug = await uniqueRecipeSlug(ctx.householdId, title);
  await prisma.recipe.create({
    data: {
      householdId: ctx.householdId,
      authorId: ctx.userId,
      title,
      slug,
      summary: r.summary,
      imageUrl: r.imageUrl,
      imagePublicId: r.imagePublicId,
      categoryId: r.categoryId,
      baseServings: r.baseServings,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      totalTimeMinutes: r.totalTimeMinutes,
      difficulty: r.difficulty,
      instructionsText: r.instructionsText,
      instructionSteps: (r.instructionSteps as string[] | null) ?? [],
      kcalPerServing: r.kcalPerServing,
      proteinPerServing: r.proteinPerServing,
      fatPerServing: r.fatPerServing,
      carbsPerServing: r.carbsPerServing,
      nutritionSource: r.nutritionSource ?? undefined,
      nutritionConfidence: r.nutritionConfidence ?? undefined,
      sourceType: "manual",
      isArchived: false,
      isFavorite: false,
      hiddenFromSuggestions: r.hiddenFromSuggestions,
      isPreparation: r.isPreparation,
      recipeTags: {
        create: r.recipeTags.map((t) => ({ tagId: t.tagId })),
      },
      ingredients: {
        create: r.ingredients.map((ing, i) => ({
          ingredientId: ing.ingredientId,
          preparationRecipeId: ing.preparationRecipeId,
          customName: ing.customName,
          quantity: ing.quantity,
          unit: ing.unit,
          note: ing.note,
          isToTaste: ing.isToTaste,
          sortOrder: i,
        })),
      },
    },
  });
  revalidatePath("/recipes");
}

export async function toggleRecipeFavoriteAction(recipeId: string) {
  const ctx = await requireHouseholdContext();
  const r = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: ctx.householdId, isArchived: false },
    select: { id: true, slug: true, isFavorite: true },
  });
  if (!r) throw new Error(serverErrorUk.notFound);
  await prisma.recipe.update({
    where: { id: r.id },
    data: { isFavorite: !r.isFavorite },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${r.slug}`);
  revalidatePath("/dashboard");
}

export async function setRecipeArchivedAction(
  recipeId: string,
  isArchived: boolean,
) {
  const ctx = await requireManager();
  await prisma.recipe.updateMany({
    where: { id: recipeId, householdId: ctx.householdId },
    data: { isArchived },
  });
  revalidatePath("/recipes");
}

export async function deleteRecipeAction(recipeId: string) {
  const ctx = await requireManager();
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: ctx.householdId },
    select: { id: true, imagePublicId: true },
  });
  if (!recipe) throw new Error(serverErrorUk.notFound);

  const imagePublicId = recipe.imagePublicId;
  let shouldDestroyImage = false;
  if (imagePublicId) {
    const otherRefs = await prisma.recipe.count({
      where: {
        householdId: ctx.householdId,
        imagePublicId,
        id: { not: recipeId },
      },
    });
    shouldDestroyImage = otherRefs === 0;
  }

  const affectedItems = await prisma.weeklyPlanItem.findMany({
    where: { recipeId },
    select: { weeklyPlanId: true },
  });
  const planIds = [...new Set(affectedItems.map((a) => a.weeklyPlanId))];

  await prisma.recipe.deleteMany({
    where: { id: recipeId, householdId: ctx.householdId },
  });

  if (
    shouldDestroyImage &&
    imagePublicId &&
    process.env.CLOUDINARY_CLOUD_NAME
  ) {
    try {
      await cloudinary.uploader.destroy(imagePublicId);
    } catch {
      // ігноруємо помилки видалення в Cloudinary
    }
  }

  for (const pid of planIds) {
    await revertActivePlanToDraftAndClearShopping(pid);
    await syncUsageLogsForPlan(pid);
  }

  revalidatePath("/recipes");
  revalidatePath("/plan");
  revalidatePath("/shopping");
  revalidatePath("/dashboard");
}

/** After plan items change, refresh usage logs for analytics. */
export async function refreshPlanUsageAction(weeklyPlanId: string) {
  const ctx = await requireHouseholdContext();
  const plan = await prisma.weeklyPlan.findFirst({
    where: { id: weeklyPlanId, householdId: ctx.householdId },
  });
  if (!plan) throw new Error(serverErrorUk.notFound);
  await syncUsageLogsForPlan(weeklyPlanId);
}
