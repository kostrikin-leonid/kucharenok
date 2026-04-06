"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  duplicateRecipeAction,
  setRecipeArchivedAction,
} from "@/actions/recipes";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { addPlanItemAction } from "@/actions/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MealType } from "@/generated/prisma";
import { uk } from "@/lib/i18n/uk";
import {
  MEAL_LABEL_UK,
  MEAL_ORDER,
  mealTypeLabelUk,
} from "@/lib/i18n/meals";
import { scaleIngredients, formatQuantityDisplay } from "@/lib/recipes/scaling";
import { addDays, startOfWeekMonday, toDateOnly } from "@/lib/week";
import { cn } from "@/lib/utils";

type Ing = {
  id: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  isToTaste: boolean;
  customName: string | null;
  ingredient: { name: string } | null;
  preparationRecipe: {
    id: string;
    title: string;
    slug: string;
  } | null;
};

export function RecipeDetail({
  recipe,
  ingredients,
  canManage,
  usageCount14,
  planSlotsCount,
}: {
  recipe: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    baseServings: number;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    totalTimeMinutes: number | null;
    kcalPerServing: number | null;
    proteinPerServing: number | null;
    fatPerServing: number | null;
    carbsPerServing: number | null;
    instructionSteps: unknown;
    isArchived: boolean;
    isFavorite: boolean;
    nutritionSource: string | null;
    isPreparation: boolean;
  };
  ingredients: Ing[];
  canManage: boolean;
  usageCount14: number;
  planSlotsCount: number;
}) {
  const router = useRouter();
  const [servings, setServings] = useState(recipe.baseServings);
  const [pending, start] = useTransition();
  const steps = Array.isArray(recipe.instructionSteps)
    ? (recipe.instructionSteps as string[])
    : [];

  const scaled = useMemo(
    () =>
      scaleIngredients(
        ingredients.map((i) => ({
          quantity: i.quantity,
          unit: i.unit,
          isToTaste: i.isToTaste,
        })),
        recipe.baseServings,
        servings,
      ),
    [ingredients, recipe.baseServings, servings],
  );

  const batchKcal =
    recipe.kcalPerServing != null
      ? recipe.kcalPerServing * servings
      : null;

  const hero = recipe.imageUrl?.trim() ?? "";
  const showHero =
    Boolean(hero) &&
    (hero.startsWith("/") || /^https?:\/\//i.test(hero));

  const plannedLine =
    uk.recipes.plannedTimes(usageCount14) +
    (usageCount14 >= 3 ? uk.recipes.plannedOften : "");

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "overflow-hidden rounded-[20px] border border-[#f9fafb] bg-white shadow-[var(--shadow-card)]",
          !showHero && "border-dashed border-[#e2e8f0]",
        )}
      >
        {showHero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt=""
            className="max-h-72 w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2.2/1] max-h-56 items-center justify-center bg-[#f0f4f8]">
            <span className="text-sm font-medium text-muted-foreground">
              {uk.recipeImage.placeholder}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#001f3f] md:text-3xl">
              {recipe.title}
            </h1>
            {recipe.isPreparation ? (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {uk.recipes.preparationBadge}
              </Badge>
            ) : null}
          </div>
          {recipe.summary ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {recipe.summary}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">{plannedLine}</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/recipes/${recipe.slug}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {uk.common.edit}
            </Link>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await duplicateRecipeAction(recipe.id);
                  toast.success(uk.recipes.duplicated);
                  router.refresh();
                });
              }}
            >
              {uk.recipes.duplicate}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await setRecipeArchivedAction(recipe.id, !recipe.isArchived);
                  toast.success(
                    recipe.isArchived
                      ? uk.recipes.restoredToast
                      : uk.recipes.archivedToast,
                  );
                  router.refresh();
                });
              }}
            >
              {recipe.isArchived ? uk.recipes.unarchive : uk.recipes.archive}
            </Button>
            <AddToPlanDialog recipeId={recipe.id} />
            <DeleteRecipeButton
              recipeId={recipe.id}
              planSlotsCount={planSlotsCount}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm">
          <span className="text-sm text-muted-foreground">
            {uk.recipes.scaleTitle}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
            >
              −
            </Button>
            <Input
              className="w-16 text-center"
              type="number"
              min={0.5}
              step={0.5}
              value={servings}
              onChange={(e) =>
                setServings(Math.max(0.5, parseFloat(e.target.value) || 1))
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setServings((s) => s + 1)}
            >
              +
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {uk.recipes.scaleRecipeBase(recipe.baseServings)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{uk.recipes.scaleHint}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm">
          <h2 className="font-medium">{uk.recipes.ingredientsTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ingredients.map((ing, i) => {
              const sc = scaled[i];
              const nameNode = ing.preparationRecipe ? (
                <Link
                  href={`/recipes/${ing.preparationRecipe.slug}`}
                  className="font-medium text-[#001f3f] underline-offset-2 hover:underline"
                >
                  {ing.preparationRecipe.title?.trim() || uk.common.unnamed}
                </Link>
              ) : (
                (ing.ingredient?.name?.trim() ||
                  ing.customName?.trim() ||
                  uk.common.unnamed)
              );
              return (
                <li key={ing.id} className="flex justify-between gap-4">
                  <span>
                    {nameNode}
                    {ing.isToTaste ? ` (${uk.recipes.toTasteShort})` : ""}
                    {ing.note ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {ing.note}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {ing.isToTaste
                      ? "—"
                      : `${formatQuantityDisplay(sc.scaledQuantity)} ${ing.unit ?? ""}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm">
          <h2 className="font-medium">{uk.recipes.stepsTitle}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="mt-4 text-xs text-muted-foreground">
            {uk.recipes.timesLine(
              recipe.prepTimeMinutes != null
                ? String(recipe.prepTimeMinutes)
                : "—",
              recipe.cookTimeMinutes != null
                ? String(recipe.cookTimeMinutes)
                : "—",
              recipe.totalTimeMinutes != null
                ? String(recipe.totalTimeMinutes)
                : "—",
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm">
        <h2 className="font-medium">{uk.recipes.nutritionApprox}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {recipe.nutritionSource === "ai_estimated"
            ? uk.recipes.nutritionAiNote
            : uk.recipes.nutritionManualNote}
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            {uk.recipes.perServing}:{" "}
            {recipe.kcalPerServing != null
              ? `${Math.round(recipe.kcalPerServing)} ${uk.dashboard.kcal} · Б ${recipe.proteinPerServing ?? "—"} · Ж ${recipe.fatPerServing ?? "—"} · В ${recipe.carbsPerServing ?? "—"}`
              : uk.recipes.nutritionMissingNote}
          </p>
          <p>
            {uk.recipes.thisBatch(servings)}:{" "}
            {batchKcal != null
              ? `${Math.round(batchKcal)} ${uk.dashboard.kcal}`
              : "—"}
          </p>
        </div>
      </section>

    </div>
  );
}

function AddToPlanDialog({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [meal, setMeal] = useState<MealType>("dinner");
  const [servings, setServings] = useState(4);
  const [pending, start] = useTransition();
  const weekStart = startOfWeekMonday();
  const date = addDays(weekStart, dayIndex);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
        {uk.recipes.addToWeek}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{uk.recipes.addToWeekTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>{uk.recipes.day}</Label>
            <Select
              value={String(dayIndex)}
              onValueChange={(v) =>
                setDayIndex(parseInt(v ?? "0", 10))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={uk.common.choose}>
                  {(v) =>
                    uk.plan.weekdaysShort[parseInt(String(v ?? "0"), 10)] ??
                    uk.common.choose
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {uk.plan.weekdaysShort.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{uk.recipes.slot}</Label>
            <Select
              value={meal}
              onValueChange={(v) => setMeal((v ?? "dinner") as MealType)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={uk.common.choose}>
                  {(v) => mealTypeLabelUk(v ?? meal)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEAL_ORDER.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MEAL_LABEL_UK[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{uk.recipes.servingsLabel}</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={servings}
              onChange={(e) =>
                setServings(Math.max(0.5, parseFloat(e.target.value) || 1))
              }
              className="mt-1"
            />
          </div>
          <Button
            disabled={pending}
            className="w-full"
            onClick={() => {
              start(async () => {
                await addPlanItemAction({
                  date: toDateOnly(date),
                  mealType: meal,
                  recipeId,
                  servings,
                  note: null,
                });
                toast.success(uk.recipes.addedToPlan);
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {uk.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
