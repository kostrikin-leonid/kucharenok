"use client";

import { ChefHat, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recipeImageSrc } from "@/lib/images/recipe-image-src";
import { uk } from "@/lib/i18n/uk";
import type { PlanRecipePickerItem } from "@/types/plan-recipe-picker";
import { cn } from "@/lib/utils";

type Cat = { slug: string; name: string };
type Tag = { slug: string; name: string };

export function PlanRecipePickerModal({
  open,
  onOpenChange,
  recipes,
  categories,
  tags,
  title,
  onPick,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipes: PlanRecipePickerItem[];
  categories: Cat[];
  tags: Tag[];
  title: string;
  onPick: (recipeId: string) => void;
  pending?: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [prepOnly, setPrepOnly] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (qq && !r.title.toLowerCase().includes(qq)) return false;
      if (cat && r.categorySlug !== cat) return false;
      if (tag && !r.tagSlugs.includes(tag)) return false;
      if (favOnly && !r.isFavorite) return false;
      if (prepOnly && !r.isPreparation) return false;
      return true;
    });
  }, [recipes, q, cat, tag, favOnly, prepOnly]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/80 px-4 py-2.5 pr-12">
          <DialogTitle className="text-left text-[15px]">{title}</DialogTitle>
        </DialogHeader>
        <div className="shrink-0 space-y-2 border-b border-border/60 bg-muted/25 px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={open ? "picker-search-open" : "picker-search-closed"}
              autoFocus={open}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={uk.recipes.searchTitlePlaceholder}
              className="h-10 bg-white pl-9 text-sm"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px]">{uk.recipes.allCategories}</Label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs text-[#001f3f]"
              >
                <option value="">{uk.recipes.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">{uk.recipes.allTags}</Label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-xs text-[#001f3f]"
              >
                <option value="">{uk.recipes.allTags}</option>
                {tags.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={favOnly}
                onChange={(e) => setFavOnly(e.target.checked)}
                className="size-3.5 rounded border-[#cbd5e1]"
              />
              {uk.recipes.favoritesOnly}
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={prepOnly}
                onChange={(e) => setPrepOnly(e.target.checked)}
                className="size-3.5 rounded border-[#cbd5e1]"
              />
              {uk.recipes.prepsOnlyFilter}
            </label>
          </div>
        </div>
        <div
          className="min-h-0 max-h-[65vh] flex-1 overflow-y-auto overscroll-contain px-3 py-2"
          data-slot="plan-recipe-picker-scroll"
        >
          <ul className="space-y-1.5 pb-1">
            {filtered.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                {uk.recipes.noResults}
              </li>
            ) : (
              filtered.map((r) => {
                const src = recipeImageSrc(r.imageUrl);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onPick(r.id)}
                      className={cn(
                        "flex w-full min-h-[72px] items-stretch gap-2.5 rounded-xl border border-transparent bg-card p-1.5 text-left transition-colors",
                        "hover:border-[#e2e8f0] hover:bg-[#fafafa]",
                        "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-[#f1f5f9] ring-1 ring-[#e8edf3]">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            width={72}
                            height={72}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[#94a3b8]">
                            <ChefHat className="size-7 stroke-[1.25]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5 pr-1">
                        <p className="text-[13px] font-semibold leading-snug text-[#001f3f]">
                          {r.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {r.categoryName ?? uk.recipes.uncategorized}
                          {" · "}
                          {uk.recipes.servings}: {r.baseServings}
                          {r.kcalPerServing != null
                            ? ` · ~${Math.round(r.kcalPerServing)} ${uk.dashboard.kcal}`
                            : ""}
                          {r.isPreparation
                            ? ` · ${uk.recipes.preparationBadge}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
