"use server";

import { revalidatePath } from "next/cache";

import { MealType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { requireHouseholdContext, requireManager } from "@/lib/household/access";
import { serverErrorUk } from "@/lib/i18n/server-errors";
import { generateShoppingListFromWeeklyPlan } from "@/lib/shopping/generate";
import {
  addDays,
  startOfWeekMonday,
  toDateOnly,
  toDateOnlyUtc,
} from "@/lib/week";
import { revertActivePlanToDraftAndClearShopping } from "@/lib/plan/revert-active-plan";
import { loadOrCreateWeeklyPlan } from "@/server/weekly-plan";
import { syncUsageLogsForPlan } from "@/lib/usage/recipe-usage";
import { z } from "zod";

async function revertToDraftIfSaved(planId: string) {
  await revertActivePlanToDraftAndClearShopping(planId);
}

export async function getOrCreateWeeklyPlan(weekStart?: Date) {
  const ctx = await requireHouseholdContext();
  return loadOrCreateWeeklyPlan(
    ctx.householdId,
    ctx.userId,
    weekStart ?? startOfWeekMonday(),
  );
}

const slotSchema = z.object({
  date: z.coerce.date(),
  mealType: z.nativeEnum(MealType),
  recipeId: z.string(),
  servings: z.coerce.number().positive(),
  note: z.string().optional().nullable(),
});

export async function addPlanItemAction(input: z.infer<typeof slotSchema>) {
  const ctx = await requireManager();
  const data = slotSchema.parse(input);
  const recipe = await prisma.recipe.findFirst({
    where: { id: data.recipeId, householdId: ctx.householdId },
  });
  if (!recipe) throw new Error(serverErrorUk.recipeNotFound);
  const plan = await getOrCreateWeeklyPlan(startOfWeekMonday(data.date));
  await revertToDraftIfSaved(plan.id);
  const maxSort = await prisma.weeklyPlanItem.aggregate({
    where: {
      weeklyPlanId: plan.id,
      date: toDateOnly(data.date),
      mealType: data.mealType,
    },
    _max: { sortOrder: true },
  });
  await prisma.weeklyPlanItem.create({
    data: {
      weeklyPlanId: plan.id,
      date: toDateOnly(data.date),
      mealType: data.mealType,
      recipeId: data.recipeId,
      servings: data.servings,
      note: data.note,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  await syncUsageLogsForPlan(plan.id);
  revalidatePath("/plan");
  revalidatePath("/shopping");
  revalidatePath("/dashboard");
}

export async function updatePlanItemServingsAction(
  itemId: string,
  servings: number,
) {
  const ctx = await requireManager();
  const item = await prisma.weeklyPlanItem.findFirst({
    where: { id: itemId, weeklyPlan: { householdId: ctx.householdId } },
  });
  if (!item) throw new Error(serverErrorUk.notFound);
  await revertToDraftIfSaved(item.weeklyPlanId);
  await prisma.weeklyPlanItem.update({
    where: { id: itemId },
    data: { servings },
  });
  await syncUsageLogsForPlan(item.weeklyPlanId);
  revalidatePath("/plan");
  revalidatePath("/shopping");
}

export async function removePlanItemAction(itemId: string) {
  const ctx = await requireManager();
  const item = await prisma.weeklyPlanItem.findFirst({
    where: { id: itemId, weeklyPlan: { householdId: ctx.householdId } },
  });
  if (!item) throw new Error(serverErrorUk.notFound);
  const planId = item.weeklyPlanId;
  await revertToDraftIfSaved(planId);
  await prisma.weeklyPlanItem.delete({ where: { id: itemId } });
  await syncUsageLogsForPlan(planId);
  revalidatePath("/plan");
  revalidatePath("/shopping");
}

export async function replacePlanItemRecipeAction(
  itemId: string,
  recipeId: string,
) {
  const ctx = await requireManager();
  const item = await prisma.weeklyPlanItem.findFirst({
    where: { id: itemId, weeklyPlan: { householdId: ctx.householdId } },
  });
  if (!item) throw new Error(serverErrorUk.notFound);
  await revertToDraftIfSaved(item.weeklyPlanId);
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: ctx.householdId },
  });
  if (!recipe) throw new Error(serverErrorUk.recipeNotFound);
  await prisma.weeklyPlanItem.update({
    where: { id: itemId },
    data: { recipeId },
  });
  await syncUsageLogsForPlan(item.weeklyPlanId);
  revalidatePath("/plan");
  revalidatePath("/shopping");
}

export async function copyPreviousWeekAction(currentWeekStart: Date) {
  const ctx = await requireManager();
  const prevStart = addDays(toDateOnly(currentWeekStart), -7);
  const prev = await prisma.weeklyPlan.findFirst({
    where: { householdId: ctx.householdId, weekStartDate: prevStart },
    include: { items: true },
  });
  if (!prev) throw new Error(serverErrorUk.noPreviousWeekPlan);
  const target = await getOrCreateWeeklyPlan(currentWeekStart);
  await revertToDraftIfSaved(target.id);
  await prisma.weeklyPlanItem.deleteMany({ where: { weeklyPlanId: target.id } });
  for (const it of prev.items) {
    const dayOffset = Math.round(
      (it.date.getTime() - prev.weekStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const newDate = addDays(target.weekStartDate, dayOffset);
    await prisma.weeklyPlanItem.create({
      data: {
        weeklyPlanId: target.id,
        date: toDateOnly(newDate),
        mealType: it.mealType,
        recipeId: it.recipeId,
        servings: it.servings,
        note: it.note,
        sortOrder: it.sortOrder,
      },
    });
  }
  await syncUsageLogsForPlan(target.id);
  revalidatePath("/plan");
  revalidatePath("/shopping");
}

export async function generateWeekDraftAction(weekStart?: Date) {
  const ctx = await requireManager();
  const start = toDateOnly(weekStart ?? startOfWeekMonday());
  const plan = await getOrCreateWeeklyPlan(start);
  await revertToDraftIfSaved(plan.id);
  await prisma.weeklyPlanItem.deleteMany({ where: { weeklyPlanId: plan.id } });

  const pool = await prisma.recipe.findMany({
    where: {
      householdId: ctx.householdId,
      isArchived: false,
      hiddenFromSuggestions: false,
      isPreparation: false,
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  if (pool.length === 0) {
    revalidatePath("/plan");
    return;
  }
  const slots: MealType[] = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "prep",
  ];
  let idx = 0;
  for (let d = 0; d < 7; d++) {
    const date = addDays(plan.weekStartDate, d);
    for (const meal of slots) {
      const recipe = pool[idx % pool.length];
      idx += 1;
      await prisma.weeklyPlanItem.create({
        data: {
          weeklyPlanId: plan.id,
          date: toDateOnly(date),
          mealType: meal,
          recipeId: recipe.id,
          servings: 4,
          sortOrder: 0,
        },
      });
    }
  }
  await syncUsageLogsForPlan(plan.id);
  revalidatePath("/plan");
  revalidatePath("/shopping");
}

export async function saveWeeklyPlanAction(weekStartIso: string) {
  const ctx = await requireManager();
  // UTC-календарна дата: інакше toDateOnly() у TZ заходу від океану зсуває день
  // відносно weekStartDate з БД (як у toISOString() з SaveWeekButton).
  const weekStart = toDateOnlyUtc(new Date(weekStartIso));
  const plan = await prisma.weeklyPlan.findFirst({
    where: { householdId: ctx.householdId, weekStartDate: weekStart },
  });
  if (!plan) throw new Error(serverErrorUk.notFound);
  await prisma.weeklyPlan.update({
    where: { id: plan.id },
    data: { status: "active" },
  });
  await generateShoppingListFromWeeklyPlan(plan.id, ctx.householdId);
  await syncUsageLogsForPlan(plan.id);
  revalidatePath("/plan");
  revalidatePath("/shopping");
  revalidatePath("/dashboard");
}
