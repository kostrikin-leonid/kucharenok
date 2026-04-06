"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  removePlanItemAction,
  replacePlanItemRecipeAction,
  updatePlanItemServingsAction,
} from "@/actions/plan";
import { PlanRecipePickerModal } from "@/components/plan/plan-recipe-picker-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uk } from "@/lib/i18n/uk";
import type { PlanRecipePickerItem } from "@/types/plan-recipe-picker";

export function PlanItemActions({
  itemId,
  servings,
  recipes,
  categories,
  tags,
}: {
  itemId: string;
  servings: number;
  recipes: PlanRecipePickerItem[];
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [sv, setSv] = useState(String(servings));
  const [pending, start] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Input
        className="h-9 w-14 bg-white px-2 text-xs"
        value={sv}
        onChange={(e) => setSv(e.target.value)}
        onBlur={() => {
          const n = parseFloat(sv);
          if (Number.isNaN(n) || n <= 0) return;
          start(async () => {
            await updatePlanItemServingsAction(itemId, n);
            router.refresh();
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setReplaceOpen(true)}
      >
        {uk.plan.replace}
      </Button>
      <PlanRecipePickerModal
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        recipes={recipes}
        categories={categories}
        tags={tags}
        title={uk.plan.replaceTitle}
        pending={pending}
        onPick={(recipeId) => {
          start(async () => {
            await replacePlanItemRecipeAction(itemId, recipeId);
            toast.success(uk.plan.replaced);
            setReplaceOpen(false);
            router.refresh();
          });
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await removePlanItemAction(itemId);
            toast.success(uk.plan.removed);
            router.refresh();
          });
        }}
      >
        {uk.plan.remove}
      </Button>
    </div>
  );
}
