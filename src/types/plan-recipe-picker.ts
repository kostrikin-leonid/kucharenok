/** Рецепт для модалки вибору на сторінці плану (серіалізується в клієнт). */
export type PlanRecipePickerItem = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  baseServings: number;
  kcalPerServing: number | null;
  isPreparation: boolean;
  isFavorite: boolean;
  categorySlug: string | null;
  categoryName: string | null;
  tagSlugs: string[];
};
