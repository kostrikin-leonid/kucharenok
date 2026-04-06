import { prisma } from "@/lib/db";

export async function getLastUsedDate(
  householdId: string,
  recipeId: string,
): Promise<Date | null> {
  const row = await prisma.recipeUsageLog.findFirst({
    where: { householdId, recipeId },
    orderBy: { usedOn: "desc" },
    select: { usedOn: true },
  });
  return row?.usedOn ?? null;
}

export function daysSinceDate(date: Date | null): number | null {
  if (!date) return null;
  return Math.round((Date.now() - date.getTime()) / 86400000);
}

export async function getUsageCount(
  householdId: string,
  recipeId: string,
  days: number,
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return prisma.recipeUsageLog.count({
    where: {
      householdId,
      recipeId,
      usedOn: { gte: since },
    },
  });
}

export async function logRecipeUsageForPlanItem(params: {
  householdId: string;
  recipeId: string;
  weeklyPlanId: string;
  weeklyPlanItemId: string;
  usedOn: Date;
}) {
  await prisma.recipeUsageLog.create({
    data: {
      householdId: params.householdId,
      recipeId: params.recipeId,
      weeklyPlanId: params.weeklyPlanId,
      weeklyPlanItemId: params.weeklyPlanItemId,
      usedOn: params.usedOn,
    },
  });
}

export async function syncUsageLogsForPlan(weeklyPlanId: string) {
  const plan = await prisma.weeklyPlan.findUnique({
    where: { id: weeklyPlanId },
    include: { items: true },
  });
  if (!plan) return;
  await prisma.recipeUsageLog.deleteMany({ where: { weeklyPlanId } });
  for (const item of plan.items) {
    await prisma.recipeUsageLog.create({
      data: {
        householdId: plan.householdId,
        recipeId: item.recipeId,
        weeklyPlanId: plan.id,
        weeklyPlanItemId: item.id,
        usedOn: item.date,
      },
    });
  }
}
