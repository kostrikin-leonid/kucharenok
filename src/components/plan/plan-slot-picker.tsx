"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addPlanItemAction } from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { PlanRecipePickerModal } from "@/components/plan/plan-recipe-picker-modal";
import type { MealType } from "@/generated/prisma";
import { uk } from "@/lib/i18n/uk";
import type { PlanRecipePickerItem } from "@/types/plan-recipe-picker";
import { cn } from "@/lib/utils";

export function PlanSlotPicker({
  weeklyPlanId,
  weekStartIso,
  dayOffset,
  mealType,
  recipes,
  categories,
  tags,
}: {
  /** Якщо зникне при серіалізації action — є `weekStartIso`. */
  weeklyPlanId: string;
  weekStartIso: string;
  dayOffset: number;
  mealType: MealType;
  recipes: PlanRecipePickerItem[];
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!recipes.length) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={cn(
          "h-11 min-h-[44px] w-full justify-between gap-2 rounded-xl border-[#e2e8f0] bg-white px-3 text-left text-sm font-medium text-[#001f3f]",
          "hover:bg-[#fafafa] active:scale-[0.99]",
        )}
      >
        <span className="truncate text-muted-foreground">{uk.common.choose}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Button>
      <PlanRecipePickerModal
        open={open}
        onOpenChange={setOpen}
        recipes={recipes}
        categories={categories}
        tags={tags}
        title={uk.plan.recipePickerTitle}
        pending={pending}
        onPick={(recipeId) => {
          start(async () => {
            try {
              await addPlanItemAction({
                weeklyPlanId,
                weekStartIso,
                dayOffset,
                mealType,
                recipeId,
                servings: 4,
                note: null,
              });
              toast.success(uk.plan.addedSlot);
              setOpen(false);
              router.refresh();
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : uk.plan.actionFailed,
              );
            }
          });
        }}
      />
    </>
  );
}
