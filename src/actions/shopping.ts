"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireHouseholdContext, requireManager } from "@/lib/household/access";
import { serverErrorUk } from "@/lib/i18n/server-errors";
import { generateShoppingListFromWeeklyPlan } from "@/lib/shopping/generate";
import { z } from "zod";

export async function regenerateShoppingListAction(weeklyPlanId: string) {
  const ctx = await requireManager();
  const plan = await prisma.weeklyPlan.findFirst({
    where: { id: weeklyPlanId, householdId: ctx.householdId },
  });
  if (!plan) throw new Error(serverErrorUk.notFound);
  if (plan.status !== "active") {
    throw new Error(serverErrorUk.planNotSaved);
  }
  const result = await generateShoppingListFromWeeklyPlan(
    weeklyPlanId,
    ctx.householdId,
  );
  revalidatePath("/shopping");
  return result;
}

export async function toggleShoppingItemCheckedAction(
  itemId: string,
  isChecked: boolean,
) {
  const ctx = await requireHouseholdContext();
  const item = await prisma.shoppingListItem.findFirst({
    where: {
      id: itemId,
      shoppingList: { householdId: ctx.householdId },
    },
  });
  if (!item) throw new Error(serverErrorUk.notFound);
  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { isChecked },
  });
}

export type ShoppingListItemDTO = {
  id: string;
  customName: string | null;
  ingredient: { name: string; shoppingCategory: string | null } | null;
  quantity: number | null;
  unit: string | null;
  isChecked: boolean;
  isManual: boolean;
  sourceBreakdownJson: unknown;
};

export async function getShoppingListItemsAction(
  listId: string,
): Promise<ShoppingListItemDTO[] | null> {
  const ctx = await requireHouseholdContext();
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId: ctx.householdId },
    include: {
      items: {
        include: { ingredient: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!list) return null;
  return list.items.map((it) => ({
    id: it.id,
    customName: it.customName,
    ingredient: it.ingredient
      ? {
          name: it.ingredient.name,
          shoppingCategory: it.ingredient.shoppingCategory,
        }
      : null,
    quantity: it.quantity,
    unit: it.unit,
    isChecked: it.isChecked,
    isManual: it.isManual,
    sourceBreakdownJson: it.sourceBreakdownJson,
  }));
}

const editSchema = z.object({
  quantity: z.coerce.number().positive().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export async function updateShoppingItemAction(
  itemId: string,
  data: z.infer<typeof editSchema>,
) {
  const ctx = await requireManager();
  const parsed = editSchema.parse(data);
  const item = await prisma.shoppingListItem.findFirst({
    where: {
      id: itemId,
      shoppingList: { householdId: ctx.householdId },
    },
  });
  if (!item) throw new Error(serverErrorUk.notFound);
  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      quantity: parsed.quantity ?? item.quantity,
      unit: parsed.unit ?? item.unit,
    },
  });
  revalidatePath("/shopping");
}

export async function deleteShoppingItemAction(itemId: string) {
  const ctx = await requireManager();
  await prisma.shoppingListItem.deleteMany({
    where: {
      id: itemId,
      shoppingList: { householdId: ctx.householdId },
    },
  });
  revalidatePath("/shopping");
}

export async function addManualShoppingItemAction(
  shoppingListId: string,
  name: string,
  quantity: number,
  unit: string,
) {
  const ctx = await requireHouseholdContext();
  const list = await prisma.shoppingList.findFirst({
    where: { id: shoppingListId, householdId: ctx.householdId },
  });
  if (!list) throw new Error(serverErrorUk.notFound);
  await prisma.shoppingListItem.create({
    data: {
      shoppingListId,
      customName: name.trim(),
      quantity,
      unit,
      isManual: true,
      isChecked: false,
      sourceBreakdownJson: [],
    },
  });
  revalidatePath("/shopping");
}
