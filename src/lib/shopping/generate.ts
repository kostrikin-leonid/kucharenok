import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";
import { scaleQuantity } from "@/lib/recipes/scaling";
import type { SourceBreakdownEntry } from "@/lib/shopping/types";

type MergeKey = string;

function normalizeCustomName(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mergeKey(
  ingredientId: string | null,
  unit: string | null,
  customName: string | null,
): MergeKey {
  const u = (unit ?? "").toLowerCase().trim() || "_none";
  if (ingredientId) return `id:${ingredientId}|${u}`;
  return `name:${normalizeCustomName(customName)}|${u}`;
}

type RecipeIngRow = {
  ingredientId: string | null;
  preparationRecipeId: string | null;
  customName: string | null;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  isToTaste: boolean;
  ingredient: { name: string } | null;
};

type PrepRecipeLoaded = {
  id: string;
  title: string;
  baseServings: number;
  ingredients: RecipeIngRow[];
};

export async function generateShoppingListFromWeeklyPlan(
  weeklyPlanId: string,
  householdId: string,
): Promise<{ shoppingListId: string; itemCount: number }> {
  const plan = await prisma.weeklyPlan.findFirst({
    where: { id: weeklyPlanId, householdId },
    include: {
      items: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: { ingredient: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    throw new Error("Weekly plan not found");
  }

  const aggregates = new Map<
    MergeKey,
    {
      ingredientId: string | null;
      customName: string | null;
      unit: string | null;
      total: number;
      breakdown: SourceBreakdownEntry[];
    }
  >();

  const prepCache = new Map<string, PrepRecipeLoaded | null>();

  async function loadPreparationRecipe(
    id: string,
  ): Promise<PrepRecipeLoaded | null> {
    if (prepCache.has(id)) return prepCache.get(id)!;
    const r = await prisma.recipe.findFirst({
      where: {
        id,
        householdId,
        isPreparation: true,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        baseServings: true,
        ingredients: {
          include: { ingredient: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!r) {
      prepCache.set(id, null);
      return null;
    }
    const loaded: PrepRecipeLoaded = {
      id: r.id,
      title: r.title,
      baseServings: r.baseServings || 4,
      ingredients: r.ingredients as RecipeIngRow[],
    };
    prepCache.set(id, loaded);
    return loaded;
  }

  function mergeLeaf(
    ri: RecipeIngRow,
    parentBaseServings: number,
    planServings: number,
    recipeIdForBreakdown: string,
    breakdownTitle: string,
  ) {
    if (ri.isToTaste) return;
    if (ri.quantity == null) return;
    const scaled = scaleQuantity(
      ri.quantity,
      parentBaseServings,
      planServings,
      ri.isToTaste,
    );
    if (scaled == null) return;
    const unit = ri.unit ?? "";
    const ingId = ri.ingredientId;
    const cName = ri.ingredient?.name ?? ri.customName ?? null;
    const key = mergeKey(ingId, ri.unit, cName);
    const entry: SourceBreakdownEntry = {
      recipeId: recipeIdForBreakdown,
      recipeTitle: breakdownTitle,
      quantity: scaled,
      unit,
    };
    const cur = aggregates.get(key);
    if (cur) {
      cur.total += scaled;
      cur.breakdown.push(entry);
    } else {
      aggregates.set(key, {
        ingredientId: ingId,
        customName: ri.ingredient ? null : ri.customName ?? cName,
        unit: ri.unit,
        total: scaled,
        breakdown: [entry],
      });
    }
  }

  async function addFromRecipe(
    lines: RecipeIngRow[],
    parentBaseServings: number,
    planServings: number,
    recipeIdForBreakdown: string,
    breakdownTitle: string,
    prepChain: Set<string>,
  ) {
    const base = parentBaseServings || 4;
    for (const ri of lines) {
      if (ri.preparationRecipeId) {
        if (prepChain.has(ri.preparationRecipeId)) continue;
        const prep = await loadPreparationRecipe(ri.preparationRecipeId);
        if (!prep) continue;
        const prepServingsNeeded = scaleQuantity(
          ri.quantity,
          base,
          planServings,
          ri.isToTaste,
        );
        if (prepServingsNeeded == null) continue;
        const nextChain = new Set(prepChain);
        nextChain.add(ri.preparationRecipeId);
        const nestedTitle = `${breakdownTitle} → ${prep.title}`;
        await addFromRecipe(
          prep.ingredients,
          prep.baseServings,
          prepServingsNeeded,
          recipeIdForBreakdown,
          nestedTitle,
          nextChain,
        );
        continue;
      }
      mergeLeaf(ri, base, planServings, recipeIdForBreakdown, breakdownTitle);
    }
  }

  for (const item of plan.items) {
    const { recipe, servings } = item;
    const base = recipe.baseServings || 4;
    const lines = recipe.ingredients as RecipeIngRow[];
    await addFromRecipe(
      lines,
      base,
      servings,
      recipe.id,
      recipe.title,
      new Set(),
    );
  }

  await prisma.shoppingList.deleteMany({ where: { weeklyPlanId: plan.id } });

  const list = await prisma.shoppingList.create({
    data: {
      householdId,
      weeklyPlanId: plan.id,
      status: "open",
      items: {
        create: [...aggregates.values()].map((a) => ({
          ingredientId: a.ingredientId,
          customName: a.customName,
          quantity: a.total,
          unit: a.unit,
          isChecked: false,
          isManual: false,
          sourceBreakdownJson: a.breakdown as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  });

  return { shoppingListId: list.id, itemCount: aggregates.size };
}
