import Link from "next/link";
import { ChefHat } from "lucide-react";

import { RecipeFavoriteStar } from "@/components/recipes/recipe-favorite-star";
import { Badge } from "@/components/ui/badge";
import { recipeImageSrc } from "@/lib/images/recipe-image-src";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export type RecipeGridCardProps = {
  recipeId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  categoryName: string | null;
  baseServings: number;
  kcalPerServing: number | null;
  isPreparation: boolean;
  isFavorite: boolean;
  lastInPlanLabel: string;
  /** Кількість разів у плані за 30 д. (для рядка «× за 30 д.»). */
  usageCount30: number;
  /** Додаткові класи кореня (наприклад hover у сітці). */
  className?: string;
};

const hrefFor = (slug: string) => `/recipes/${slug}`;

/**
 * Картка рецепта для сітки /recipes.
 * Структура: корінь (flex col, p-0) → ImageWrapper (aspect-square) → Content (padding лише тут).
 */
export function RecipeGridCard({
  recipeId,
  slug,
  title,
  imageUrl,
  categoryName,
  baseServings,
  kcalPerServing,
  isPreparation,
  isFavorite,
  lastInPlanLabel,
  usageCount30,
  className,
}: RecipeGridCardProps) {
  const src = recipeImageSrc(imageUrl);
  const href = hrefFor(slug);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-[#e8edf3] p-0 text-sm text-card-foreground shadow-[0_2px_8px_rgba(0,31,63,0.06)]",
        className,
      )}
    >
      {/* ImageWrapper: єдиний візуальний блок фото; без margin/padding */}
      <div
        className="relative m-0 box-border aspect-square w-full max-w-full shrink-0 overflow-hidden p-0"
        data-slot="recipe-grid-card-image"
      >
        <Link
          href={href}
          className="m-0 box-border block h-full w-full max-h-full max-w-full p-0 leading-none no-underline outline-none"
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              decoding="async"
              className="m-0 block h-full w-full max-h-full max-w-full object-cover p-0"
            />
          ) : (
            <div className="m-0 flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#f4f7fb] to-[#eef2f7] p-0 text-center">
              <ChefHat
                className="size-8 text-[#b8c5d4]"
                strokeWidth={1.25}
                aria-hidden
              />
              <span className="text-[10px] font-medium leading-tight text-[#94a3b8]">
                {uk.recipeImage.placeholder}
              </span>
            </div>
          )}
        </Link>

        <div className="absolute top-2 right-2 z-[2] m-0 p-0">
          <div className="rounded-lg bg-white/95 p-0.5 shadow-sm backdrop-blur-sm">
            <RecipeFavoriteStar recipeId={recipeId} isFavorite={isFavorite} />
          </div>
        </div>
      </div>

      {/* Content: увесь внутрішній відступ лише тут */}
      <Link
        href={href}
        className="flex flex-col gap-1 bg-card px-[14px] py-3 leading-normal no-underline outline-none"
      >
        <div className="m-0 flex flex-wrap items-start gap-1 p-0">
          <h2 className="m-0 min-w-0 flex-1 p-0 text-[13px] font-semibold leading-snug text-[#001f3f] md:text-sm">
            {title}
          </h2>
          {isPreparation ? (
            <Badge
              variant="outline"
              className="m-0 shrink-0 px-1 py-0 text-[9px] font-semibold"
            >
              {uk.recipes.preparationBadge}
            </Badge>
          ) : null}
        </div>
        <p className="m-0 p-0 text-[11px] leading-relaxed text-[#64748b]">
          {categoryName?.trim() || uk.recipes.uncategorized} · {baseServings}
          {kcalPerServing != null
            ? ` · ~${Math.round(kcalPerServing)}`
            : ""}
        </p>
        <p className="m-0 p-0 text-[10px] leading-tight text-[#94a3b8]">
          {uk.recipes.lastInPlanLine(lastInPlanLabel, usageCount30)}
        </p>
      </Link>
    </article>
  );
}
