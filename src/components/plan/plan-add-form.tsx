"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addPlanItemAction } from "@/actions/plan";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MealType } from "@/generated/prisma";
import { uk } from "@/lib/i18n/uk";

type Rec = { id: string; title: string };

export function PlanAddForm({
  date,
  mealType,
  recipes,
}: {
  date: Date;
  mealType: MealType;
  recipes: Rec[];
}) {
  const router = useRouter();
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? "");
  const [pending, start] = useTransition();

  if (!recipes.length) return null;

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await addPlanItemAction({
            date,
            mealType,
            recipeId,
            servings: 4,
            note: null,
          });
          toast.success(uk.plan.addedSlot);
          router.refresh();
        });
      }}
    >
      <Select
        value={recipeId}
        onValueChange={(v) => setRecipeId(v ?? "")}
      >
        <SelectTrigger className="h-8 max-w-[10rem] text-xs">
          <SelectValue placeholder={uk.common.choose}>
            {(v) => {
              const r = recipes.find((x) => x.id === v);
              return r?.title?.trim() || uk.common.unnamed;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {recipes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.title?.trim() || uk.common.unnamed}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {uk.plan.addToSlot}
      </Button>
    </form>
  );
}
