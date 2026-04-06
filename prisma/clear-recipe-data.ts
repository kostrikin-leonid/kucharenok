/**
 * Видаляє всі дані, пов’язані з рецептами, планом і списками покупок,
 * для ВСІХ домогосподарств у базі. Користувачі, члени, категорії, теги та
 * каталог інгредієнтів залишаються.
 *
 * Порядок згідно з foreign keys у prisma/schema.prisma
 */
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.aIImportJob.deleteMany(),
    prisma.recipeUsageLog.deleteMany(),
    prisma.shoppingListItem.deleteMany(),
    prisma.shoppingList.deleteMany(),
    prisma.weeklyPlanItem.deleteMany(),
    prisma.weeklyPlan.deleteMany(),
    prisma.recipeTag.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.recipe.deleteMany(),
  ]);
  console.info(
    "clear-recipe-data: видалено рецепти, плани тижня, списки покупок, логи використання, імпорти ШІ.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
