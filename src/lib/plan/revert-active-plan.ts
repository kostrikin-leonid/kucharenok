import { prisma } from "@/lib/db";

/** Збережений тиждень → чернетка + прибрати список покупок (після змін у плані / видалення рецепта). */
export async function revertActivePlanToDraftAndClearShopping(
  planId: string,
): Promise<void> {
  const cur = await prisma.weeklyPlan.findUnique({ where: { id: planId } });
  if (!cur || cur.status !== "active") return;
  await prisma.$transaction([
    prisma.weeklyPlan.update({
      where: { id: planId },
      data: { status: "draft" },
    }),
    prisma.shoppingList.deleteMany({ where: { weeklyPlanId: planId } }),
  ]);
}
