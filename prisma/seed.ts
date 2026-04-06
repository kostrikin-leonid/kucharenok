import "dotenv/config";

import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma";
import { DEFAULT_CATEGORY_DEFINITIONS } from "../src/lib/default-categories";
import { slugifyText } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  await prisma.aIImportJob.deleteMany();
  await prisma.recipeUsageLog.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.weeklyPlanItem.deleteMany();
  await prisma.weeklyPlan.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();

  const pass = await hash("password123", 12);
  const owner = await prisma.user.create({
    data: {
      email: "owner@demo.local",
      passwordHash: pass,
      name: "Олексій",
    },
  });
  const member1 = await prisma.user.create({
    data: {
      email: "member1@demo.local",
      passwordHash: pass,
      name: "Марія",
    },
  });
  const member2 = await prisma.user.create({
    data: {
      email: "member2@demo.local",
      passwordHash: pass,
      name: "Андрій",
    },
  });

  const household = await prisma.household.create({
    data: {
      name: "Родина демо",
      defaultServings: 4,
      dailyKcalGoal: 2200,
      dailyProteinGoal: 120,
      dailyFatGoal: 70,
      dailyCarbGoal: 250,
    },
  });

  await prisma.householdMember.createMany({
    data: [
      {
        householdId: household.id,
        userId: owner.id,
        role: "owner",
        status: "active",
      },
      {
        householdId: household.id,
        userId: member1.id,
        role: "member",
        status: "active",
      },
      {
        householdId: household.id,
        userId: member2.id,
        role: "member",
        status: "active",
      },
    ],
  });

  for (let i = 0; i < DEFAULT_CATEGORY_DEFINITIONS.length; i++) {
    const c = DEFAULT_CATEGORY_DEFINITIONS[i];
    await prisma.category.create({
      data: {
        householdId: household.id,
        name: c.name,
        slug: c.slug,
        sortOrder: i,
      },
    });
  }

  const tagDefs: { key: string; name: string }[] = [
    { key: "quick", name: "Швидко" },
    { key: "favorite", name: "Улюблене" },
    { key: "chicken", name: "Курка" },
    { key: "vegetarian", name: "Вегетаріанське" },
    { key: "weekday", name: "На будні" },
    { key: "high-protein", name: "Багато білка" },
  ];
  for (const t of tagDefs) {
    await prisma.tag.create({
      data: {
        householdId: household.id,
        name: t.name,
        slug: `${slugifyText(t.key)}-seed`,
      },
    });
  }

  const ingNames = [
    "Яйця",
    "Молоко",
    "Вершкове масло",
    "Помідори",
    "Цибуля",
    "Куряче філе",
    "Рис",
    "Паста",
    "Оливкова олія",
    "Сіль",
    "Чорний перець",
    "Картопля",
    "Морква",
    "Болгарський перець",
    "Вершки",
    "Борошно",
    "Дріжджі",
    "Цукор",
    "Лимон",
    "Часник",
    "Яловичий фарш",
    "Сир",
    "Шпинат",
    "Вівсянка",
    "Хліб",
  ];
  for (const name of ingNames) {
    await prisma.ingredient.create({
      data: {
        householdId: household.id,
        name,
        slug: `${slugifyText(name)}-seed`,
        shoppingCategory: "Загальне",
        defaultUnit: "g",
      },
    });
  }

  console.info(
    "Seed OK: користувачі, домогосподарство, категорії, теги, каталог інгредієнтів. Рецептів і плану немає.",
  );
  console.info(
    "Демо: owner@demo.local / member1@demo.local / member2@demo.local — пароль password123",
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
