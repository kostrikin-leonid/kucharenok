export type ScalableIngredient = {
  quantity: number | null;
  unit: string | null;
  isToTaste: boolean;
  customName?: string | null;
  ingredientName?: string | null;
};

export function scaleQuantity(
  quantity: number | null | undefined,
  baseServings: number,
  targetServings: number,
  isToTaste: boolean,
): number | null {
  if (isToTaste || quantity == null || !Number.isFinite(quantity)) {
    return quantity ?? null;
  }
  if (!Number.isFinite(baseServings) || baseServings <= 0) return quantity;
  const m = targetServings / baseServings;
  const scaled = quantity * m;
  return roundQuantity(scaled, quantity);
}

function roundQuantity(scaled: number, original: number): number {
  if (original >= 100) return Math.round(scaled);
  if (original >= 10) return Math.round(scaled * 10) / 10;
  if (original < 1 && original > 0) return Math.round(scaled * 100) / 100;
  return Math.round(scaled * 100) / 100;
}

export function scaleIngredients<T extends ScalableIngredient>(
  ingredients: T[],
  baseServings: number,
  targetServings: number,
): (T & { scaledQuantity: number | null })[] {
  return ingredients.map((ing) => ({
    ...ing,
    scaledQuantity: scaleQuantity(
      ing.quantity,
      baseServings,
      targetServings,
      ing.isToTaste,
    ),
  }));
}

export function formatQuantityDisplay(q: number | null | undefined): string {
  if (q == null) return "—";
  if (Math.abs(q - Math.round(q)) < 1e-6) return String(Math.round(q));
  return String(q);
}
