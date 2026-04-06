import { prisma } from "@/lib/db";
import { getLastUsedDate, getUsageCount } from "@/lib/usage/recipe-usage";

export async function getReplacementSuggestions(
  householdId: string,
  recipeId: string,
  limit = 8,
) {
  const base = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId, isArchived: false },
    include: { recipeTags: true },
  });
  if (!base) return [];

  const candidates = await prisma.recipe.findMany({
    where: {
      householdId,
      isArchived: false,
      hiddenFromSuggestions: false,
      isPreparation: false,
      id: { not: recipeId },
    },
    include: { recipeTags: true, category: true },
  });

  const baseTagIds = new Set(base.recipeTags.map((t) => t.tagId));
  const baseTime = base.totalTimeMinutes ?? base.cookTimeMinutes ?? 9999;

  const scored = await Promise.all(
    candidates.map(async (r) => {
      let score = 0;
      if (r.categoryId && r.categoryId === base.categoryId) score += 40;
      const overlap = r.recipeTags.filter((t) => baseTagIds.has(t.tagId))
        .length;
      score += overlap * 12;
      const rt = r.totalTimeMinutes ?? r.cookTimeMinutes ?? 9999;
      const diff = Math.abs(rt - baseTime);
      if (diff <= 10) score += 15;
      else if (diff <= 20) score += 8;

      const last = await getLastUsedDate(householdId, r.id);
      const daysSince = last
        ? (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      score += Math.min(25, daysSince / 3);

      const recent = await getUsageCount(householdId, r.id, 30);
      score -= recent * 8;

      return { recipe: r, score };
    }),
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.recipe);
}
