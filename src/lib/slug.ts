import slugifyPkg from "slugify";

export function slugifyText(text: string): string {
  return slugifyPkg(text, { lower: true, strict: true, trim: true });
}

export async function uniqueRecipeSlug(
  householdId: string,
  title: string,
  excludeId?: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const base = slugifyText(title) || "recipe";
  let candidate = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.recipe.findUnique({
      where: {
        householdId_slug: { householdId, slug: candidate },
      },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function uniqueIngredientSlug(
  householdId: string,
  name: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const base = slugifyText(name) || "ingredient";
  let candidate = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.ingredient.findUnique({
      where: {
        householdId_slug: { householdId, slug: candidate },
      },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function uniqueCategorySlug(
  householdId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const base = slugifyText(name) || "category";
  let candidate = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.category.findFirst({
      where: { householdId, slug: candidate },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function uniqueTagSlug(
  householdId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const base = slugifyText(name) || "tag";
  let candidate = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.tag.findFirst({
      where: { householdId, slug: candidate },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
