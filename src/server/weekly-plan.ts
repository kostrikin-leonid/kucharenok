import { prisma } from "@/lib/db";
import { endOfWeekSunday, startOfWeekMonday, toDateOnly } from "@/lib/week";

export async function loadOrCreateWeeklyPlan(
  householdId: string,
  userId: string,
  anchorDate: Date = new Date(),
) {
  const start = toDateOnly(startOfWeekMonday(anchorDate));
  const end = toDateOnly(endOfWeekSunday(start));
  let plan = await prisma.weeklyPlan.findFirst({
    where: {
      householdId,
      weekStartDate: start,
    },
    include: {
      items: {
        include: {
          recipe: {
            include: {
              category: true,
              recipeTags: { include: { tag: true } },
            },
          },
        },
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
      },
    },
  });
  if (!plan) {
    plan = await prisma.weeklyPlan.create({
      data: {
        householdId,
        weekStartDate: start,
        weekEndDate: end,
        status: "draft",
        createdBy: userId,
      },
      include: {
        items: {
          include: {
          recipe: {
            include: {
              category: true,
              recipeTags: { include: { tag: true } },
            },
          },
        },
          orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
        },
      },
    });
  }
  return plan;
}
