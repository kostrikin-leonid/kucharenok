"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { toggleRecipeFavoriteAction } from "@/actions/recipes";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

export function RecipeFavoriteStar({
  recipeId,
  isFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState(isFavorite);

  useEffect(() => {
    setOptimistic(isFavorite);
  }, [isFavorite]);

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={optimistic}
      title={
        optimistic
          ? uk.recipes.favoriteRemoveHint
          : uk.recipes.favoriteAddHint
      }
      aria-label={
        optimistic
          ? uk.recipes.favoriteRemoveHint
          : uk.recipes.favoriteAddHint
      }
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-[#94a3b8] transition-colors hover:border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-amber-500 md:size-9",
        optimistic && "text-amber-500 hover:text-amber-600",
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !optimistic;
        setOptimistic(next);
        start(async () => {
          try {
            await toggleRecipeFavoriteAction(recipeId);
            router.refresh();
          } catch {
            setOptimistic(!next);
          }
        });
      }}
    >
      <Star
        className={cn(
          "size-5 stroke-[1.75]",
          optimistic
            ? "fill-amber-400 text-amber-500"
            : "fill-transparent",
        )}
      />
    </button>
  );
}
