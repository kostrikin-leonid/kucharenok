/** Повідомлення для throw new Error у server actions (показуються в toast) */
export const serverErrorUk = {
  notFound: "Не знайдено",
  nameRequired: "Вкажіть назву",
  invalidWeek: "Недійсний тиждень плану.",
  planNotSaved: "Спочатку збережіть тиждень — список формується лише зі збереженого плану.",
  recipeNotFound: "Рецепт не знайдено",
  ingredientNameRequired: "Потрібна назва інгредієнта",
  invalidInvite: "Недійсне запрошення",
  cannotChangeMember: "Неможливо змінити цього учасника",
  cannotDemoteOwner: "Неможливо змінити роль власника",
  noPreviousWeekPlan: "Немає плану попереднього тижня",
  registerFirst: "Спочатку зареєструйте користувача, потім додайте його.",
  alreadyInHousehold: "Цей користувач уже в домогосподарстві.",
  invalidPreparation: "Недійсна або недоступна заготовка.",
} as const;
