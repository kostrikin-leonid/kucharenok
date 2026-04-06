import type { Household, WeeklyPlanItem } from "@/generated/prisma";

export type NutritionTotals = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export function nutritionForSlot(
  recipe: {
    kcalPerServing: number | null;
    proteinPerServing: number | null;
    fatPerServing: number | null;
    carbsPerServing: number | null;
  },
  servings: number,
): NutritionTotals {
  const s = servings || 0;
  return {
    kcal: (recipe.kcalPerServing ?? 0) * s,
    protein: (recipe.proteinPerServing ?? 0) * s,
    fat: (recipe.fatPerServing ?? 0) * s,
    carbs: (recipe.carbsPerServing ?? 0) * s,
  };
}

export function sumNutrition(parts: NutritionTotals[]): NutritionTotals {
  return parts.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      fat: a.fat + b.fat,
      carbs: a.carbs + b.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export function calculateDailyNutritionFromItems(
  items: (WeeklyPlanItem & {
    recipe: {
      kcalPerServing: number | null;
      proteinPerServing: number | null;
      fatPerServing: number | null;
      carbsPerServing: number | null;
    };
  })[],
  day: Date,
): NutritionTotals {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  const dayItems = items.filter((it) => {
    const x = new Date(it.date);
    return (
      x.getFullYear() === y && x.getMonth() === m && x.getDate() === d
    );
  });
  return sumNutrition(
    dayItems.map((it) => nutritionForSlot(it.recipe, it.servings)),
  );
}

export function compareNutritionToGoals(
  actual: NutritionTotals,
  household: Pick<
    Household,
    "dailyKcalGoal" | "dailyProteinGoal" | "dailyFatGoal" | "dailyCarbGoal"
  >,
) {
  return {
    kcal: {
      actual: actual.kcal,
      goal: household.dailyKcalGoal,
      delta:
        household.dailyKcalGoal != null
          ? actual.kcal - household.dailyKcalGoal
          : null,
    },
    protein: {
      actual: actual.protein,
      goal: household.dailyProteinGoal,
      delta:
        household.dailyProteinGoal != null
          ? actual.protein - household.dailyProteinGoal
          : null,
    },
    fat: {
      actual: actual.fat,
      goal: household.dailyFatGoal,
      delta:
        household.dailyFatGoal != null
          ? actual.fat - household.dailyFatGoal
          : null,
    },
    carbs: {
      actual: actual.carbs,
      goal: household.dailyCarbGoal,
      delta:
        household.dailyCarbGoal != null
          ? actual.carbs - household.dailyCarbGoal
          : null,
    },
  };
}
