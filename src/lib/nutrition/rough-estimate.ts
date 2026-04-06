import type { ParsedRecipeDraft } from "@/lib/ai/recipe-parser";

type Totals = { kcal: number; protein: number; fat: number; carbs: number };

type DraftIng = ParsedRecipeDraft["ingredients"][number];

function matchProfile(name: string): Totals {
  const n = name.toLowerCase();
  if (
    /олі(я|ї)|оливк|соняшник|вершков|масл(о|а)|олія/i.test(n)
  ) {
    return { kcal: 884, protein: 0, fat: 100, carbs: 0 };
  }
  if (/рис|гречк|паста|макарон|крупа|вівсянк|борошн|хліб|булк/i.test(n)) {
    return { kcal: 340, protein: 10, fat: 2, carbs: 70 };
  }
  if (/м'ясо|ялович|свинин|курк|індич|риб|фарш|шніцель/i.test(n)) {
    return { kcal: 200, protein: 22, fat: 12, carbs: 0 };
  }
  if (/молок|вершк|сметан|кефір|йогурт|творог|сир\b/i.test(n)) {
    return { kcal: 65, protein: 3.5, fat: 3.5, carbs: 5 };
  }
  if (/яйц/i.test(n)) {
    return { kcal: 155, protein: 13, fat: 11, carbs: 1 };
  }
  if (/картоп|моркв|цибул|помідор|огірок|капуст|перець|гриб|зелен|салат|яблук|банан/i.test(n)) {
    return { kcal: 45, protein: 1.5, fat: 0.3, carbs: 9 };
  }
  if (/цукор|мед|шоколад|варен|печив/i.test(n)) {
    return { kcal: 380, protein: 3, fat: 5, carbs: 80 };
  }
  return { kcal: 130, protein: 6, fat: 5, carbs: 15 };
}

function gramsFromIngredient(ing: DraftIng): number | null {
  if (ing.isToTaste) return null;
  const q = ing.quantity;
  if (q == null || !Number.isFinite(q) || q <= 0) return null;
  const u = (ing.unit ?? "").toLowerCase().trim();
  if (/^(г|g)$/.test(u)) return q;
  if (/^(кг|kg)$/.test(u)) return q * 1000;
  if (/^(мл|ml)$/.test(u)) return q;
  if (/^(л|l)$/.test(u)) return q * 1000;
  if (/^(шт|штук|x)?$/i.test(u) || u === "") return null;
  return null;
}

/** Орієнтовні КБЖУ на всю страву за списком інгредієнтів (лише з кількістю в г/мл). */
export function roughRecipeTotalsFromDraft(
  draft: ParsedRecipeDraft,
): Totals | null {
  let k = 0;
  let p = 0;
  let f = 0;
  let c = 0;
  let n = 0;
  for (const ing of draft.ingredients) {
    const g = gramsFromIngredient(ing);
    if (g == null) continue;
    const prof = matchProfile(ing.name);
    const factor = g / 100;
    k += prof.kcal * factor;
    p += prof.protein * factor;
    f += prof.fat * factor;
    c += prof.carbs * factor;
    n += 1;
  }
  if (n === 0) return null;
  return { kcal: k, protein: p, fat: f, carbs: c };
}

export function roughPerServingFromDraft(
  draft: ParsedRecipeDraft,
): { kcal: number; protein: number; fat: number; carbs: number } | null {
  const servings = draft.baseServings && draft.baseServings > 0 ? draft.baseServings : 4;
  const t = roughRecipeTotalsFromDraft(draft);
  if (!t) return null;
  return {
    kcal: Math.round(t.kcal / servings),
    protein: Math.round((t.protein / servings) * 10) / 10,
    fat: Math.round((t.fat / servings) * 10) / 10,
    carbs: Math.round((t.carbs / servings) * 10) / 10,
  };
}
