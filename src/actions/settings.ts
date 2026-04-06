"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/household/access";
import { z } from "zod";

const householdSchema = z.object({
  name: z.string().min(1),
  defaultServings: z.coerce.number().int().positive().optional().nullable(),
  dailyKcalGoal: z.coerce.number().int().optional().nullable(),
  dailyProteinGoal: z.coerce.number().optional().nullable(),
  dailyFatGoal: z.coerce.number().optional().nullable(),
  dailyCarbGoal: z.coerce.number().optional().nullable(),
});

export async function updateHouseholdSettingsAction(
  data: z.infer<typeof householdSchema>,
) {
  const ctx = await requireManager();
  const parsed = householdSchema.parse(data);
  await prisma.household.update({
    where: { id: ctx.householdId },
    data: {
      name: parsed.name,
      defaultServings: parsed.defaultServings ?? undefined,
      dailyKcalGoal: parsed.dailyKcalGoal ?? undefined,
      dailyProteinGoal: parsed.dailyProteinGoal ?? undefined,
      dailyFatGoal: parsed.dailyFatGoal ?? undefined,
      dailyCarbGoal: parsed.dailyCarbGoal ?? undefined,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

const catalogSchema = z.object({
  name: z.string().min(1),
  shoppingCategory: z.string().optional().nullable(),
  defaultUnit: z.string().optional().nullable(),
});

export async function createIngredientCatalogAction(
  data: z.infer<typeof catalogSchema>,
) {
  const ctx = await requireManager();
  const parsed = catalogSchema.parse(data);
  const { uniqueIngredientSlug } = await import("@/lib/slug");
  const slug = await uniqueIngredientSlug(ctx.householdId, parsed.name);
  await prisma.ingredient.create({
    data: {
      householdId: ctx.householdId,
      name: parsed.name.trim(),
      slug,
      shoppingCategory: parsed.shoppingCategory,
      defaultUnit: parsed.defaultUnit,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/recipes/new");
}

const tagSchema = z.object({
  name: z.string().min(1),
});

export async function createTagAction(data: z.infer<typeof tagSchema>) {
  const ctx = await requireManager();
  const parsed = tagSchema.parse(data);
  const { slugifyText } = await import("@/lib/slug");
  const base = slugifyText(parsed.name) || "tag";
  let slug = base;
  for (let n = 1; n < 50; n++) {
    const taken = await prisma.tag.findUnique({
      where: {
        householdId_slug: { householdId: ctx.householdId, slug },
      },
    });
    if (!taken) break;
    slug = `${base}-${n}`;
  }
  await prisma.tag.create({
    data: {
      householdId: ctx.householdId,
      name: parsed.name.trim(),
      slug,
    },
  });
  revalidatePath("/settings");
}
