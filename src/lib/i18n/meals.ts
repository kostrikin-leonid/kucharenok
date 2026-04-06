import type { MealType } from "@/generated/prisma";

import { uk } from "@/lib/i18n/uk";

export const MEAL_LABEL_UK: Record<MealType, string> = {
  breakfast: "Сніданок",
  lunch: "Обід",
  dinner: "Вечеря",
  snack: "Перекус",
  prep: "Заготовки",
};

export const MEAL_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "prep",
];

/** Підпис прийому їжі для UI (значення enum з БД ніколи не показуємо сирим). */
export function mealTypeLabelUk(value: unknown): string {
  if (typeof value !== "string" || !value) return uk.common.choose;
  if (value in MEAL_LABEL_UK) {
    return MEAL_LABEL_UK[value as MealType];
  }
  return uk.common.choose;
}
