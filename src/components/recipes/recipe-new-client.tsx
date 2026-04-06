"use client";

import { useState } from "react";

import type { ParsedRecipeDraft } from "@/lib/ai/recipe-parser";

import { RecipeEditor } from "./recipe-editor";

type CatOpt = { id: string; name: string; slug: string };
type Opt = { id: string; name: string };

function mapDraft(d: ParsedRecipeDraft, categories: CatOpt[]) {
  const cat = d.categorySlugSuggestion
    ? categories.find((c) => c.slug === d.categorySlugSuggestion)
    : undefined;
  const nutritionConfidence =
    d.kcalPerServing != null && d.kcalPerServing > 0
      ? d.warnings.some((w) =>
          w.includes("пораховано автоматично за кількостями"),
        )
        ? ("low" as const)
        : ("medium" as const)
      : ("low" as const);
  const base = {
    title: d.title,
    summary: d.summary ?? "",
    baseServings: d.baseServings ?? 4,
    prepTimeMinutes: d.prepTimeMinutes ?? undefined,
    cookTimeMinutes: d.cookTimeMinutes ?? undefined,
    totalTimeMinutes: d.totalTimeMinutes ?? undefined,
    instructionSteps: d.instructionSteps,
    kcalPerServing: d.kcalPerServing ?? undefined,
    proteinPerServing: d.proteinPerServing ?? undefined,
    fatPerServing: d.fatPerServing ?? undefined,
    carbsPerServing: d.carbsPerServing ?? undefined,
    categoryId: cat?.id ?? "",
    nutritionSource: "ai_estimated" as const,
    nutritionConfidence,
    sourceType: "ai_text" as const,
  };
  if (d.ingredients.length === 0) {
    return base;
  }
  return {
    ...base,
    ingredientRows: d.ingredients.map((ing) => ({
      ingredientId: "",
      preparationRecipeId: "",
      customName: ing.name,
      quantity:
        ing.quantity != null && !ing.isToTaste ? String(ing.quantity) : "",
      unit: ing.unit ?? "г",
      note: ing.note ?? "",
      toTaste: ing.isToTaste ?? false,
    })),
  };
}

export function RecipeNewClient({
  categories,
  tags,
  catalog,
  preparations,
}: {
  categories: CatOpt[];
  tags: Opt[];
  catalog: Opt[];
  preparations: { id: string; title: string }[];
}) {
  const [initial] = useState(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = sessionStorage.getItem("rc_draft");
      if (!raw) return undefined;
      const d = JSON.parse(raw) as ParsedRecipeDraft;
      sessionStorage.removeItem("rc_draft");
      return {
        ...mapDraft(d, categories),
        tagIds: [] as string[],
      };
    } catch {
      sessionStorage.removeItem("rc_draft");
      return undefined;
    }
  });

  return (
    <RecipeEditor
      key={initial ? "with-draft" : "empty"}
      mode="create"
      categories={categories}
      tags={tags}
      catalog={catalog}
      preparations={preparations}
      initial={
        initial
          ? {
              ...initial,
            }
          : undefined
      }
    />
  );
}
